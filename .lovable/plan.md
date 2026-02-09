

# Permissionamento: Chat History + Settings

## Problema 1: Chat History visivel apenas para managers

Atualmente, o link "Historico" no menu lateral esta dentro de um bloco `hasPermission('chat', 'manage')` (linha 276 do AppSidebar.tsx), junto com Atendentes, Gerencial e Configuracoes do Chat. Isso impede atendentes comuns (que tem apenas permissao `chat` + `view`) de acessar o historico.

**Solucao:** Mover o item "Historico" para FORA do bloco `manage`, mantendo-o dentro do bloco `chat view` que ja existe na linha 233. Assim, qualquer usuario com permissao de visualizacao do modulo Chat podera ver o historico de atendimentos.

**Itens que permanecem restritos a `chat` + `manage`:**
- Atendentes
- Dashboard Gerencial
- Configuracoes do Chat

**Itens visiveis com `chat` + `view`:**
- Dashboard (ja esta)
- Workspace (ja esta)
- Historico (sera movido)

---

## Problema 2: Settings acessivel por todos

O botao "Configuracoes" no rodape da sidebar (linha 335) nao tem nenhuma verificacao de permissao. Qualquer usuario autenticado pode acessar todas as configuracoes.

**Solucao:** Adicionar verificacao de permissao `hasPermission('settings', 'view')` para:

1. **Sidebar (AppSidebar.tsx):** Condicionar a exibicao do botao "Configuracoes" no footer a `hasPermission('settings', 'view')`.

2. **Pagina Settings (Settings.tsx):** Condicionar a exibicao de cada aba sensivel a permissoes:
   - Marca, E-mail, Notificacoes: visiveis com `settings` + `view`
   - API Keys: visivel com `settings` + `manage` (dado sensivel)
   - Equipe: visivel apenas para `isAdmin` (ja esta)
   - Organizacao: visivel apenas para `isAdmin` (ja esta)

---

## Arquivos Modificados

### 1. `src/components/AppSidebar.tsx`
- Mover o item "Historico" (`/admin/history`) para fora do bloco `hasPermission('chat', 'manage')`, colocando-o logo apos o item "Workspace" no bloco geral do Chat
- Envolver o botao "Configuracoes" no footer com `hasPermission('settings', 'view')`

### 2. `src/pages/Settings.tsx`
- Importar `hasPermission` do `useAuth`
- Condicionar a aba "API Keys" a `hasPermission('settings', 'manage')` ou `isAdmin`
- Ajustar contagem dinamica de tabs

---

## Detalhes Tecnicos

### AppSidebar.tsx -- Reorganizacao do menu Chat

**Antes (estrutura atual):**
```text
Chat (chat view)
  +-- Dashboard
  +-- Workspace
  +-- [chat manage only]
      +-- Atendentes
      +-- Gerencial
      +-- Historico    <-- PROBLEMA
      +-- Config Chat
```

**Depois (nova estrutura):**
```text
Chat (chat view)
  +-- Dashboard
  +-- Workspace
  +-- Historico        <-- MOVIDO para aqui
  +-- [chat manage only]
      +-- Atendentes
      +-- Gerencial
      +-- Config Chat
```

### AppSidebar.tsx -- Footer Settings

**Antes:**
```typescript
<SidebarMenuButton onClick={() => navigate("/nps/settings")} ...>
  <Settings /> {!collapsed && <span>{t("nav.config")}</span>}
</SidebarMenuButton>
```

**Depois:**
```typescript
{hasPermission('settings', 'view') && (
  <SidebarMenuButton onClick={() => navigate("/nps/settings")} ...>
    <Settings /> {!collapsed && <span>{t("nav.config")}</span>}
  </SidebarMenuButton>
)}
```

### Settings.tsx -- Permissionamento por aba

**Logica de visibilidade das abas:**
- Brand, Email, Notificacoes: sempre visiveis (ja filtrado pelo acesso a pagina)
- API Keys: `isAdmin || hasPermission('settings', 'manage')`
- Equipe: `isAdmin` (sem mudanca)
- Organizacao: `isAdmin` (sem mudanca)

### Arquivos NAO modificados
- `AdminChatHistory.tsx` -- nenhuma mudanca necessaria, a pagina em si ja funciona via RLS
- `UserPermissionsDialog.tsx` -- o modulo `settings` ja existe no array MODULES
- `useAuth.ts` -- `hasPermission` ja cobre o modulo `settings`
- Rotas em `App.tsx` -- nao alteramos rotas, apenas visibilidade no menu

