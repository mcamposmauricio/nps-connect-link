

# Redesign Completo do Design System - Journey CS (Atualizado)

## Direcao Visual Inspirada nas Referencias

Com base nas imagens de referencia, a nova direcao visual combina:
- **Paleta principal**: Azul-indigo profundo (`#3B3DBF` / indigo-700) como cor primaria, substituindo o verde
- **Accent**: Verde-teal vibrante (`#10B981` / emerald-500) como cor de destaque e sucesso
- **Fundos escuros para landing/login**: Background navy/dark com gradientes cosmicos sutis
- **Fundos claros para dashboards**: Off-white limpo para areas operacionais
- **Sidebar**: Estilo Lutra - fundo branco limpo com item ativo usando pill arredondada em gradiente verde suave
- **Tipografia**: Headlines bold com peso forte, labels uppercase em tracking-wider

---

## 1. Nova Paleta de Cores (`index.css`)

### Light Mode (dashboards operacionais)
```
--background: 220 20% 97%          (off-white levemente azulado)
--foreground: 224 30% 15%          (navy escuro)
--primary: 239 60% 50%             (indigo profundo - cor principal da marca)
--primary-foreground: 0 0% 100%
--accent: 160 84% 39%              (teal/emerald - destaque e sucesso)
--accent-foreground: 0 0% 100%
--secondary: 224 20% 96%           (cinza muito claro)
--muted: 220 14% 96%
--muted-foreground: 220 10% 46%
--card: 0 0% 100%
--border: 220 13% 91%
--ring: 239 60% 50%
```

### Dark Mode (landing page, login, areas publicas)
```
--background: 224 47% 8%           (navy profundo)
--foreground: 210 20% 98%
--primary: 239 60% 60%             (indigo mais claro para contraste)
--accent: 160 84% 45%              (teal vibrante)
--card: 224 40% 12%                (card escuro com leve elevacao)
--border: 224 30% 18%
--muted: 224 30% 14%
```

### Variaveis NPS mantidas
```
--promoter: 160 84% 39%            (teal = promotores)
--passive: 43 74% 66%              (amarelo = neutros)
--detractor: 0 84% 60%             (vermelho = detratores)
```

### Novos gradientes
```
--gradient-hero: linear-gradient(135deg, hsl(224 47% 8%) 0%, hsl(239 40% 15%) 50%, hsl(224 47% 8%) 100%)
--gradient-cosmic: radial-gradient(ellipse at 30% 50%, hsl(239 60% 20% / 0.4) 0%, transparent 60%)
--gradient-sidebar-active: linear-gradient(135deg, hsl(160 84% 39% / 0.15) 0%, hsl(160 84% 39% / 0.05) 100%)
```

---

## 2. Sidebar Redesenhada (`AppSidebar.tsx`)

Inspirada diretamente na imagem Lutra (imagem 3):

- **Fundo**: Branco puro limpo (light) / navy escuro (dark)
- **Grupos**: Labels em texto uppercase, tracking-wider, cor muted-foreground/70, font-weight 500
- **Item ativo**: Pill arredondada com background em gradiente verde suave (emerald/teal com 15% opacidade), texto na cor primaria, borda esquerda de 2px na cor accent
- **Hover**: Background muted com transicao de 150ms
- **Logo**: Icone em circulo com fundo primario (indigo) em vez de verde
- **Footer**: Dropdown compacto com avatar + nome + logout/idioma

---

## 3. Landing Page (`LandingPage.tsx`)

Inspirada nas imagens 2 e 4 (Revup dark hero):

- **Background**: Dark navy com gradiente cosmico radial (tons de indigo/purple sutis)
- **Navbar**: Transparente com backdrop-blur sobre fundo escuro, logo branco
- **Hero**: Titulo `text-5xl font-bold text-white` com palavra-chave em cor teal/accent
- **Subtitulo**: Cinza claro (muted-foreground claro)
- **Form card**: Fundo glass escuro (card dark com borda sutil e backdrop-blur)
- **Botao CTA**: Background teal/accent com texto branco, `font-semibold`
- **Mockup**: Manter DashboardMockup mas com cores atualizadas (bordas mais suaves, fundo card escuro)
- **Footer**: Sobre fundo escuro, texto muted claro

---

## 4. Tela de Login (`Auth.tsx`)

Inspirada no estilo dark premium:

- **Background**: Mesmo gradiente cosmico da landing (navy + indigo radial)
- **Card**: Fundo glass escuro (`bg-card/80 backdrop-blur-xl border-border/30`), bordas arredondadas `rounded-2xl`
- **Logo**: Maior, centralizado, texto branco
- **Inputs**: Fundo transparente com borda sutil, placeholder claro
- **Botao login**: Gradiente accent (teal) ou primario (indigo)

---

## 5. Componentes Reutilizaveis

