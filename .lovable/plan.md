
# Plano: Expansao do Modulo de Chat - Historico, Dashboard Gerencial, Configuracoes e Portal Publico

## Visao Geral

Expandir as paginas existentes do modulo de chat (AdminChatHistory, AdminDashboardGerencial, AdminSettings) com funcionalidades completas, e criar uma nova pagina publica para usuarios/contatos acessarem seu proprio historico de chats sem autenticacao.

---

## O que ja existe (nao precisa criar)

- Tabelas: `chat_rooms`, `chat_messages`, `chat_visitors`, `chat_tags`, `chat_room_tags`, `chat_macros`, `chat_settings`, `attendant_profiles`, `user_roles`, `company_contacts`
- Hooks: `useAuth`, `useChatRealtime`, `useAttendants`
- Paginas basicas: `AdminChatHistory`, `AdminDashboardGerencial`, `AdminSettings`
- Rotas e sidebar ja configurados
- Chaves i18n basicas

---

## FASE 1: Banco de Dados (Novas tabelas e colunas)

### 1.1 Adicionar coluna `resolution_status` em `chat_rooms`

```sql
ALTER TABLE public.chat_rooms 
ADD COLUMN IF NOT EXISTS resolution_status text DEFAULT 'pending';
```

Valores: `pending`, `resolved`, `escalated`

### 1.2 Criar tabela `chat_business_hours`

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid NOT NULL | - |
| day_of_week | integer NOT NULL | - |
| start_time | text | '08:00' |
| end_time | text | '18:00' |
| is_active | boolean | true |
| created_at | timestamptz | now() |

RLS: user_id = auth.uid()

### 1.3 Criar tabela `chat_auto_rules`

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid NOT NULL | - |
| rule_type | text NOT NULL | - |
| is_enabled | boolean | true |
| trigger_minutes | integer | null |
| message_content | text | null |
| created_at / updated_at | timestamptz | now() |

Tipos de rule_type: `welcome_message`, `offline_message`, `inactivity_warning`, `auto_close`

RLS: user_id = auth.uid()

### 1.4 Criar tabela `chat_custom_fields`

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid NOT NULL | - |
| name | text NOT NULL | - |
| label | text NOT NULL | - |
| field_type | text | 'text' |
| placeholder | text | null |
| is_required | boolean | false |
| sort_order | integer | 0 |
| created_at | timestamptz | now() |

RLS: user_id = auth.uid()

### 1.5 Adicionar coluna `public_token` em `company_contacts`

```sql
ALTER TABLE public.company_contacts 
ADD COLUMN IF NOT EXISTS public_token text DEFAULT (gen_random_uuid())::text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_contacts_public_token 
ON company_contacts(public_token);
```

### 1.6 Adicionar indices de performance

```sql
CREATE INDEX IF NOT EXISTS idx_chat_rooms_closed_at 
  ON chat_rooms(closed_at DESC) WHERE status = 'closed';
CREATE INDEX IF NOT EXISTS idx_chat_rooms_status 
  ON chat_rooms(status);
CREATE INDEX IF NOT EXISTS idx_chat_room_tags_room_id 
  ON chat_room_tags(room_id);
```

### 1.7 RLS para acesso publico ao portal do usuario

Adicionar politica em `chat_rooms` e `chat_messages` para permitir SELECT publico filtrado por `company_contact_id` (ja existe SELECT publico nessas tabelas).

---

## FASE 2: Expandir AdminChatHistory (`/admin/history`)

### Arquivo: `src/pages/AdminChatHistory.tsx` (reescrever)

**Funcionalidades novas:**
- Paginacao real (20 por pagina) com controles anterior/proximo
- Filtros: resolution_status, attendant_id, tag_id, busca por nome do visitante
- Enriquecimento: nome do visitante (via chat_visitors), nome do atendente (via attendant_profiles), tags (via chat_room_tags + chat_tags)
- Exportacao CSV (Blob + URL.createObjectURL, sem dependencia externa)
- Badges coloridos para resolution_status: resolved=verde, pending=laranja, escalated=vermelho
- Coluna CSAT com nota

### Hook novo: `src/hooks/useChatHistory.ts`

Encapsula:
- Fetch paginado de `chat_rooms` com joins para visitor name, attendant name, tags, CSAT
- Controle de filtros e paginacao
- Funcao `exportToCSV` com colunas: ID, Cliente, Atendente, Status, Resolucao, CSAT, Inicio, Encerramento, Tags

---

## FASE 3: Expandir AdminDashboardGerencial (`/admin/gerencial`)

### Arquivo: `src/pages/AdminDashboardGerencial.tsx` (reescrever)

**Novas metricas (KPIs em cards):**
1. Total de Chats (30 dias)
2. Chats Hoje
3. CSAT Medio
4. Taxa de Resolucao (%)
5. Tempo Medio de Resolucao (minutos, calculado de created_at ate closed_at)

**Novos graficos:**
- BarChart: Conversas por dia (ultimos 30 dias) -- ja existe, manter
- BarChart horizontal: Chats por Atendente
- Cards com distribuicao por resolution_status (resolved/pending/escalated)

**Filtros:**
- Periodo: Hoje | 7 dias | 30 dias | Todos
- Filtro por atendente (select)

### Hook novo: `src/hooks/useDashboardStats.ts`

Encapsula todas as queries de metricas e retorna o objeto `DashboardStats` com calculo de:
- `resolutionRate`: (resolved / total) * 100
- `avgResolutionTime`: media de (closed_at - created_at) em minutos
- `chatsByAttendant`: agrupado por attendant_id com nome via join
- `resolutionDistribution`: contagem por resolution_status

---

## FASE 4: Expandir AdminSettings (`/admin/settings`)

