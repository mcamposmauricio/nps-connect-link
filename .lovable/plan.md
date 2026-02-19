
# Tema Claro + Escuro Funcional (Escuro como Padrão)

## Diagnóstico do Problema

Hoje o sistema tem duas inconsistências que impedem o tema claro de funcionar:

**Problema 1 — `App.tsx` linha 51:**
```tsx
<ThemeProvider attribute="class" defaultTheme="light">
```
O padrão está como `"light"`, mas os tokens do `:root` são escuros. Precisa mudar para `defaultTheme="dark"`.

**Problema 2 — `src/index.css`:**
O bloco `:root` e `.dark` contêm **exatamente os mesmos valores** (ambos escuros). Quando o usuário clica no botão Sol/Lua, o tema muda a classe `html.dark`, mas as variáveis CSS não mudam nada — resultado: nenhuma diferença visual.

A correção consiste em:
- `:root` = tokens do **tema claro** (fundo branco/cinza claro, texto escuro)
- `.dark` = tokens do **tema escuro** (fundo `#0F1115`, texto claro) — já existe e está correto
- `defaultTheme="dark"` no `ThemeProvider`

Também é necessário adaptar o logo: no tema claro, usar o logo escrito em preto (`logo-light.svg`), e no tema escuro, o colorido (`logo-dark.svg`).

---

## Paleta do Tema Claro

Projetada para ser **limpa, profissional e consistente** com a identidade Journey:

| Token | Valor HSL | Hex aproximado | Uso |
|---|---|---|---|
| `--background` | `220 20% 97%` | `#F4F5F8` | Fundo da página |
| `--foreground` | `222 25% 12%` | `#161C29` | Texto principal |
| `--card` | `0 0% 100%` | `#FFFFFF` | Cards |
| `--card-foreground` | `222 25% 12%` | igual ao foreground |
| `--popover` | `0 0% 100%` | `#FFFFFF` | Popovers |
| `--muted` | `220 15% 92%` | `#E6E8EF` | Superfícies secundárias |
| `--muted-foreground` | `220 10% 45%` | `#696E7D` | Textos secundários |
| `--secondary` | `220 15% 94%` | `#ECEEF4` | Inputs, secondary BG |
| `--border` | `220 14% 85%` | `#D3D6E0` | Bordas |
| `--input` | `220 14% 85%` | igual ao border |
| `--primary` | `14 100% 60%` | `#FF6633` (coral ligeiramente mais escuro para contraste AA) |
| `--accent` | `207 80% 48%` | `#1A8FD1` (azul com mais contraste em fundo claro) |
| `--sidebar-background` | `220 20% 95%` | `#EEF0F5` | Sidebar clara |
| `--sidebar-foreground` | `222 25% 15%` | texto escuro |
| `--sidebar-accent` | `220 15% 88%` | `#DADDE8` | Hover e item ativo |
| `--sidebar-border` | `220 14% 82%` | `#CDD0DB` | Borda sidebar |

---

## Mudanças Planejadas

### 1. `src/App.tsx` — linha 51

```tsx
// ANTES
<ThemeProvider attribute="class" defaultTheme="light">

// DEPOIS
<ThemeProvider attribute="class" defaultTheme="dark">
```

### 2. `src/index.css` — `:root` vira tema claro, `.dark` permanece escuro

