

# Auto-provisionar Admin como Atendente de Chat

## Problema

Quando um tenant e criado e o admin aceita o convite, ele recebe apenas o role de `admin`. Nao e criado um registro na tabela `csms` com `is_chat_enabled = true`, o que significa que o admin nao aparece como atendente e nao consegue atender chats nem atribuir conversas a si mesmo.

## Solucao

Modificar a Edge Function `backoffice-admin` no caso `accept-invite` para que, ao criar o role de admin para o tenant, tambem crie automaticamente um registro CSM com `is_chat_enabled = true`.

A trigger `sync_csm_chat_enabled` ja existente no banco cuidara automaticamente de criar o `attendant_profile` correspondente.

### Cadeia de eventos

```text
Admin aceita convite
  --> accept-invite cria role "admin"
  --> accept-invite cria registro "csms" com is_chat_enabled = true  [NOVO]
    --> trigger sync_csm_chat_enabled cria "attendant_profile"       [AUTOMATICO]
      --> Admin aparece como atendente no workspace
        --> Pode atender e atribuir chats a si mesmo
```

### Alteracao em `supabase/functions/backoffice-admin/index.ts`

No bloco `accept-invite` (linhas 58-65), apos criar o role de admin, adicionar a criacao do CSM:

```typescript
// Create admin role if tenant admin
if (profile.tenant_id && (!profile.specialty || profile.specialty.length === 0)) {
  const { error: roleErr } = await adminClient.from("user_roles").upsert(
    { user_id: userId, role: "admin" },
    { onConflict: "user_id,role" }
  );
  if (roleErr) console.error("Role creation error:", roleErr);

  // NEW: Auto-provision admin as chat attendant
  await adminClient.from("csms").insert({
    user_id: userId,
    name: displayName || profile.email.split("@")[0],
    email: profile.email,
    is_chat_enabled: true,
    tenant_id: profile.tenant_id,
  });
}
```

A trigger `sync_csm_chat_enabled` ja existente fara o resto (criar `attendant_profile` com `max_conversations = 5`).

### Resultado

- Novo admin de tenant ja vem pronto para atender chats imediatamente apos aceitar o convite
- Aparece na lista de atendentes do workspace
- Pode clicar em "Atender" em chats nao atribuidos
- Pode adicionar mais membros ao time depois via configuracoes

