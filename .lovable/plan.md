

# Redesign de Produto: Design System Profissional para SaaS B2B

## 1. Principios de Design

### 1.1 Clareza Operacional
Cada tela deve comunicar imediatamente **o que o usuario pode fazer** e **qual e o estado atual**. Informacao critica (metricas, status, alertas) deve estar visivel sem scroll. Acoes secundarias devem ser acessiveis mas nao competir com o conteudo principal.

### 1.2 Hierarquia Visual Forte
Estabelecer uma cadeia tipografica rigida:
- **Titulo de pagina**: `text-2xl font-semibold tracking-tight` (unico por tela)
- **Subtitulo/descricao**: `text-sm text-muted-foreground` (maximo 1 linha)
- **Titulo de secao/card**: `text-sm font-medium` (nunca `text-2xl` dentro de cards)
- **Labels de metricas**: `text-xs font-medium uppercase tracking-wider text-muted-foreground`
- **Valores de metricas**: `text-2xl font-semibold` (nao `text-3xl` -- proporcional ao container)
- **Corpo**: `text-sm` padrao

### 1.3 Design System Escalavel
Componentes compartilhados com variantes controladas via props, nao via classes avulsas. Tokens de cor semanticos. Espacamento consistente baseado em multiplos de 4px (p-4, p-6, gap-4, gap-6).

### 1.4 Percepcao Profissional
Reduzir "ruido visual": menos sombras empilhadas, menos hover-scale, menos gradientes. Usar cor com intencao (primaria apenas para acoes e indicadores positivos). Fundo neutro, conteudo em cards solidos com borda sutil.

---

## 2. Diagnostico dos Problemas Atuais

### Problemas Identificados na Auditoria Visual

| Problema | Onde ocorre | Impacto |
|----------|------------|---------|
| Glass-card com backdrop-blur causa "lavagem" visual -- conteudo perde contraste | Todas as telas CS, Chat, Cadastros | Legibilidade reduzida, percepcao de produto "inacabado" |
| `text-3xl font-bold` em metricas dentro de cards pequenos | CSMetricsHeader, AdminDashboard, Health, Churn, Financial | Metricas parecem "gritando", sem proporcao |
| `hover:scale-[1.01]` em CompanyCard | Contacts | Efeito sutil demais para ser intencional, mas causa micro-jank |
| Header do SidebarLayout com `backdrop-blur-xl bg-white/60` mistura glass no header | SidebarLayout | Header nao se diferencia do conteudo |
| Cards de Settings sem glass mas tabs com `grid-cols-${tabCount}` dinamico | Settings.tsx | Layout quebra com muitas tabs -- nao escala |
| Titulos de secao dentro de cards usam `CardTitle` com tamanho `text-2xl` nos settings tabs | BrandSettingsTab, EmailSettingsTab, NotificationSettingsTab | Hierarquia invertida: subtitulo maior que titulo da pagina |
| `glass-gradient-bg` no fundo principal cria um verde sutil que compete com o primario | SidebarLayout | Fundo colorido tira a neutralidade necessaria para o glass funcionar |
| Sidebar com logo "Journey CS" mas produto se chama "Meu NPS" | AppSidebar | Inconsistencia de marca |
| `bg-primary/8` nao e uma classe Tailwind valida (deveria ser `/5` ou `/10`) | CSMetricsHeader, CompanyCard | Pode causar inconsistencia de render |

---

## 3. Arquitetura Visual das Telas Principais

### 3.1 Padrao de Page Layout (todas as telas)

```text
+--------------------------------------------------+
| Page Header                                       |
|   H1 titulo (text-2xl font-semibold)             |
|   Subtitulo (text-sm text-muted-foreground)       |
|   [Acoes primarias alinhadas a direita]           |
+--------------------------------------------------+
| gap-6                                             |
+--------------------------------------------------+
| Metric Cards (quando houver)                      |
|   Grid 4 colunas, cards solidos com borda         |
+--------------------------------------------------+
| gap-6                                             |
+--------------------------------------------------+
| Conteudo Principal                                |
|   Cards solidos, tabelas, kanban                  |
+--------------------------------------------------+
```

### 3.2 Metric Card (componente padrao)

```text
+-----------------------------------+
| LABEL (uppercase, xs, muted)      |
| Valor (text-2xl font-semibold)    |
|                         [icon]    |
+-----------------------------------+
```