**`:root` (tema claro — novo):**
```css
:root {
  /* Base surfaces — light */
  --background: 220 20% 97%;
  --foreground: 222 25% 12%;

  --card: 0 0% 100%;
  --card-foreground: 222 25% 12%;

  --popover: 0 0% 100%;
  --popover-foreground: 222 25% 12%;

  /* Primary — coral (levemente mais escuro para contraste AA no claro) */
  --primary: 14 95% 55%;
  --primary-foreground: 0 0% 100%;

  /* Secondary surface */
  --secondary: 220 15% 94%;
  --secondary-foreground: 222 25% 12%;

  /* Muted */
  --muted: 220 15% 92%;
  --muted-foreground: 220 10% 45%;

  /* Accent — azul com contraste maior no fundo claro */
  --accent: 207 80% 42%;
  --accent-foreground: 0 0% 100%;

  /* Semantic */
  --destructive: 0 85% 55%;
  --destructive-foreground: 0 0% 100%;

  --success: 152 60% 40%;
  --warning: 40 85% 48%;
  --neutral: 220 10% 55%;

  /* NPS categories */
  --promoter: 152 60% 40%;
  --passive: 40 85% 48%;
  --detractor: 0 85% 55%;

  /* Borders & inputs */
  --border: 220 14% 85%;
  --input: 220 14% 85%;
  --ring: 207 80% 42%;

  --radius: 0.5rem;

  /* Sidebar — clara */
  --sidebar-background: 220 20% 95%;
  --sidebar-foreground: 222 25% 15%;
  --sidebar-primary: 207 80% 42%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 220 15% 88%;
  --sidebar-accent-foreground: 222 25% 12%;
  --sidebar-border: 220 14% 82%;
  --sidebar-ring: 207 80% 42%;

  /* Gradients */
  --gradient-hero: linear-gradient(135deg, hsl(224 47% 5%) 0%, hsl(222 22% 10%) 50%, hsl(224 47% 5%) 100%);
  --gradient-cosmic: radial-gradient(ellipse at 30% 50%, hsl(14 100% 67% / 0.08) 0%, transparent 60%);

  /* Shadows — mais suaves no claro */
  --shadow-sm: 0 1px 2px 0 hsl(0 0% 0% / 0.08);
  --shadow-md: 0 4px 6px -1px hsl(0 0% 0% / 0.1);
  --shadow-lg: 0 10px 20px -3px hsl(0 0% 0% / 0.12);
}
```

**`.dark` permanece idêntico ao atual** (apenas verificar que está correto).

### 3. `src/components/AppSidebar.tsx` — Logo adaptativo por tema

Atualmente o logo é fixo (`/logo-dark.svg`). No tema claro, precisa trocar para o logo escuro/preto.

Adicionar lógica com `useTheme()` (já importado no componente):

```tsx
// Logo já condicionado pelo estado collapsed
// Adicionar condicional de tema:
const logoSrc = theme === "dark" ? "/logo-dark.svg" : "/logo-light.svg";
const iconSrc = theme === "dark" ? "/logo-icon-dark.svg" : "/logo-icon-light.svg";

// No JSX:
{collapsed ? (
  <img src={iconSrc} alt="Journey" className="h-20 w-20 object-contain flex-shrink-0" />
) : (
  <img src={logoSrc} alt="Journey" className="h-20 w-auto object-contain max-w-[200px]" />
)}
```

### 4. `src/components/SidebarLayout.tsx` — Ajuste da topbar no tema claro

A topbar usa `bg-sidebar` via variável, então responde automaticamente ao tema. Verificar se a classe `border-white/[0.08]` precisa ser condicional — no claro, bordas brancas não fazem sentido. Substituir por uma borda que usa a variável CSS:

```tsx
// ANTES
<header className="h-14 border-b border-white/[0.08] flex items-center px-4 bg-sidebar">

// DEPOIS
<header className="h-14 border-b border-sidebar-border flex items-center px-4 bg-sidebar">
```

Isso garante que a borda seja clara no tema claro e escura no tema escuro automaticamente via CSS variable.

---

## Componentes que respondem automaticamente (sem mudança)

Todos os componentes que usam as variáveis semânticas (`bg-background`, `bg-card`, `text-foreground`, `border-border`, etc.) vão adaptar automaticamente ao trocar o tema. Isso inclui:

- `Card`, `Input`, `Button`, `Badge`, `Select`, `Dialog`, `Sheet`
- Páginas de dashboard, contatos, campanhas, configurações
- `AppSidebar` — fundo, itens de menu, footer

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | `defaultTheme="light"` → `defaultTheme="dark"` |
| `src/index.css` | Reescrever `:root` com tokens do tema claro; `.dark` mantém tokens escuros |
| `src/components/AppSidebar.tsx` | Logo/ícone adaptativo baseado no `theme` atual |
| `src/components/SidebarLayout.tsx` | Borda do topbar usando `border-sidebar-border` em vez de `border-white/[0.08]` |

## O que NÃO será alterado

- Lógica de negócio, hooks, contextos, queries
- Estrutura de rotas e permissões
- Edge functions e banco de dados
- Animações e keyframes
- Estrutura dos componentes
