
# Renomear Configuracoes de Chat, Adicao em Massa e Melhorias no Relatorio de Atendimento

## Resumo

Este plano cobre 3 frentes: (1) renomear abas e labels nas configuracoes do chat, (2) melhorar a UX de adicao de empresas em categorias com selecao em massa, e (3) revisar o relatorio gerencial de atendimento adicionando novos KPIs e graficos para gerar mais insights gerenciais.

---

## 1. Renomear abas e labels

| Aba/label atual | Novo nome (PT-BR) | Novo nome (EN) |
|---|---|---|
| Equipes | Times de Atendimento | Service Teams |
| Regras | Msgs Automaticas | Auto Messages |
| Categorias | Regras de Atendimento | Service Rules |

Arquivos afetados:
- `src/locales/pt-BR.ts` - Atualizar chaves `chat.teams.title`, `chat.settings.tab_rules`, `chat.categories.title`
- `src/locales/en.ts` - Mesmas chaves
- `src/components/chat/CategoriesTab.tsx` - Atualizar label de "Equipes responsaveis" para "Times responsaveis"

---

## 2. Adicao em massa de empresas nas categorias (`CategoriesTab.tsx`)

Substituir o `<select>` simples por um Dialog com:

- Campo de busca para filtrar empresas por nome
- Lista com checkboxes para selecionar multiplas empresas
- Botao "Selecionar todas" (filtradas)
- Botao "Adicionar X empresas" que salva todas de uma vez
- Contador mostrando quantas estao selecionadas

Fluxo: usuario clica em "+ Adicionar empresas" na categoria, abre Dialog, busca/filtra, marca as desejadas, clica "Adicionar".

---

## 3. Melhorias no Relatorio de Atendimento (Gerencial)

### 3.1 Novos KPIs (alem dos 5 existentes)

| KPI atual | Mantem? |
|---|---|
| Total de Chats | Sim |
| Chats Hoje | Sim |
| CSAT Medio | Sim |
| Taxa de Resolucao | Sim |
| Tempo Medio de Resolucao | Sim |

**Novos KPIs a adicionar:**

| Novo KPI | Descricao | Calculo |
|---|---|---|
| Tempo Medio de Primeira Resposta | Quanto tempo leva para o atendente enviar a primeira mensagem apos o chat ser criado | Diferenca entre `chat_rooms.created_at` e a primeira `chat_messages.created_at` onde `sender_type = 'attendant'` |
| Chats sem Resolucao | Quantidade de chats fechados sem resolucao definida (status "pending") | Filtrar rooms onde `status = 'closed'` e `resolution_status = 'pending'` |

### 3.2 Novos graficos/secoes

**Grafico de Evolucao CSAT por periodo** - Grafico de linha mostrando a media de CSAT ao longo dos dias do periodo selecionado (complementa o bar chart de volume).

**Tabela de Performance por Atendente** - Tabela detalhada com colunas:
- Nome do atendente
- Total de chats
- CSAT medio individual
- Taxa de resolucao individual
- Tempo medio de resolucao individual

Isso substitui o grafico de barras horizontal atual por algo mais rico em informacao.

**Grafico de Horarios de Pico** - Heatmap ou bar chart mostrando distribuicao de chats por hora do dia, permitindo ao gestor entender quando ha mais demanda.

### 3.3 Filtro adicional

Adicionar filtro por **categoria de atendimento** (service category) para cruzar dados com as novas regras de fila.

### 3.4 Atualizacao do hook `useDashboardStats.ts`

Adicionar ao `DashboardStats`:
- `avgFirstResponseMinutes: number | null` - tempo medio de primeira resposta
- `unresolvedChats: number` - chats sem resolucao
- `csatByDay: { date: string; avg: number }[]` - evolucao CSAT
- `attendantPerformance: { name: string; chats: number; csat: number | null; resolutionRate: number | null; avgResolution: number | null }[]` - performance individual
- `chatsByHour: { hour: number; count: number }[]` - distribuicao por hora

Adicionar ao `DashboardFilters`:
- `categoryId?: string | null` - filtro por categoria de atendimento

Para calcular o tempo de primeira resposta, sera necessario consultar `chat_messages` agrupando pela `room_id` para encontrar a primeira mensagem do tipo attendant.

---

## Arquivos modificados/criados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/locales/pt-BR.ts` | Renomear chaves de abas e adicionar novas chaves para relatorio |
| 2 | `src/locales/en.ts` | Mesmas traducoes em ingles |
| 3 | `src/pages/AdminSettings.tsx` | Atualizar labels das tabs (chaves de traducao atualizadas refletem automaticamente) |
| 4 | `src/components/chat/CategoriesTab.tsx` | Adicao em massa com Dialog, busca e checkboxes; renomear labels de "equipes" para "times" |
| 5 | `src/hooks/useDashboardStats.ts` | Novos campos de stats, filtro por categoria, consulta a chat_messages para primeira resposta |
| 6 | `src/pages/AdminDashboardGerencial.tsx` | Novos KPI cards, grafico CSAT por dia, tabela de performance, grafico por hora, filtro de categoria |

## Nenhuma mudanca no banco de dados

Todos os dados necessarios ja existem nas tabelas `chat_rooms`, `chat_messages`, `contacts` e `chat_service_categories`.
