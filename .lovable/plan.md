

# Implementacao: `external_id` na tabela `contacts` + Refatoracao Completa

## Resumo

Adicionar `external_id` na tabela de empresas (`contacts`), tornar `email` opcional para empresas criadas via widget, refatorar o fluxo de criacao/vinculacao de empresas no widget, e atualizar UI e documentacao.

## 1. Migracao SQL

Adicionar coluna `external_id` na tabela `contacts` com indice unico por tenant, e tornar `email` nullable (empresas criadas pelo widget nao tem email real):

```sql
ALTER TABLE public.contacts ADD COLUMN external_id text;

CREATE UNIQUE INDEX idx_contacts_external_id_tenant 
  ON public.contacts (tenant_id, external_id) 
  WHERE external_id IS NOT NULL;

ALTER TABLE public.contacts ALTER COLUMN email DROP NOT NULL;
```

## 2. Refatorar `upsertCompany` em `ChatWidget.tsx` (linhas 548-634)

Logica atual busca empresa indiretamente via `company_contacts.external_id` e cria email fake. Nova logica:

1. Se `company_id` existe: buscar `contacts WHERE external_id = company_id AND user_id = ownerUserId AND is_company = true`
2. Se encontrou: usar empresa existente
3. Se nao encontrou: criar empresa com `external_id = company_id`, `email = null`, e ja incluir campos diretos (mrr, contract_value, etc.) na criacao
4. Buscar/criar `company_contact` vinculado
5. Atualizar campos diretos e custom_fields na empresa

Isso elimina emails fake e evita duplicatas.

## 3. Atualizar `CompanyForm.tsx`

- Adicionar campo `external_id` na interface `CompanyFormData`
- Adicionar input "ID Externo" no formulario, logo apos o campo CNPJ
- Inicializar com `initialData?.external_id || ""`
- Campo opcional, com placeholder explicativo ("Ex: EMP-123, usado para integracao via widget")

## 4. Atualizar `Contacts.tsx`

- Incluir `external_id` no `handleAddCompany` (insert)
- Incluir `external_id` no `handleEditCompany` (update)
- Incluir `external_id` no `initialData` passado ao `CompanyForm` na edicao

## 5. Atualizar `CompanyDetailsSheet.tsx`

- Exibir `external_id` no card de "Integracao" (linhas 364-386), logo abaixo do "System ID"
- Formato: label "ID Externo" + code + botao copiar (mesmo padrao do System ID)
- Mostrar apenas se `external_id` nao for null

## 6. Atualizar `BulkImportDialog.tsx`

- Adicionar `"external_id"` ao array `COMPANY_FIXED_COLUMNS` (linha 23)
- Mapear no record de insert: `external_id: row.data.external_id?.trim() || null`

## 7. Atualizar `ChatWidgetDocsTab.tsx`

- Atualizar a descricao do campo `company_id` na tabela de campos reservados para: "ID externo da empresa -- vincula diretamente ao cadastro da empresa por external_id"
- No prompt de vibecoding, incluir nota sobre o `company_id` ser o identificador unico da empresa

## 8. Atualizar `resolve-chat-visitor` edge function

Ao criar visitor, se `companyContact.company_id` aponta para uma empresa que nao tem `external_id`, preencher com o `external_id` do `company_contact` (retrocompatibilidade).

## Arquivos afetados

| Arquivo | Acao |
|---------|------|
| Migracao SQL | `external_id` + indice unico + email nullable |
| `src/pages/ChatWidget.tsx` | Refatorar `upsertCompany` |
| `src/components/CompanyForm.tsx` | Adicionar campo `external_id` |
| `src/pages/Contacts.tsx` | Incluir `external_id` no insert/update |
| `src/components/CompanyDetailsSheet.tsx` | Exibir `external_id` |
| `src/components/BulkImportDialog.tsx` | `external_id` no CSV |
| `src/components/chat/ChatWidgetDocsTab.tsx` | Atualizar descricao |
| `supabase/functions/resolve-chat-visitor/index.ts` | Propagar `external_id` |

## Detalhes tecnicos

### Impacto na RLS
Nenhuma nova politica necessaria. A tabela `contacts` ja tem RLS por `tenant_id`. O indice unico garante unicidade apenas dentro do mesmo tenant.

### Impacto em dados existentes
- Empresas existentes terao `external_id = null` (sem quebra)
- Empresas com email fake continuam funcionando
- O formulario do admin mantera `email` como campo visivel (nao obrigatorio no banco, mas o front pode validar se quiser)

### Email nullable
O `email` sera `NOT NULL` removido apenas no banco. O formulario do admin (`CompanyForm`) continuara mostrando o campo normalmente -- a validacao de obrigatoriedade fica no front-end para empresas criadas manualmente. Apenas empresas criadas automaticamente pelo widget poderao ter email null.

