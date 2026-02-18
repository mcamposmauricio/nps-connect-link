
# Problema: Acesso sem Convite — Diagnóstico e Correção

## Causa Raiz Real (3 camadas)

### Camada 1 — Autenticação aberta no Supabase
O signup está **habilitado sem restrições** no projeto de autenticação. Qualquer pessoa que já tenha um usuário criado (mesmo de uma época anterior ao produto) consegue fazer `signInWithPassword`. O `mcampos.mauricio@gmail.com` foi criado em **outubro de 2025** — antes mesmo do produto existir — e conseguiu logar porque a conta de autenticação já existia.

### Camada 2 — AuthContext cria perfil para qualquer usuário autenticado
O `loadUserData` em `AuthContext.tsx` (linhas 89-97) faz um `upsert` na tabela `user_profiles` para **qualquer usuário que faça login**:

```typescript
await supabase.from("user_profiles").upsert(
  {
    user_id: currentUser.id,
    email: currentUser.email ?? "",
    display_name: ...,
    last_sign_in_at: new Date().toISOString(),
  },
  { onConflict: "user_id" }
);
```

Isso significa que qualquer usuário de autenticação — mesmo sem convite — entra no sistema e ganha um perfil com `invite_status: "accepted"`, mas sem `tenant_id`. O perfil do `mcampos.mauricio@gmail.com` foi **criado hoje às 20:38** justamente por esse upsert.

### Camada 3 — Sem validação pós-login
`SidebarLayout.tsx` apenas verifica se há um `user` autenticado. Não valida se esse usuário tem `tenant_id` ou permissões. Resultado: usuário entra, não vê nada, fica na tela em branco.

---

## Mapa dos Usuários no Banco

| Email | Criado em Auth | tenant_id | invite_status | Role |
|-------|---------------|-----------|---------------|------|
| mauriciotadeu_campos@hotmail.com | out/2025 | ✅ 9d0baccf | accepted | admin |
| camposmauricio_o.o@hotmail.com | fev/2026 | ✅ 9d0baccf | accepted | - |
| felipe@marqponto.com.br | fev/2026 | ✅ 9d0baccf | accepted | - |
| lucas@marqponto.com.br | fev/2026 | ✅ 9d0baccf | accepted | - |
| **mcampos.mauricio@gmail.com** | **out/2025** | **❌ null** | accepted | **none** |

---

## Solução em 3 Partes

### Parte 1 — Remover o upsert automático de perfil no AuthContext (crítico)

O `upsert` que cria perfil para qualquer usuário autenticado deve ser **removido**. O perfil só deve ser criado pelo fluxo de convite. O `last_sign_in_at` deve ser atualizado apenas se o perfil já existir (UPDATE, não upsert).

**Arquivo:** `src/contexts/AuthContext.tsx`

```typescript
// ANTES (cria perfil para qualquer um):
await supabase.from("user_profiles").upsert({ user_id, email, ... }, { onConflict: "user_id" });

// DEPOIS (só atualiza se já existe):
await supabase.from("user_profiles")
  .update({ last_sign_in_at: new Date().toISOString() })
  .eq("user_id", currentUser.id);
```

### Parte 2 — Bloquear acesso no SidebarLayout para usuários sem tenant (crítico)

Após o carregamento dos dados, se o usuário está autenticado mas não tem `tenant_id` E não é admin, redirecionar para `/pending-approval` com mensagem clara.

**Arquivo:** `src/components/SidebarLayout.tsx`

```typescript
const { user, loading, userDataLoading, tenantId, isAdmin } = useAuth();

useEffect(() => {
  if (!loading && !userDataLoading) {
    if (!user) {
      navigate("/auth");
    } else if (!tenantId && !isAdmin) {
      // Usuário autenticado mas sem tenant = sem convite válido
      navigate("/pending-approval");
    }
  }
}, [user, loading, userDataLoading, tenantId, isAdmin, navigate]);

// Mostrar loading enquanto userDataLoading for true também
if (loading || userDataLoading) {
  return <spinner />;
}
```

### Parte 3 — Corrigir dados do mcampos.mauricio (SQL)

O perfil órfão precisa ser removido ou o usuário de autenticação deletado. Como ele não foi convidado, o correto é remover o `user_profile` criado indevidamente pelo upsert, para que ele não consiga mais entrar — ou desativar o usuário de auth.

**SQL a executar:**

```sql
-- Remover o perfil órfão criado indevidamente pelo upsert
DELETE FROM user_profiles WHERE user_id = 'c24cb1ed-3b26-4599-b8d1-97f6f8536cae';
```

> O usuário de autenticação (`auth.users`) não pode ser deletado via SQL direto pelo código — mas com o upsert removido e o bloqueio no SidebarLayout, ele será redirecionado para `/pending-approval` mesmo que tente logar.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/contexts/AuthContext.tsx` | Substituir `upsert` por `update` no `last_sign_in_at` |
| `src/components/SidebarLayout.tsx` | Adicionar validação de `tenantId` pós-login e mostrar spinner durante `userDataLoading` |
| SQL (migration) | `DELETE FROM user_profiles` para o perfil órfão |

## O que NÃO será alterado

- Fluxo de convite (funciona corretamente)
- Fluxo de login via `signInWithPassword` (correto — quem não tem tenant é bloqueado antes de ver o sistema)
- Tabela `user_roles` (segurança do RBAC mantida)
- Supabase Auth signup (não há como desabilitar via código — mas o bloqueio no SidebarLayout resolve na prática)

