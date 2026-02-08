

# Plano: Modulo de Chat Nativo - NPS Connect Link

## Visao Geral

Construir um sistema de chat de atendimento completo como modulo nativo do sistema, integrado ao menu lateral, banco de dados, sistema de permissoes e timeline existentes. O chat conecta visitantes (via widget embedado) a CSMs habilitados para atendimento em tempo real.

---

## FASE 1: Fundacao (Banco de Dados e Permissoes)

### 1.1 Criar tabela `user_roles`

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'attendant');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

### 1.2 Criar funcao `has_role()` (SECURITY DEFINER)

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### 1.3 RLS para `user_roles`

- SELECT: Admins podem ver todos; usuarios veem o proprio
- INSERT/UPDATE/DELETE: Somente admins

### 1.4 Alterar tabela `csms`

Adicionar colunas:
- `is_chat_enabled boolean DEFAULT false`
- `chat_max_conversations integer DEFAULT 5`

### 1.5 Alterar tabela `company_contacts`

Adicionar colunas:
- `chat_visitor_id text`
- `chat_total integer DEFAULT 0`
- `chat_avg_csat numeric DEFAULT 0`
- `chat_last_at timestamptz`

### 1.6 Criar tabelas do chat

**`chat_settings`** - Configuracoes globais do chat por usuario (owner)

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid NOT NULL | - |
| welcome_message | text | 'Bem-vindo!' |
| offline_message | text | 'Estamos offline' |
| business_hours | jsonb | '{}' |
| auto_assignment | boolean | true |
| max_queue_size | integer | 50 |
| require_approval | boolean | false |
| created_at / updated_at | timestamptz | now() |

**`attendant_profiles`** - Perfis de atendentes (vinculados a CSMs)

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid NOT NULL | - |
| csm_id | uuid NOT NULL (FK csms.id) | - |
| display_name | text NOT NULL | - |
| avatar_url | text | null |
| status | text | 'offline' |
| max_conversations | integer | 5 |
| active_conversations | integer | 0 |
| created_at / updated_at | timestamptz | now() |

**`chat_visitors`** - Visitantes do chat

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| owner_user_id | uuid NOT NULL | - |
| company_contact_id | uuid (FK) | null |
| contact_id | uuid (FK contacts.id) | null |
| name | text NOT NULL | - |
| email | text | null |
| phone | text | null |
| role | text | null |
| department | text | null |
| visitor_token | text UNIQUE | gen_random_uuid() |
| metadata | jsonb | '{}' |
| created_at | timestamptz | now() |

**`chat_rooms`** - Salas de conversa

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| owner_user_id | uuid NOT NULL | - |
| visitor_id | uuid NOT NULL (FK chat_visitors.id) | - |
| attendant_id | uuid (FK attendant_profiles.id) | null |
| contact_id | uuid (FK contacts.id) | null |
| company_contact_id | uuid (FK company_contacts.id) | null |
| status | text | 'waiting' |
| priority | text | 'normal' |
| started_at | timestamptz | now() |
| assigned_at | timestamptz | null |
| closed_at | timestamptz | null |
| csat_score | integer | null |
| csat_comment | text | null |
| metadata | jsonb | '{}' |
| created_at / updated_at | timestamptz | now() |

**`chat_messages`** - Mensagens

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| room_id | uuid NOT NULL (FK chat_rooms.id) | - |
| sender_type | text NOT NULL | - |
| sender_id | text | null |
| sender_name | text | null |
| content | text NOT NULL | - |
| message_type | text | 'text' |
| is_internal | boolean | false |
| metadata | jsonb | '{}' |
| created_at | timestamptz | now() |

**`chat_macros`** - Respostas rapidas

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid NOT NULL | - |
| title | text NOT NULL | - |
| content | text NOT NULL | - |
| shortcut | text | null |
| category | text | null |
| created_at / updated_at | timestamptz | now() |

**`chat_tags`** - Tags para categorizar conversas

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid NOT NULL | - |
| name | text NOT NULL | - |
| color | text | '#6366f1' |
| created_at | timestamptz | now() |

**`chat_room_tags`** - Relacao N:N rooms-tags

| Coluna | Tipo |
|--------|------|
| room_id | uuid FK |
| tag_id | uuid FK |
| PK | (room_id, tag_id) |

