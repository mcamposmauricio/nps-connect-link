

# Fix: Admin Role para Usuarios Criados com Tenant

## Problema

Quando um novo usuario aceita o convite de tenant admin, o codigo do frontend (Auth.tsx) tenta inserir a role "admin" na tabela `user_roles` usando o client autenticado. Porem, a politica RLS de INSERT exige `has_role(auth.uid(), 'admin')` — e o usuario recem-criado ainda nao tem essa role. Resultado: a insercao falha silenciosamente e o usuario entra sem ser admin, sem conseguir ver dados do tenant.

Evidencia no banco: `chuck@marqponto.com.br` aceitou convite mas nao tem role admin.

## Solucao

Mover a criacao da role admin para o backend (edge function `backoffice-admin`), que usa service role e nao e bloqueado pelo RLS. O frontend chamara uma nova action `accept-invite` que:

1. Valida o invite_token
2. Atualiza o profile com user_id e invite_status
3. Cria a role "admin" usando service role

## Alteracoes

### 1. `supabase/functions/backoffice-admin/index.ts`

Adicionar nova action `accept-invite`:

```typescript
case "accept-invite": {
  const { inviteToken, userId, displayName } = params;
  if (!inviteToken || !userId) throw new Error("inviteToken and userId required");

  // Buscar profile pendente
  const { data: profile, error: profileErr } = await adminClient
    .from("user_profiles")
    .select("id, email, tenant_id, specialty, invite_status")
    .eq("invite_token", inviteToken)
    .eq("invite_status", "pending")
    .maybeSingle();
  if (profileErr || !profile) throw new Error("Invalid or expired invite");

  // Atualizar profile
  await adminClient.from("user_profiles").update({
    user_id: userId,
    invite_status: "accepted",
    display_name: displayName,
    last_sign_in_at: new Date().toISOString(),
  }).eq("id", profile.id);

  // Criar role admin se for tenant admin (sem specialty)
  if (profile.tenant_id && (!profile.specialty || profile.specialty.length === 0)) {
    await adminClient.from("user_roles").upsert(
      { user_id: userId, role: "admin" },
      { onConflict: "user_id,role" }
    );
  }

  // Criar CSM se tiver specialty
  if (profile.specialty && profile.specialty.length > 0) {
    await adminClient.from("csms").upsert({
      user_id: userId,
      name: displayName || profile.email.split("@")[0],
      email: profile.email,
      specialty: profile.specialty,
    }, { onConflict: "user_id" });
  }

  return Response({ success: true, tenantId: profile.tenant_id });
}
```

**Importante**: Esta action NAO exige role master — qualquer usuario autenticado pode chamar, pois a validacao e feita pelo invite_token. O caller precisa estar autenticado (auth header) e o invite_token precisa ser valido.

### 2. `src/pages/Auth.tsx`

Modificar `handleAcceptInvite` e `handleAcceptAsExistingUser` para chamar a edge function em vez de fazer INSERT direto:

**Remover** (linhas 120-152 em handleAcceptInvite):
- INSERT direto em `user_profiles`
- INSERT direto em `user_roles`
- INSERT direto em `csms`

**Substituir por**:
```typescript
const { data: acceptData, error: acceptError } = await supabase.functions.invoke("backoffice-admin", {
  body: {
    action: "accept-invite",
    inviteToken: inviteProfile.invite_token,
    userId,
    displayName: displayName || inviteProfile.display_name,
  },
});
if (acceptError || acceptData?.error) {
  throw new Error(acceptData?.error || acceptError?.message || "Failed to accept invite");
}
```

Mesma alteracao para `handleAcceptAsExistingUser` (linhas 174-194).

### 3. Correcao retroativa (SQL migration)

Corrigir usuarios que ja aceitaram convite mas ficaram sem role admin:

```sql
INSERT INTO user_roles (user_id, role)
SELECT up.user_id, 'admin'::app_role
FROM user_profiles up
WHERE up.invite_status = 'accepted'
  AND up.tenant_id IS NOT NULL
  AND up.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = up.user_id AND ur.role = 'admin'
  )
  AND NOT EXISTS (
    SELECT 1 FROM csms c WHERE c.user_id = up.user_id
  );
```

Esta query insere role admin para todos os usuarios aceitos que tem tenant_id mas nao tem role e nao sao CSMs (atendentes).

### 4. Edge function: remover verificacao master para accept-invite

No switch do backoffice-admin, a verificacao de master ocorre antes do switch. Precisamos permitir que `accept-invite` funcione sem ser master. Mover a verificacao master para DENTRO de cada case que precisa, ou adicionar `accept-invite` como excecao antes da verificacao.

```typescript
// Antes da verificacao master, extrair action
const body = await req.json();
const { action, ...params } = body;

// accept-invite nao precisa ser master — apenas autenticado
if (action === "accept-invite") {
  // ... handle accept-invite sem verificar master
}

// Para todas as outras actions, verificar master
const { data: masterCheck } = await adminClient...
if (!masterCheck) return 403;
```

## Isolamento de Dados

O isolamento de dados por tenant ja funciona corretamente via RLS com `get_user_tenant_id()`. Uma vez que o usuario tenha a role admin e o profile com tenant_id, ele:

- Ve apenas empresas, contatos, campanhas do seu tenant
- Tem acesso completo como admin (hasPermission retorna true)
- Nao ve dados de outros tenants

## Arquivos Modificados

1. `supabase/functions/backoffice-admin/index.ts` — nova action `accept-invite` + reestruturar verificacao master
2. `src/pages/Auth.tsx` — chamar edge function em vez de INSERT direto
3. Migracao SQL — corrigir usuarios existentes sem role

