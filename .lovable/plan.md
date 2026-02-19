
# Fix: Workspace Menu State Persistido no localStorage

## Causa Raiz

O `AppSidebar` é instanciado dentro de `SidebarLayout`, que é renderizado por cada página individualmente (ex: `AdminDashboard`, `AdminChatHistory`). Ao navegar entre rotas, o componente antigo **desmonta** e o novo **remonta** — zerando todos os `useState` locais para seus valores iniciais.

Por isso `workspaceOpen` (e também `chatOpen`, `npsOpen`, `reportsOpen`) começam sempre como `true`, causando o flash visual de "colapsa e expande".

## Solução

Substituir os `useState` simples por uma função de inicialização que lê do `localStorage`, e persistir cada mudança no `localStorage`. Assim, ao remontar, o componente recupera o último estado do usuário.

### Padrão a aplicar (para cada submenu):

```tsx
// ANTES
const [workspaceOpen, setWorkspaceOpen] = useState(true);

// DEPOIS
const [workspaceOpen, setWorkspaceOpen] = useState(
  () => localStorage.getItem("sidebar-workspace-open") !== "false"
);

const handleWorkspaceOpen = (open: boolean) => {
  setWorkspaceOpen(open);
  localStorage.setItem("sidebar-workspace-open", String(open));
};
```

O padrão `!== "false"` garante que o default seja `true` quando não há valor salvo (primeira vez), e respeita o estado salvo nas visitas seguintes.

## Mudanças no `src/components/AppSidebar.tsx`

### 1. Inicialização dos 4 estados com leitura do localStorage

```tsx
// ANTES
const [npsOpen, setNpsOpen] = useState(true);
const [chatOpen, setChatOpen] = useState(true);
const [reportsOpen, setReportsOpen] = useState(true);
const [workspaceOpen, setWorkspaceOpen] = useState(true);

// DEPOIS
const [npsOpen, setNpsOpen] = useState(
  () => localStorage.getItem("sidebar-nps-open") !== "false"
);
const [chatOpen, setChatOpen] = useState(
  () => localStorage.getItem("sidebar-chat-open") !== "false"
);
const [reportsOpen, setReportsOpen] = useState(
  () => localStorage.getItem("sidebar-reports-open") !== "false"
);
const [workspaceOpen, setWorkspaceOpen] = useState(
  () => localStorage.getItem("sidebar-workspace-open") !== "false"
);
```

### 2. Handlers que persistem a mudança

Criar 4 handlers nomeados que salvam no localStorage ao mudar:

```tsx
const handleNpsOpen = (open: boolean) => {
  setNpsOpen(open);
  localStorage.setItem("sidebar-nps-open", String(open));
};
const handleChatOpen = (open: boolean) => {
  setChatOpen(open);
  localStorage.setItem("sidebar-chat-open", String(open));
};
const handleReportsOpen = (open: boolean) => {
  setReportsOpen(open);
  localStorage.setItem("sidebar-reports-open", String(open));
};
const handleWorkspaceOpen = (open: boolean) => {
  setWorkspaceOpen(open);
  localStorage.setItem("sidebar-workspace-open", String(open));
};
```

### 3. Substituir `onOpenChange` nos Collapsible

- `<Collapsible open={npsOpen} onOpenChange={setNpsOpen}>` → `onOpenChange={handleNpsOpen}`
- `<Collapsible open={chatOpen} onOpenChange={setChatOpen}>` → `onOpenChange={handleChatOpen}`
- `<Collapsible open={workspaceOpen} onOpenChange={setWorkspaceOpen}>` → `onOpenChange={handleWorkspaceOpen}`
- Se `reportsOpen` também usar Collapsible → `onOpenChange={handleReportsOpen}`

## Arquivo a Modificar

| Arquivo | Mudança |
|---|---|
| `src/components/AppSidebar.tsx` | Inicializar os 4 estados via `localStorage`, criar 4 handlers que persistem, substituir `onOpenChange` |

## O que NÃO será alterado

- Lógica de negócio, hooks, queries
- Estrutura de rotas e permissões
- Design visual da sidebar
- Backend e edge functions
- Outros estados locais do componente
