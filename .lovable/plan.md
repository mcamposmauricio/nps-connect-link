

# Plano: Testes Detalhados da Implementacao de Campos Customizados e Upsert de Empresa

## Resumo

Criar uma suite de testes automatizados cobrindo 4 areas da implementacao:
1. Edge function `resolve-chat-visitor` (teste Deno)
2. Tabela `chat_custom_field_definitions` e RLS (teste via query SQL)
3. Logica de upsert de empresa no `ChatWidget` (teste unitario React)
4. Componente `CustomFieldDefinitionsTab` e `VisitorInfoPanel` (testes de renderizacao)

---

## Parte 1: Setup do ambiente de testes

O projeto nao possui nenhuma configuracao de testes. Sera necessario:

1. Instalar dependencias: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
2. Criar `vitest.config.ts` com aliases e environment jsdom
3. Criar `src/test/setup.ts` com mocks de `matchMedia`
4. Atualizar `tsconfig.app.json` com `vitest/globals`

---

## Parte 2: Teste da Edge Function `resolve-chat-visitor`

### Arquivo: `supabase/functions/resolve-chat-visitor/index.test.ts`

Cenarios:
- **Sem api_key**: retorna 400
- **API key invalida**: retorna 401
- **API key valida sem external_id**: retorna `user_id` (owner resolution only)
- **API key valida com external_id existente**: retorna `visitor_token`, `company_contact_id`, `contact_id`
- **API key valida com external_id inexistente**: retorna `contact_not_found` com `user_id`

---

## Parte 3: Testes unitarios do ChatWidget

### Arquivo: `src/pages/__tests__/ChatWidget.test.tsx`

**3a. Separacao de campos reservados vs customizados**

Testar que a constante `COMPANY_DIRECT_FIELDS` mapeia corretamente:
- `mrr` -> `mrr`
- `contract_value` -> `contract_value`
- `company_sector` -> `company_sector`
- `company_name` -> `trade_name`

E que campos reservados de contato (`name`, `email`, `phone`) e empresa (`company_id`, `company_name`, `user_id`) sao filtrados no loop de upsert.

**3b. Auto-start via postMessage**

Testar que quando `nps-chat-update` com `name` e recebido:
- `formData.name` e preenchido
- `autoStartTriggered.current` vira true
- O useEffect dispara `handleStartChat`

**3c. Upsert de empresa (logica isolada)**

Extrair e testar a funcao `upsertCompany`:
- Cenario 1: `company_id` existente -> encontra company_contact, retorna IDs
- Cenario 2: `company_id` inexistente + `company_name` -> cria empresa + company_contact
- Cenario 3: Sem `company_id` nem `company_name` -> retorna null/null
- Cenario 4: Campos diretos (mrr, contract_value) sao atualizados via UPDATE na contacts
- Cenario 5: Campos customizados sao mergeados no `custom_fields` JSONB

---

## Parte 4: Testes do componente `CustomFieldDefinitionsTab`

### Arquivo: `src/components/chat/__tests__/CustomFieldDefinitionsTab.test.tsx`

Cenarios:
- Renderiza mensagem vazia quando nao ha campos
- Renderiza tabela com campos existentes (key, label, tipo, destino)
- Botao "Adicionar Campo" abre dialog com campos corretos
- Limite de 20 campos: botao desabilitado quando atingido
- Key e sanitizada (lowercase, espacos -> underscore)
- Selecao de "Mapeia para" so aparece quando destino = "Empresa"

---

## Parte 5: Testes do `VisitorInfoPanel`

### Arquivo: `src/components/chat/__tests__/VisitorInfoPanel.test.tsx`

Cenarios:
- Busca definicoes de campos customizados do tenant
- Renderiza secao "Dados Customizados" quando existem dados no metadata
- Formatacao correta por tipo:
  - decimal: `R$ 5.000,50`
  - url: link clicavel
  - boolean: badge Sim/Nao
  - date: data formatada
  - integer: numero formatado
  - text: texto simples
- Nao renderiza secao quando metadata esta vazio
- Nao renderiza campos cujas definicoes estao inativas

---

## Parte 6: Teste E2E da Edge Function (Deno test)

### Arquivo: `supabase/functions/resolve-chat-visitor/index.test.ts`

```typescript
import "https://deno.land/std@0.224.0/dotenv/load.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("retorna 400 sem api_key", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/resolve-chat-visitor`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({}),
  });
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "api_key is required");
});

Deno.test("retorna 401 com api_key invalida", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/resolve-chat-visitor`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ api_key: "invalid_key_12345" }),
  });
  assertEquals(res.status, 401);
  await res.text();
});
```

---

## Arquivos a criar/modificar

1. **`vitest.config.ts`** -- Configuracao do Vitest
2. **`src/test/setup.ts`** -- Setup com mocks
3. **`tsconfig.app.json`** -- Adicionar `vitest/globals`
4. **`supabase/functions/resolve-chat-visitor/index.test.ts`** -- Testes da edge function
5. **`src/components/chat/__tests__/CustomFieldDefinitionsTab.test.tsx`** -- Testes do admin
6. **`src/components/chat/__tests__/VisitorInfoPanel.test.tsx`** -- Testes do painel
7. **`src/pages/__tests__/ChatWidget.test.tsx`** -- Testes do widget (auto-start, upsert)