### Arquivo: `src/pages/AdminSettings.tsx` (reescrever)

**De 2 abas (General + Widget) para 5 abas:**

1. **Geral** (existente - manter): welcome_message, offline_message, auto_assignment, max_queue_size
2. **Widget** (existente - manter): codigo de integracao
3. **Macros**: CRUD de `chat_macros` - listar, criar, editar, excluir
4. **Horarios**: Tabela de 7 dias da semana com start_time, end_time, is_active (toggle) usando `chat_business_hours`
5. **Regras**: CRUD de `chat_auto_rules` - cards com toggle habilitado, campo de minutos (se aplicavel), campo de mensagem

Cada aba como componente inline ou secao separada dentro do mesmo arquivo para manter simplicidade.

---

## FASE 5: Portal Publico do Usuario

### 5.1 Nova rota: `/portal/:token`

Rota publica (sem SidebarLayout, sem autenticacao) que mostra:
- Dados do usuario (nome, email, empresa)
- Lista de chats anteriores do usuario (via `company_contact_id`)
- Status de cada conversa
- CSAT dado (se houver)
- Possibilidade de clicar para ver transcript readonly

### 5.2 Arquivo: `src/pages/UserPortal.tsx` (novo)

**Fluxo:**
1. Recebe `token` da URL
2. Busca `company_contacts` por `public_token = token`
3. Se encontrado, busca `chat_rooms` por `company_contact_id`
4. Exibe lista de conversas com status, data, CSAT
5. Clicar em conversa expande transcript (readonly)
6. Layout limpo, sem sidebar, com header simples mostrando nome da empresa

**Design:** Card centralizado, responsivo, sem necessidade de auth. Tudo atribuido ao `company_contact_id` correspondente.

### 5.3 Link publico na pagina de contatos

Adicionar no `CompanyContactsList.tsx` (ou equivalente) um botao/icone de "Link do Portal" que gera a URL:
`{origin}/portal/{company_contact.public_token}`

Com botao de copiar para clipboard.

### 5.4 Registrar rota em `App.tsx`

```tsx
<Route path="/portal/:token" element={<UserPortal />} />
```

---

## FASE 6: Traducoes i18n

### Novas chaves a adicionar em pt-BR.ts e en.ts:

**Historico:**
- `chat.history.filter.status`, `chat.history.filter.attendant`, `chat.history.filter.tag`, `chat.history.filter.clear`
- `chat.history.export_csv`, `chat.history.client`, `chat.history.attendant`, `chat.history.resolution`
- `chat.history.csat`, `chat.history.tags`, `chat.history.no_data`, `chat.history.page`

**Gerencial:**
- `chat.gerencial.chats_today`, `chat.gerencial.resolution_rate`, `chat.gerencial.avg_resolution`
- `chat.gerencial.chats_by_attendant`, `chat.gerencial.resolution_distribution`
- `chat.gerencial.period`, `chat.gerencial.filter_by_attendant`

**Settings:**
- `chat.settings.tab_macros`, `chat.settings.tab_hours`, `chat.settings.tab_rules`
- `chat.settings.macros.*`, `chat.settings.hours.*`, `chat.settings.rules.*`

**Portal:**
- `chat.portal.title`, `chat.portal.chats`, `chat.portal.no_chats`, `chat.portal.status`
- `chat.portal.view_transcript`, `chat.portal.not_found`, `chat.portal.copy_link`, `chat.portal.link_copied`

---

## Resumo de Arquivos

### Novos:
| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/useChatHistory.ts` | Hook de historico paginado com filtros e export CSV |
| `src/hooks/useDashboardStats.ts` | Hook de metricas gerenciais |
| `src/pages/UserPortal.tsx` | Portal publico do usuario |

### Modificados:
| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/AdminChatHistory.tsx` | Reescrever com filtros, paginacao, enriquecimento, export CSV |
| `src/pages/AdminDashboardGerencial.tsx` | Expandir com novos KPIs, graficos, filtros |
| `src/pages/AdminSettings.tsx` | Adicionar abas Macros, Horarios, Regras |
| `src/App.tsx` | Adicionar rota `/portal/:token` |
| `src/locales/pt-BR.ts` | +~50 chaves novas |
| `src/locales/en.ts` | +~50 chaves novas |

### Banco de dados (migration):
- 1 coluna nova em `chat_rooms` (resolution_status)
- 1 coluna nova em `company_contacts` (public_token)
- 3 tabelas novas: `chat_business_hours`, `chat_auto_rules`, `chat_custom_fields`
- RLS em todas as tabelas novas
- Indices de performance

---

## Ordem de Implementacao

1. **Migration SQL** -- colunas, tabelas novas, indices, RLS
2. **Hooks** -- useChatHistory, useDashboardStats
3. **AdminChatHistory** -- reescrever com funcionalidades completas
4. **AdminDashboardGerencial** -- expandir com novos KPIs e graficos
5. **AdminSettings** -- adicionar abas Macros, Horarios, Regras
6. **UserPortal** -- pagina publica + rota
7. **i18n** -- todas as traducoes
8. **App.tsx** -- rota do portal

---

## Detalhes Tecnicos

- **Export CSV**: Usando `Blob` + `URL.createObjectURL` nativo, sem papaparse (para export)
- **Paginacao**: Offset-based com `.range(from, to)` do Supabase
- **Filtros**: Aplicados na query do Supabase (`.eq()`, `.ilike()`), nao em memoria
- **Portal publico**: Sem `SidebarLayout`, design standalone com layout proprio
- **RLS portal**: Reutiliza as policies publicas ja existentes em `chat_rooms` e `chat_messages` (SELECT publico)
- **Graficos**: Recharts (BarChart, PieChart) ja instalado no projeto
