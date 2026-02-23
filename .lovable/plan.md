

# Fix: Rooms orfaos com tenant_id NULL (solucao server-side definitiva)

## Problema recorrente

O fix no `nps-chat-embed.js` esta correto no codigo, mas os navegadores dos visitantes ainda usam a versao cacheada do script servido por `jornadacliente.com.br`. Isso causa rooms e visitors criados com `owner_user_id = 00000000-...` e `tenant_id = NULL`, tornando-os invisiveis para os atendentes.

## Solucao: Safety net no banco de dados

Criar uma trigger `BEFORE INSERT` na tabela `chat_visitors` que resolve o `tenant_id` a partir da API key quando `owner_user_id` e o UUID nulo. Adicionalmente, criar uma trigger similar na `chat_rooms` que herda o `tenant_id` do visitor vinculado.

### 1. Trigger na tabela `chat_visitors` (BEFORE INSERT)

Quando um visitor e inserido com `owner_user_id = 00000000-...`:
- Buscar o ultimo `api_keys` ativo no sistema (pelo `key_prefix = 'chat_'`) para descobrir o tenant
- Nao ideal, mas como fallback funciona para tenants unicos

**Abordagem melhor**: passar a API key via URL param para o widget, e usar essa informacao no `handleStartChat` para resolver o owner via edge function antes de criar o visitor.

### 2. Abordagem recomendada: resolver owner no widget antes de criar visitor

Modificar `ChatWidget.tsx` para que, quando `paramOwnerUserId` for null/vazio e existir uma API key disponivel, chamar a edge function `resolve-chat-visitor` para obter o `owner_user_id` correto antes de criar o visitor.

#### A. `public/nps-chat-embed.js` - Passar apiKey como parametro do iframe

Mesmo sem resolvedToken, sempre passar a API key para o iframe:

```javascript
// Always pass API key to iframe for fallback resolution
if (apiKey) {
  iframeSrc += "&apiKey=" + encodeURIComponent(apiKey);
}
```

#### B. `src/pages/ChatWidget.tsx` - Resolver owner via API key

No `handleStartChat`, quando `paramOwnerUserId` estiver ausente mas existir `paramApiKey`:

```javascript
const paramApiKey = searchParams.get("apiKey");

// In handleStartChat, before creating visitor:
let ownerUserId = paramOwnerUserId;
if (!ownerUserId && paramApiKey) {
  const res = await fetch(`${supabaseUrl}/functions/v1/resolve-chat-visitor`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: supabaseAnonKey },
    body: JSON.stringify({ api_key: paramApiKey }),
  });
  if (res.ok) {
    const data = await res.json();
    ownerUserId = data.user_id || null;
  }
}
if (!ownerUserId) ownerUserId = "00000000-0000-0000-0000-000000000000";
```

#### C. Limpeza SQL dos rooms orfaos atuais

```sql
-- Fix orphaned visitors
UPDATE chat_visitors SET
  owner_user_id = '17755531-96a2-4a46-9c11-9bee2b71aaf0',
  tenant_id = 'ff3876d4-5a07-44b9-be1b-b1899ce96df8'
WHERE owner_user_id = '00000000-0000-0000-0000-000000000000'
  AND tenant_id IS NULL;

-- Fix orphaned rooms
UPDATE chat_rooms SET
  owner_user_id = '17755531-96a2-4a46-9c11-9bee2b71aaf0',
  tenant_id = 'ff3876d4-5a07-44b9-be1b-b1899ce96df8'
WHERE owner_user_id = '00000000-0000-0000-0000-000000000000'
  AND tenant_id IS NULL;
```

### Arquivos alterados

1. **`public/nps-chat-embed.js`** - Sempre passar `apiKey` como parametro do iframe
2. **`src/pages/ChatWidget.tsx`** - Resolver `ownerUserId` via edge function quando ausente, usando a API key

### Resultado

- Mesmo com script cacheado (sem ownerUserId no URL), o widget consegue resolver o owner via API key
- Rooms e visitors sempre terao `tenant_id` correto
- Os 2 rooms orfaos atuais serao corrigidos via SQL
- Solucao robusta que nao depende do cache do navegador do visitante