### 1.7 Habilitar Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
```

### 1.8 Adicionar valor ao enum `timeline_event_type`

```sql
ALTER TYPE public.timeline_event_type ADD VALUE IF NOT EXISTS 'chat_opened';
ALTER TYPE public.timeline_event_type ADD VALUE IF NOT EXISTS 'chat_closed';
```

### 1.9 RLS para todas as tabelas de chat

- `chat_settings`: owner (user_id = auth.uid())
- `attendant_profiles`: owner (user_id = auth.uid())
- `chat_visitors`: owner (owner_user_id = auth.uid()) + publico para INSERT (visitantes anonimos)
- `chat_rooms`: owner + SELECT publico para visitantes (via visitor_token)
- `chat_messages`: via room ownership + publico para visitantes (via room)
- `chat_macros`: owner (user_id = auth.uid())
- `chat_tags`: owner (user_id = auth.uid())
- `chat_room_tags`: via room ownership

### 1.10 Triggers automaticos

**Trigger: Sincronizar CSMs com attendant_profiles**
- Quando `csms.is_chat_enabled` muda para `true`: criar `attendant_profiles`
- Quando muda para `false`: remover `attendant_profiles`

**Trigger: Atualizar metricas em company_contacts ao fechar chat**
- Incrementar `chat_total`
- Recalcular `chat_avg_csat`
- Atualizar `chat_last_at`

**Trigger: Criar timeline_event ao abrir/fechar chat**
- Tipo: `chat_opened` / `chat_closed`
- Metadata: room_id, visitor_name, csat

---

## FASE 2: Infraestrutura Frontend (Auth, Hooks, Contexto)

### 2.1 Criar `src/hooks/useAuth.ts`

Hook que expoe:
- `user` (dados do Supabase auth)
- `isAdmin` (consulta `has_role(uid, 'admin')`)
- `isChatEnabled` (consulta `csms.is_chat_enabled` para o user)
- `loading`

### 2.2 Criar `src/pages/PendingApproval.tsx`

Pagina simples: "Sua conta esta aguardando aprovacao do administrador."
- Usada quando `chat_settings.require_approval = true` e usuario nao tem role

### 2.3 Criar `src/hooks/useChatRealtime.ts`

Hook para subscrever mensagens e status de rooms em tempo real via Supabase Realtime channels.

### 2.4 Criar `src/hooks/useAttendants.ts`

Hook para listar, atualizar status e gerenciar atendentes.

### 2.5 Adicionar chaves i18n

Adicionar ~40 chaves em `src/locales/pt-BR.ts` e `src/locales/en.ts` para todo o modulo de chat (conforme especificacao).

---

## FASE 3: Widget do Visitante

### 3.1 Criar `src/pages/ChatWidget.tsx`

Rota: `/widget`
Parametros: `?embed=true&companyName=NomeDaEmpresa&api_key=xxx`

Fluxo:
1. Verificar `chat_visitor_id` no localStorage
2. Se nao existe: exibir formulario (nome*, email, phone, role, department)
3. Ao submeter: criar `chat_visitor` + `chat_room` (status: 'waiting')
4. Tela de espera com animacao
5. Quando atendente assume (status muda para 'active'): transicao para chat
6. Chat em tempo real via Realtime
7. Ao fechar: exibir formulario CSAT (1-5 estrelas + comentario)
8. PostMessage para aplicacao pai: `chat-ready`, `chat-connected`, `chat-closed`, `chat-csat-submitted`

---

## FASE 4: Painel Administrativo

### 4.1 `src/pages/AdminDashboard.tsx` - Rota: `/admin/dashboard`

Metricas em cards:
- Conversas ativas / na fila / encerradas hoje
- Tempo medio de resposta
- CSAT medio
- Atendentes online

### 4.2 `src/pages/AdminWorkspace.tsx` - Rota: `/admin/workspace/:roomId?`

Layout em 3 colunas:
- **Esquerda**: Lista de conversas (filtros: ativas, fila, minhas)
- **Centro**: Area de chat (mensagens, input, notas internas)
- **Direita**: Painel de info do visitante (dados, historico, empresa vinculada)

Funcionalidades:
- Assumir conversa da fila
- Transferir para outro atendente
- Adicionar tags
- Usar macros (atalhos de texto)
- Notas internas (is_internal = true, nao visivel ao visitante)
- Encerrar conversa

### 4.3 `src/pages/AdminAttendants.tsx` - Rota: `/admin/attendants`

Listar CSMs existentes com toggle `is_chat_enabled`.
- NAO permite criar CSM aqui (redireciona para /csms)
- Toggle aciona trigger que cria/remove attendant_profiles
- Exibe status atual (online/busy/offline)
- Exibe conversas ativas

### 4.4 `src/pages/AdminUsers.tsx` - Rota: `/admin/users`

Gestao de roles (user_roles):
- Listar usuarios do sistema
- Atribuir/remover role `admin` ou `attendant`
- Somente admins tem acesso

### 4.5 `src/pages/AdminSettings.tsx` - Rota: `/admin/settings/:tab?`

Tabs:
- **Geral**: welcome_message, offline_message, auto_assignment
- **Horario**: business_hours (JSON editor simplificado)
- **Macros**: CRUD de chat_macros
- **Tags**: CRUD de chat_tags
- **Widget**: Codigo de integracao (similar ao NPS widget)

### 4.6 `src/pages/AdminDashboardGerencial.tsx` - Rota: `/admin/gerencial`

Graficos com recharts:
- Conversas por dia (ultimos 30 dias)
- CSAT por periodo
- Tempo medio de resposta
- Ranking de atendentes

### 4.7 `src/pages/AdminChatHistory.tsx` - Rota: `/admin/history`

Tabela paginada com filtros:
- Data, atendente, status, tags, CSAT
- Clicar abre transcript completo readonly

---

## FASE 5: Integracao com Sistema Existente

### 5.1 Atualizar `src/App.tsx`

Adicionar todas as rotas:
```
/widget
/admin/dashboard
/admin/workspace
/admin/workspace/:roomId
/admin/attendants
/admin/users
/admin/settings
/admin/settings/:tab
/admin/gerencial
/admin/history
/pending-approval
```

### 5.2 Atualizar `src/components/AppSidebar.tsx`

Nova secao "Chat Atendimento" com sub-grupos:
- Chat: Dashboard, Workspace
- Gestao (admin): Atendentes, Usuarios
- Relatorios (admin): Dashboard Gerencial, Historico
- Config (admin): Configuracoes

Items `adminOnly` so aparecem se `useAuth().isAdmin === true`.

### 5.3 Timeline Integration

Triggers de banco criam eventos em `timeline_events` automaticamente quando chat e aberto/fechado, ligando ao `contact_id` da empresa.

### 5.4 company_contacts metricas

Triggers atualizam `chat_total`, `chat_avg_csat`, `chat_last_at` em `company_contacts` ao fechar um chat com CSAT.

---

## FASE 6: Componentes Compartilhados

### Novos componentes a criar:

| Componente | Descricao |
|---|---|
| `src/components/chat/ChatMessageList.tsx` | Lista de mensagens com scroll infinito |
| `src/components/chat/ChatInput.tsx` | Input com suporte a macros e envio |
| `src/components/chat/ChatRoomList.tsx` | Lista lateral de conversas |
| `src/components/chat/VisitorInfoPanel.tsx` | Painel lateral com dados do visitante |
| `src/components/chat/CSATForm.tsx` | Formulario de avaliacao (1-5 estrelas) |
| `src/components/chat/ChatQueueIndicator.tsx` | Badge de fila de espera |
| `src/components/chat/MacroSelector.tsx` | Dropdown de macros |
| `src/components/chat/TagSelector.tsx` | Multi-select de tags |
| `src/components/chat/ChatMetricsCards.tsx` | Cards de metricas reutilizaveis |
| `src/components/chat/AttendantStatusBadge.tsx` | Badge de status do atendente |

---

## Arquivos Existentes Modificados

| Arquivo | Alteracao |
|---|---|
| `src/App.tsx` | +11 rotas novas |
| `src/components/AppSidebar.tsx` | +secao Chat com items condicionais |
| `src/locales/pt-BR.ts` | +~40 chaves |
| `src/locales/en.ts` | +~40 chaves |
| `src/components/SidebarLayout.tsx` | Nenhuma (ja funciona para proteger as paginas) |

---

## Arquivos Novos (Resumo)

- 2 hooks: `useAuth.ts`, `useChatRealtime.ts`, `useAttendants.ts`
- 1 pagina widget: `ChatWidget.tsx`
- 7 paginas admin: `AdminDashboard.tsx`, `AdminWorkspace.tsx`, `AdminAttendants.tsx`, `AdminUsers.tsx`, `AdminSettings.tsx`, `AdminDashboardGerencial.tsx`, `AdminChatHistory.tsx`
- 1 pagina utilitaria: `PendingApproval.tsx`
- ~10 componentes em `src/components/chat/`
- 8 tabelas novas + 2 colunas em csms + 4 colunas em company_contacts
- 1 funcao SQL (has_role)
- 1 enum SQL (app_role)
- 2 valores no enum timeline_event_type
- 3+ triggers SQL
- RLS em todas as tabelas novas

---

## Ordem de Implementacao Sugerida

Dado o tamanho, recomendo dividir em etapas incrementais:

1. **Etapa 1**: Migrations SQL (tabelas, enums, funcao has_role, RLS, triggers) -- tudo de banco primeiro
2. **Etapa 2**: Hook useAuth + AdminUsers (gestao de roles) -- fundacao de permissoes
3. **Etapa 3**: AdminAttendants + toggle CSM -- habilitar atendentes
4. **Etapa 4**: ChatWidget (visitante) + chat_visitors + chat_rooms + chat_messages -- fluxo basico
5. **Etapa 5**: AdminWorkspace (atendente responde) + Realtime -- o chat funciona
6. **Etapa 6**: AdminDashboard + AdminSettings + Macros/Tags -- gestao
7. **Etapa 7**: AdminDashboardGerencial + AdminChatHistory -- relatorios
8. **Etapa 8**: Sidebar + Rotas + i18n -- integracao final
9. **Etapa 9**: Triggers de integracao (timeline, metricas company_contacts)

---

## Notas de Seguranca

- `user_roles` usa funcao `has_role()` com SECURITY DEFINER para evitar recursao RLS
- Visitantes sao anonimos (sem auth), mas limitados a criar visitors/rooms e enviar mensagens nas suas proprias rooms via `visitor_token`
- Admins validados via `has_role(auth.uid(), 'admin')` no banco, nunca no frontend
- Todas as tabelas com RLS habilitado

