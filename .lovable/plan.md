

# Melhorias no Widget de Chat e Workspace

## 1. Estilo visual diferenciado para mensagens automaticas no Widget

**Arquivo**: `src/pages/ChatWidget.tsx`

Atualmente as mensagens de sistema aparecem como pilulas cinzas centralizadas. Sera aplicado um estilo com fundo amarelo claro (`bg-amber-50 border border-amber-200/60 text-amber-800`) para que se destaquem visualmente das trocas normais entre atendente e visitante.

---

## 2. Encerrar como pendente: mover para lista de pendentes do atendente

**Arquivo**: `supabase/functions/process-chat-auto-rules/index.ts`

O `inactivity_warning` ja muda o status para `waiting`. Mas o comportamento correto e: a sala sai da lista ativa do atendente e vai para pendentes, mantendo o `attendant_id` para que, quando o cliente retomar, volte para o mesmo atendente.

**Arquivo**: `src/pages/ChatWidget.tsx`

Quando o visitante envia uma mensagem em um chat com status `closed` e `resolution_status = "pending"`, o chat ja pode ser reaberto via `handleReopenChat`. Confirmar que o fluxo de reopen usa o `attendant_id` original da sala (ja implementado, precisa apenas verificar).

A Edge Function `process-chat-auto-rules` no passo `inactivity_warning` ja muda para `waiting` -- ajustar para mudar para `closed` com `resolution_status: "pending"` em vez de `waiting`, para que saia da fila ativa e va para pendentes conforme solicitado.

---

## 3. CSAT apenas para chats resolvidos (nao pendentes/arquivados)

**Arquivo**: `src/pages/ChatWidget.tsx` (linha ~448)

Atualmente, quando a sala muda para `closed`, o widget sempre vai para `phase = "csat"`. Alterar para verificar o `resolution_status`:
- Se `resolution_status === "resolved"` -> mostrar CSAT
- Se `resolution_status === "pending"` ou `"archived"` -> pular direto para historico ou `closed`

Isso requer buscar o `resolution_status` no payload do Realtime (ja disponivel pois a tabela usa `REPLICA IDENTITY FULL`).

---

## 4. Checks de entregue e visualizado no Widget

**Arquivo**: `src/pages/ChatWidget.tsx`

Adicionar indicadores visuais junto ao timestamp das mensagens do visitante:
- Um check unico (&#10003;) = entregue (mensagem inserida no banco com sucesso)
- Duplo check (&#10003;&#10003;) = visualizado pelo atendente

**Implementacao**:
- Entregue: marcar quando a mensagem otimista e substituida pela real (confirmacao do Realtime INSERT)
- Visualizado: usar um campo `read_at` na tabela `chat_messages` ou um campo `last_read_at` na sala. Quando o atendente abre/visualiza a conversa, gravar o timestamp. No widget, comparar `msg.created_at` com `last_read_at` da sala para determinar se mostra check duplo.

**Migracao de banco**: Adicionar coluna `attendant_last_read_at` em `chat_rooms` para rastrear ate onde o atendente leu.

**Arquivo**: `src/pages/AdminWorkspace.tsx` - Ao selecionar uma sala, atualizar `attendant_last_read_at` com o timestamp atual.

---

## 5. Macros com navegacao fluida por teclado

**Arquivo**: `src/components/chat/ChatInput.tsx`

Problemas atuais:
- O componente `Command` do cmdk ja suporta navegacao por setas e Enter, porem o macro popup e controlado manualmente e pode nao receber foco corretamente
- O filtro por `/` nao filtra pelo conteudo digitado apos a barra

Melhorias:
- Quando `macrosOpen = true`, capturar as teclas no textarea: setas (up/down) e Enter delegam para o Command
- Filtrar macros pelo texto apos `/` (ex: `/ola` filtra macros com "ola" no titulo ou shortcut)
- Enter seleciona a macro destacada e insere o conteudo no textarea
- Escape fecha o popup de macros
- Remover o `CommandInput` separado (o textarea ja serve como input de busca)

---

## 6. CloseRoomDialog: nota apenas para Resolvido

**Arquivo**: `src/components/chat/CloseRoomDialog.tsx`

Reestruturar o dialog para ter 3 botoes claros:
- **Resolvido**: abre campo de nota + tags (como hoje)
- **Com Pendencia**: fecha imediatamente sem pedir nota
- **Arquivar**: fecha imediatamente sem pedir nota

A nota e o seletor de tags so aparecem se o usuario escolher "Resolvido" primeiro. "Pendencia" e "Arquivar" executam a acao diretamente.

Atualizar a interface `onConfirm` para aceitar `"resolved" | "pending" | "archived"`.

---

## Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/ChatWidget.tsx` | Estilo amarelo para msgs sistema; CSAT condicional por resolution_status; checks entregue/visualizado; subscrever attendant_last_read_at |
| `src/components/chat/CloseRoomDialog.tsx` | 3 botoes; nota apenas para resolvido; adicionar opcao "Arquivar" |
| `src/components/chat/ChatInput.tsx` | Macros: filtro por texto pos-barra, navegacao por setas/Enter, foco automatico |
| `src/pages/AdminWorkspace.tsx` | Atualizar `attendant_last_read_at` ao abrir sala; ajustar handleConfirmClose para 3 status |
| `supabase/functions/process-chat-auto-rules/index.ts` | Passo inactivity_warning fecha como pending (nao waiting) |
| `src/components/chat/ChatMessageList.tsx` | Estilo amarelo claro para msgs de sistema no admin |
| Migration SQL | Adicionar `attendant_last_read_at timestamptz` em `chat_rooms` |

