
# Correção do Colapso da Sidebar + Submenu Workspace

## Problema 1 — Sidebar não colapsa ao clicar no SidebarTrigger

### Causa Raiz Real

Em `src/components/SidebarLayout.tsx`, o `SidebarProvider` recebe `onOpenChange` mas **não recebe a prop `open`**:

```tsx
<SidebarProvider
  defaultOpen={sidebarDefaultOpen}
  onOpenChange={(open) => localStorage.setItem("sidebar-open", String(open))}
>
```

Isso cria um bug de estado semi-controlado. No `sidebar.tsx` (linhas 56–71), a lógica do `setOpen` é:

```tsx
const [_open, _setOpen] = useState(defaultOpen);
const open = openProp ?? _open;  // openProp é undefined → usa _open

const setOpen = useCallback((value) => {
  const openState = ...
  if (setOpenProp) {
    setOpenProp(openState); // ← só chama o localStorage.setItem
    // _setOpen NUNCA é chamado porque setOpenProp existe
  } else {
    _setOpen(openState);
  }
}, [setOpenProp, open]);
```

Quando `onOpenChange` é fornecido (mesmo que seja apenas para salvar no localStorage), o Shadcn interpreta o `SidebarProvider` como **modo controlado externamente**. Isso faz com que o `setOpen` interno chame apenas `setOpenProp` (o handler do localStorage) e **nunca chame `_setOpen`**. Resultado: o estado `_open` fica travado no valor inicial (`defaultOpen`) e a sidebar nunca recolhe visualmente.

### Solução

Tornar o `SidebarProvider` **completamente não-controlado** — remover o `onOpenChange` e persistir o estado no localStorage via o cookie que o próprio Shadcn já gerencia (linha 68 do `sidebar.tsx`):

```tsx
// O Shadcn já grava o cookie "sidebar:state" automaticamente em setOpen
document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
```

Entretanto, o projeto usa `localStorage` (não cookie) para persistência. A solução correta é **manter o `onOpenChange` mas também passar `open` como prop controlada**, tornando o provider corretamente controlado:

```tsx
// SidebarLayout.tsx — SOLUÇÃO CORRETA
const [sidebarOpen, setSidebarOpen] = useState(
  () => localStorage.getItem("sidebar-open") !== "false"
);

<SidebarProvider
  open={sidebarOpen}
  onOpenChange={(open) => {
    setSidebarOpen(open);
    localStorage.setItem("sidebar-open", String(open));
  }}
>
```

Assim o ciclo fica correto: `SidebarTrigger` → `toggleSidebar()` → `setOpen(false)` → chama `setOpenProp(false)` → atualiza o state React + localStorage → re-render → sidebar colapsa.

---

## Problema 2 — Submenu "Atendentes" abre/fecha ao clicar em outros itens

### Causa Raiz

O `CollapsibleContent` do workspace (linha 368 de `AppSidebar.tsx`) contém os `SidebarMenuButton` dos atendentes, mas os cliques nesses botões podem subir via bubbling até o `CollapsibleTrigger` do bloco de Chat (linha 301-312), que usa `SidebarGroupLabel` como trigger. Quando o evento chega ao label do Chat, o `chatOpen` é toggleado, fazendo o bloco inteiro recolher e reabrir.

O `div onClick={e.stopPropagation()}` na linha 334 só bloqueia o bubble do `SidebarMenuButton` do workspace em si — mas **não** bloqueia os cliques nos itens filhos dentro do `CollapsibleContent` (linha 368).

### Solução

Adicionar `onClick={(e) => e.stopPropagation()}` diretamente no `<CollapsibleContent>` do workspace (linha 368), bloqueando qualquer evento originado dentro da lista de atendentes de chegar ao trigger do Chat:

```tsx
// ANTES (linha 368)
<CollapsibleContent>

// DEPOIS
<CollapsibleContent onClick={(e) => e.stopPropagation()}>
```

---

## Arquivos a Modificar

| Arquivo | Linha | Mudança |
|---|---|---|
| `src/components/SidebarLayout.tsx` | 33–51 | Transformar em componente com state `sidebarOpen` + passar `open` e `onOpenChange` ao `SidebarProvider` |
| `src/components/AppSidebar.tsx` | 368 | Adicionar `onClick={(e) => e.stopPropagation()}` no `<CollapsibleContent>` do workspace |

## O que NÃO é alterado

- Lógica de autenticação e redirecionamento do `SidebarLayout`
- Estado dos submenus (npsOpen, chatOpen, reportsOpen, workspaceOpen) e persistência
- Qualquer outro componente, página ou arquivo
- Backend, rotas, design system
