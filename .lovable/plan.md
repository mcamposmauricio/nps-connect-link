

# Fix: ownerUserId nao e passado ao iframe no fallback

## Problema

O embed script (`nps-chat-embed.js`) so adiciona `ownerUserId` na URL do iframe quando `resolvedToken` existe (linha 207: `if (resolvedToken)`). No caso de fallback (contato nao encontrado, mas API key valida), `resolvedToken` e `null` e `resolvedOwnerUserId` e preenchido — porem nunca e enviado ao widget.

Resultado: o ChatWidget recebe `paramOwnerUserId = null`, usa o UUID nulo `00000000-...`, e a trigger `set_tenant_id_from_owner` ignora-o, deixando `tenant_id = NULL`.

## Solucao

Adicionar um segundo bloco no `createChatWidget()` que passa `ownerUserId` mesmo quando nao ha `resolvedToken`.

### Alteracao em `public/nps-chat-embed.js` (linha ~214)

Apos o bloco `if (resolvedToken) { ... }`, adicionar:

```javascript
// Fallback: pass ownerUserId even without resolved token
if (!resolvedToken && resolvedOwnerUserId) {
  iframeSrc += "&ownerUserId=" + encodeURIComponent(resolvedOwnerUserId);
}
```

### Limpeza SQL

Corrigir o room recem-criado e seu visitor:

```sql
-- Fix visitor
UPDATE chat_visitors SET
  owner_user_id = '17755531-96a2-4a46-9c11-9bee2b71aaf0',
  tenant_id = 'ff3876d4-5a07-44b9-be1b-b1899ce96df8'
WHERE id = 'c1d0b785-87a2-4b52-b476-d3bc96729af5';

-- Fix room
UPDATE chat_rooms SET
  owner_user_id = '17755531-96a2-4a46-9c11-9bee2b71aaf0',
  tenant_id = 'ff3876d4-5a07-44b9-be1b-b1899ce96df8'
WHERE id = '140425f6-2650-4e62-b02f-6667b601bf44';
```

### Resultado

- Widget embedado com API key MARQ criara rooms com `tenant_id` correto mesmo quando o `external_id` nao corresponde a nenhum contato cadastrado
- O room problematico sera corrigido e visivel apenas no tenant MARQ

### Nota importante

O arquivo `nps-chat-embed.js` e servido pelo dominio `jornadacliente.com.br`. Apos o deploy, o usuario precisa garantir que o navegador nao esta usando uma versao cacheada do script (hard refresh ou limpar cache).
