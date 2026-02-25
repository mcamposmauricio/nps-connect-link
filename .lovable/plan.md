
# Plano: Dashboard de Chat Completa + Status em Tempo Real por Time + Relatorio CSAT

## Resumo

Tres grandes melhorias no modulo de Chat:

1. **Dashboard de Atendimento reformulada** com indicadores mais completos e insights visuais
2. **Status em Tempo Real com segmentacao por time** e mais indicadores por atendente
3. **Nova pagina de Relatorio CSAT** com listagem completa, filtros avancados e link para conversa

---

## 1. Dashboard de Atendimento (AdminDashboard.tsx) -- Melhorias

### 1.1 Novos KPIs no header de metricas

Adicionar cards que faltam ao grid atual de 7 cards:

| KPI | Calculo | Icone |
|-----|---------|-------|
| Tempo Medio de Espera (TME) | Media entre `created_at` e `assigned_at` das rooms do periodo | Clock |
| Tempo Medio de Primeira Resposta | Ja existe no hook, promover para card visivel | Zap |
| Chats Nao Resolvidos | Ja existe (`unresolvedChats`), promover para card | AlertTriangle |
| Taxa de Abandono | Rooms que ficaram em `waiting` e foram fechadas sem attendant_id | TrendingDown |

### 1.2 Novos graficos

- **Grafico de Conversas por Dia** (ja existe no Gerencial, trazer para o Dashboard principal como area chart)
- **Grafico de CSAT por Dia** (line chart -- ja existe no Gerencial, trazer)
- **Grafico de Horario de Pico** (bar chart 24h -- ja existe no Gerencial, trazer)
- **Distribuicao de Resolucao** (donut/pie chart com resolved/pending/escalated/archived)

### 1.3 Tabela de Performance por Atendente

Adicionar a tabela de performance (`attendantPerformance`) que ja existe no Gerencial, mas com colunas extras:
- Nome, Total Chats, CSAT Medio, Taxa Resolucao, Tempo Medio Resolucao, **Tempo Medio Primeira Resposta**, **Time (nome do chat_team)**

### 1.4 Filtros adicionais

Adicionar ao filtro existente:
- **Regra de Atendimento (Categoria)** -- dropdown de `chat_service_categories`
- **Tag** -- dropdown de `chat_tags`

---

## 2. Status em Tempo Real -- Segmentacao por Time

### 2.1 Reorganizar a secao "Status em Tempo Real"

Substituir a tabela plana de atendentes por uma visao agrupada por time:

```text
Time: Suporte Nivel 1
  +----------------------------+--------+-------+-------------+
  | Atendente                  | Status | Fila  | Capacidade  |
  +----------------------------+--------+-------+-------------+
  | Maria Silva (voce)         | Online |   2   | ████░ 3/5   |
  | Joao Santos                | Busy   |   1   | ██████ 5/5  |
  +----------------------------+--------+-------+-------------+
  Resumo: 2 online | 5 ativos | Cap. media: 80%

Time: Suporte Nivel 2
  ...

Sem Time
  | Pedro Costa                | Offline|   0   | ░░░░░ 0/5   |
```

### 2.2 Indicadores por time (resumo inline)

Cada bloco de time exibe:
- Total de atendentes online / total do time
- Total de conversas ativas no time
- Capacidade media do time (%)
- CSAT medio do time (no periodo filtrado)

### 2.3 Indicadores adicionais por atendente

Adicionar colunas na tabela:
- **Nivel** (Junior/Pleno/Senior) -- badge colorido
- **Conversas Ativas** (numero atual) vs **Capacidade Max**
- **CSAT** (media no periodo, com estrela)
- Manter a funcionalidade de expandir para ver rooms individuais

### 2.4 Dados necessarios

Buscar `chat_teams` e `chat_team_members` para agrupar atendentes. Usar join com `attendant_profiles` para enrichment. Atendentes sem time ficam em grupo "Sem Time".

---

## 3. Nova Pagina: Relatorio CSAT

### 3.1 Rota e navegacao

- Rota: `/admin/csat`
- Novo arquivo: `src/pages/AdminCSATReport.tsx`
- Adicionar no menu lateral no grupo "Relatorios" com icone Star e label "CSAT"
- Adicionar rota em `App.tsx`

### 3.2 Metricas do header (4 cards)

| Card | Valor |
|------|-------|
| CSAT Medio | Media geral do periodo |
| Total de Avaliacoes | Quantidade de rooms com csat_score != null |
| Avaliacoes Positivas | % de notas 4-5 |
| Avaliacoes Negativas | % de notas 1-2 |

### 3.3 Graficos

- **CSAT por Dia** (line chart com media diaria)
- **Distribuicao de Notas** (bar chart horizontal: quantas notas 1, 2, 3, 4, 5)

### 3.4 Filtros

| Filtro | Tipo |
|--------|------|
| Periodo | today/week/month/all |
| Nota CSAT | 1, 2, 3, 4, 5 (multi-select ou dropdown) |
| Atendente | dropdown de attendant_profiles |
| Time | dropdown de chat_teams |
| Tag | dropdown de chat_tags |
| Data De / Ate | date pickers |

### 3.5 Tabela de resultados

Colunas da tabela:

| Coluna | Descricao |
|--------|-----------|
| Cliente | Nome do visitante (visitor_name) |
| Atendente | display_name do attendant |
| Nota | 1-5 com estrelas coloridas (vermelho 1-2, amarelo 3, verde 4-5) |
| Comentario | Texto do csat_comment (truncado com tooltip) |
| Duracao | Tempo total da conversa |
| Tags | Tags vinculadas a room |
| Data | Data de encerramento |
| Acao | Botao "Ver Conversa" que abre ReadOnlyChatDialog |

### 3.6 Paginacao e exportacao

- Paginacao: 20 registros por pagina
- Botao "Exportar CSV" com todas as colunas
- Ordenacao por nota (asc/desc) e por data

### 3.7 Hook dedicado: `useCSATReport.ts`

Query: `chat_rooms` WHERE `csat_score IS NOT NULL` AND `status = 'closed'`, com joins para visitor_name, attendant_name, tags. Filtros aplicados via query params.

---

## Alteracoes tecnicas

### Arquivos novos
- `src/pages/AdminCSATReport.tsx` -- pagina completa do relatorio CSAT
- `src/hooks/useCSATReport.ts` -- hook de dados paginados com filtros

### Arquivos modificados
- `src/pages/AdminDashboard.tsx` -- adicionar graficos, KPIs extras, tabela de performance, filtros de categoria/tag, secao de status reorganizada por time
- `src/hooks/useDashboardStats.ts` -- adicionar calculo de TME, taxa de abandono, tempo medio de primeira resposta por atendente
- `src/components/AppSidebar.tsx` -- adicionar link "CSAT" no grupo de Relatorios
- `src/App.tsx` -- adicionar rota `/admin/csat`
- `src/locales/pt-BR.ts` -- chaves de traducao para CSAT report
- `src/locales/en.ts` -- chaves de traducao para CSAT report

### Sem alteracoes no banco de dados
Todos os dados necessarios ja existem nas tabelas `chat_rooms`, `chat_visitors`, `attendant_profiles`, `chat_teams`, `chat_team_members`, `chat_tags`, `chat_room_tags`. Nenhuma migration necessaria.
