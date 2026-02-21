
# Plano: Tags em Chats - Adicao durante atendimento e fechamento

## Resumo

Implementar gestao completa de tags nos chats: permitir adicionar/remover tags durante o atendimento (no painel lateral), opcionalmente no dialog de fechamento, criar novas tags inline, e filtrar por tags em historico e relatorio gerencial.

## Componentes a Criar

### 1. Componente `ChatTagSelector` (novo)

**Arquivo:** `src/components/chat/ChatTagSelector.tsx`

Componente reutilizavel que:
- Carrega todas as tags existentes (`chat_tags`) do tenant
- Carrega as tags ja atribuidas ao room (`chat_room_tags`)
- Exibe badges clicaveis para adicionar/remover tags
- Tem um input para criar nova tag inline (nome + cor aleatoria)
- Ao criar nova tag, insere em `chat_tags` e ja associa ao room em `chat_room_tags`
- Ao clicar em tag existente, faz toggle (insert/delete em `chat_room_tags`)

Props:
```text
roomId: string
compact?: boolean  (para uso no CloseRoomDialog)
```

## Arquivos a Modificar

### 2. VisitorInfoPanel - Adicionar aba/secao de Tags

**Arquivo:** `src/components/chat/VisitorInfoPanel.tsx`

- Receber `roomId` (ja recebe)
- Adicionar uma secao de Tags abaixo do header do contato ou dentro da tab "Contato"
- Renderizar `<ChatTagSelector roomId={roomId} />`

### 3. CloseRoomDialog - Tags opcionais no fechamento

**Arquivo:** `src/components/chat/CloseRoomDialog.tsx`

- Receber `roomId` como nova prop
- Abaixo da textarea de observacao, renderizar `<ChatTagSelector roomId={roomId} compact />`
- As tags selecionadas/adicionadas ficam salvas em tempo real (nao precisa de submit especial, o componente ja persiste)

### 4. AdminWorkspace - Passar roomId ao CloseRoomDialog

**Arquivo:** `src/pages/AdminWorkspace.tsx`

- Passar `roomId={closingRoomId}` para o `CloseRoomDialog`

### 5. AdminChatHistory - Filtro de tags

**Arquivo:** `src/pages/AdminChatHistory.tsx`

- Carregar lista de `chat_tags` do tenant
- Adicionar um Select de filtro por tag (similar aos outros filtros existentes)
- Passar `tagId` para o hook `useChatHistory` (que ja suporta `tagId` no filter!)

### 6. AdminDashboardGerencial - Filtro de tags

**Arquivo:** `src/pages/AdminDashboardGerencial.tsx`

- Carregar lista de `chat_tags`
- Adicionar Select de filtro por tag
- Passar `tagId` para `DashboardFilters` e `useDashboardStats`

### 7. useDashboardStats - Suportar filtro por tagId

**Arquivo:** `src/hooks/useDashboardStats.ts`

- Adicionar `tagId` ao `DashboardFilters`
- Quando `tagId` estiver presente, buscar room_ids de `chat_room_tags` e filtrar os rooms por esses ids

## Fluxo de Dados

```text
chat_tags (tabela de definicao)
  |-- id, name, color, tenant_id, user_id
  
chat_room_tags (tabela de associacao - ja existe)
  |-- room_id, tag_id

ChatTagSelector:
  1. SELECT * FROM chat_tags WHERE tenant_id = ...
  2. SELECT * FROM chat_room_tags WHERE room_id = ...
  3. Toggle: INSERT/DELETE em chat_room_tags
  4. Nova tag: INSERT em chat_tags + INSERT em chat_room_tags
```

## Nenhuma migracao necessaria

As tabelas `chat_tags` e `chat_room_tags` ja existem com RLS configurada corretamente. Nao e necessario criar nada no banco.

## Resumo de Alteracoes

| Arquivo | Mudanca |
|---|---|
| `src/components/chat/ChatTagSelector.tsx` | Novo componente de selecao/criacao de tags |
| `src/components/chat/VisitorInfoPanel.tsx` | Adicionar secao de tags usando ChatTagSelector |
| `src/components/chat/CloseRoomDialog.tsx` | Receber roomId, exibir ChatTagSelector opcional |
| `src/pages/AdminWorkspace.tsx` | Passar roomId ao CloseRoomDialog |
| `src/pages/AdminChatHistory.tsx` | Adicionar filtro Select de tags |
| `src/pages/AdminDashboardGerencial.tsx` | Adicionar filtro Select de tags |
| `src/hooks/useDashboardStats.ts` | Suportar tagId no filtro |
