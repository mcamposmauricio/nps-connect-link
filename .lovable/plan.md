

# Plano: Chat e Banner com api_key + external_id (mesma estrutura do NPS)

## Problema

O NPS usa `api_key` + `external_id` para autenticar e identificar o usuario. O chat e banner usam `tenant_id` + `visitor_token` sem validacao de chave e sem vinculo automatico com o contato cadastrado.

## Solucao

Adicionar ao chat e banner a mesma estrutura: `api_key` (prefixo `chat_`) + `external_id`. Quando fornecidos, o sistema valida a chave (mesmo algoritmo SHA-256 do NPS), busca o `company_contact` pelo `external_id`, e cria/reutiliza um `chat_visitor` vinculado. Quando nao fornecidos, funciona como visitante anonimo com formulario de nome.

## Mudancas

### 1. Nova edge function: `resolve-chat-visitor`

Funcao publica que replica a logica de autenticacao do `check-nps-pending`:
- Recebe `{ api_key, external_id }` via POST
- Valida api_key: extrai prefixo, busca na tabela `api_keys`, compara SHA-256 hash
- Busca `company_contact` pelo `external_id` + `user_id` da chave
- Se ja existe `chat_visitor` com `company_contact_id` correspondente, retorna o `visitor_token` existente
- Se nao existe, cria um novo `chat_visitor` com nome/email do contato, vinculado ao `company_contact_id` e `contact_id`
- Atualiza `last_used_at` da api_key
- Retorna: `{ visitor_token, visitor_name, visitor_email, contact_id }`
- Se `external_id` nao encontrado, retorna `{ visitor_token: null, error: "contact_not_found" }`

### 2. Atualizar `get-visitor-banners`

Adicionar suporte a `api_key` + `external_id` como alternativa ao `visitor_token`:
- Se receber `api_key` + `external_id` nos query params: valida chave, busca contato, busca banners pelo `contact_id` da empresa
- Se receber `visitor_token`: mantem fluxo atual
- Isso permite que banners carreguem mesmo sem visitor_token no localStorage

### 3. Atualizar `nps-chat-embed.js`

- Aceitar novos atributos: `data-api-key` e `data-external-id`
- Na inicializacao, se ambos forem fornecidos:
  1. Chamar `resolve-chat-visitor` para obter `visitor_token`
  2. Salvar token no localStorage
  3. Carregar banners com `api_key` + `external_id` (mais confiavel que visitor_token)
  4. Passar `visitor_token` e nome resolvido como query params para o iframe do chat
- Se nao fornecidos: manter fluxo atual (visitor_token do localStorage ou formulario)

### 4. Atualizar `ChatWidget.tsx`

- Ler novos query params: `visitorToken`, `visitorName`
- Se `visitorToken` estiver presente (vindo do resolve): pular formulario, usar token direto, checar room existente ou criar novo
- Se nao tiver: mostrar formulario como hoje (visitante anonimo)

### 5. Atualizar `ChatApiKeysTab.tsx`

- Atualizar o snippet de integracao para incluir `data-api-key` e `data-external-id`
- Usar a api_key real da chave selecionada no snippet

### 6. Atualizar `AdminSettings.tsx`

- Atualizar o embed code na tab Widget para incluir os novos atributos

### 7. Atualizar `supabase/config.toml`

- Adicionar `resolve-chat-visitor` com `verify_jwt = false`

## Arquivos

| # | Arquivo | Mudanca |
|---|---------|---------|
| 1 | `supabase/functions/resolve-chat-visitor/index.ts` | **Novo** -- Resolve api_key + external_id em visitor_token |
| 2 | `supabase/functions/get-visitor-banners/index.ts` | Aceitar api_key + external_id como alternativa |
| 3 | `public/nps-chat-embed.js` | Aceitar data-api-key + data-external-id |
| 4 | `src/pages/ChatWidget.tsx` | Pular formulario quando visitor ja resolvido |
| 5 | `src/components/ChatApiKeysTab.tsx` | Atualizar snippet com api_key + external_id |
| 6 | `src/pages/AdminSettings.tsx` | Atualizar embed code |
| 7 | `supabase/config.toml` | Adicionar resolve-chat-visitor |

## Secao Tecnica

### Snippet de integracao final

```text
<!-- Com usuario identificado -->
<script src="https://app.url/nps-chat-embed.js"
  data-api-key="chat_abc123..."
  data-external-id="USER_ID_DO_SISTEMA"
  data-position="right"
  data-primary-color="#7C3AED"
  data-company-name="Suporte">
</script>

<!-- Visitante anonimo (sem api_key/external_id) -->
<script src="https://app.url/nps-chat-embed.js"
  data-position="right"
  data-primary-color="#7C3AED"
  data-company-name="Suporte">
</script>
```

### Fluxo com external_id

```text
1. Script le data-api-key + data-external-id
2. POST /resolve-chat-visitor { api_key, external_id }
3. Edge function valida chave (SHA-256), busca company_contact, cria/reutiliza visitor
4. Retorna { visitor_token, visitor_name, visitor_email, contact_id }
5. Script salva visitor_token no localStorage
6. Banners: GET /get-visitor-banners?api_key=...&external_id=...
7. Chat iframe: /widget?embed=true&visitorToken=xxx&visitorName=xxx&...
8. Widget detecta visitorToken → pula formulario → cria/reconecta room
```

### Fluxo sem external_id

```text
1. Script carrega SEM data-api-key / data-external-id
2. Verifica localStorage por chat_visitor_token
3. Se existe → carrega banners + reconecta chat
4. Se nao → widget mostra formulario nome/email (Visitante)
```

### Validacao da API Key (identica ao NPS)

```text
1. Extrai prefixo: api_key.substring(0, 12)
2. Busca em api_keys WHERE key_prefix = prefixo AND is_active = true
3. Calcula SHA-256 da chave completa
4. Compara com key_hash armazenado
5. Se valido → retorna user_id do dono da chave
```

