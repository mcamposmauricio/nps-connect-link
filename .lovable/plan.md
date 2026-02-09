

# Plano Revisado: Convites, Consolidacao CSM + Multi-Tenancy

## Auditoria Completa -- Riscos Identificados

Apos revisar todos os arquivos do projeto, identifiquei **pontos criticos** que o plano anterior poderia quebrar. Esta versao revisada endereca cada um deles.

---

## Risco #1: Chat Widget Publico Usa `owner_user_id` Fixo

**Arquivo:** `src/pages/ChatWidget.tsx` (linhas 131-148)

O widget de chat publico (`/widget`) insere visitantes e salas com `owner_user_id: "00000000-0000-0000-0000-000000000000"` -- um UUID placeholder. Se adicionarmos `tenant_id` como coluna obrigatoria nessas tabelas, esse fluxo vai quebrar imediatamente.

**Solucao:** O `tenant_id` deve ser NULLABLE nas tabelas `chat_visitors` e `chat_rooms`, e a migracao deve definir o tenant do admin existente apenas nos registros que ja tem `owner_user_id` real. O widget continuara funcionando sem tenant, e o admin vera as salas por RLS que permite acesso ao dono OU ao tenant.

---

## Risco #2: Portal Publico (`/portal/:token`) Acessa Dados Sem Auth

**Arquivo:** `src/pages/UserPortal.tsx`

O portal do usuario busca `company_contacts` por `public_token`, cria `chat_visitors`, cria `chat_rooms` -- tudo sem autenticacao. Se as RLS passarem a exigir `tenant_id = get_user_tenant_id(auth.uid())`, essas operacoes publicas vao falhar porque `auth.uid()` e NULL.

**Solucao:** Manter as policies publicas existentes (INSERT/SELECT/UPDATE sem restricao por tenant) para `chat_rooms`, `chat_messages`, `chat_visitors`, e `company_contacts` (via `public_token`). As policies de tenant serao adicionadas como **complementares** (PERMISSIVE), nao substitutas.

---

## Risco #3: NPS Response e Embed Sao Publicos

**Arquivos:** `src/pages/NPSResponse.tsx`, `src/pages/NPSEmbed.tsx`, e edge functions `check-nps-pending`, `submit-embedded-response`

A resposta NPS busca `campaign_contacts` por `link_token`, acessa `campaigns` e `brand_settings` -- tudo publicamente. As RLS ja tem policies publicas para SELECT nessas tabelas. INSERT em `responses` tambem e publico.

**Solucao:** As policies publicas existentes DEVEM ser mantidas. As novas policies de tenant serao adicionadas SEM remover as publicas.

---

## Risco #4: Edge Functions Usam `user_id` Para Buscar Dados

**Arquivos:** `supabase/functions/process-automatic-campaigns/index.ts` (linha 178), `supabase/functions/send-response-notification/index.ts` (linha 163), `supabase/functions/check-nps-pending/index.ts` (linha 73)

