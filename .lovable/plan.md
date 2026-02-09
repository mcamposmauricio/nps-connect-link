
# Fase 2 Revisada: Multi-Tenancy Completo + Informacoes da Organizacao

## Auditoria dos Riscos e Garantias de Seguranca

Apos revisao detalhada de todos os arquivos que serao afetados, aqui estao os riscos mapeados e as solucoes para cada um:

---

### Risco #1: Chat Widget Publico (`/widget`)
**Arquivo:** `ChatWidget.tsx` -- insere `chat_visitors` e `chat_rooms` com `owner_user_id: "00000000-0000-0000-0000-000000000000"` (placeholder UUID).

**Impacto:** Se exigirmos `tenant_id` no INSERT, esse fluxo quebra porque o widget nao tem autenticacao.

**Solucao:** `tenant_id` sera NULLABLE em `chat_rooms` e `chat_visitors`. As policies publicas de INSERT existentes (`Public can insert rooms`, `Public can insert visitors`) serao MANTIDAS intactas. Novas policies de tenant sao adicionadas como COMPLEMENTARES (OR), nao substitutas.

---

### Risco #2: Portal Publico (`/portal/:token`)
**Arquivo:** `UserPortal.tsx` -- busca `company_contacts` por `public_token`, cria `chat_visitors` com `owner_user_id: contact.user_id`, cria `chat_rooms` -- tudo sem autenticacao.

**Impacto:** Se RLS exigir `tenant_id = get_user_tenant_id(auth.uid())`, `auth.uid()` sera NULL e falha.

**Solucao:** Todas as policies publicas existentes em `chat_rooms`, `chat_visitors`, `chat_messages`, e `company_contacts` (por `public_token`) serao MANTIDAS. As novas policies de tenant sao adicionais.

---

### Risco #3: NPS Response e Embed Publicos
**Arquivos:** `NPSResponse.tsx`, `NPSEmbed.tsx`, edge functions `check-nps-pending`, `submit-embedded-response`

**Impacto:** NPS busca `campaign_contacts` por `link_token`, acessa `campaigns` e `brand_settings` publicamente. INSERT em `responses` e publico.

**Solucao:** Policies publicas de SELECT em `campaigns`, `campaign_contacts`, `brand_settings`, `contacts` e de INSERT em `responses` serao MANTIDAS intactas. Nao tocaremos nessas policies.

---

### Risco #4: NPSResponse usa `campaigns.user_id` para buscar `brand_settings`
**Arquivo:** `NPSResponse.tsx` (linha 73) -- `settingsQuery.eq("user_id", campaigns.user_id)` como fallback quando `brand_settings_id` nao existe.

**Impacto:** Se mudarmos RLS de `brand_settings` para tenant, essa query continua funcionando porque a policy publica `Public can view brand settings for NPS responses` (USING: true) ja permite acesso.

**Solucao:** Nenhuma mudanca necessaria neste arquivo. A policy publica garante o acesso.

---

