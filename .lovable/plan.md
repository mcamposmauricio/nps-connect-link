
# Adicionar update_existing na API + Documentação da Tela

## Escopo

Duas frentes em paralelo:
1. Edge Function `import-external-data` — suporte ao parâmetro `update_existing`
2. Tela `ExternalApiTab.tsx` — exemplos, documentação e resposta de sucesso atualizados
3. Locales `pt-BR.ts` e `en.ts` — novas chaves de tradução

---

## Parte 1 — Edge Function: `supabase/functions/import-external-data/index.ts`

### Mudanças de lógica

**Extração do novo parâmetro no body:**
```typescript
const { type, data, skip_duplicates = false, update_existing = false } = body;
```

**Para empresas:**

O select inicial será expandido para incluir `id`:
```typescript
const { data: existing } = await supabase
  .from('contacts')
  .select('id, email, company_document')
  .eq('is_company', true)
  .eq('tenant_id', tenantId);
```

Os maps existentes passam a guardar `id` junto com email/cnpj:
```typescript
const existingEmailMap = new Map<string, string>(); // email -> id
const existingCnpjMap = new Map<string, string>();   // cnpjDigits -> id
```

Dentro do loop, a lógica de duplicata passa a ser:
```typescript
const existingId = existingEmailMap.get(emailLower)
  || (cnpjDigits ? existingCnpjMap.get(cnpjDigits) : null);

if (existingId) {
  if (update_existing) {
    // Buscar custom_fields atuais para merge
    const { data: cur } = await supabase
      .from('contacts').select('custom_fields').eq('id', existingId).single();
    const mergedCf = { ...(cur?.custom_fields || {}), ...(row.custom_fields || {}) };

    await supabase.from('contacts').update({
      name: row.nome.trim(),
      phone: row.telefone || null,
      company_document: row.cnpj || null,
      trade_name: row.nome_fantasia || null,
      company_sector: row.setor || null,
      street: row.rua || null,
      street_number: row.numero || null,
      complement: row.complemento || null,
      neighborhood: row.bairro || null,
      city: row.cidade || null,
      state: row.estado || null,
      zip_code: row.cep || null,
      custom_fields: mergedCf,
    }).eq('id', existingId);

    updated++;
  } else if (skip_duplicates) {
    skipped++;
  } else {
    errors.push({ row: rowIdx, email, reason: 'Duplicate email or CNPJ' });
  }
  continue;
}
```

**Para contatos:**

O select inicial expandido para incluir `id`:
```typescript
const { data: existingContacts } = await supabase
  .from('company_contacts')
  .select('id, email, company_id')
  .eq('tenant_id', tenantId);
```

Map agora guarda `id`:
```typescript
const existingContactMap = new Map<string, string>(); // "company_id::email" -> id
```

Dentro do loop:
```typescript
const dupKey = `${companyId}::${email.toLowerCase()}`;
const existingContactId = existingContactMap.get(dupKey);

if (existingContactId) {
  if (update_existing) {
    const { data: cur } = await supabase
      .from('company_contacts').select('custom_fields').eq('id', existingContactId).single();
    const mergedCf = { ...(cur?.custom_fields || {}), ...(row.custom_fields || {}) };

    await supabase.from('company_contacts').update({
      name: row.nome.trim(),
      phone: row.telefone || null,
      role: row.cargo || null,
      department: row.departamento || null,
      is_primary: row.contato_principal === true,
      external_id: row.external_id || null,
      custom_fields: mergedCf,
    }).eq('id', existingContactId);

    updated++;
  } else if (skip_duplicates) {
    skipped++;
  } else {
    errors.push({ row: rowIdx, email, reason: 'Contact already exists in this company' });
  }
  continue;
}
```

**Contador `updated` adicionado ao summary:**
```typescript
let updated = 0;
// ...
return { success: true, summary: { total: data.length, imported, updated, skipped, errors } }
```

---

## Parte 2 — UI: `src/components/ExternalApiTab.tsx`

### Novos payloads de exemplo (com `update_existing`)

Adicionar dois novos payloads ao lado dos existentes na seção de Payloads, mostrando `update_existing: true`:

```typescript
const companiesUpdatePayload = `{
  "type": "companies",
  "update_existing": true,
  "data": [
    {
      "nome": "Empresa X Ltda",
      "email": "contato@empresax.com",
      "telefone": "(11) 91111-2222",
      "setor": "Tecnologia e Inovação",
      "custom_fields": {
        "plano": "Enterprise Plus"
      }
    }
  ]
}`;

const contactsUpdatePayload = `{
  "type": "contacts",
  "update_existing": true,
  "data": [
    {
      "nome": "João Silva",
      "email": "joao@empresax.com",
      "empresa_email": "contato@empresax.com",
      "cargo": "VP Comercial",
      "custom_fields": {
        "nivel_acesso": "superadmin"
      }
    }
  ]
}`;
```

### Novos tabs na seção de Payloads

A `TabsList` da seção de Payloads ganha 2 novas abas:
- `JSON Empresas (Update)` 
- `JSON Contatos (Update)`

### Bloco de documentação `update_existing`

Abaixo do bloco `skip_duplicates`, adicionar:

```tsx
<div className="mt-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
  <h4 className="font-medium text-sm mb-2">update_existing</h4>
  <p className="text-sm text-muted-foreground">{t("externalApi.updateExistingExplanation")}</p>
</div>
```

### Resposta de sucesso atualizada

Atualizar `successResponse` para incluir o campo `updated`:
```json
{
  "success": true,
  "summary": {
    "total": 10,
    "imported": 6,
    "updated": 2,
    "skipped": 1,
    "errors": [...]
  }
}
```

---

## Parte 3 — Locales: `src/locales/pt-BR.ts` e `src/locales/en.ts`

### Novas chaves

**pt-BR.ts** (após `skipDuplicatesExplanation`):
```typescript
"externalApi.updateExistingExplanation":
  "Quando update_existing é true, registros com email ou CNPJ já existente serão atualizados com os novos dados enviados. Os custom_fields são mesclados — campos existentes não enviados são preservados. Use junto com skip_duplicates: false para atualizar existentes e inserir novos em uma única chamada.",
"externalApi.updated": "Atualizados",
"externalApi.companiesJsonUpdate": "JSON Empresas (Update)",
"externalApi.contactsJsonUpdate": "JSON Contatos (Update)",
```

**en.ts** (após `skipDuplicatesExplanation`):
```typescript
"externalApi.updateExistingExplanation":
  "When update_existing is true, records with existing email or CNPJ will be updated with the new data provided. Custom fields are merged — existing fields not sent are preserved. Use together with skip_duplicates: false to update existing records and insert new ones in a single call.",
"externalApi.updated": "Updated",
"externalApi.companiesJsonUpdate": "JSON Companies (Update)",
"externalApi.contactsJsonUpdate": "JSON Contacts (Update)",
```

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/import-external-data/index.ts` | Lógica de update para empresas e contatos, contador `updated` no summary |
| `src/components/ExternalApiTab.tsx` | Novos payloads, 2 novas tabs, bloco de documentação `update_existing`, resposta de sucesso atualizada |
| `src/locales/pt-BR.ts` | 4 novas chaves de tradução |
| `src/locales/en.ts` | 4 novas chaves de tradução |

## O que NÃO será alterado

- Banco de dados (nenhuma migration necessária)
- Autenticação da API key (sem mudanças)
- Campos `mrr`, `contract_value`, `health_score`, `user_id`, `tenant_id` — imutáveis via API para evitar sobrescrita acidental
- Comportamento padrão (`update_existing: false`) — compatível com chamadas existentes