Essas funcoes usam `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS) e buscam dados usando `user_id` diretamente:
- `brand_settings.eq('user_id', campaign.user_id)`
- `company_contacts.eq('user_id', userId)`  
- `user_notification_settings.eq('user_id', campaign.user_id)`

Como usam service role, nao sao afetadas por mudancas em RLS. Mas as queries com `user_id` continuarao funcionando pois nao vamos REMOVER a coluna `user_id` -- apenas adicionaremos `tenant_id`.

**Solucao:** NAO alterar edge functions nesta fase. Elas continuam usando `user_id` que continuara existindo. Quando o multi-tenant estiver maduro, migraremos as functions para usar `tenant_id`.

---

## Risco #5: Database Triggers Usam `user_id`

**Funcoes afetadas:**
- `create_recovery_trail_for_detractor()` -- busca `contacts.user_id`
- `update_contact_nps_on_response()` -- usa `contacts.user_id`
- `create_nps_trail_on_campaign_contact()` -- usa `contacts.user_id`
- `create_chat_timeline_event()` -- usa `chat_rooms.owner_user_id`
- `update_company_contact_chat_metrics()` -- usa `company_contacts`
- `sync_csm_chat_enabled()` -- usa `csms.user_id`

**Solucao:** NAO alterar triggers nesta fase. Eles continuam usando `user_id` que permanece nas tabelas. Funciona porque `user_id` nao sera removido.

---

## Risco #6: AdminDashboard e useDashboardStats Nao Filtram por user_id

**Arquivo:** `src/pages/AdminDashboard.tsx` -- busca `chat_rooms` SEM filtro de `user_id` (depende 100% do RLS)

**Arquivo:** `src/hooks/useDashboardStats.ts` -- busca `chat_rooms` SEM filtro de `user_id`

Se mudarmos o RLS para exigir `tenant_id`, precisamos garantir que o `user_profiles` do admin tenha o `tenant_id` correto, caso contrario esses dashboards ficam vazios.

**Solucao:** A migracao deve popular o `tenant_id` no `user_profiles` do admin existente ANTES de alterar qualquer RLS.

---

## Risco #7: CSMs Sao Referenciados em Varios Lugares

A tabela `csms` e referenciada por:
- `contacts.csm_id` (atribuicao de CSM a empresa)
- `attendant_profiles.csm_id` (perfil de atendente vinculado ao CSM)
- `CSKanbanBoard.tsx` (dropdown de CSMs no Kanban)
- `CSDashboard.tsx` (lista CSMs ativos)
- `AdminWorkspace.tsx` (auto-provisioning de CSM)
- Trigger `sync_csm_chat_enabled` (cria attendant_profile quando CSM e chat-enabled)

**Solucao:** A tabela `csms` PERMANECE. A consolidacao CSM+Equipe sera apenas de UI -- o TeamSettingsTab mostrara dados de CS junto com permissoes, e ao salvar sincronizara com a tabela `csms`. A pagina CSMsPage pode ser mantida como redirect para Settings.

---

## Estrategia de Implementacao Segura -- Fases

Dada a complexidade e os riscos, a implementacao sera dividida em **2 fases**. A Fase 1 (esta implementacao) cobre convites + consolidacao CSM. A Fase 2 (futura) cobrira multi-tenancy completo.

### Fase 1 (ESTA IMPLEMENTACAO): Convites + Consolidacao CSM

Escopo limitado e seguro:

1. **Registro por convite** (alterar `user_profiles` + `Auth.tsx`)
2. **Consolidar CSMs na aba Equipe** (reescrever `TeamSettingsTab` + `UserPermissionsDialog`)
3. **Adicionar `tenant_id` somente em `user_profiles`** (como preparacao, sem mudar RLS de outras tabelas)
4. **Criar tabela `tenants`** (como preparacao, sem impacto no frontend)

### Fase 2 (FUTURA): Multi-Tenancy Completo

- Adicionar `tenant_id` a todas as 20+ tabelas
- Migrar RLS policies
- Atualizar todos os 22+ arquivos frontend
- Atualizar edge functions

---

## Detalhes da Fase 1

### 1. Migration SQL

```sql
-- Tabela de tenants (preparacao para futuro)
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Apenas admins gerenciam tenants por enquanto
CREATE POLICY "Authenticated users can view tenants"
  ON tenants FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Criar tenant para admin atual
INSERT INTO tenants (name, slug) 
VALUES ('Organizacao Principal', 'org-principal');

-- Adicionar colunas de convite + CS ao user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id),
  ADD COLUMN IF NOT EXISTS invite_token text UNIQUE 
    DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS invite_status text DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS invited_by uuid,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS specialty text[] DEFAULT '{}';

-- Associar admin existente ao tenant
UPDATE user_profiles 
SET tenant_id = (SELECT id FROM tenants LIMIT 1),
    invite_status = 'accepted'
WHERE user_id IS NOT NULL;

