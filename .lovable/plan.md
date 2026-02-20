

# Corrigir: Matheus nao aparece na lista de atendentes

## Root Cause

Dois problemas encontrados no `UserPermissionsDialog.tsx`:

### Bug 1: `user_id` errado ao criar CSM (linha 357)
Quando o admin salva as permissoes de outro usuario e um CSM precisa ser criado, o codigo faz:
```typescript
const { data: { user } } = await supabase.auth.getUser();
await supabase.from("csms").insert({ user_id: user.id, ... });
```
`user.id` e o ID do **admin logado**, nao do usuario sendo editado. O correto seria `profile.user_id`.

### Bug 2: CSM so e criado se `csSpecialty.length > 0` (linha 338)
O bloco que cria/atualiza o CSM esta dentro de `if (csSpecialty.length > 0)`. Se o admin nao selecionou nenhuma especialidade CS, o CSM nunca e criado -- e sem CSM, o usuario nao aparece na aba de Atendentes para habilitar chat.

Para que um usuario possa ser atendente de chat, ele precisa ter um registro na tabela `csms`. O fluxo deveria garantir que o CSM seja criado sempre que o usuario tem permissao de chat, independente de ter especialidade CS.

## Solucao

### 1. Corrigir `user_id` no insert (Bug 1)

```typescript
// Linha 357 — DE:
user_id: user.id,
// PARA:
user_id: profile.user_id,
```

Remover tambem o `getUser()` desnecessario (linha 354), ja que `profile.user_id` esta disponivel.

### 2. Garantir criacao do CSM quando permissao de chat existe (Bug 2)

Mover a logica de criacao/atualizacao do CSM para fora do `if (csSpecialty.length > 0)`. O CSM deve ser criado/atualizado sempre, usando especialidade vazia se nenhuma for selecionada.

A condicao para criar o CSM passa a ser: **sempre** (todo membro do tenant pode ser um CSM; a aba de Atendentes controla quem tem chat habilitado via `is_chat_enabled`).

### 3. Corrigir dados do Matheus no banco

Inserir o CSM do Matheus manualmente via migracao para corrigir o estado atual:

```sql
INSERT INTO public.csms (user_id, name, email, tenant_id)
SELECT 
  up.user_id, 
  up.display_name, 
  up.email, 
  up.tenant_id
FROM public.user_profiles up
WHERE up.user_id = 'c4644e4d-d0bb-46b5-92ed-afb113945d9a'
AND NOT EXISTS (
  SELECT 1 FROM public.csms WHERE user_id = up.user_id
);
```

## Arquivos a Modificar

| Arquivo | Mudanca |
|---|---|
| `src/components/UserPermissionsDialog.tsx` | Corrigir `user_id` no insert; mover bloco de CSM para fora do if de specialty |
| Migration SQL | Inserir CSM do Matheus para corrigir estado atual |

## Resultado Esperado

- Matheus aparece na lista de CSMs na aba Atendentes
- Admin pode habilitar chat para ele via toggle
- Futuros usuarios cadastrados via permissoes terao CSM criado corretamente

