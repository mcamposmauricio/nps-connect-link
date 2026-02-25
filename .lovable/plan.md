
# Redesign UI/UX das Paginas de Dados (Dashboard, Gerencial, CSAT, Historico)

## Problema Atual

As paginas de dados tem inconsistencias visuais entre si:
- Dashboard usa cards inline com estilos diferentes do MetricCard
- CSAT Report usa MetricCard mas com layout diferente do Dashboard
- Gerencial usa um KPICard local com estilo proprio
- Tipografia dos titulos das secoes inconsistente (h1 com tamanhos diferentes, labels com tracking diferente)
- Filtros sem padrao visual unificado (uns dentro de Card, outros soltos)
- Graficos com alturas inconsistentes (250px vs 300px)
- Tabelas com densidade visual diferente entre paginas
- Secoes sem separacao visual clara

## Principios do Redesign

1. **Consistencia**: todas as paginas usam os mesmos componentes e espacamentos
2. **Hierarquia visual**: KPIs no topo, graficos no meio, tabelas detalhadas embaixo
3. **Tipografia limpa**: tamanhos padronizados para cada nivel
4. **Densidade controlada**: espacamento de 24px entre secoes, 16px entre cards
5. **Filtros unificados**: barra de filtros padronizada com visual identico em todas as paginas

## Mudancas por Arquivo

### 1. MetricCard (`src/components/ui/metric-card.tsx`) -- Ajustar como componente padrao

- Reduzir padding de `p-5` para `p-4` para cards mais compactos
- Valor principal: `text-2xl` (era `text-3xl`) para nao dominar demais
- Label: `text-[10px]` uppercase tracking-widest `text-muted-foreground/70`
- Icone: reduzir container de `p-3` para `p-2.5`, icone de `h-5 w-5` para `h-4 w-4`
- Adicionar prop opcional `subtitle` para texto auxiliar abaixo do valor

### 2. Novo componente: `src/components/ui/section-label.tsx`

Componente reutilizavel para labels de secao tipo "METRICAS DO PERIODO", "STATUS EM TEMPO REAL":
- `text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60`
- Padding bottom de `mb-3`

### 3. Novo componente: `src/components/ui/filter-bar.tsx`

Barra de filtros padronizada usada em todas as paginas:
- Fundo `bg-muted/30` com `rounded-xl` e `px-4 py-3`
- Icone de filtro a esquerda
- Selects com largura minima consistente e `h-9` (menor que o padrao)
- Chips de score (para CSAT) opcionais

### 4. Novo componente: `src/components/ui/chart-card.tsx`

Wrapper padronizado para graficos:
- Card com `rounded-xl` e padding interno consistente
- Titulo no header: `text-sm font-medium` (nao `text-h3`)
- Altura fixa de `h-[240px]` para todos os graficos
- Empty state centralizado com icone + texto

### 5. AdminDashboard.tsx -- Redesign completo

**Header**: 
- Titulo `text-2xl font-semibold` com subtitulo `text-sm text-muted-foreground`
- Badge de "Atualizado ha X" alinhado a direita no mesmo nivel

**Filtros**: Substituir Card atual por FilterBar padronizado

**KPIs**: 
- Grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6` (6 cards por linha em telas grandes, nao 11 cards)
- Agrupar KPIs relacionados visualmente:
  - Linha 1: Ativos, Na Fila, Encerrados Hoje, Atendentes Online, CSAT Medio, Taxa Resolucao
  - Linha 2: TME, Tempo 1a Resposta, Nao Resolvidos, Taxa Abandono, Tempo Resolucao
- Usar MetricCard unificado para todos (remover cards inline customizados)

**Graficos**: 
- Grid de 2 colunas usando ChartCard padronizado
- Altura uniforme de 240px
- Cores dos graficos usando tokens do design system (primary, accent, success)

**Tabela de Performance**:
- Dentro de Card com header compacto
- Texto da tabela `text-[13px]`
- Head com `text-[10px] uppercase tracking-wider`
- Celulas numericas com `tabular-nums font-medium`

**Status em Tempo Real por Time**:
- Section label padronizado
- Cards de time com header mais compacto: nome do time a esquerda, badges resumo a direita
- Resumo inline: `text-[11px]` com separadores visuais (dot separators)
- Tabela de atendentes: tipografia reduzida para `text-[13px]`
- Barra de capacidade mais fina: `h-1.5` (era `h-2`)
- Status badge menor e mais sutil

### 6. AdminDashboardGerencial.tsx -- Alinhar com mesmo padrao

- Substituir KPICard local pelo MetricCard padrao
- Aplicar mesmo grid de KPIs
- Usar ChartCard para graficos
- Alinhar FilterBar
- Tabela de performance com mesma tipografia

### 7. AdminCSATReport.tsx -- Redesign

**Header**: Titulo + subtitulo + botao Export alinhados

**Filtros**: FilterBar com score chips integrados na mesma linha

**KPIs**: 4 MetricCards padronizados em `grid-cols-2 lg:grid-cols-4`

**Graficos**: 2 ChartCards lado a lado com altura de 240px

**Tabela de Resultados**:
- Card com header compacto: titulo + contador + sort dropdown
- Tipografia da tabela: `text-[13px]`
- Coluna Score: estrelas menores `h-3 w-3` + numero sem borda extra (simplificar)
- Coluna Comentario: max-width com truncate + tooltip (ja existe, manter)
- Paginacao com visual mais limpo: botoes ghost ao inves de outline

### 8. AdminChatHistory.tsx -- Alinhar tipografia e espacamentos

- Aplicar mesmo padrao de header (PageHeader component)
- Filtros com FilterBar padronizado (mover filtros de busca + selects para dentro)
- Tabela com mesma tipografia reduzida `text-[13px]`
- Headers `text-[10px] uppercase tracking-wider`
- Paginacao com mesmo visual das outras paginas

## Regras de Tipografia Padronizadas

| Elemento | Classe |
|----------|--------|
| Titulo da pagina | `text-2xl font-semibold` |
| Subtitulo da pagina | `text-sm text-muted-foreground` |
| Label de secao | `text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60` |
| Titulo de card/chart | `text-sm font-medium` |
| Label de KPI | `text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70` |
| Valor de KPI | `text-2xl font-semibold tabular-nums` |
| Header de tabela | `text-[10px] font-medium uppercase tracking-wider text-muted-foreground` |
| Celula de tabela | `text-[13px]` |
| Badge/chip | `text-[10px] font-medium` |
| Texto auxiliar | `text-[11px] text-muted-foreground` |

## Espacamentos Padronizados

| Entre | Valor |
|-------|-------|
| Secoes da pagina | `gap-6` (24px) |
| Cards no grid | `gap-4` (16px) |
| Dentro de card (padding) | `p-4` |
| Label de secao ate conteudo | `mb-3` |

## Arquivos Modificados

- `src/components/ui/metric-card.tsx` -- ajustes de tamanho
- `src/components/ui/section-label.tsx` -- NOVO
- `src/components/ui/filter-bar.tsx` -- NOVO
- `src/components/ui/chart-card.tsx` -- NOVO
- `src/pages/AdminDashboard.tsx` -- redesign completo
- `src/pages/AdminDashboardGerencial.tsx` -- alinhar padrao
- `src/pages/AdminCSATReport.tsx` -- redesign
- `src/pages/AdminChatHistory.tsx` -- ajustes de tipografia e filtros

## Nenhuma mudanca no banco de dados ou logica de hooks

Todas as mudancas sao puramente visuais/UI. Os hooks, queries e dados permanecem identicos.
