
# Logo na Sidebar — Dobrar Tamanho e Centralizar

## Diagnóstico

No `AppSidebar.tsx` (linha 129–136), o logo está configurado assim:

```tsx
<SidebarHeader className="border-b border-white/[0.06] px-4 py-5">
  <Link to="/" className="flex items-center gap-3 min-w-0">
    {collapsed ? (
      <img src="/logo-icon-dark.svg" className="h-10 w-10 object-contain flex-shrink-0" />
    ) : (
      <img src="/logo-dark.svg" className="h-10 w-auto object-contain max-w-[140px]" />
    )}
  </Link>
</SidebarHeader>
```

Problemas identificados:
- `h-10` = 40px → precisa ir para `h-20` (80px) para dobrar
- `max-w-[140px]` está limitando o logo expandido — precisa aumentar para `max-w-[180px]`
- `flex items-center gap-3 min-w-0` alinha à esquerda — precisa de `justify-center` para centralizar
- `px-4` no header empurra o logo para o lado — remover ou reduzir para `px-2`
- `py-5` (20px) precisa aumentar para `py-6` ou `py-8` para dar mais respiro ao logo maior

## Mudanças Planejadas

### `src/components/AppSidebar.tsx` — apenas 3 linhas afetadas

**SidebarHeader** — remover padding lateral excessivo e aumentar vertical:
```tsx
// ANTES
<SidebarHeader className="border-b border-white/[0.06] px-4 py-5">
// DEPOIS
<SidebarHeader className="border-b border-white/[0.06] px-2 py-6">
```

**Link container** — adicionar `justify-center` para centralizar:
```tsx
// ANTES
<Link to="/" className="flex items-center gap-3 min-w-0">
// DEPOIS
<Link to="/" className="flex items-center justify-center gap-3 min-w-0 w-full">
```

**Logo expandido** — dobrar altura e aumentar max-width:
```tsx
// ANTES
<img src="/logo-dark.svg" className="h-10 w-auto object-contain max-w-[140px]" />
// DEPOIS
<img src="/logo-dark.svg" className="h-20 w-auto object-contain max-w-[200px]" />
```

**Ícone colapsado** — dobrar também:
```tsx
// ANTES
<img src="/logo-icon-dark.svg" className="h-10 w-10 object-contain flex-shrink-0" />
// DEPOIS
<img src="/logo-icon-dark.svg" className="h-20 w-20 object-contain flex-shrink-0" />
```

## Arquivo a Modificar

| Arquivo | Mudança |
|---|---|
| `src/components/AppSidebar.tsx` | `h-10` → `h-20`, `w-10` → `w-20`, `max-w-[140px]` → `max-w-[200px]`, adicionar `justify-center w-full`, ajustar padding do header |

## O que NÃO será alterado

- Lógica de estado dos submenus
- Estrutura de navegação e rotas
- Backend, hooks, contextos
- Design system
