
# Subscription Realtime para Chats Proativos no Widget e Portal

## Problema
O chat proativo criado pelo atendente no Workspace nao aparece automaticamente no widget embedado. So aparece no portal externo quando o usuario navega entre telas.

## Solucao
Adicionar um `useEffect` com subscription Realtime em ambos os arquivos para escutar `INSERT` em `chat_rooms`.

---

## Alteracoes

### 1. ChatWidget.tsx

Novo `useEffect` (apos a subscription de room status, antes do scroll effect):

- Escuta `INSERT` em `chat_rooms` filtrado por `visitor_id=eq.{visitorId}`
- So ativa quando `visitorId` esta definido
- Quando recebe novo room e o widget nao esta em conversa ativa (`phase !== "chat"`, `"waiting"`, `"csat"`):
  - Define `roomId`, limpa mensagens, entra na fase correspondente (`chat` ou `waiting`)
- Se esta na tela de historico, atualiza a lista via `fetchHistory`

### 2. UserPortal.tsx

Novo `useEffect` (apos o fetch inicial, antes do `activeRoom`):

- Escuta `INSERT` em `chat_rooms` filtrado por `company_contact_id=eq.{contact.id}` (ou `visitor_id` se disponivel)
- Quando recebe novo room:
  - Atualiza lista de rooms via `fetchRooms`
  - Se nao esta em chat ativo (`!activeRoomId`), entra automaticamente no novo chat proativo

### Impacto em performance
Zero impacto relevante -- reutiliza a conexao WebSocket existente com filtro server-side.