### Risco #5: Edge Functions usam service_role + `user_id`
**Arquivos:** 4 edge functions confirmadas usando `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS completo).

**Impacto:** Nenhum -- service role ignora RLS. As queries por `user_id` continuam funcionando porque `user_id` NAO sera removido de nenhuma tabela.

**Solucao:** NAO alterar edge functions nesta fase.

---

### Risco #6: Database Triggers usam `user_id`
**Funcoes:** `create_recovery_trail_for_detractor`, `update_contact_nps_on_response`, `create_nps_trail_on_campaign_contact`, `create_chat_timeline_event`, `sync_csm_chat_enabled`, `update_company_contact_chat_metrics` -- todas usam `user_id` ou `owner_user_id`.

**Impacto:** Triggers sao SECURITY DEFINER e acessam tabelas diretamente, nao passam por RLS.

**Solucao:** NAO alterar triggers. `user_id` permanece em todas as tabelas.

---

### Risco #7: `useDashboardStats` e `useChatHistory` nao filtram por user_id
**Arquivos:** Esses hooks buscam `chat_rooms` SEM filtro de `user_id`, dependendo 100% do RLS.

**Impacto:** Se mudarmos o RLS de `chat_rooms` para exigir `tenant_id`, o admin precisa ter `tenant_id` correto no `user_profiles` (ja resolvido na Fase 1).

**Solucao:** A migracao populara `tenant_id` em todos os registros de `chat_rooms` ANTES de alterar RLS. Como as policies publicas serao mantidas, e o admin autentica normalmente, tudo continua visivel.

---

### Risco #8: `useAttendants` busca todos os attendant_profiles sem filtro
**Arquivo:** `useAttendants.ts` -- busca `.from("attendant_profiles").select("*")` sem nenhum filtro.

**Impacto:** Depende 100% do RLS. Atualmente tem policy para admin ver tudo e user ver o proprio.

**Solucao:** Substituir policies de `attendant_profiles` por tenant-based. Manter policy para user ver o proprio.

---

### Risco #9: `Results.tsx` filtra por `campaigns.user_id` dentro do join
**Arquivo:** `Results.tsx` (linha 73) -- `.eq("campaigns.user_id", user.id)` usando inner join.

**Impacto:** Com RLS de tenant em `campaigns`, o filtro `.eq("campaigns.user_id", user.id)` nao retornara resultados para membros da equipe que nao sao o admin original.

**Solucao:** Mudar para `.eq("campaigns.tenant_id", tenantId)` no `Results.tsx`. Da mesma forma, `Dashboard.tsx` (linhas 133-135 e 194) precisa mudar o inner join filter.

---

### Risco #10: `CampaignDetails.tsx` tem 4 queries com `user_id`
**Arquivo:** `CampaignDetails.tsx` -- campaign fetch, brand_settings fallback, contacts list.

**Impacto:** Queries como `.eq("user_id", user.id)` nao mostrarao dados para membros da equipe.

**Solucao:** Mudar para `.eq("tenant_id", tenantId)` onde aplicavel. O fallback de `brand_settings` por `user_id` (linha 365, 440) deve mudar para `tenant_id`.

---

## Estrategia de RLS: Abordagem Segura

Para cada tabela, seguiremos esta logica:

**Tabelas SEM acesso publico** (somente autenticado):
- DROP policy antiga `Users can X their own Y` (baseada em `user_id`)
- CREATE nova policy `Tenant members can X Y` (baseada em `tenant_id = get_user_tenant_id(auth.uid())`)

**Tabelas COM acesso publico** (chat, NPS):
- MANTER todas as policies publicas existentes
- DROP apenas as policies de `user_id` para operacoes autenticadas
- CREATE novas policies de tenant para operacoes autenticadas

---

## Implementacao

### 1. Migration SQL

**Funcao auxiliar:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT tenant_id FROM public.user_profiles 
     WHERE user_id = _user_id LIMIT 1 $$;
```

**Adicionar `tenant_id` a 21 tabelas** (todas como `uuid REFERENCES tenants(id)` NULLABLE):
- contacts, company_contacts, campaigns, brand_settings, csms
- trails, trail_templates, timeline_events
- chat_settings, chat_business_hours, chat_auto_rules, chat_macros, chat_tags, chat_custom_fields
- chat_rooms, chat_visitors
- user_email_settings, user_notification_settings, api_keys
- attendant_profiles, user_permissions

**Popular dados existentes** usando `user_id` -> `user_profiles.tenant_id`:
```sql
UPDATE contacts SET tenant_id = (
  SELECT tenant_id FROM user_profiles 
  WHERE user_id = contacts.user_id LIMIT 1
) WHERE user_id IS NOT NULL AND tenant_id IS NULL;
-- Repetir para todas as 21 tabelas
```

Para tabelas que usam `owner_user_id` (chat_rooms, chat_visitors):
```sql
UPDATE chat_rooms SET tenant_id = (
  SELECT tenant_id FROM user_profiles 
  WHERE user_id = chat_rooms.owner_user_id LIMIT 1
) WHERE owner_user_id != '00000000-0000-0000-0000-000000000000' 
  AND tenant_id IS NULL;
```

