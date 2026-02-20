

# Plano: Layout Persistente para Eliminar Recarregamentos

## Problema Atual

Cada uma das 21 paginas do sistema faz isto:

```
return <SidebarLayout> ... conteudo ... </SidebarLayout>
```

Quando voce navega de uma pagina para outra, o React **desmonta** o SidebarLayout inteiro e **remonta** um novo. Isso causa:

1. O logo pulsante (loading) aparece brevemente a cada navegacao
2. O SidebarDataProvider e destruido e recriado -- fazendo novas queries ao banco e recriando canais Realtime
3. O estado da sidebar (aberta/fechada, submenus expandidos) precisa ser relido do localStorage
4. Hooks de dados das paginas (useChatRooms, useDashboardStats) refazem todas as queries do zero

## Solucao: Layout Route com Outlet

Usar o padrao de Layout Route do React Router v6. O `SidebarLayout` vira um componente de rota pai que renderiza `<Outlet />` no lugar de `{children}`. As paginas ficam como rotas filhas.

```text
ANTES (cada pagina monta/desmonta o layout):

  /admin/workspace  -->  [SidebarLayout [SidebarDataProvider [AppSidebar + Workspace]]]
  /admin/dashboard  -->  [SidebarLayout [SidebarDataProvider [AppSidebar + Dashboard]]]
  (navegar = destruir tudo e recriar)

DEPOIS (layout persiste, so o conteudo muda):

  SidebarLayout (permanente)
    |-- SidebarDataProvider (permanente)
    |-- AppSidebar (permanente)
    |-- <Outlet />  <-- so este troca
          |-- /admin/workspace  -->  [Workspace]
          |-- /admin/dashboard  -->  [Dashboard]
```

## Etapas de Implementacao

### 1. Converter SidebarLayout para usar Outlet

**Arquivo:** `src/components/SidebarLayout.tsx`

- Remover a prop `children`
- Importar `Outlet` de `react-router-dom`
- Substituir `{children}` por `<Outlet />`
- Manter toda a logica de auth redirect e loading

### 2. Reestruturar rotas no App.tsx

**Arquivo:** `src/App.tsx`

Agrupar todas as rotas protegidas (que usam sidebar) como filhas de uma rota pai com `element={<SidebarLayout />}`:

```text
<Route element={<SidebarLayout />}>
  {/* Chat */}
  <Route path="/admin/dashboard" element={<AdminDashboard />} />
  <Route path="/admin/workspace" element={<AdminWorkspace />} />
  <Route path="/admin/workspace/:roomId" element={<AdminWorkspace />} />
  <Route path="/admin/attendants" element={<AdminAttendants />} />
  <Route path="/admin/settings" element={<AdminSettings />} />
  <Route path="/admin/settings/:tab" element={<AdminSettings />} />
  <Route path="/admin/gerencial" element={<AdminDashboardGerencial />} />
  <Route path="/admin/history" element={<AdminChatHistory />} />
  <Route path="/admin/banners" element={<AdminBanners />} />

  {/* NPS */}
  <Route path="/nps/dashboard" element={<Dashboard />} />
  <Route path="/nps/contacts" element={<Contacts />} />
  <Route path="/nps/people" element={<People />} />
  <Route path="/nps/campaigns" element={<Campaigns />} />
  <Route path="/nps/campaigns/:id" element={<CampaignDetails />} />
  <Route path="/nps/settings" element={<Settings />} />
  <Route path="/nps/nps-settings" element={<NPSSettings />} />

  {/* CS */}
  <Route path="/cs-dashboard" element={<CSDashboard />} />
  <Route path="/cs-trails" element={<CSTrailsPage />} />
  <Route path="/cs-health" element={<CSHealthPage />} />
  <Route path="/cs-churn" element={<CSChurnPage />} />
  <Route path="/cs-financial" element={<CSFinancialPage />} />

  {/* Profile */}
  <Route path="/profile" element={<MyProfile />} />
</Route>
```

Rotas publicas (auth, widget, landing, embed, portal, nps response) permanecem fora.

### 3. Remover SidebarLayout de cada pagina (21 arquivos)

**Arquivos afetados:**

| Pagina | Mudanca |
|---|---|
| `AdminDashboard.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `AdminWorkspace.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `AdminAttendants.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `AdminSettings.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `AdminDashboardGerencial.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `AdminChatHistory.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `AdminBanners.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `Dashboard.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `Contacts.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `People.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `Campaigns.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `CampaignDetails.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `Settings.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `NPSSettings.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `CSDashboard.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `CSTrailsPage.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `CSHealthPage.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `CSChurnPage.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `CSFinancialPage.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `MyProfile.tsx` | Remover import e wrapper `<SidebarLayout>` |
| `CSMsPage.tsx` | Remover import e wrapper `<SidebarLayout>` |

Em cada arquivo a mudanca e mecanica e identica:
- Deletar `import SidebarLayout from "@/components/SidebarLayout";`
- No return, substituir `<SidebarLayout>..conteudo..</SidebarLayout>` por apenas `..conteudo..` (envolto em um fragment se necessario)

### 4. Remover Results.tsx se nao esta em uso

O arquivo `Results.tsx` importa SidebarLayout mas nao aparece nas rotas. Verificar se pode ser removido.

## Ganhos Esperados

| Aspecto | Antes | Depois |
|---|---|---|
| Loading spinner ao navegar | Aparece toda vez | Nunca mais (layout ja montado) |
| Canais Realtime | Destruidos e recriados a cada clique | Criados uma vez, vivem a sessao inteira |
| Queries de inicializacao (SidebarDataProvider) | Re-executadas a cada navegacao | Executadas uma unica vez |
| Estado da sidebar | Relido do localStorage | Mantido em memoria |
| Auth check (useAuth redirect) | Re-executado a cada pagina | Executado uma unica vez |

## Riscos e Mitigacoes

- **Risco:** Paginas que dependem de remontagem para resetar estado interno. **Mitigacao:** Hooks com `useEffect` que dependem de parametros de rota (como `roomId`) continuam funcionando normalmente pois os params mudam e disparam o effect.
- **Risco:** AdminSettings usa SidebarLayout duas vezes (loading state e conteudo). **Mitigacao:** O loading state interno da pagina usa um spinner proprio, nao o SidebarLayout.

Nenhuma migracao de banco necessaria. Nenhuma mudanca visual -- apenas eliminacao de recarregamentos desnecessarios.

