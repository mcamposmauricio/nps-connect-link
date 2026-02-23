

# Provisionar Primeiro Admin ao Criar Tenant

## Objetivo

Ao criar uma nova plataforma (tenant) no backoffice, incluir campos para o primeiro usuario administrador (nome e email). Esse usuario sera automaticamente provisionado com convite pendente e role `admin`, permitindo que ele acesse a plataforma e comece a convidar outros usuarios.

---

## 1. Frontend -- Formulario de Criacao de Tenant

**Arquivo:** `src/components/backoffice/TenantManagement.tsx`

Adicionar ao formulario de "Novo Tenant" (apenas quando NAO esta editando):

- Campo **"Email do primeiro admin"** (obrigatorio na criacao)
- Campo **"Nome do primeiro admin"** (obrigatorio na criacao)
- Separador visual com titulo "Primeiro Administrador"

Ao salvar:
1. Criar o tenant via `supabase.from("tenants").insert(...)` e obter o `id` retornado
2. Chamar a Edge Function `backoffice-admin` com action `provision-tenant-admin` passando `tenantId`, `email` e `displayName`
3. Exibir toast de sucesso com informacao de que o convite foi criado

O estado do form passa a incluir `admin_email` e `admin_name`.

---

## 2. Edge Function -- Nova Action `provision-tenant-admin`

**Arquivo:** `supabase/functions/backoffice-admin/index.ts`

Adicionar case `"provision-tenant-admin"` que:

1. Recebe `tenantId`, `email`, `displayName`
2. Verifica se ja existe usuario no `auth.users` com esse email
   - Se **SIM**: usa o `user_id` existente
   - Se **NAO**: cria o usuario via `adminClient.auth.admin.createUser({ email, email_confirm: false })` (gera convite por email)
3. Cria o `user_profile` com:
   - `user_id`, `email`, `display_name`, `tenant_id`, `invite_status: 'accepted'`, `is_active: true`
4. Insere `user_roles` com `role: 'admin'` para esse `user_id`
5. Envia email de reset de senha via `adminClient.auth.resetPasswordForEmail(email)` para que o usuario defina sua senha
6. Retorna sucesso com o `user_id` criado

Isso usa `service_role_key` (necessario para `auth.admin`) e ja esta protegido pela verificacao de role `master`.

---

## 3. Fluxo Completo

```text
1. Master clica "Novo Tenant"
2. Preenche: Nome da plataforma, Slug, Logo
3. Preenche: Email e Nome do primeiro admin
4. Clica "Salvar"
5. Sistema cria o tenant no banco
6. Sistema chama edge function para provisionar o admin:
   a. Cria usuario no auth (ou reutiliza existente)
   b. Cria user_profile vinculado ao tenant
   c. Cria user_role como admin
   d. Envia email de definicao de senha
7. Toast: "Plataforma criada! Convite enviado para [email]"
```

---

## Secao Tecnica

| Arquivo | Alteracao |
|---|---|
| `src/components/backoffice/TenantManagement.tsx` | Adicionar campos admin_email e admin_name ao form, chamar edge function apos criar tenant |
| `supabase/functions/backoffice-admin/index.ts` | Adicionar action `provision-tenant-admin` |