**Tabelas cujas RLS NAO mudam** (acesso via FK, sem `user_id` proprio):
- `campaign_contacts`, `campaign_sends`, `responses` -- acesso via FK para `campaigns`
- `trail_activity_logs` -- acesso via FK para `trails`
- `trail_template_activities` -- acesso via FK para `trail_templates`
- `chat_messages` -- acesso via FK para `chat_rooms`
- `chat_room_tags` -- acesso via FK para `chat_rooms`

**Tabela `user_roles`** -- NAO recebe `tenant_id` (roles sao globais)

### 2. Aba "Organizacao" nas Configuracoes

**Novo componente:** `OrganizationSettingsTab.tsx`
- Exibe informacoes do tenant atual: nome, slug
- Permite ao admin editar o nome da organizacao
- Mostra dados somente-leitura: ID do tenant, data de criacao
- Exibe contagem de membros e recursos
- Somente admins verao esta aba

**Alteracao em `Settings.tsx`:**
- Adicionar nova aba "Organizacao" com icone `Building2`
- Aumentar grid para 6 colunas quando admin

**Nova RLS para tenants:**
- Admins podem atualizar o proprio tenant

---

## Arquivos Modificados: Lista Completa

### Novos (2 arquivos):
| Arquivo | Descricao |
|---------|-----------|
| Migration SQL | Funcao auxiliar + colunas + popular dados + RLS |
| `src/components/OrganizationSettingsTab.tsx` | Aba de informacoes da organizacao |

### Frontend -- Mudanca de `user_id` para `tenant_id` nas queries (26 arquivos):

**Pages (14):**
| Arquivo | Queries afetadas |
|---------|-----------------|
| `Contacts.tsx` | fetchCompanies: `contacts.eq("user_id")` -> `eq("tenant_id")`. handleAddCompany/handleAddContact inserts: `user_id: user.id` -> adicionar `tenant_id: tenantId` (manter `user_id` tambem para compatibilidade com triggers) |
| `Dashboard.tsx` | 6 queries: contacts count, campaigns select, responses inner join, contacts search |
| `Campaigns.tsx` | fetchCampaigns, fetchContactsCount, handleDeleteCampaign |
| `CampaignDetails.tsx` | fetchCampaign, brand_settings fallback, contacts list (4 queries) |
| `CSDashboard.tsx` | contacts query + csms query |
| `CSHealthPage.tsx` | contacts query |
| `CSChurnPage.tsx` | 3 contacts queries |
| `CSFinancialPage.tsx` | contacts query |
| `CSTrailsPage.tsx` | trail_templates query + insert |
| `CSMsPage.tsx` | csms query + contacts query + insert |
| `People.tsx` | company_contacts query |
| `AdminSettings.tsx` | chat_settings, chat_macros, chat_business_hours, chat_auto_rules queries + inserts |
| `AdminAttendants.tsx` | csms query (atualmente sem filtro user_id, agora precisa tenant_id) |
| `Results.tsx` | responses inner join com campaigns.user_id -> campaigns.tenant_id |

**Components (8):**
| Arquivo | Queries afetadas |
|---------|-----------------|
| `BrandSettingsTab.tsx` | brand_settings query + upsert |
| `EmailSettingsTab.tsx` | user_email_settings query + upsert |
| `NotificationSettingsTab.tsx` | user_notification_settings query + upsert |
| `ApiKeysTab.tsx` | api_keys query + insert |
| `CampaignForm.tsx` | brand_settings query + campaign insert |
| `CompanySelector.tsx` | contacts query |
| `QuickContactForm.tsx` | company_contacts insert |
| `Settings.tsx` | Adicionar aba Organizacao |

**Hooks (4):**
| Arquivo | Mudanca |
|---------|---------|
| `useDashboardStats.ts` | Sem mudanca (depende do RLS que sera atualizado) |
| `useAttendants.ts` | Sem mudanca (depende do RLS que sera atualizado) |
| `useChatHistory.ts` | Sem mudanca (depende do RLS, policies publicas mantidas) |
| `useChatRealtime.ts` | Sem mudanca (depende do RLS, policies publicas mantidas) |

