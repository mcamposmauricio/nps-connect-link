

# Correcao: Chat Widget com tenant_id NULL e Visibilidade Cross-Tenant

## Problemas Identificados

### 1. Chat rooms criados com tenant_id NULL

**Causa raiz**: O `resolve-chat-visitor` nao encontrou um `company_contact` com `external_id = 'FEEEE812C71049FEB7D4BB1B343CF76F'` no tenant MARQ (a tabela esta vazia). O retorno e `contact_not_found`, e o widget cai no modo anonimo com `owner_user_id = 00000000-0000-0000-0000-000000000000`.

A trigger `set_tenant_id_from_owner` ignora esse UUID especifico, resultando em `tenant_id = NULL` tanto no `chat_visitors` quanto no `chat_rooms`.

**Consequencia**: O room com `tenant_id = NULL` aparece para o usuario master da plataforma "Suporte" via politica `"Master can view all chat rooms"`, e nao aparece para ninguem do tenant MARQ.

### 2. Erro ao enviar mensagem no chat

O POST para `chat_messages` falha. Apesar da politica `"Public can insert messages"` permitir insercao anonima, preciso confirmar o erro exato. Possivelmente e um erro 403 causado pela combinacao de politicas ou uma restricao de FK.

### 3. Atendentes de outros tenants visiveis

As politicas RLS de `attendant_profiles` e `csms` ja filtram por `tenant_id = get_user_tenant_id(auth.uid())`. Chuck (MARQ) nao deveria ver atendentes de outros tenants. Porem, e possivel que a tela consultada esteja usando uma query sem RLS ou que o cache do SidebarDataContext esteja com dados antigos de antes da correcao de RLS.

## Solucao

### A. Edge Function `resolve-chat-visitor`: Propagar tenant_id mesmo sem contato

Quando o `external_id` nao e encontrado mas a API key e valida, a funcao deve retornar o `user_id` do dono da chave para que o widget use-o como `owner_user_id`. Isso garante que a trigger `set_tenant_id_from_owner` consiga resolver o `tenant_id` correto.

**Alteracao no `resolve-chat-visitor/index.ts`**:
- Quando `companyContact` nao e encontrado, em vez de retornar apenas `contact_not_found`, retornar tambem o `user_id` do proprietario da API key.

```text
// Atual (linha ~75):
return { visitor_token: null, error: "contact_not_found" }

// Novo:
return { visitor_token: null, error: "contact_not_found", user_id: userId }
```

### B. Embed Script `nps-chat-embed.js`: Usar user_id do fallback

Mesmo quando `resolve-chat-visitor` retorna `contact_not_found`, extrair o `user_id` da resposta e passa-lo ao iframe como `ownerUserId`. Assim, o widget cria o visitor e room com o `owner_user_id` correto.

**Alteracao no `nps-chat-embed.js`**:
Na funcao `resolveVisitor`, quando a resposta contem `user_id` mas nao `visitor_token`:

```text
// Dentro do .then() de resolveVisitor:
if (!data.visitor_token && data.user_id) {
  resolvedOwnerUserId = data.user_id;
}
```

### C. Widget `ChatWidget.tsx`: Usar ownerUserId na criacao de visitor anonimo

Atualmente, quando nao ha `paramVisitorToken`, o widget cria um visitor com `owner_user_id: "00000000..."`. Se `paramOwnerUserId` estiver disponivel (vindo do embed), usar esse valor.

**Alteracao no `ChatWidget.tsx`** (funcao `handleStartChat`, linha ~512):

```text
// Atual:
owner_user_id: "00000000-0000-0000-0000-000000000000"

// Novo:
owner_user_id: paramOwnerUserId || "00000000-0000-0000-0000-000000000000"
```

Isso ja esta parcialmente feito na funcao `createLinkedRoom` (linha 390), mas `handleStartChat` usa o hardcoded.

### D. Limpeza de dados orfaos

Executar uma migracao para corrigir os rooms e visitors existentes com `tenant_id = NULL`:

```sql
-- Atualizar chat_visitors orfaos cujo owner nao e o UUID nulo
UPDATE chat_visitors SET tenant_id = (
  SELECT tenant_id FROM user_profiles WHERE user_id = chat_visitors.owner_user_id LIMIT 1
) WHERE tenant_id IS NULL
  AND owner_user_id != '00000000-0000-0000-0000-000000000000';

-- Atualizar chat_rooms orfaos cujo owner nao e o UUID nulo
UPDATE chat_rooms SET tenant_id = (
  SELECT tenant_id FROM user_profiles WHERE user_id = chat_rooms.owner_user_id LIMIT 1
) WHERE tenant_id IS NULL
  AND owner_user_id != '00000000-0000-0000-0000-000000000000';
```

Para os 3 registros restantes com `owner_user_id = 00000000...`, sera necessario decidir: deletar ou manter como orfaos.

### E. Verificacao de visibilidade de atendentes

As politicas RLS de `attendant_profiles` e `csms` ja estao corretas (filtram por `tenant_id`). O mais provavel e que o usuario viu dados em cache (antes da correcao RLS anterior). Apos a implementacao, validar se Chuck ve 0 atendentes no painel de chat MARQ.

Se o problema persistir apos teste, sera necessario investigar se ha alguma politica adicional ou se a tela usa uma query diferente.

## Resultado Esperado

- Widget embedado com API key MARQ criara rooms com `tenant_id` correto do MARQ
- Mensagens serao enviadas com sucesso (room tera tenant valido)
- Rooms aparecera apenas no workspace do MARQ, nao no Suporte
- Atendentes de outros tenants nao serao visiveis para Chuck