-- RLS para convites (publico pode ver perfis pendentes por token)
CREATE POLICY "Public can view pending invites by token"
  ON user_profiles FOR SELECT
  USING (invite_token IS NOT NULL AND invite_status = 'pending');

-- Admins podem criar perfis (convites) para qualquer usuario
CREATE POLICY "Admins can insert any profile"
  ON user_profiles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Publico pode aceitar convite (atualizar user_id ao registrar)
CREATE POLICY "Public can accept pending invite"
  ON user_profiles FOR UPDATE
  USING (invite_token IS NOT NULL AND invite_status = 'pending');
```

### 2. Auth.tsx -- Registro por Convite

Mudancas:
- Detectar `?invite=TOKEN` na URL
- **Com token valido**: mostrar formulario de primeiro acesso (nome pre-preenchido, email readonly, campo de senha)
- **Sem token**: mostrar APENAS formulario de login (remover toggle "criar conta")
- Ao registrar via convite: `signUp`, depois update do perfil com `user_id` e `invite_status = 'accepted'`
- Se o perfil tem especialidades CS, criar registro em `csms` automaticamente
- O upsert de profile que ja existe no useAuth continuara funcionando para logins normais

### 3. TeamSettingsTab -- Reescrita Completa

Nova funcionalidade:
- **Botao "Convidar Membro"** com dialog:
  - Nome (obrigatorio)
  - Email (obrigatorio)
  - Telefone (opcional)
  - Departamento (opcional)
  - Especialidades CS (checkboxes: Implementacao, Onboarding, Acompanhamento, Churn)
  - Ao salvar: cria `user_profiles` com `tenant_id` do admin, `invite_status = 'pending'`
  - Gera e copia link `/auth?invite=TOKEN`

- **Lista de membros** mostrando:
  - Avatar + Nome + Email
  - Badge: Pendente / Ativo / Inativo
  - Badge: Admin / Membro
  - Especialidades CS
  - Empresas vinculadas (count de `contacts.csm_id`)
  - Botao "Editar" e "Copiar link" (se pendente)

### 4. UserPermissionsDialog -- Campos CS Adicionados

Alem das permissoes por modulo:
- Campos de CS: telefone, departamento, especialidades
- Ao salvar, sincronizar com tabela `csms`:
  - Se o usuario tem especialidades e um `csms` ja existe: atualizar
  - Se tem especialidades e nao tem `csms`: criar
  - Se nao tem especialidades e tem `csms`: manter (nao deletar)

### 5. Sidebar e Routing

- Item "Equipe CS" (`/csms`) no sidebar -> redirecionar para `/nps/settings` (aba Team)
- Manter rota `/csms` no App.tsx como redirect para `/nps/settings`
- NAO deletar `CSMsPage.tsx` -- transformar em redirect

### 6. useAuth.ts

- Adicionar `tenantId: string | null` ao retorno
- Carregar do `user_profiles` junto com as permissoes
- NAO mudar nenhuma query existente no useAuth

---

## Arquivos Modificados

| Arquivo | Alteracao | Risco |
|---------|-----------|-------|
| Migration SQL | Criar `tenants`, alterar `user_profiles` | Baixo -- apenas adiciona colunas |
| `src/pages/Auth.tsx` | Detectar invite token, modo login-only | Medio -- muda fluxo de login |
| `src/components/TeamSettingsTab.tsx` | Reescrever com convite + dados CS | Baixo -- componente isolado |
| `src/components/UserPermissionsDialog.tsx` | Adicionar campos CS, sync csms | Baixo -- componente isolado |
| `src/hooks/useAuth.ts` | Adicionar tenantId ao retorno | Baixo -- apenas adiciona campo |
| `src/components/AppSidebar.tsx` | Redirecionar item CSMs para settings | Baixo -- apenas muda URL |
| `src/App.tsx` | Redirecionar `/csms` para `/nps/settings` | Baixo -- apenas redirect |
| `src/pages/CSMsPage.tsx` | Manter mas redirecionar para settings | Baixo -- fallback seguro |
| `src/locales/pt-BR.ts` | Novas chaves para convite e CS | Nenhum |
| `src/locales/en.ts` | Novas chaves em ingles | Nenhum |

## Arquivos NAO Modificados (mantidos intactos)

| Arquivo | Motivo |
|---------|--------|
| Todas as edge functions (6) | Usam service role + user_id que continua existindo |
| `src/pages/AdminWorkspace.tsx` | Auto-provisioning de CSM funciona normalmente |
| `src/pages/AdminDashboard.tsx` | Queries sem user_id filtram via RLS que nao muda |
| `src/pages/AdminSettings.tsx` | Usa user_id que continua existindo |
| `src/hooks/useDashboardStats.ts` | Queries por chat_rooms sem mudanca de RLS |
| `src/hooks/useChatRealtime.ts` | Queries por chat_rooms sem mudanca |
| `src/pages/UserPortal.tsx` | Acesso publico preservado |
| `src/pages/ChatWidget.tsx` | Widget publico preservado |
| `src/pages/NPSResponse.tsx` | Resposta NPS publica preservada |
| `src/pages/NPSEmbed.tsx` | Embed NPS publico preservado |
| `src/pages/CSDashboard.tsx` | Usa user_id que continua existindo |
| `src/pages/Contacts.tsx` | Usa user_id que continua existindo |
| `src/pages/Campaigns.tsx` | Usa user_id que continua existindo |
| `src/pages/Dashboard.tsx` | Usa user_id que continua existindo |
| Todas as 6 database functions/triggers | Usam user_id que permanece |
| `src/components/BrandSettingsTab.tsx` | Usa user_id inalterado |
| `src/components/EmailSettingsTab.tsx` | Usa user_id inalterado |
| `src/components/cs/*` | Componentes CS inalterados |

## O Que NAO Muda (Garantias de Seguranca)

1. **Chat continua funcionando** -- nenhuma RLS de chat_rooms, chat_messages, chat_visitors muda
2. **NPS publico continua funcionando** -- policies publicas de responses, campaign_contacts, campaigns preservadas
3. **Portal publico continua funcionando** -- policies de company_contacts e chat_rooms preservadas
4. **Permissionamento existente continua funcionando** -- hasPermission() e isAdmin nao mudam
5. **Widget de chat continua funcionando** -- owner_user_id placeholder nao e afetado
6. **Triggers e database functions continuam funcionando** -- usam user_id que permanece
7. **Edge functions continuam funcionando** -- usam service role + user_id que permanece
8. **Admin existente continua vendo todos os dados** -- user_id nao muda em nenhuma tabela
9. **CSMs existentes continuam vinculados** -- tabela csms permanece, apenas sincronizada via UI

## Criacao de Tenants Futuros (Via SQL)

```sql
-- Criar novo tenant
INSERT INTO tenants (name, slug) VALUES ('Nova Empresa', 'nova-empresa');

-- Criar perfil do admin (convite pendente)  
INSERT INTO user_profiles (tenant_id, email, display_name, 
  invite_status, invite_token)
VALUES (
  (SELECT id FROM tenants WHERE slug = 'nova-empresa'),
  'admin@nova.com', 'Admin Nova', 'pending', gen_random_uuid()
);

-- Enviar link: /auth?invite=TOKEN_GERADO
-- Apos aceitar, dar role admin:
INSERT INTO user_roles (user_id, role) 
VALUES ('...user_id_apos_registro...', 'admin');
```

---

## Ordem de Implementacao

1. Migration SQL (tenants + alteracoes user_profiles + RLS)
2. `useAuth.ts` (adicionar tenantId)
3. `Auth.tsx` (fluxo de convite)
4. `TeamSettingsTab.tsx` (reescrever com convite + CS)
5. `UserPermissionsDialog.tsx` (campos CS + sync csms)
6. `AppSidebar.tsx` + `App.tsx` (redirect /csms)
7. `CSMsPage.tsx` (transformar em redirect)
8. Locales (pt-BR.ts + en.ts)

