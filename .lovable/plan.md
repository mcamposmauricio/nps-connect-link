
# Equipes, Categorias de Atendimento, e Regras de Fila

## Resumo

Este plano implementa 4 funcionalidades interligadas: criacao de equipes de atendentes, categorias de atendimento para empresas, regras de fila (qual equipe atende qual categoria), e prioridade de atendimento no cadastro de empresas. Tambem move o menu "Atendentes" da sidebar para dentro das configuracoes do chat.

## Novas tabelas no banco de dados

### 1. `chat_teams` - Equipes de atendimento
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| tenant_id | uuid | Isolamento multi-tenant |
| name | text | Nome da equipe (ex: "Suporte Tecnico") |
| description | text | Descricao opcional |
| user_id | uuid | Criador |
| created_at | timestamptz | |

### 2. `chat_team_members` - Vinculo atendente-equipe
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| team_id | uuid FK | Referencia a chat_teams |
| attendant_id | uuid FK | Referencia a attendant_profiles |
| tenant_id | uuid | |
| created_at | timestamptz | |
| UNIQUE(team_id, attendant_id) | | Evita duplicata |

### 3. `chat_service_categories` - Categorias de atendimento
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| tenant_id | uuid | |
| name | text | Nome (ex: "Premium", "Standard") |
| description | text | |
| color | text | Cor para badge visual |
| user_id | uuid | Criador |
| created_at | timestamptz | |

### 4. `chat_category_teams` - Regras de fila (quais equipes atendem cada categoria)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| category_id | uuid FK | Referencia a chat_service_categories |
| team_id | uuid FK | Referencia a chat_teams |
| tenant_id | uuid | |
| priority_order | integer | Ordem de prioridade entre equipes |
| created_at | timestamptz | |
| UNIQUE(category_id, team_id) | | Evita duplicata |

### 5. Alteracao na tabela `contacts`
- Adicionar coluna `service_category_id` (uuid, nullable, FK para chat_service_categories)
- Adicionar coluna `service_priority` (text, default 'normal') -- valores: 'low', 'normal', 'high', 'critical'

## Politicas RLS

Todas as novas tabelas terao politicas baseadas em `tenant_id = get_user_tenant_id(auth.uid())` para SELECT, INSERT, UPDATE, DELETE -- seguindo o padrao ja usado nas demais tabelas de chat.

## Mudancas na interface

### 1. Configuracoes do Chat (`AdminSettings.tsx`) - Novas abas

Adicionar 3 novas abas na pagina de configuracoes do chat:

**Aba "Atendentes"** - Mover o conteudo atual de `AdminAttendants.tsx` para dentro desta aba. O componente ja existe, apenas sera incorporado como tab. Adicionar nesta aba um seletor de equipe para cada atendente (multi-select, permitindo o atendente pertencer a varias equipes).

**Aba "Equipes"** - CRUD de equipes:
- Lista de equipes com nome, descricao, e quantidade de membros
- Botao para criar nova equipe
- Dialog de edicao/criacao com campos nome e descricao
- Botao de excluir com confirmacao

**Aba "Categorias"** - CRUD de categorias de atendimento:
- Lista de categorias com nome, cor, e empresas vinculadas
- Botao para criar nova categoria
- Dialog de criacao/edicao com campos nome, descricao, cor
- Secao para atribuir empresas a cada categoria (multi-select buscando de `contacts` onde `is_company = true`)
- Secao para definir quais equipes atendem esta categoria (multi-select de `chat_teams`)

### 2. Sidebar (`AppSidebar.tsx`)

- Remover o item "Atendentes" (`/admin/attendants`) da sidebar do chat (sera acessado via configuracoes)

### 3. Cadastro de Empresas (`CompanyForm.tsx` e `CompanyDetailsSheet.tsx`)

- Adicionar campo "Prioridade de Atendimento" no formulario de empresa (`CompanyForm.tsx`):
  - Select com opcoes: Baixa, Normal, Alta, Critica
  - Default: Normal
- Adicionar campo "Categoria de Atendimento" no formulario de empresa:
  - Select buscando de `chat_service_categories` do tenant
- Exibir esses campos tambem no `CompanyDetailsSheet.tsx` como badges visuais

### 4. Rota removida

- A rota `/admin/attendants` continua existindo mas redireciona para `/admin/settings/attendants`

## Arquivos modificados/criados

| # | Arquivo | Tipo | Descricao |
|---|---------|------|-----------|
| 1 | Migracao SQL | DB | Criar tabelas chat_teams, chat_team_members, chat_service_categories, chat_category_teams; alterar contacts |
| 2 | `src/pages/AdminSettings.tsx` | Modificado | Adicionar abas Atendentes, Equipes e Categorias |
| 3 | `src/components/chat/TeamsTab.tsx` | Novo | Componente da aba de equipes (CRUD) |
| 4 | `src/components/chat/CategoriesTab.tsx` | Novo | Componente da aba de categorias (CRUD + regras de fila) |
| 5 | `src/components/chat/AttendantsTab.tsx` | Novo | Componente da aba de atendentes (conteudo migrado de AdminAttendants + selecao de equipe) |
| 6 | `src/components/AppSidebar.tsx` | Modificado | Remover link "Atendentes" da sidebar |
| 7 | `src/components/CompanyForm.tsx` | Modificado | Adicionar campos prioridade e categoria |
| 8 | `src/components/CompanyDetailsSheet.tsx` | Modificado | Exibir prioridade e categoria |
| 9 | `src/pages/Contacts.tsx` | Modificado | Passar dados de prioridade/categoria ao inserir/editar |
| 10 | `src/pages/AdminAttendants.tsx` | Modificado | Redirecionar para /admin/settings/attendants |
| 11 | `src/locales/pt-BR.ts` | Modificado | Novas chaves de traducao |
| 12 | `src/locales/en.ts` | Modificado | Novas chaves de traducao |

## Fluxo de dados

```text
Empresa (contacts)
  |-- service_category_id --> chat_service_categories
  |-- service_priority (low/normal/high/critical)
  |
  +-- company_contacts (pessoas vinculadas herdam a categoria da empresa)

chat_service_categories
  |-- chat_category_teams --> chat_teams (quais equipes atendem)
  
chat_teams
  |-- chat_team_members --> attendant_profiles (quais atendentes pertencem)
```

Quando um chat e aberto por um contato de uma empresa com categoria X, o sistema sabe quais equipes e atendentes sao responsaveis, e a prioridade da empresa define a ordem na fila.
