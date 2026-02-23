

# Correcao de Seguranca + Limpeza de Auth Users Orfaos

## Problemas Atuais

1. **Email duplicado nao detectado**: O `provision-tenant-admin` cria um segundo `user_profile` para um email ja existente sem aviso, causando conflito de tenant no login.
2. **Acesso direto sem convite**: O perfil e criado com `invite_status: 'accepted'`, permitindo login imediato -- deveria usar fluxo de convite com `invite_status: 'pending'`.
3. **Auth users orfaos**: O provisionamento pode ter criado usuarios no `auth.users` que nao correspondem a nenhum perfil valido, ou existem usuarios antigos sem vinculo.
4. **`loadUserData` usa `.maybeSingle()`**: Se um usuario tiver perfis em multiplos tenants, retorna erro ou o perfil errado.

---

## 1. Limpeza de Dados (Edge Function + UI)

### 1.1 Nova action `cleanup-orphan-auth-users` na Edge Function

**Arquivo:** `supabase/functions/backoffice-admin/index.ts`

Nova action que:

1. Lista todos os usuarios do `auth.users` via `adminClient.auth.admin.listUsers()`
2. Lista todos os `user_id` distintos da tabela `user_profiles`
3. Lista todos os `user_id` distintos da tabela `user_roles`
4. Identifica **orfaos**: usuarios no `auth.users` cujo `id` NAO aparece em `user_profiles` NEM em `user_roles`
5. Modo `dry_run` (padrao): retorna a lista de orfaos sem deletar
6. Modo `execute`: deleta os orfaos do `auth.users` via `adminClient.auth.admin.deleteUser()`
7. Nunca deleta o proprio master que esta executando

### 1.2 Limpeza do perfil duplicado de `mauricio@marqponto.com.br`

Alem da funcionalidade generica, uma correcao pontual:

- O perfil criado em MARQ HR para `mauricio@marqponto.com.br` (user_id: `0f04ffe2`) com `invite_status: 'accepted'` deve ser convertido para `invite_status: 'pending'` com `user_id: NULL` para forcar o fluxo de convite
- O auth user `0f04ffe2` criado pelo provisionamento deve ser removido (e orfao, foi criado desnecessariamente)
- A role `admin` para esse user_id tambem deve ser removida (sera recriada no aceite do convite)

### 1.3 UI na aba Operacoes

**Arquivo:** `src/components/backoffice/Operations.tsx`

Adicionar secao "Limpeza de Usuarios":

- Botao **"Verificar orfaos"** (dry_run) que lista usuarios no auth sem perfil
- Exibe a lista com email e data de criacao
- Botao **"Limpar orfaos"** (execute) com dialog de confirmacao
- Exibe resultado: quantos foram removidos

---

## 2. Correcao do Provisionamento

### 2.1 Validacao de email no frontend

**Arquivo:** `src/components/backoffice/TenantManagement.tsx`

Antes de salvar um novo tenant:

- Consultar `user_profiles` filtrando por `email` do admin
- Se encontrar perfil existente:
  - Exibir **AlertDialog** informando: "Este email ja esta associado a plataforma [Nome]. Deseja criar um convite para esta nova plataforma?"
  - Mostrar o tenant atual do usuario
  - Permitir continuar com confirmacao explicita
- Se nao encontrar: prosseguir normalmente

### 2.2 Edge Function corrigida

**Arquivo:** `supabase/functions/backoffice-admin/index.ts`

Alterar `provision-tenant-admin`:

**Para email que NAO existe no auth:**
1. Criar usuario via `admin.createUser({ email, email_confirm: true })` -- confirma email para evitar login direto
2. Criar `user_profile` com `invite_status: 'pending'`, `user_id: NULL`, e `invite_token` gerado
3. Retornar link de convite: `/auth?invite=TOKEN`

**Para email que JA existe no auth (usuario ja tem conta):**
1. NAO reutilizar o user_id no profile imediatamente
2. Criar `user_profile` com `invite_status: 'pending'`, `user_id: NULL`, e `invite_token`
3. Enviar email com link de convite via `resetPasswordForEmail` com redirect para `/auth?invite=TOKEN`
4. O usuario aceitara o convite e o sistema vinculara o `user_id` ao novo perfil

