

# Adicionar Filtros Avancados na Tela de Empresas

## Objetivo

Adicionar o filtro de **coluna do Kanban (cs_status)** e outros filtros relevantes na tela de Empresas (`/nps/contacts`), aproveitando dados que ja existem na tabela `contacts` mas nao estao expostos na interface de filtragem.

## Novos Filtros

| Filtro | Campo | Valores |
|---|---|---|
| **Etapa do Kanban** | `cs_status` | Implementacao, Onboarding, Acompanhamento, Churn |
| **Prioridade** | `service_priority` | Normal, Alta, Urgente |
| **Health Score** | `health_score` | Saudavel (70-100), Atencao (40-69), Critico (0-39) |
| **NPS** | `last_nps_score` | Promotor (9-10), Neutro (7-8), Detrator (0-6), Sem resposta |

Esses filtros se somam aos ja existentes (Setor, Estado, Cidade).

## Mudancas Tecnicas

### 1. `src/pages/Contacts.tsx`

- Adicionar estados: `csStatusFilter`, `priorityFilter`, `healthFilter`, `npsFilter`
- Incluir os novos `Select` na barra de filtros, usando as traducoes ja existentes para cs_status (`cs.status.implementacao`, etc.)
- Atualizar a logica de filtragem do `.filter()` para considerar os novos campos
- Atualizar o contador de filtros ativos e o botao de limpar
- Expandir a interface `Company` para incluir `cs_status`, `health_score`, `service_priority`, `last_nps_score`

### 2. `src/locales/pt-BR.ts` e `src/locales/en.ts`

- Adicionar chaves para os novos filtros:
  - `companies.filterByKanban` / `companies.allKanbanStages`
  - `companies.filterByPriority` / `companies.allPriorities`
  - `companies.filterByHealth` / `companies.allHealthScores`
  - `companies.filterByNPS` / `companies.allNPS`
  - Labels para faixas de health score e NPS

### 3. Nenhuma alteracao no banco de dados

Todos os campos ja existem na tabela `contacts` e ja sao retornados pela query `select("*")`.

