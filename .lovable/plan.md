
# Plano: Dashboard com Filtros, Workspace Melhorado, e Reorganizacao de Settings

## 1. Dashboard de Atendimento com Filtros e Status em Tempo Real

### 1.1 Filtros no Dashboard (`AdminDashboard.tsx`)

O dashboard atual e estatico -- mostra apenas 4 metricas sem filtros. Sera transformado em uma visao operacional completa:

**Filtros adicionados:**
- Periodo: Hoje, 7 dias, 30 dias, Todos
- Atendente: dropdown com lista de atendentes
- Status: Ativo, Na Fila, Encerrado
- Prioridade: Normal, Alta, Urgente

Os filtros reutilizarao o hook `useDashboardStats` que ja suporta `period` e `attendantId`, e sera estendido para suportar `status` e `priority`.

**Metricas exibidas (filtradas):**
- Conversas Ativas
- Na Fila
- CSAT Medio
- Atendentes Online
- Encerradas Hoje
- Taxa de Resolucao
- Tempo Medio de Resolucao

### 1.2 Sessao "Status em Tempo Real" (nova)

Abaixo das metricas, uma nova sessao mostra o status atual das filas de todos os atendentes:

```text
+------------------------------------------------------+
| STATUS EM TEMPO REAL                                  |
+------------------------------------------------------+
| Atendente     | Status   | Fila | Ativas | Capacidade|
|---------------|----------|------|--------|-----------|
| Joao (voce)   | Online   |  2   |   3    |   5       |
| Maria         | Online   |  1   |   4    |   5       |
| Pedro         | Offline  |  0   |   0    |   5       |
+------------------------------------------------------+
| Fila Geral (sem atendente)                           |
|   #abc123 - Visitante X - 5min atras   [Ver]        |
|   #def456 - Visitante Y - 2min atras   [Ver]        |
+------------------------------------------------------+
```

Ao clicar em uma conversa de outro atendente:
- Abre um **Dialog/Sheet** com as mensagens (modo somente leitura)
- Disponibiliza apenas o campo de **nota interna** (is_internal = true)
- O cliente NAO ve as notas internas

Ao clicar em uma conversa propria:
- Navega para o Workspace (`/admin/workspace/{roomId}`)

### 1.3 Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/AdminDashboard.tsx` | Reescrita completa com filtros, metricas expandidas e sessao de status em tempo real |
| `src/hooks/useDashboardStats.ts` | Adicionar filtros `status` e `priority` ao DashboardFilters |
| `src/hooks/useChatRealtime.ts` | Adicionar hook `useAttendantQueues()` para buscar filas por atendente em tempo real |
| `src/components/chat/ReadOnlyChatDialog.tsx` | **Novo** - Dialog para visualizar mensagens de outros atendentes + enviar notas internas |

---

## 2. Workspace Melhorado

### 2.1 Conversas com informacoes uteis (nao IDs)

A `ChatRoomList` atualmente mostra `#abc12345` como identificador. Sera atualizado para mostrar:
- **Nome do visitante** (buscado de `chat_visitors`)
- **Ultima mensagem** (preview truncado)
- **Tempo desde a ultima mensagem**
- Badge de status com cor

### 2.2 Filtrar conversas encerradas

O `useChatRooms` busca todas as rooms sem filtro de status. Sera atualizado para:
- No Workspace: filtrar `.in("status", ["active", "waiting"])` -- excluir `closed`
- Conversas encerradas ficam apenas no Historico (`/admin/history`)

### 2.3 Header do chat com nome do visitante

O header atualmente mostra `Sala #abc12345`. Sera atualizado para mostrar o nome do visitante (ja disponivel via `chat_visitors`).

### 2.4 Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useChatRealtime.ts` | Adicionar parametro `excludeClosed` ao `useChatRooms`, e buscar dados de visitor junto com rooms |
| `src/components/chat/ChatRoomList.tsx` | Mostrar nome do visitante, ultima mensagem, tempo relativo |
| `src/pages/AdminWorkspace.tsx` | Passar `excludeClosed=true`, header com nome do visitante |

---

## 3. Reorganizacao das Configuracoes NPS

### 3.1 Identificacao das tabs NPS-especificas

