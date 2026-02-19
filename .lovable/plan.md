
# Redesign Visual Completo — Journey CS (Dark-First) com Logos Oficiais

## Logo Oficial — Análise dos Assets

O logo Journey é composto por dois elementos:
1. **Wordmark**: "JOURNEY" em tipografia bold/semibold sem serifa
2. **Símbolo (ícone)**: dois traços diagonais paralelos (gradiente coral → vermelho e gradiente azul) + seta diagonal apontando para cima-direita (gradiente azul → branco no dark, azul → ciano claro no light)

Versões disponíveis (4 arquivos enviados):

| Arquivo | Versão | Uso previsto |
|---|---|---|
| `Screenshot_2026-02-18_at_21.50.48.png` | Logo completo — fundo escuro (#2B3245) | Sidebar, header, telas dark |
| `Screenshot_2026-02-18_at_21.51.11.png` | Logo completo — fundo branco | Exportações, relatórios PDF, landing |
| `Screenshot_2026-02-18_at_21.51.37.png` | Ícone isolado — fundo escuro | Sidebar colapsada, favicon, loading screen |
| `Screenshot_2026-02-18_at_21.51.49.png` | Ícone isolado — fundo branco | Contextos claros externos |

---

## Estratégia de Assets

### Organização dos arquivos no projeto

```text
public/
  logo-dark.png          ← Logo completo dark (sidebar, header, auth)
  logo-light.png         ← Logo completo light (landing, relatórios)
  logo-icon-dark.png     ← Ícone isolado dark (sidebar colapsada)
  logo-icon-light.png    ← Ícone isolado light (alternativo)
  favicon.ico            ← (manter existente ou substituir pelo ícone)
```

Os 4 arquivos enviados serão copiados para `public/` para uso direto em `<img>` sem necessidade de import ES6, facilitando o uso em múltiplos componentes.

---

## Onde Aplicar Cada Versão do Logo

### 1. Sidebar (`AppSidebar.tsx`) — Logo no topo

Atualmente usa o componente `<Zap>` + texto "Journey CS" como marca. No redesign:

**Sidebar expandida**: logo completo dark (`logo-dark.png`)
```tsx
<img src="/logo-dark.png" alt="Journey" className="h-8 w-auto" />
```

**Sidebar colapsada**: apenas o ícone isolado dark (`logo-icon-dark.png`)
```tsx
<img src="/logo-icon-dark.png" alt="Journey" className="h-8 w-8 object-contain" />
```

A sidebar usa `useSidebar()` para detectar estado `open/collapsed` — aplicar condicionalmente.

### 2. Página de Login/Auth (`Auth.tsx`) — Cabeçalho do card

Atualmente usa `<Zap>` + "Journey CS" como título. No redesign, substituir pelo logo dark:
```tsx
<img src="/logo-dark.png" alt="Journey" className="h-10 w-auto mx-auto" />
```
O fundo da auth já é dark (`bg-dark-hero`) — o logo dark se encaixa perfeitamente.

### 3. Landing Page (`LandingPage.tsx`) — Navbar

A navbar usa `<Zap>` + "Journey CS". Substituir:
- **Navbar dark** (fundo escuro com backdrop): logo dark
- Tamanho recomendado: `h-8 w-auto`

### 4. Loading Screen / Spinner (SidebarLayout)

Durante `loading || userDataLoading`, exibir o ícone isolado dark animado como loading indicator:
```tsx
<img src="/logo-icon-dark.png" alt="Journey" className="h-12 w-12 animate-pulse" />
```

### 5. Páginas públicas — PendingApproval, ForgotPassword, ResetPassword

Todas usam `<Zap>` como ícone de marca. Substituir pelo logo completo dark ou ícone isolado, dependendo do espaço disponível no card.

---

## Cores extraídas do logo (para consistência do design system)

O gradiente do ícone Journey contém exatamente as cores definidas no novo design system:

| Elemento do ícone | Cor | Token |
|---|---|---|
| Traço coral/laranja (gradiente baixo) | #FF6B4A → #FF9A5C | `--primary` (#FF7A59) |
| Traço azul (gradiente médio) | #4A7BFF → #5CA0FF | Próximo ao `--accent` (#3DA5F4) |
| Seta (gradiente alto) | #7BB5F5 → #FFFFFF | Branco/foreground |

Isso confirma que a paleta definida no redesign é **consistente com a identidade visual oficial da marca**.

---

## Diagrama de Uso dos Logos nas Telas

```text
TELA                       LOGO USADO              POSIÇÃO
─────────────────────────────────────────────────────────────────
Sidebar (expandida)        logo-dark.png           Topo, 32px altura
Sidebar (colapsada)        logo-icon-dark.png      Centro, 32x32px
Auth / Login               logo-dark.png           Centro do card, 40px
Landing Page (navbar)      logo-dark.png           Esquerda da nav, 32px
Loading Screen             logo-icon-dark.png      Centro, 48px animate-pulse
PendingApproval            logo-icon-dark.png      Acima do card, 40px
ForgotPassword             logo-dark.png           Topo do card, 40px
ResetPassword              logo-dark.png           Topo do card, 40px
```

---

## Plano de Execução Completo (com logos integrados)

### Fase 1 — Fundação (tokens e tipografia)

**1.1. `index.html`**
- Adicionar link Google Fonts: Manrope (400, 500, 600, 700)
- Remover referência ao ícone `<Zap>` no favicon se aplicável

**1.2. `src/index.css`**
Substituir completamente os tokens CSS por dark-first:
```css
:root {
  --background: 220 12% 7%;        /* #0F1115 */
  --foreground: 220 18% 96%;       /* #F2F4F8 */
  --card: 222 20% 12%;             /* #171C28 */
  --card-foreground: 220 18% 96%;
  --popover: 225 19% 16%;          /* #1E2433 */
  --popover-foreground: 220 18% 96%;
  --primary: 25 100% 67%;          /* #FF7A59 coral */
  --primary-foreground: 0 0% 100%;
  --secondary: 225 19% 16%;        /* #1E2433 */
  --secondary-foreground: 220 18% 96%;
  --muted: 222 20% 14%;
  --muted-foreground: 220 10% 65%;
  --accent: 207 88% 60%;           /* #3DA5F4 blue */
  --accent-foreground: 0 0% 100%;
  --destructive: 0 100% 68%;       /* #FF5C5C */
  --success: 152 65% 54%;          /* #2ED47A */
  --warning: 40 90% 62%;           /* #F5B546 */
  --border: 220 14% 16%;
  --input: 220 14% 16%;
  --ring: 207 88% 60%;
  --radius: 0.5rem;
  --sidebar-background: 222 22% 10%;  /* #131722 */
  --sidebar-accent: 225 19% 16%;      /* #1E2433 */
  --sidebar-primary: 207 88% 60%;     /* #3DA5F4 */
  --sidebar-border: 220 14% 14%;
  font-family: 'Manrope', sans-serif;
}
```

**1.3. `tailwind.config.ts`**
Adicionar ao `extend`:
```ts
colors: {
  'coral': '#FF7A59',
  'metric-blue': '#3DA5F4',
  'growth-green': '#2ED47A',
  'risk-yellow': '#F5B546',
  'danger-red': '#FF5C5C',
  'surface': '#171C28',
  'surface-2': '#1E2433',
  'app-bg': '#0F1115',
  'sidebar-bg': '#131722',
}
fontFamily: {
  sans: ['Manrope', 'sans-serif'],
}
```

---

### Fase 2 — Componentes UI globais

**2.1. `src/components/ui/button.tsx`**
- `default`: `bg-primary text-white hover:bg-primary/85` (coral)
- `secondary`: `border border-white/20 bg-transparent text-foreground hover:bg-white/5`
- `ghost`: `text-foreground/70 hover:text-foreground hover:bg-white/5`
- `outline`: `border border-white/15 bg-transparent hover:bg-white/5`

**2.2. `src/components/ui/card.tsx`**
```
"rounded-xl border border-white/[0.06] bg-card text-card-foreground shadow-sm"
```

**2.3. `src/components/ui/input.tsx`**
```
"flex h-10 w-full rounded-lg border border-white/10 bg-secondary px-3 py-2 text-sm
 placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-accent"
```

**2.4. `src/components/ui/badge.tsx`**
Adicionar variantes:
- `promoter`: `bg-success/15 text-success`
- `passive`: `bg-warning/15 text-warning`
- `detractor`: `bg-destructive/15 text-destructive`

**2.5. `src/components/ui/metric-card.tsx`**
- Número KPI: `text-3xl font-semibold` (Manrope semibold)
- Label: `text-[11px] uppercase tracking-wider text-muted-foreground`
- Ícone: `bg-accent/10 text-accent` ou `bg-primary/10 text-primary`
- Borda: `border-white/[0.06]`

**2.6. `src/components/ui/page-header.tsx`**
- Título: `text-[28px] font-medium`
- Subtitle: `text-sm text-muted-foreground`

---

### Fase 3 — Layout e navegação

**3.1. `src/components/AppSidebar.tsx`**

Substituir o bloco de logo (atualmente `<Zap>` + texto):
```tsx
// Expandido
{open && <img src="/logo-dark.png" alt="Journey" className="h-8 w-auto" />}
// Colapsado
{!open && <img src="/logo-icon-dark.png" alt="Journey" className="h-8 w-8 object-contain" />}
```

Itens de navegação ativos:
```tsx
// Item ativo recebe borda esquerda azul (Metric Blue)
className="border-l-[3px] border-[#3DA5F4] bg-sidebar-accent pl-[calc(theme(spacing.3)-3px)]"
```

Cores gerais da sidebar:
- Fundo: `bg-[#131722]`
- Labels de grupo: `text-white/35 text-[10px] uppercase tracking-widest`
- Hover: `hover:bg-sidebar-accent`

**3.2. `src/components/SidebarLayout.tsx`**

Header (topbar):
```tsx
<header className="h-14 border-b border-white/[0.06] flex items-center px-4 bg-[#131722]">
  <SidebarTrigger className="text-foreground/50 hover:text-foreground" />
</header>
```

Loading screen (com logo):
```tsx
<div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
  <img src="/logo-icon-dark.png" alt="Journey" className="h-12 w-12 animate-pulse" />
</div>
```

---

### Fase 4 — Telas de autenticação e públicas

**4.1. `src/pages/Auth.tsx`**

Substituir o bloco do logo:
```tsx
// ANTES:
<Zap className="h-10 w-10 text-primary mr-3" />
<h1>Journey CS</h1>

// DEPOIS:
<img src="/logo-dark.png" alt="Journey" className="h-10 w-auto mx-auto mb-2" />
```

**4.2. `src/pages/LandingPage.tsx`** (navbar)

```tsx
// ANTES:
<Zap className="h-4 w-4" />
<span>Journey CS</span>

// DEPOIS:
<img src="/logo-dark.png" alt="Journey" className="h-8 w-auto" />
```

**4.3. `src/pages/ForgotPassword.tsx`** e **`src/pages/ResetPassword.tsx`**

Substituir `<Zap>` + título pelo logo dark.

**4.4. `src/pages/PendingApproval.tsx`**

Adicionar logo acima do card:
```tsx
<img src="/logo-icon-dark.png" alt="Journey" className="h-10 w-10 mx-auto mb-6" />
```

---

### Fase 5 — Componentes específicos (Kanban, Chat)

**5.1. `src/components/cs/CSKanbanCard.tsx`**
- Remover `border-l-4` colorido
- Adicionar faixa no topo: `<div className="h-1 rounded-t-xl bg-[color]" />`
- Fundo card: `bg-card`
- Sombra: `shadow-sm`

**5.2. Classes hardcoded a substituir** (busca global):
- `text-blue-600` → `text-accent`
- `bg-green-100` → `bg-success/15`
- `text-yellow-600` → `text-warning`
- `bg-indigo-*` → remover ou substituir por `bg-primary/10`
- `text-green-600` → `text-success`

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `public/logo-dark.png` | Copiar asset enviado (logo completo dark) |
| `public/logo-light.png` | Copiar asset enviado (logo completo light) |
| `public/logo-icon-dark.png` | Copiar asset enviado (ícone dark) |
| `public/logo-icon-light.png` | Copiar asset enviado (ícone light) |
| `index.html` | Manrope Google Font |
| `src/index.css` | Tokens dark-first completos |
| `tailwind.config.ts` | Cores + fontFamily |
| `src/components/ui/button.tsx` | Variantes |
| `src/components/ui/card.tsx` | Border radius e cor |
| `src/components/ui/input.tsx` | Estilo dark |
| `src/components/ui/badge.tsx` | Variantes de status |
| `src/components/ui/metric-card.tsx` | KPI widget |
| `src/components/ui/page-header.tsx` | Tipografia |
| `src/components/AppSidebar.tsx` | Logo + estilos de navegação |
| `src/components/SidebarLayout.tsx` | Topbar + loading screen |
| `src/components/cs/CSKanbanCard.tsx` | Faixa de status no topo |
| `src/pages/Auth.tsx` | Logo no card |
| `src/pages/LandingPage.tsx` | Logo na navbar |
| `src/pages/ForgotPassword.tsx` | Logo no card |
| `src/pages/ResetPassword.tsx` | Logo no card |
| `src/pages/PendingApproval.tsx` | Logo acima do card |

## O que NÃO será alterado

- Toda lógica de negócio, hooks, contextos, queries
- Estrutura de rotas e permissões
- Edge functions e banco de dados
- Estrutura dos componentes (apenas classes CSS e substituição de ícone `<Zap>` por `<img>` do logo)
- Animações funcionais existentes