- Fundo: `bg-card` (solido, branco no light mode)
- Borda: `border` (sutil, 1px)
- Sem backdrop-blur
- Sem hover-scale
- Sombra: `shadow-sm` apenas
- Padding: `p-5`

### 3.3 Sidebar

- Manter estrutura atual de navegacao (sem mudanca funcional)
- Corrigir o nome do produto para "Meu NPS" ou manter "Journey CS" conforme decisao de branding
- Manter glass no sidebar (faz sentido como painel fixo lateral)

### 3.4 Settings

- Substituir `grid-cols-${tabCount}` por `lg:w-auto lg:inline-flex` (tabs fluidas)
- Reduzir titulos internos de `text-2xl font-bold` para `text-lg font-semibold`
- Usar `glass-card` nos cards de formulario para manter coerencia com outras telas

---

## 4. Design System Base

### 4.1 Cores (mantidas, com ajuste de uso)

Cores atuais estao bem definidas. O ajuste e de **uso**, nao de valor:

| Token | Uso correto |
|-------|------------|
| `--primary` (verde) | Botoes primarios, indicadores positivos, links ativos |
| `--destructive` (vermelho) | Erros, exclusao, alertas criticos |
| `--warning` (amarelo) | Atencao, status intermediario |
| `--muted` | Fundos de areas inativas, placeholders |
| `--card` | Fundo de cards (solido, opaco) |
| `--background` | Fundo geral da pagina |

**Mudanca critica:** Remover `glass-gradient-bg` do fundo principal. Usar `bg-background` puro (hsl(0 0% 98%)) para que os cards tenham contraste natural.

### 4.2 Tipografia

| Nivel | Classe | Uso |
|-------|--------|-----|
| Page Title | `text-2xl font-semibold tracking-tight` | H1, unico por pagina |
| Page Subtitle | `text-sm text-muted-foreground` | Descricao abaixo do titulo |
| Section Title | `text-lg font-semibold` | Titulos dentro de cards/secoes |
| Card Title | `text-sm font-medium` | Headers de cards de metricas |
| Metric Label | `text-xs font-medium uppercase tracking-wider text-muted-foreground` | Labels acima de numeros |
| Metric Value | `text-2xl font-semibold` | Valores numericos destacados |
| Body | `text-sm` | Texto padrao |
| Caption | `text-xs text-muted-foreground` | Informacao auxiliar |

### 4.3 Espacamento

| Contexto | Valor |
|----------|-------|
| Entre secoes de pagina | `space-y-6` |
| Entre cards em grid | `gap-4` |
| Padding interno de card | `p-5` |
| Padding de pagina (content area) | `p-6` (ja esta) |

### 4.4 Cards

**Duas variantes:**

1. **Card Solido (padrao):** `rounded-lg border bg-card shadow-sm` -- para metricas, formularios, tabelas
2. **Glass Card:** `.glass-card` -- APENAS para paineis flutuantes (sidebar, chat panels, visitor info)

**Regra:** Se o card esta sobre `bg-background`, use Card Solido. Se esta sobre outro card ou em contexto de painel lateral, use Glass Card.

### 4.5 Componentes de Lista

Itens de lista dentro de cards:
- `p-3 rounded-lg hover:bg-muted/50 transition-colors` (sem borda)
- Separacao visual por `space-y-1` (sem `border` entre itens)
- Ultimo item sem borda inferior

### 4.6 Botoes

Manter o padrao atual (ja esta bom):
- Primario: `<Button>` (verde)
- Secundario: `<Button variant="outline">`
- Destrutivo: `<Button variant="destructive">`
- Ghost: `<Button variant="ghost">` (para acoes em listas)

---

## 5. Mudancas por Arquivo

### Bloco 1: Design System e Layout

**`src/index.css`**
- Manter as variaveis glass (usadas em paineis laterais)
- Remover `.glass-gradient-bg` (substituir por `bg-background` puro)
- Ajustar `.glass-card:hover` para remover `box-shadow` excessivo (usar `shadow-md` ao inves de `0 12px 40px`)

**`src/components/SidebarLayout.tsx`**
- Remover classe `glass-gradient-bg` do container de conteudo
- Header: trocar `backdrop-blur-xl bg-white/60 dark:bg-gray-800/50` por `bg-card border-b` (solido, previsivel)
- Conteudo: manter `p-6 overflow-auto` com `bg-background`