Na pagina Settings (`/nps/settings`) atual:
- **Brand** -- configura cores/logo do formulario NPS -> **NPS-especifico**
- **Email** -- configura provedor de email para envio NPS -> **NPS-especifico**
- **Notifications** -- configura notificacoes de respostas NPS -> **NPS-especifico**
- **API Keys** -- chaves de API gerais -> **Geral**
- **Team** -- gerenciamento de equipe -> **Geral**
- **Organization** -- dados da organizacao -> **Geral**

### 3.2 Nova estrutura

**Settings gerais (`/nps/settings`):**
- API Keys
- Team (admin only)
- Organization (admin only)

**Configuracoes NPS (novo menu no submenu NPS da sidebar):**
- Nova rota `/nps/nps-settings` com pagina `NPSSettings.tsx`
- Tabs: Marca, Email, Notificacoes
- Reutiliza os mesmos componentes `BrandSettingsTab`, `EmailSettingsTab`, `NotificationSettingsTab`

### 3.3 Sidebar atualizada

No submenu NPS (collapsible), adicionar item:
- Icone: Settings
- Label: "Configuracoes" (pt-BR) / "Settings" (en)
- Rota: `/nps/nps-settings`

### 3.4 Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/NPSSettings.tsx` | **Novo** - Pagina de configuracoes especificas do NPS (Brand, Email, Notifications) |
| `src/pages/Settings.tsx` | Remover tabs Brand, Email, Notifications -- manter apenas API Keys, Team, Organization |
| `src/components/AppSidebar.tsx` | Adicionar item "Configuracoes" ao submenu NPS |
| `src/App.tsx` | Adicionar rota `/nps/nps-settings` |
| `src/locales/pt-BR.ts` | Adicionar chaves para NPS settings |
| `src/locales/en.ts` | Adicionar chaves para NPS settings |

---

## 4. Resumo de Arquivos

### Arquivos novos (3)
1. `src/components/chat/ReadOnlyChatDialog.tsx`
2. `src/pages/NPSSettings.tsx`
3. (nenhum outro)

### Arquivos modificados (10)
1. `src/pages/AdminDashboard.tsx` -- reescrita com filtros + status tempo real
2. `src/hooks/useDashboardStats.ts` -- novos filtros
3. `src/hooks/useChatRealtime.ts` -- excludeClosed, visitor data, hook de filas
4. `src/components/chat/ChatRoomList.tsx` -- nome do visitante, ultima msg
5. `src/pages/AdminWorkspace.tsx` -- excludeClosed, header com nome
6. `src/pages/Settings.tsx` -- remover tabs NPS
7. `src/components/AppSidebar.tsx` -- adicionar item NPS settings
8. `src/App.tsx` -- nova rota
9. `src/locales/pt-BR.ts` -- novas chaves
10. `src/locales/en.ts` -- novas chaves

### Arquivos NAO modificados
- Modulo NPS (Dashboard, Campaigns, etc)
- Componentes de settings (BrandSettingsTab, EmailSettingsTab, NotificationSettingsTab) -- reutilizados sem mudanca
- AdminSettings (chat settings) -- sem mudanca
- Componentes UI base

---

## Secao Tecnica

### Hook `useAttendantQueues`

Novo hook em `useChatRealtime.ts` que busca em tempo real:
1. Todos os `attendant_profiles` com status e capacidade
2. Contagem de rooms ativas/waiting por `attendant_id`
3. Rooms sem atendente (fila geral)
4. Atualiza via Supabase Realtime (canal `chat_rooms`)

### ReadOnlyChatDialog

Componente que:
1. Recebe `roomId` e `visitorName`
2. Usa `useChatMessages(roomId)` para carregar mensagens
3. Renderiza `ChatMessageList` em modo leitura
4. Mostra um `ChatInput` modificado -- apenas modo interno (nota), sem toggle
5. Ao enviar, insere mensagem com `is_internal: true`

### ChatRoomList com dados de visitante

O `useChatRooms` sera atualizado para fazer um join com `chat_visitors`:
```sql
chat_rooms(*, chat_visitors!visitor_id(name, email))
```

Isso evita N+1 queries ao renderizar a lista. A interface `ChatRoom` ganha `visitor_name` e `visitor_email`.

Para a ultima mensagem, sera feito um fetch separado das ultimas mensagens por room (agrupado) ou adicionado ao query principal via subquery.
