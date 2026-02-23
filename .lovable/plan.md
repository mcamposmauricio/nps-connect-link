

# Reabrir Chats Pendentes, Chat Proativo e Controle de Multiplos Chats

## Visao Geral

Quatro funcionalidades relacionadas ao ciclo de vida de chats:

1. **Reabrir chats fechados com pendencia** -- tanto o atendente (pelo historico) quanto o visitante/cliente (pelo widget/portal) podem reativar um chat "pending"
2. **Controle de multiplos chats simultaneos** -- configuracao no AdminSettings para permitir ou nao que visitantes tenham mais de um chat ativo
3. **Chat proativo do atendente** -- o atendente inicia uma conversa com uma empresa/contato, que aparece automaticamente no widget/portal do visitante
4. **Gestao de pendencias no historico** -- filtrar por "pending", e acoes em lote/individuais para arquivar ou marcar como resolvido

---

## 1. Reabrir Chats Pendentes

### 1.1 Pelo Atendente -- Historico de Chats (AdminChatHistory.tsx)

Na tabela de historico, quando um chat fechado tem `resolution_status = 'pending'`:

- Exibir botao **"Reabrir"** na linha
- Ao clicar:
  - Atualiza `chat_rooms` com `status: 'active'`, `closed_at: null`, `resolution_status: null`
  - Re-atribui ao atendente original (se disponivel) ou deixa como `waiting`
  - Insere mensagem de sistema: "[Sistema] Chat reaberto por [atendente]"
  - O chat aparece imediatamente no Workspace via Realtime

### 1.2 Pelo Cliente -- Widget e Portal

**Arquivo:** `src/pages/ChatWidget.tsx`, `src/components/portal/PortalChatList.tsx`, `src/components/portal/PortalChatView.tsx`

Na lista de historico do visitante (widget e portal), chats fechados com `resolution_status = 'pending'`:

- Exibir badge **"Pendente"** e botao **"Retomar conversa"** ao lado do chat
- Ao clicar:
  - Atualiza `chat_rooms` com `status: 'waiting'`, `closed_at: null`, `resolution_status: null`
  - Insere mensagem de sistema: "[Sistema] Chat reaberto pelo cliente"
  - O visitante e redirecionado para a view do chat (PortalChatView ou tela de conversa do widget)
  - A sala entra na fila de atribuicao normalmente (trigger `assign_chat_room` e disparado ao voltar para `waiting`)
- Se `allow_multiple_chats = false` e ja houver outro chat ativo, bloquear a reabertura com mensagem explicativa

### 1.3 Impacto no Widget/Portal

- O Realtime existente nos canais de `chat_rooms` ja detecta mudancas de status, entao o chat reaberto sera refletido automaticamente para ambas as partes

---

## 2. Configuracao de Multiplos Chats Simultaneos

### 2.1 Nova coluna em `chat_settings`

```sql
ALTER TABLE chat_settings ADD COLUMN allow_multiple_chats boolean NOT NULL DEFAULT false;
```

### 2.2 AdminSettings.tsx -- Nova opcao na aba Widget

Switch "Permitir multiplos chats simultaneos" junto com os outros switches existentes.

### 2.3 ChatWidget.tsx e UserPortal -- Validacao

No `handleNewChat` e na reabertura de chats pendentes:

- Se `allow_multiple_chats = false`: verificar se ja existe `chat_room` com `status in ('active', 'waiting')` para esse `visitor_id`. Se existir, impedir e mostrar mensagem.
- Se `allow_multiple_chats = true`: permitir normalmente

---

## 3. Chat Proativo pelo Atendente

### 3.1 UI no Workspace (AdminWorkspace.tsx)

Botao **"Novo Chat"** no header que abre dialog com:

- Seletor de empresa (contacts com `is_company = true`)
- Seletor de contato da empresa (company_contacts)
- Campo para mensagem inicial
- Botao "Iniciar Conversa"