**Locales (2):**
| Arquivo | Mudanca |
|---------|---------|
| `pt-BR.ts` | Novas chaves para aba Organizacao |
| `en.ts` | Novas chaves para aba Organizacao |

### Arquivos NAO Modificados (garantias de seguranca):

| Arquivo | Motivo |
|---------|--------|
| `ChatWidget.tsx` | Policies publicas mantidas, tenant_id NULLABLE |
| `UserPortal.tsx` | Policies publicas mantidas |
| `NPSResponse.tsx` | Policy publica de SELECT garante acesso |
| `NPSEmbed.tsx` | Usa edge function com service_role |
| `Auth.tsx` | Login/convite nao precisa tenant_id |
| `AdminDashboard.tsx` | Depende do RLS (atualizado automaticamente) |
| `AdminWorkspace.tsx` | Queries por user_id especifico, sem mudanca |
| `AdminChatHistory.tsx` | Usa hook useChatHistory (RLS automatico) |
| `AdminDashboardGerencial.tsx` | Usa hooks (RLS automatico) |
| 4 edge functions | Usam service_role, bypass RLS |
| 8 database triggers/functions | SECURITY DEFINER, usam user_id que permanece |
| `useAuth.ts` | Ja retorna tenantId, queries por user_id pessoal continuam |
| `UserPermissionsDialog.tsx` | Queries por user_id especifico de perfil |
| `TeamSettingsTab.tsx` | Ja usa tenantId para convites |

---

## Padrao de Mudanca nos Arquivos Frontend

### Para queries SELECT:
**Antes:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
supabase.from("contacts").select("*").eq("user_id", user.id)
```

**Depois:**
```typescript
// Recebe tenantId do useAuth ou como prop
supabase.from("contacts").select("*").eq("tenant_id", tenantId)
```

### Para queries INSERT:
**Antes:**
```typescript
supabase.from("contacts").insert({ user_id: user.id, name: "..." })
```

**Depois:**
```typescript
supabase.from("contacts").insert({ 
  user_id: user.id,  // MANTER para compatibilidade com triggers
  tenant_id: tenantId,  // ADICIONAR
  name: "..." 
})
```

A coluna `user_id` continua nos INSERTs porque os triggers (ex: `create_recovery_trail_for_detractor`) usam `contacts.user_id` para criar registros derivados. Removamos `user_id` dos INSERTs apenas numa fase futura quando os triggers forem atualizados.

### Para queries com inner join:
**Antes:**
```typescript
supabase.from("responses")
  .select("*, campaigns!inner(user_id)")
  .eq("campaigns.user_id", user.id)
```

**Depois:**
```typescript
supabase.from("responses")
  .select("*, campaigns!inner(tenant_id)")
  .eq("campaigns.tenant_id", tenantId)
```

---

## Ordem de Implementacao

1. Migration SQL (funcao auxiliar + colunas + popular dados + RLS)
2. `OrganizationSettingsTab.tsx` (novo componente)
3. `Settings.tsx` (adicionar aba Organizacao)
4. Pages CS (CSDashboard, CSHealthPage, CSChurnPage, CSFinancialPage, CSTrailsPage, CSMsPage)
5. Pages NPS (Dashboard, Campaigns, CampaignDetails, Results)
6. Pages Chat (AdminSettings, AdminAttendants)
7. Pages Cadastros (Contacts, People)
8. Components (BrandSettingsTab, EmailSettingsTab, NotificationSettingsTab, ApiKeysTab, CampaignForm, CompanySelector, QuickContactForm)
9. Locales (pt-BR.ts + en.ts)

---

## Resumo de Seguranca

1. Chat Widget: policies publicas MANTIDAS, tenant_id NULLABLE
2. NPS publico: policies publicas MANTIDAS intactas
3. Portal publico: policies publicas MANTIDAS intactas
4. Triggers: usam user_id que PERMANECE em todas as tabelas
5. Edge functions: usam service_role, NAO afetadas
6. user_id: NAO removido de nenhuma tabela
7. Admin existente: tenant_id ja populado na Fase 1
8. Dados existentes: migrados com UPDATE antes de alterar RLS
