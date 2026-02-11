
# Melhorias de Usabilidade no Workspace de Atendimento

Revisao completa do workspace com base em boas praticas de atendimento ao cliente, focando em agilidade, visibilidade de informacoes criticas e reducao de fricao operacional.

---

## Melhorias Identificadas

### 1. Contador de Mensagens Nao Lidas na Lista de Conversas
**Problema:** O atendente nao sabe quais conversas tem mensagens novas do visitante sem clicar em cada uma.

**Solucao:** Adicionar um badge numerico com a contagem de mensagens do visitante recebidas desde a ultima visualizacao do atendente. Ao selecionar a sala, marcar como "lida".

- Criar uma tabela `chat_room_reads` com `room_id`, `user_id`, `last_read_at` (timestamp)
- No `useChatRooms`, buscar a contagem de mensagens `sender_type = 'visitor'` com `created_at > last_read_at`
- No `ChatRoomList`, exibir badge vermelho com numero quando `unread_count > 0`
- Ao selecionar uma sala no workspace, fazer upsert em `chat_room_reads` com `now()`

### 2. Ordenacao Inteligente da Lista de Conversas
**Problema:** A lista ordena por `created_at` da sala, nao pela atividade mais recente. Conversas com mensagens novas podem ficar no final.

**Solucao:** Ordenar por `last_message_at` (descendente), com salas que tem mensagens nao lidas no topo.

- Alterar a query no `useChatRooms` para usar a data da ultima mensagem como criterio de ordenacao
- No `ChatRoomList`, priorizar: 1) salas com unread > 0, 2) por last_message_at desc

### 3. Indicador de Tempo de Espera na Fila (SLA Visual)
**Problema:** Salas com status "waiting" nao mostram ha quanto tempo o visitante esta esperando. Nao ha urgencia visual.

**Solucao:** Adicionar indicador colorido de tempo de espera nas salas "waiting":
- Verde: < 5min
- Amarelo: 5-15min
- Vermelho: > 15min

Exibir no `ChatRoomList` como um dot colorido ou texto com cor ao lado do status.

### 4. Preview da Ultima Mensagem com Indicacao de Remetente
**Problema:** A preview da ultima mensagem nao indica se foi enviada pelo visitante ou pelo atendente, dificultando saber se requer acao.

**Solucao:** Prefixar a preview com "Voce: " quando o `sender_type` da ultima mensagem nao e "visitor". Buscar o `sender_type` junto com a ultima mensagem no `useChatRooms`.

### 5. Notificacao Sonora para Novas Mensagens
**Problema:** Se o atendente esta em outra aba ou conversa, nao percebe novas mensagens.

**Solucao:** Emitir um som curto (`new Audio()`) quando uma mensagem de visitante chega via realtime e a sala nao e a atualmente selecionada.

### 6. Atalho de Macros Visivel no Input
**Problema:** O sistema tem macros (`chat_macros`) mas nao ha indicacao visual ou acesso rapido no campo de input.

**Solucao:** Adicionar um botao de "/" ou icone de macros no `ChatInput`. Ao digitar "/" no inicio, abrir um dropdown com as macros disponiveis filtraveis por texto.

### 7. Indicador de Prioridade na Lista de Conversas
**Problema:** A prioridade da sala (`priority: normal | high | urgent`) nao e exibida na lista.

**Solucao:** Mostrar um indicador visual (icone ou borda colorida) para salas com prioridade `high` ou `urgent`.

### 8. Tempo de Conversa Ativa no Header
**Problema:** O header da conversa nao mostra ha quanto tempo a conversa esta em andamento.

**Solucao:** Exibir no header do chat a duracao desde `started_at` (ex: "32min" ou "1h45min") para ajudar o atendente a gerenciar o tempo.

---

## Priorizacao e Escopo Sugerido

| # | Melhoria | Impacto | Esforco |
|---|---------|---------|---------|
| 1 | Mensagens nao lidas (badge) | Alto | Medio |
| 2 | Ordenacao por atividade recente | Alto | Baixo |
| 3 | SLA visual na fila | Alto | Baixo |
| 4 | Remetente na preview | Medio | Baixo |
| 5 | Notificacao sonora | Medio | Baixo |
| 6 | Acesso rapido a macros | Medio | Medio |
| 7 | Indicador de prioridade | Baixo | Baixo |
| 8 | Duracao no header | Baixo | Baixo |

---

## Detalhes Tecnicos

### Tabela `chat_room_reads` (nova)

```sql
CREATE TABLE chat_room_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);
ALTER TABLE chat_room_reads ENABLE ROW LEVEL SECURITY;
-- RLS: users can manage their own reads
```

### Contagem de nao lidas no `useChatRooms`

Apos buscar os rooms, fazer uma query adicional:
```sql
SELECT room_id, COUNT(*) as unread
FROM chat_messages
WHERE room_id IN (...) AND sender_type = 'visitor' AND is_internal = false
  AND created_at > COALESCE(
    (SELECT last_read_at FROM chat_room_reads WHERE room_id = chat_messages.room_id AND user_id = $userId),
    '1970-01-01'
  )
GROUP BY room_id
```

### Ordenacao

No `ChatRoomList`, ordenar o array de rooms no frontend:
```typescript
const sorted = [...rooms].sort((a, b) => {
  // Unread first
  if ((a.unread_count ?? 0) > 0 && (b.unread_count ?? 0) === 0) return -1;
  if ((a.unread_count ?? 0) === 0 && (b.unread_count ?? 0) > 0) return 1;
  // Then by most recent activity
  const aTime = a.last_message_at || a.created_at;
  const bTime = b.last_message_at || b.created_at;
  return new Date(bTime).getTime() - new Date(aTime).getTime();
});
```

### Macros dropdown

Buscar `chat_macros` ao montar o `ChatInput`. Ao digitar "/" no campo, filtrar e exibir um `Command` dropdown (usando o componente cmdk ja instalado).

### Notificacao sonora

No listener realtime de `chat_messages`, quando `payload.new.sender_type === 'visitor'` e `payload.new.room_id !== selectedRoomId`:
```typescript
new Audio('/notification.mp3').play().catch(() => {});
```

### Arquivos a serem modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | Migration SQL | Criar tabela `chat_room_reads` |
| 2 | `src/hooks/useChatRealtime.ts` | Adicionar unread_count, sender_type da ultima msg, ordenacao, notificacao sonora |
| 3 | `src/components/chat/ChatRoomList.tsx` | Badge de nao lidas, SLA visual, indicador de prioridade, remetente na preview |
| 4 | `src/components/chat/ChatInput.tsx` | Dropdown de macros com "/" |
| 5 | `src/pages/AdminWorkspace.tsx` | Marcar como lido ao selecionar sala, duracao no header, listener de notificacao |
| 6 | `public/notification.mp3` | Arquivo de audio para notificacao (som curto) |
