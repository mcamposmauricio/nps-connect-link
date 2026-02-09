
# Redesign Visual: Liquid Glass + Naming (exceto NPS)

## Visao Geral

Redesign completo do layout visual de todas as telas do sistema (exceto modulo NPS) aplicando a estetica "Liquid Glass" -- cards translucidos com backdrop-blur, bordas sutis e sombras suaves -- alem de corrigir nomenclaturas inconsistentes na navegacao e titulos de secoes.

---

## 1. Design System -- Liquid Glass

### Novas variaveis CSS (`src/index.css`)

Adicionar variaveis de glass ao design system existente:

```css
--glass-bg: 0 0% 100% / 0.6;
--glass-border: 0 0% 100% / 0.3;
--glass-shadow: 0 8px 32px 0 hsl(0 0% 0% / 0.06);
--glass-blur: 12px;
```

Modo dark:
```css
--glass-bg: 210 4% 22% / 0.5;
--glass-border: 0 0% 100% / 0.08;
--glass-shadow: 0 8px 32px 0 hsl(0 0% 0% / 0.2);
```

### Classe utilitaria `.glass-card`

Adicionar ao `index.css`:
```css
@layer components {
  .glass-card {
    background: hsl(var(--glass-bg));
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid hsl(var(--glass-border));
    box-shadow: var(--glass-shadow);
    border-radius: var(--radius);
    transition: var(--transition);
  }
  .glass-card:hover {
    box-shadow: 0 12px 40px 0 hsl(0 0% 0% / 0.08);
  }
}
```

### Background do layout principal

Adicionar um gradiente sutil ao background da area de conteudo do `SidebarLayout.tsx` para que o efeito glass tenha um fundo visualmente rico:
```css
background: linear-gradient(135deg, hsl(148 59% 95%) 0%, hsl(0 0% 98%) 40%, hsl(210 4% 96%) 100%);
```

---

## 2. Componentes Base Atualizados

### `SidebarLayout.tsx`
- Adicionar background gradiente na area de conteudo principal
- Header com glass effect (backdrop-filter: blur)
- Remover `bg-card` do header, substituir pela classe glass

### `Card` component (`src/components/ui/card.tsx`)
- **NAO** alterar o Card base (muito usado em NPS)
- Em vez disso, aplicar `.glass-card` diretamente nas paginas de CS, Chat e Cadastros

### Metric Cards (CSMetricsHeader, AdminDashboard, etc)
- Aplicar glass-card nos cards de metricas
- Icones com fundo translucido (bg-primary/8 em vez de bg-primary/10)
- Valor numerico com mais destaque (text-3xl font-bold)
- Label mais discreta (text-xs uppercase tracking-wider)

---

## 3. Nomenclatura -- Correcoes

### Sidebar (`AppSidebar.tsx`)

| De | Para (pt-BR) | Para (en) |
|----|-------------|-----------|
| `cs.title` (faltante) | "Customer Success" | "Customer Success" |
| `cs.reports` (faltante) | "Relatorios" | "Reports" |
| `nav.journeys` = "Jornadas" | "Jornadas" (manter) | "Journeys" |
| `nav.people` = "Pessoas" | "Pessoas" (manter) | "People" |

Adicionar as chaves faltantes nos dois locales:
- `"cs.title": "Customer Success"` (ambos idiomas)
- `"cs.reports": "Relatorios"` (pt-BR) / `"Reports"` (en)

### Titulos de pagina

| Pagina | Titulo Atual | Novo Titulo (pt-BR) |
|--------|-------------|---------------------|
| CSDashboard | "Customer Success" | "Visao Geral" |
| CSHealthPage | "Health Score" | "Saude dos Clientes" |
| CSChurnPage | "Analise de Churn" | "Risco e Churn" |
| CSFinancialPage | "Analise Financeira" | "Receita" |
| CSTrailsPage | "Trilhas" | "Jornadas" |
| CSMsPage | "Customer Success Managers" | "Equipe CS" |
| AdminDashboard (Chat) | "Dashboard Chat" | "Painel de Atendimento" |
| AdminChatHistory | "Historico de Chats" | "Historico" |
| AdminAttendants | "Atendentes" | "Atendentes" (manter) |
| AdminDashboardGerencial | "Dashboard Gerencial" | "Relatorios de Atendimento" |

---

## 4. Alteracoes por Pagina

### CS Dashboard (`CSDashboard.tsx`)
- Aplicar `glass-card` nos metric cards
- Titulo: "Visao Geral" com subtitulo atualizado
- Espacamento entre secoes com `space-y-8` (mais ar)

### CSMetricsHeader (`CSMetricsHeader.tsx`)
- Cards com classe `glass-card`
- Icones dentro de divs com `bg-{color}/8 rounded-xl` (mais arredondado)
- Labels com `text-xs uppercase tracking-wider text-muted-foreground`
- Valores com `text-3xl font-bold`

### CSKanbanBoard + CSKanbanCard
- Colunas do Kanban com `glass-card` e `min-h-[400px]`
- Cards dentro do Kanban: borda esquerda colorida (ja existe), adicionar hover com elevacao suave
- Header da coluna com badge mais minimalista