### Bloco 2: Metricas e Dashboards CS

**`src/components/cs/CSMetricsHeader.tsx`**
- Trocar `glass-card` por card solido: `rounded-lg border bg-card shadow-sm`
- Trocar `text-3xl font-bold` por `text-2xl font-semibold`
- Trocar `bg-primary/8` por `bg-primary/10` (classe Tailwind valida)
- Manter `p-5`, manter `rounded-xl` no icone

**`src/pages/CSDashboard.tsx`**
- Sem mudanca estrutural (ja esta limpo)

**`src/pages/CSHealthPage.tsx`**
- Summary cards: trocar `glass-card` por `rounded-lg border bg-card shadow-sm`
- Lista de empresas: trocar `glass-card` do card externo por card solido
- Trocar `text-3xl font-bold` por `text-2xl font-semibold` nos valores

**`src/pages/CSChurnPage.tsx`**
- Mesmo padrao: trocar `glass-card` por card solido em todos os summary cards e cards de conteudo
- Trocar `text-3xl` por `text-2xl`

**`src/pages/CSFinancialPage.tsx`**
- Mesmo padrao: cards solidos, tipografia proporcional
- Sub-cards de "MRR por Status": manter `glass-card` aqui (cards dentro de card -- caso de uso valido para glass)

**`src/components/cs/CSKanbanBoard.tsx`**
- Colunas: trocar `glass-card` por `rounded-lg border bg-card shadow-sm`
- Manter `min-h-[400px]`

**`src/components/cs/CSKanbanCard.tsx`**
- Remover `hover:shadow-lg hover:translate-y-[-1px]` (muito agressivo para kanban)
- Usar `hover:bg-muted/50 transition-colors` (sutil, consistente)

### Bloco 3: Chat/Admin

**`src/pages/AdminDashboard.tsx`**
- Cards: trocar `glass-card` por card solido
- Trocar `text-3xl font-bold` por `text-2xl font-semibold`

**`src/pages/AdminDashboardGerencial.tsx`**
- KPI cards: trocar `glass-card` por card solido
- Cards de grafico: trocar `glass-card` por card solido
- Trocar `text-3xl font-bold` por `text-2xl font-semibold`

**`src/pages/AdminAttendants.tsx`**
- Cards de atendente: trocar `glass-card` por card solido

**`src/pages/AdminChatHistory.tsx`**
- Card da tabela: trocar `glass-card` por card solido

**`src/pages/AdminWorkspace.tsx`**
- Manter `glass-card` nos paineis laterais (ChatRoomList, VisitorInfoPanel) -- caso valido de glass
- Card do header do chat: trocar `glass-card` por card solido

**`src/components/chat/ChatRoomList.tsx`**
- Manter `glass-card` (painel lateral)
- Trocar `border-white/10` por `border-border` (consistencia com o sistema)

**`src/components/chat/VisitorInfoPanel.tsx`**
- Manter `glass-card` (painel lateral)
- Trocar `border-white/10` por `border-border`

### Bloco 4: Cadastros

**`src/components/CompanyCard.tsx`**
- Trocar `glass-card hover:shadow-lg hover:scale-[1.01]` por `rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow`
- Trocar `bg-primary/8` por `bg-primary/10`

**`src/pages/Contacts.tsx`**
- Sem mudanca (layout ja esta limpo, CompanyCard fara o trabalho)

**`src/pages/People.tsx`**
- Trocar `glass-card` do wrapper da tabela por `rounded-lg border bg-card shadow-sm`

### Bloco 5: CS extras

**`src/pages/CSTrailsPage.tsx`**
- Cards de template: trocar `glass-card` por card solido
- Estado vazio: trocar `glass-card` por card solido

**`src/pages/CSMsPage.tsx`**
- Cards de CSM: trocar `glass-card` por card solido
- Estado vazio: trocar `glass-card` por card solido

### Bloco 6: Settings

**`src/components/BrandSettingsTab.tsx`**
- Trocar `text-2xl font-bold` por `text-lg font-semibold` no titulo da secao
- Card de formulario: adicionar `glass-card` (para manter coerencia de formulario)

**`src/components/EmailSettingsTab.tsx`**
- Trocar `text-2xl font-bold` por `text-lg font-semibold`