Em ambos os casos, a role `admin` NAO e criada no provisionamento -- sera criada quando o usuario aceitar o convite.

---

## 3. AuthContext -- Suporte Multi-Tenant

### 3.1 Buscar todos os perfis

**Arquivo:** `src/contexts/AuthContext.tsx`

Alterar `loadUserData`:

- Substituir `.maybeSingle()` por `.eq("invite_status", "accepted")` para buscar todos os perfis aceitos
- Se houver 1 perfil: usar normalmente (comportamento atual)
- Se houver multiplos: armazenar lista e expor `availableTenants`
- Expor `selectTenant(tenantId)` para troca de plataforma
- Persistir selecao em `localStorage`

### 3.2 Novos campos no contexto

```
availableTenants: { tenantId: string; tenantName: string }[]
selectTenant: (tenantId: string) => void
```

---

## 4. Tela de Selecao de Tenant

### 4.1 Componente inline no SidebarLayout

**Arquivo:** `src/components/SidebarLayout.tsx`

Quando `availableTenants.length > 1` e nenhum tenant selecionado:

- Exibir tela intermediaria com cards para cada plataforma
- Ao selecionar, define o tenantId e carrega o dashboard

### 4.2 Seletor no header (para troca rapida)

Quando ja logado com multiplos tenants, adicionar dropdown no header da sidebar para trocar entre plataformas.

---

## 5. Auth.tsx -- Aceite de Convite para Admin de Tenant

**Arquivo:** `src/pages/Auth.tsx`

O fluxo de convite ja existe. Ajustar para admin de tenant:

- Ao aceitar convite, verificar se o usuario ja tem conta no auth:
  - **Sim**: Usar `signInWithPassword` ao inves de `signUp` e vincular `user_id` ao novo perfil
  - **Nao**: Usar `signUp` normalmente (fluxo atual)
- Apos aceite, criar a role `admin` para o novo perfil
- Redirecionar para selecao de tenant (se multiplos) ou dashboard

---

## Secao Tecnica -- Arquivos

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/backoffice-admin/index.ts` | Corrigir `provision-tenant-admin` para usar convite pendente; adicionar action `cleanup-orphan-auth-users` |
| `src/components/backoffice/TenantManagement.tsx` | Validacao de email duplicado com AlertDialog de confirmacao |
| `src/components/backoffice/Operations.tsx` | Secao de limpeza de usuarios orfaos com dry_run e execute |
| `src/contexts/AuthContext.tsx` | Multi-perfil: buscar todos os perfis aceitos, expor `availableTenants` e `selectTenant` |
| `src/components/SidebarLayout.tsx` | Tela de selecao de tenant quando multiplos disponiveis |
| `src/pages/Auth.tsx` | Suporte a aceite de convite para usuario que ja tem conta; criacao de role admin no aceite |

## Fluxo Corrigido

```text
CRIACAO DE TENANT COM ADMIN NOVO:
1. Master cria tenant "MARQ HR" com admin "novo@empresa.com"
2. Sistema verifica: email nao existe -> prossegue
3. Edge function cria auth user + user_profile com invite_status='pending'
4. Email de convite enviado com link /auth?invite=TOKEN
5. Novo admin clica no link -> define senha -> perfil vinculado -> acessa a plataforma

CRIACAO DE TENANT COM EMAIL JA EXISTENTE:
1. Master cria tenant "MARQ HR" com admin "mauricio@marqponto.com.br"
2. Sistema detecta: "Email ja associado a Organizacao Principal"
3. Master confirma: "Sim, criar convite para MARQ HR"
4. Edge function cria user_profile com invite_status='pending', user_id=NULL
5. Email de convite enviado
6. Mauricio clica no link -> confirma -> perfil vinculado com user_id existente
7. Proximo login: selecao de plataforma "Organizacao Principal" ou "MARQ HR"

LIMPEZA DE ORFAOS:
1. Master vai em Operacoes -> Limpeza de Usuarios
2. Clica "Verificar orfaos" -> ve lista de auth users sem perfil
3. Confirma "Limpar orfaos" -> sistema remove do auth.users
```