### CSHealthPage
- Titulo: "Saude dos Clientes"
- Summary cards com `glass-card`
- Lista de empresas com fundo translucido e hover suave
- Progress bar com rounded-full

### CSChurnPage
- Titulo: "Risco e Churn"
- Summary cards com `glass-card`
- Cards de detalhes (At Risk, Renewals, Churned) com glass-card
- Items da lista com `glass-card` individual no hover

### CSFinancialPage
- Titulo: "Receita"
- Summary cards com `glass-card`
- MRR por Status: sub-cards com glass
- Top Empresas: lista com hover translucido

### CSTrailsPage
- Titulo: "Jornadas"
- Cards de template com `glass-card`
- Badge de tipo com fundo translucido

### CSMsPage
- Titulo: "Equipe CS"
- Cards de CSM com `glass-card`
- Avatar com ring translucido
- Info de contato mais compacta

### Contacts.tsx
- Cards de empresa com `glass-card`
- Search bar com fundo translucido
- Sheet de detalhes com header glass

### People.tsx
- Tabela com header glass (fundo translucido no thead)
- Hover nas linhas com efeito sutil
- Search bar unificada com estilo glass

### AdminDashboard (Chat)
- Titulo: "Painel de Atendimento"
- Metric cards com `glass-card`
- Card "Encerradas Hoje" com destaque glass

### AdminWorkspace (Chat)
- Chat room list com glass
- Header do chat com glass
- Visitor info panel com glass

### AdminChatHistory
- Titulo: "Historico"
- Filtros com fundo glass
- Tabela dentro de card glass

### AdminDashboardGerencial
- Titulo: "Relatorios de Atendimento"
- KPI cards com glass
- Cards de graficos com glass

### AdminAttendants
- Cards de atendente com glass
- Switch com fundo mais suave

### Settings.tsx
- Tabs com estilo glass
- Titulo e subtitulo atualizados

---

## 5. CompanyCard.tsx
- Aplicar `glass-card` como base
- Hover: `hover:shadow-lg hover:scale-[1.01]` com transicao suave
- Icone Building2 com fundo `bg-primary/8 rounded-xl`

---

## 6. Arquivos Modificados

| # | Arquivo | Tipo de Mudanca |
|---|---------|----------------|
| 1 | `src/index.css` | Novas variaveis CSS glass + classe utilitaria |
| 2 | `src/components/SidebarLayout.tsx` | Background gradiente + header glass |
| 3 | `src/locales/pt-BR.ts` | Novas chaves + renomear titulos |
| 4 | `src/locales/en.ts` | Novas chaves + renomear titulos |
| 5 | `src/components/AppSidebar.tsx` | Nenhuma mudanca de codigo (labels vem dos locales) |
| 6 | `src/pages/CSDashboard.tsx` | Glass cards + titulo atualizado |
| 7 | `src/components/cs/CSMetricsHeader.tsx` | Redesign metricas com glass |
| 8 | `src/components/cs/CSKanbanBoard.tsx` | Colunas com glass |
| 9 | `src/components/cs/CSKanbanCard.tsx` | Hover refinado |
| 10 | `src/pages/CSHealthPage.tsx` | Glass cards + titulo |
| 11 | `src/pages/CSChurnPage.tsx` | Glass cards + titulo |
| 12 | `src/pages/CSFinancialPage.tsx` | Glass cards + titulo |
| 13 | `src/pages/CSTrailsPage.tsx` | Glass cards + titulo |
| 14 | `src/pages/CSMsPage.tsx` | Glass cards + titulo |
| 15 | `src/pages/Contacts.tsx` | Glass cards |
| 16 | `src/components/CompanyCard.tsx` | Glass + hover |
| 17 | `src/pages/People.tsx` | Tabela glass |
| 18 | `src/pages/AdminDashboard.tsx` | Glass cards + titulo |
| 19 | `src/pages/AdminWorkspace.tsx` | Glass panels |
| 20 | `src/pages/AdminChatHistory.tsx` | Glass table + titulo |
| 21 | `src/pages/AdminDashboardGerencial.tsx` | Glass cards + titulo |
| 22 | `src/pages/AdminAttendants.tsx` | Glass cards |
| 23 | `src/pages/Settings.tsx` | Titulo atualizado |
| 24 | `src/components/chat/ChatRoomList.tsx` | Glass panel |
| 25 | `src/components/chat/VisitorInfoPanel.tsx` | Glass panel |

## 7. Arquivos NAO Modificados

- Todas as paginas NPS (Dashboard, Campaigns, CampaignDetails, NPSEmbed, NPSResponse, NPSForm)
- Componentes UI base (button, badge, input, etc)
- Auth.tsx, ChatWidget.tsx, UserPortal.tsx (fluxos publicos)
- Hooks, contexts, integrations (sem mudanca funcional)

---

## Resultado Esperado

Uma interface moderna e coesa com:
- Cards translucidos que criam profundidade visual
- Nomenclatura clara e consistente em portugues
- Mais espacamento (breathing room) entre elementos
- Hover states suaves com transicoes de 300ms
- Hierarquia visual clara: titulos > subtitulos > labels > dados
- Fundo com gradiente sutil que da vida ao efeito glass