### `MetricCard` (novo: `src/components/ui/metric-card.tsx`)
Card unificado para todos os dashboards:
- Icone em circulo com background colorido (padrao atual do CSMetricsHeader)
- Label uppercase tracking-wider em `text-[11px]`
- Valor em `text-2xl font-bold tabular-nums`
- Delta opcional (seta + valor)
- Border sutil, padding `p-5`

### `PageHeader` (novo: `src/components/ui/page-header.tsx`)
Header padrao de pagina:
- Titulo `text-2xl font-bold tracking-tight`
- Subtitulo `text-sm text-muted-foreground`
- Slot para acoes a direita

---

## 6. Dashboards (`Dashboard.tsx`, `CSMetricsHeader.tsx`, `AdminDashboard.tsx`)

- Migrar cards de metricas para usar `MetricCard`
- Headers de pagina usando `PageHeader`
- Cores dos cards NPS atualizadas: promoter=teal, passive=amarelo, detractor=vermelho
- Tabelas: header com bg-muted/50, hover sutil, zebra-striping opcional

---

## 7. Animacoes e Transicoes

Novas keyframes no `tailwind.config.ts`:
```
fade-in: opacity 0->1 + translateY(8px)->0, 300ms
slide-up: translateY(12px)->0, 250ms
scale-in: scale(0.97)->1, 200ms
```

Aplicar em: cards ao carregar, dialogs ao abrir, sidebar ao expandir submenu.

---

## 8. Botao (`button.tsx`)

Adicionar variante `gradient`:
```
gradient: "bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 shadow-md"
```

---

## Arquivos Criados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/components/ui/metric-card.tsx` | Card de metrica unificado |
| 2 | `src/components/ui/page-header.tsx` | Header padrao de pagina |

## Arquivos Modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 3 | `src/index.css` | Nova paleta indigo/teal, gradientes cosmicos, dark mode atualizado, classes utilitarias tipograficas |
| 4 | `tailwind.config.ts` | Novas animacoes (fade-in, slide-up, scale-in), cores complementares |
| 5 | `src/components/ui/button.tsx` | Variante `gradient` |
| 6 | `src/components/AppSidebar.tsx` | Estilo Lutra: pill ativa verde, labels uppercase, footer compacto |
| 7 | `src/pages/LandingPage.tsx` | Hero dark com gradiente cosmico, form glass, CTA teal |
| 8 | `src/pages/Auth.tsx` | Background dark, card glass, inputs refinados |
| 9 | `src/components/DashboardMockup.tsx` | Cores atualizadas para nova paleta |
| 10 | `src/pages/Dashboard.tsx` | Usar MetricCard e PageHeader |
| 11 | `src/components/cs/CSMetricsHeader.tsx` | Migrar para MetricCard |
| 12 | `src/pages/AdminDashboard.tsx` | Usar MetricCard e PageHeader |
| 13 | `src/pages/CSDashboard.tsx` | Usar PageHeader |
| 14 | `src/pages/Contacts.tsx` | Usar PageHeader |
| 15 | `src/pages/People.tsx` | Usar PageHeader |
| 16 | `src/pages/Settings.tsx` | Usar PageHeader |
| 17 | `src/pages/NPSSettings.tsx` | Usar PageHeader |
| 18 | `src/pages/CSTrailsPage.tsx` | Usar PageHeader |
| 19 | `src/pages/Campaigns.tsx` | Usar PageHeader |
| 20 | `src/pages/AdminSettings.tsx` | Usar PageHeader |
| 21 | `src/pages/AdminChatHistory.tsx` | Usar PageHeader |
| 22 | `src/pages/AdminBanners.tsx` | Usar PageHeader |
| 23 | `src/pages/CSHealthPage.tsx` | Usar PageHeader |
| 24 | `src/pages/CSChurnPage.tsx` | Usar PageHeader |
| 25 | `src/pages/CSFinancialPage.tsx` | Usar PageHeader |
| 26 | `src/pages/MyProfile.tsx` | Usar PageHeader |
| 27 | `src/components/SidebarLayout.tsx` | Header refinado |
| 28 | `src/components/CompanyCard.tsx` | Hover e transicoes refinadas |

## Ordem de Implementacao

1. Variaveis CSS + Tailwind config (fundacao do sistema)
2. Componentes reutilizaveis (MetricCard, PageHeader, Button gradient)
3. Sidebar (componente central, estilo Lutra)
4. Landing Page + Login (primeira impressao, dark premium)
5. Dashboards (NPS, CS, Chat) usando novos componentes
6. Paginas restantes (PageHeader em todas)
7. Refinamentos (animacoes, loading states, hover)

## Nota sobre Modulos Publicos

Os formularios NPS publicos (`NPSResponse`, `NPSEmbed`) e o widget de chat manterao seu estilo proprio (glass-morphism) para nao conflitar com a marca do cliente final. Apenas as areas internas/operacionais seguirao o novo design system.

