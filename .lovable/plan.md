# Logo Maior na Sidebar + Melhoria de Contraste Visual

## Diagnóstico

### Problema 1 — Logo e Ícone pequenos na Sidebar

No `AppSidebar.tsx`, as imagens do logo estão com:

- **Logo expandido**: `h-16 w-auto` → 64px de altura (pequeno para ser marca âncora)
- **Ícone colapsado**: `h-8 w-8` → 32x32px (pequeno e sem área de respiro)

O `SidebarHeader` tem apenas `py-4` (16px cima/baixo) e o logo fica "espremido" dentro de um container pequeno.

Além disso, os SVGs enviados são raster embedados (PNG dentro de SVG) com resolução `1920x1080` para o logo completo e resolução similar para o ícone — ao exibir com apenas 32px, perdem fidelidade visual.

### Problema 2 — Contraste Visual da Interface

Com o sistema dark-first usando `#0F1115` de fundo, os textos e elementos de menor opacidade podem ficar com contraste insuficiente para leitura confortável:

- `text-muted-foreground` atualmente em `hsl(220 10% 65%)` — pode ser elevado para ~70%
- `groupLabelCls` com `text-muted-foreground/50` — labels de grupo quase invisíveis
- `border` em `hsl(220 14% 16%)` — bordas quase imperceptíveis
- Itens de menu com `text-foreground/70` nos estados hover

---

## Mudanças Planejadas

### 1. `src/components/AppSidebar.tsx` — Logo maior e mais destaque

**Logo expandido** (sidebar aberta):

```tsx
// ANTES
<img src="/logo-dark.svg" alt="Journey" className="h-8 w-auto object-contain" />

// DEPOIS
<img src="/logo-dark.svg" alt="Journey" className="h-10 w-auto object-contain max-w-[140px]" />
```

**Ícone colapsado** (sidebar recolhida):

```tsx
// ANTES
<img src="/logo-icon-dark.svg" alt="Journey" className="h-8 w-8 object-contain flex-shrink-0" />

// DEPOIS
<img src="/logo-icon-dark.svg" alt="Journey" className="h-10 w-10 object-contain flex-shrink-0" />
```

**SidebarHeader** — aumentar o padding para dar mais respiro ao logo:

```tsx
// ANTES
<SidebarHeader className="border-b border-white/[0.06] px-4 py-4">

// DEPOIS
<SidebarHeader className="border-b border-white/[0.06] px-4 py-5">
```

**Labels de grupo** — aumentar legibilidade:

```tsx
// ANTES
const groupLabelCls = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 py-1.5";

// DEPOIS
const groupLabelCls = "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-2 py-1.5";
```

### 2. `src/index.css` — Ajustes de contraste global

Elevar o `--muted-foreground` de `65%` para `68%` de lightness para textos secundários ficarem mais legíveis:

```css
/* ANTES */
--muted-foreground: 220 10% 65%;

/* DEPOIS */
--muted-foreground: 220 10% 68%;
```

Elevar ligeiramente o `--border` para ser mais visível:

```css
/* ANTES */
--border: 220 14% 16%;

/* DEPOIS */
--border: 220 14% 18%;
```

Mesmo ajuste em `.dark` (espelhado).

E também elevar o `--sidebar-border`:

```css
/* ANTES */
--sidebar-border: 220 14% 14%;

/* DEPOIS */
--sidebar-border: 220 14% 17%;
```

### 3. `src/components/SidebarLayout.tsx` — Topbar com separação visual mais clara

Atualizar a borda do header para ter um pouco mais de opacidade:

```tsx
// ANTES
<header className="h-14 border-b border-white/[0.06] flex items-center px-4 bg-sidebar">

// DEPOIS
<header className="h-14 border-b border-white/[0.08] flex items-center px-4 bg-sidebar">
```

---

## Arquivos a Modificar

| Arquivo                            | Mudança                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/AppSidebar.tsx`    | Logo de `h-8` para `h-10`, `max-w-[140px]`, ícone de `h-8 w-8` para `h-10 w-10`, padding do header, labels de grupo mais visíveis |
| `src/index.css`                    | `--muted-foreground` 65% → 68%, `--border` 16% → 18%, `--sidebar-border` 14% → 17%                                                |
| `src/components/SidebarLayout.tsx` | Borda do topbar de `white/[0.06]` para `white/[0.08]`                                                                             |

## O que NÃO será alterado

- Lógica de estado dos submenus (já corrigida)
- Estrutura de navegação e rotas
- Backend, hooks, contextos
- Design system principal além dos pequenos ajustes de contraste