### 3.2 Logica de criacao

1. Buscar ou criar `chat_visitor` associado ao `company_contact`
2. Criar `chat_room` com `status: 'active'`, `attendant_id` do atendente atual
3. Inserir mensagem inicial como `sender_type: 'attendant'`

### 3.3 Impacto no Widget/Portal

- Adicionar subscription Realtime para `INSERT` em `chat_rooms` filtrado por `visitor_id` no widget e portal
- Visitante identificado (via `external_id`) recebe o chat automaticamente

---

## 4. Gestao de Pendencias no Historico

### 4.1 Novo status: "archived"

Usar `resolution_status = 'archived'` como valor adicional (coluna texto, sem migracao necessaria).

### 4.2 AdminChatHistory.tsx -- Acoes em lote

- Checkbox de selecao em cada linha + "selecionar todos"
- Barra de acoes: **"Marcar como Resolvido"** e **"Arquivar"**
- Filtro de "Arquivado" no dropdown de status

### 4.3 Acao individual

Dropdown por linha com: "Reabrir", "Marcar como Resolvido", "Arquivar"

---

## Secao Tecnica -- Arquivos

| Arquivo | Alteracao |
|---|---|
| **Migracao SQL** | Adicionar `allow_multiple_chats` em `chat_settings` |
| `src/pages/AdminSettings.tsx` | Switch para "Permitir multiplos chats" |
| `src/pages/AdminChatHistory.tsx` | Botao "Reabrir" para pendentes; selecao em lote; acoes "Resolver/Arquivar"; dropdown individual; filtro "archived" |
| `src/hooks/useChatHistory.ts` | Suportar filtro por `archived` no `resolution_status` |
| `src/pages/AdminWorkspace.tsx` | Botao "Novo Chat" proativo com dialog de selecao de empresa/contato |
| `src/pages/ChatWidget.tsx` | Validacao de `allow_multiple_chats`; botao "Retomar" para chats pendentes; subscription Realtime para chats proativos |
| `src/pages/UserPortal.tsx` | Subscription para chats proativos; exibir opcao de retomar chats pendentes |
| `src/components/portal/PortalChatList.tsx` | Badge "Pendente" e botao "Retomar conversa" para chats com `resolution_status = 'pending'` |
| `src/components/portal/PortalChatView.tsx` | Nenhuma alteracao (ja escuta Realtime) |

## Fluxo: Reabrir Chat pelo Atendente

```text
1. Atendente acessa Historico de Chats
2. Filtra por "Com pendencia"
3. Clica "Reabrir" no chat desejado
4. Sistema reativa a sala: status='active', closed_at=null
5. Chat aparece no Workspace do atendente
6. Visitante ve o chat ativo novamente no widget/portal
```

## Fluxo: Reabrir Chat pelo Cliente

```text
1. Cliente acessa historico no widget ou portal
2. Ve chat fechado com badge "Pendente"
3. Clica "Retomar conversa"
4. Sistema valida: nao ha outro chat ativo (ou allow_multiple_chats=true)
5. Sala volta para status='waiting', entra na fila de atribuicao
6. Mensagem de sistema registrada: "Chat reaberto pelo cliente"
7. Atendente recebe a sala no Workspace quando atribuida
```

## Fluxo: Chat Proativo

```text
1. Atendente clica "Novo Chat" no Workspace
2. Seleciona empresa e contato
3. Escreve mensagem inicial
4. Sistema cria visitor + room + mensagem
5. Chat aparece no Workspace como "ativo"
6. Visitante recebe o chat no widget automaticamente
```

## Fluxo: Gestao de Pendencias em Lote

```text
1. Admin acessa Historico
2. Filtra por "Com pendencia"
3. Seleciona multiplos chats via checkbox
4. Clica "Marcar como Resolvido" ou "Arquivar"
5. Sistema atualiza resolution_status em lote
```

