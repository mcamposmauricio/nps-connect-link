
# Plano: Filtros por Empresa/Contato + Identificacao do Atendente no Widget + Side Panel com Historico de Chats

## 1. Filtros por Empresa e Contato nos Dashboards e Relatorios

**Problema**: Os dashboards de chat (AdminDashboard, AdminDashboardGerencial, AdminCSATReport) e o dashboard NPS nao possuem filtros por empresa ou contato especifico.

**Solucao**: Adicionar filtros de Empresa (`contactId`) e Contato (`companyContactId`) nos seguintes locais:

### 1.1 Hook `useDashboardStats.ts`
- Adicionar `contactId?: string | null` e `companyContactId?: string | null` ao tipo `DashboardFilters`
- Na query de rooms, se `contactId` estiver preenchido, filtrar `contact_id = contactId`
- Se `companyContactId` estiver preenchido, buscar rooms que tenham `company_contact_id = companyContactId`

### 1.2 Hook `useCSATReport.ts`
- Adicionar `contactId?: string | null` e `companyContactId?: string | null` ao tipo `CSATReportFilters`
- Aplicar os mesmos filtros nas queries de stats e paginacao

### 1.3 Paginas de Dashboard de Chat (`AdminDashboard.tsx`, `AdminDashboardGerencial.tsx`)
- Buscar lista de empresas (`contacts` com `is_company: true`) e contatos (`company_contacts`) para popular os selects
- Adicionar dois `<Select>` na `FilterBar`: "Empresa" e "Contato"
- Passar os valores selecionados para o hook `useDashboardStats`

### 1.4 Pagina CSAT Report (`AdminCSATReport.tsx`)
- Mesma logica: adicionar selects de Empresa e Contato na FilterBar
- Passar para `useCSATReport`

### 1.5 Dashboard NPS (`Dashboard.tsx`)
- Adicionar filtro por empresa no modo "Por Campanha" (select de empresa que filtra os responses por `contact_id`)

**Arquivos modificados**: `useDashboardStats.ts`, `useCSATReport.ts`, `AdminDashboard.tsx`, `AdminDashboardGerencial.tsx`, `AdminCSATReport.tsx`, `Dashboard.tsx`

---

## 2. Identificacao do Atendente no Widget

**Problema**: Quando o chat e atribuido a um atendente, o cliente nao ve quem esta atendendo no topo do widget.

**Solucao**: Quando o status da room mudar para `active` (via realtime), buscar o `attendant_id` da room e depois o `display_name` do atendente na tabela `attendant_profiles`. Exibir esse nome no header do widget.

### Mudancas em `src/pages/ChatWidget.tsx`
- Adicionar estado `attendantName: string | null`
- No `useEffect` que escuta `UPDATE` na `chat_rooms` (linha ~380), quando `room.status === 'active'`, buscar o nome do atendente:
  ```
  const { data: att } = await supabase
    .from("attendant_profiles")
    .select("display_name")
    .eq("id", room.attendant_id)
    .maybeSingle();
  setAttendantName(att?.display_name ?? null);
  ```
- No header do widget (linha ~914-918), quando `phase === "chat"` e `attendantName` existir, exibir:
  ```
  <p className="text-xs opacity-80">{attendantName}</p>
  ```
  em vez de "Chat ativo"

**Arquivo modificado**: `src/pages/ChatWidget.tsx`

---

## 3. Side Panel com Historico de Chats no Workspace

**Problema**: O `VisitorInfoPanel` nao mostra os ultimos chats do visitante/contato. O atendente nao tem contexto do historico de conversas anteriores.

**Solucao**: Adicionar uma secao "Ultimos Chats" na aba "Contato" do `VisitorInfoPanel`.

### Mudancas em `src/components/chat/VisitorInfoPanel.tsx`
- Adicionar estado `recentChats` com tipo `{ id: string; status: string; created_at: string; closed_at: string | null; csat_score: number | null; attendant_name: string | null; tags: { name: string; color: string | null }[] }[]`
- No `fetchData`, buscar os ultimos 5 chats do `company_contact_id` (ou `contact_id` se nao houver):
  ```sql
  chat_rooms WHERE company_contact_id = ccId OR contact_id = cId
  ORDER BY created_at DESC LIMIT 5
  ```
- Para cada room, buscar tags via `chat_room_tags` e nome do atendente via `attendant_profiles`
- Adicionar estado `chatPage` para paginacao (carregar mais 5 a cada clique)
- Na aba "Contato", apos as metricas de chat, exibir a lista com:
  - Data, status (badge colorido), CSAT score (se houver), tags (badges pequenos), nome do atendente
  - Ao clicar em um chat, abrir o `ReadOnlyChatDialog` ja existente no sistema
- Botao "Carregar mais" que busca os proximos 5

### Integracao com ReadOnlyChatDialog
- Importar `ReadOnlyChatDialog` no `VisitorInfoPanel`
- Ao clicar em um chat da lista, abrir o dialog com `roomId` e `visitorName`

**Arquivo modificado**: `src/components/chat/VisitorInfoPanel.tsx`

---

## Resumo de Mudancas

| Arquivo | Tipo | Mudanca |
|---------|------|---------|
| `src/hooks/useDashboardStats.ts` | Modificado | Adicionar filtros contactId e companyContactId |
| `src/hooks/useCSATReport.ts` | Modificado | Adicionar filtros contactId e companyContactId |
| `src/pages/AdminDashboard.tsx` | Modificado | Adicionar selects de Empresa e Contato na FilterBar |
| `src/pages/AdminDashboardGerencial.tsx` | Modificado | Adicionar selects de Empresa e Contato na FilterBar |
| `src/pages/AdminCSATReport.tsx` | Modificado | Adicionar selects de Empresa e Contato na FilterBar |
| `src/pages/Dashboard.tsx` | Modificado | Adicionar filtro por empresa |
| `src/pages/ChatWidget.tsx` | Modificado | Exibir nome do atendente no header |
| `src/components/chat/VisitorInfoPanel.tsx` | Modificado | Secao de ultimos chats com tags, status e dialog |

Nenhuma alteracao no banco de dados.