**`src/components/NotificationSettingsTab.tsx`**
- Trocar `text-2xl font-bold` por `text-lg font-semibold`

**`src/pages/Settings.tsx`**
- Trocar `grid-cols-${tabCount}` por layout flexivel: `lg:w-auto lg:inline-flex flex-wrap`

---

## 6. Justificativa das Decisoes

### Por que remover glass dos cards de conteudo?

Backdrop-blur reduz o contraste entre fundo e texto. Em dashboards B2B onde o usuario precisa ler numeros rapidamente (MRR, health score, contagem de clientes), contraste maximo e essencial. Glass funciona em paineis decorativos (sidebar, chat panels), nao em areas de dados operacionais.

### Por que reduzir text-3xl para text-2xl?

Cards de metricas tem ~200px de largura em grids de 4 colunas. `text-3xl` (1.875rem / 30px) ocupa proporcao excessiva do card, criando desequilibrio entre label e valor. `text-2xl` (1.5rem / 24px) mantem destaque sem dominar.

### Por que remover o gradiente de fundo?

O `glass-gradient-bg` com verde sutil cria uma "tinta" que interfere na percepcao de neutralidade do produto. SaaS B2B profissionais usam fundos neutros (cinza claro, branco) para que a cor do conteudo (verdes de sucesso, vermelhos de alerta) tenha maximo impacto semantico.

### Por que manter glass nos paineis do chat?

O workspace de chat e um contexto diferente: 3 paineis lado a lado (lista, conversa, info do visitante). Glass nos paineis laterais cria separacao visual sutil sem adicionar bordas pesadas, funcionando como "camadas" de informacao.

### Por que nao alterar componentes UI base?

Os componentes em `src/components/ui/` sao primitivos do design system. Altera-los afetaria todo o sistema, incluindo NPS (que esta excluido do redesign). A abordagem correta e controlar a aparencia via classes aplicadas nas paginas.

---

## 7. Arquivos Modificados (total: 22)

| # | Arquivo | Tipo |
|---|---------|------|
| 1 | `src/index.css` | Remover `glass-gradient-bg`, ajustar hover do glass-card |
| 2 | `src/components/SidebarLayout.tsx` | Header solido, fundo neutro |
| 3 | `src/components/cs/CSMetricsHeader.tsx` | Card solido, tipografia ajustada |
| 4 | `src/pages/CSHealthPage.tsx` | Cards solidos, tipografia |
| 5 | `src/pages/CSChurnPage.tsx` | Cards solidos, tipografia |
| 6 | `src/pages/CSFinancialPage.tsx` | Cards solidos (manter glass nos sub-cards) |
| 7 | `src/components/cs/CSKanbanBoard.tsx` | Colunas com card solido |
| 8 | `src/components/cs/CSKanbanCard.tsx` | Hover sutil |
| 9 | `src/pages/AdminDashboard.tsx` | Cards solidos, tipografia |
| 10 | `src/pages/AdminDashboardGerencial.tsx` | Cards solidos, tipografia |
| 11 | `src/pages/AdminAttendants.tsx` | Cards solidos |
| 12 | `src/pages/AdminChatHistory.tsx` | Card solido |
| 13 | `src/pages/AdminWorkspace.tsx` | Header do chat solido |
| 14 | `src/components/chat/ChatRoomList.tsx` | Border consistente |
| 15 | `src/components/chat/VisitorInfoPanel.tsx` | Border consistente |
| 16 | `src/components/CompanyCard.tsx` | Card solido, hover ajustado |
| 17 | `src/pages/People.tsx` | Card solido |
| 18 | `src/pages/CSTrailsPage.tsx` | Cards solidos |
| 19 | `src/pages/CSMsPage.tsx` | Cards solidos |
| 20 | `src/components/BrandSettingsTab.tsx` | Tipografia ajustada |
| 21 | `src/components/EmailSettingsTab.tsx` | Tipografia ajustada |
| 22 | `src/components/NotificationSettingsTab.tsx` | Tipografia ajustada |

### Arquivos NAO modificados

- Modulo NPS inteiro (excluido do redesign)
- Componentes UI base (`ui/card.tsx`, `ui/button.tsx`, etc)
- Auth, ChatWidget, UserPortal (fluxos publicos)
- AppSidebar (estrutura e navegacao mantidas)
- Locales (nomenclatura ja foi corrigida anteriormente)
- Hooks, contexts, integrations

