
# Corrigir: Admin não consegue salvar status/nível/capacidade de atendentes

## Root Cause Confirmado

A tabela `attendant_profiles` tem apenas 2 políticas RLS:

```
1. "Users manage own attendant profile"   → ALL   → USING (auth.uid() = user_id)
2. "Tenant members can view attendant profiles" → SELECT → USING (tenant_id = get_user_tenant_id(auth.uid()))
```

Quando o admin chama `updateAttendantProfile()` em `AttendantsTab.tsx`:

```typescript
await supabase.from("attendant_profiles").update(updates).eq("id", attId);
```

O Supabase avalia a política de UPDATE `auth.uid() = user_id`. Como o admin tem `user_id` diferente do atendente, o filtro RLS exclui a linha e **zero linhas são atualizadas** — sem erro, sem exceção. O código não detecta isso porque só checa `if (error)`, e `error` é `null`.

O atendente que edita o próprio status em "Meu Perfil" funciona porque é o seu próprio `user_id`.

## Solução: Nova Política RLS para Admins de Tenant

Criar uma política UPDATE (e DELETE, para consistência) que permita que admins do tenant atualizem perfis de atendentes do **seu próprio tenant**.

A função `has_role()` já existe e é usada em outras tabelas — evita recursão RLS.

### Migration SQL

```sql
-- Política: Admins do tenant podem atualizar qualquer attendant_profile do seu tenant
CREATE POLICY "Tenant admins can update attendant profiles"
ON public.attendant_profiles
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
)
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
);
```

Esta política usa:
- `get_user_tenant_id(auth.uid())` — função `SECURITY DEFINER` já existente que retorna o `tenant_id` do usuário logado
- `has_role(auth.uid(), 'admin')` — função `SECURITY DEFINER` já existente que verifica a tabela `user_roles` (sem recursão)

### Detecção silenciosa de falha no frontend

Além da política RLS, o código em `AttendantsTab.tsx` deve ser corrigido para detectar quando o UPDATE foi silenciosamente bloqueado (nenhuma linha afetada). O Supabase JS retorna `{ data: [], count: 0, error: null }` quando o RLS filtra todas as linhas.

Adicionar detecção de `count === 0` como fallback de erro:

```typescript
// AttendantsTab.tsx — updateAttendantProfile
const { error, count } = await supabase
  .from("attendant_profiles")
  .update(updates)
  .eq("id", attId)
  .select("id", { count: "exact", head: true });  // retorna count sem dados

if (error || count === 0) {
  toast({
    title: "Erro",
    description: error?.message ?? "Sem permissão para atualizar este perfil",
    variant: "destructive"
  });
} else {
  setAttendantProfiles(prev => prev.map(p => p.id === attId ? { ...p, ...updates } : p));
}
```

## Arquivos a Modificar

| Arquivo | Ação | O que muda |
|---|---|---|
| Migration SQL | CRIAR | Nova política RLS `"Tenant admins can update attendant profiles"` na tabela `attendant_profiles` |
| `src/components/chat/AttendantsTab.tsx` | MODIFICAR | Trocar `.update(updates).eq("id", attId)` para versão com `select` + detecção de `count === 0` |

## Comportamento Esperado

| Cenário | Antes | Depois |
|---|---|---|
| Admin muda status de atendente | Parece que salvou (toast de sucesso), mas DB não atualiza | Salva corretamente no banco |
| Admin muda nível/capacidade | Idem | Salva corretamente no banco |
| Atendente muda próprio status em "Meu Perfil" | Funciona (política existente `auth.uid() = user_id`) | Continua funcionando (política existente não é removida) |
| Usuário sem admin tenta atualizar perfil de outro | Não é possível pela UI, mas se tentasse via API, seria bloqueado | Continua bloqueado |

Nenhuma mudança de schema de tabela é necessária — apenas nova política RLS e pequeno ajuste no código de detecção de erro.
