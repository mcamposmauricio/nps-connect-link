

# Plano: Exibir Campos Customizados e Dados Completos em Todas as Telas

## Problema Atual

Os campos customizados configurados pelo tenant (via `chat_custom_field_definitions`) e armazenados em `contacts.custom_fields` aparecem de forma inconsistente:

- O componente `CustomFieldsDisplay` mostra apenas as **chaves brutas** (ex: "mrr") ao inves dos labels configurados (ex: "Valor do MRR")
- O `CompanyCSDetailsSheet` (CS Dashboard) nao exibe campos customizados, setor, CNPJ nem prioridade
- O `CompanyCard` na listagem de empresas nao mostra Health Score, MRR nem NPS
- O `VisitorInfoPanel` le campos customizados do metadata do visitor mas nao le os `custom_fields` da empresa vinculada
- O `PersonDetailsSheet` mostra campos customizados sem formatacao por tipo

## Arquivos Afetados

### 1. `src/components/CustomFieldsDisplay.tsx` -- Refatoracao Principal

Transformar de componente "burro" (exibe key/value) para componente "inteligente" que:
- Busca as definicoes de campos do tenant (`chat_custom_field_definitions`)
- Usa o `label` cadastrado ao inves da key bruta
- Formata valores por tipo (decimal como moeda, url como link clicavel, boolean como badge, date como data formatada)
- Aceita prop `target` ("company" ou "contact") para filtrar definicoes relevantes
- Campos sem definicao cadastrada continuam aparecendo com a key original como fallback

### 2. `src/components/CompanyDetailsSheet.tsx` -- Overview da Empresa

Substituir o uso atual de `<CustomFieldsDisplay fields={company.custom_fields} />` pelo componente refatorado com `target="company"`. Resultado: campos customizados aparecem com labels e formatacao correta.

### 3. `src/components/PersonDetailsSheet.tsx` -- Detalhes do Contato

Substituir o uso atual de `<CustomFieldsDisplay fields={person.custom_fields} />` pelo componente refatorado com `target="contact"`.

### 4. `src/components/cs/CompanyCSDetailsSheet.tsx` -- Sheet do CS Dashboard

Adicionar na aba Overview:
- CNPJ (`company_document`)
- Setor (`company_sector`)
- Prioridade (`service_priority`) quando diferente de "normal"
- Secao de campos customizados (`custom_fields`) com o componente refatorado
- Buscar `custom_fields` do banco (atualmente o SELECT nao inclui essa coluna)

### 5. `src/components/CompanyCard.tsx` -- Card na Listagem de Empresas

Adicionar indicadores visuais compactos:
- Badge de Health Score (colorido: verde/amarelo/vermelho)
- MRR formatado quando presente
- Badge NPS (Promotor/Neutro/Detrator) quando presente
- Exibir ate 2 campos customizados mais relevantes (os primeiros por `display_order`)

A interface `Company` no card precisa ser expandida para incluir `health_score`, `mrr`, `last_nps_score` e `custom_fields`.

### 6. `src/components/chat/VisitorInfoPanel.tsx` -- Painel do Atendente

Na aba "Empresa", apos os dados financeiros ja exibidos, adicionar secao de campos customizados da empresa (`company.custom_fields`), usando as mesmas definicoes de campo (`fieldDefs`) ja carregadas, filtrando por `target = "company"`.

Atualmente so exibe campos do `visitorMetadata` na aba "Contato". O plano e:
- Aba "Contato": campos customizados do metadata do visitor (dados recebidos via API, ja funciona)
- Aba "Empresa": campos customizados de `contacts.custom_fields` (dados persistidos da empresa, **novo**)

Para isso, buscar `custom_fields` da empresa no SELECT existente (atualmente nao esta incluido).

### 7. `src/pages/Contacts.tsx` -- Listagem de Empresas

Expandir a interface `Company` para passar `health_score`, `mrr`, `last_nps_score` e `custom_fields` ao `CompanyCard` (os dados ja sao buscados do banco com `select("*")`).

---

## Detalhes Tecnicos

### Refatoracao do `CustomFieldsDisplay`

```text
Props:
  - fields: Record<string, any>  -- os custom_fields do registro
  - target?: "company" | "contact"  -- filtra definicoes por target

Comportamento:
  1. Busca chat_custom_field_definitions do tenant (com cache via react-query)
  2. Para cada entry em fields:
     a. Se existe definicao com key correspondente e target correto: usa label + formatacao
     b. Se nao existe definicao: exibe key original como fallback
  3. Ordena por display_order das definicoes
```

### Expansao do SELECT no CompanyCSDetailsSheet

```text
Atual:  .select("id, name, trade_name, health_score, mrr, ...")
Novo:   Adicionar company_sector, company_document, service_priority, custom_fields
```

### Expansao do SELECT no VisitorInfoPanel

```text
Atual:  .select("id, name, trade_name, health_score, mrr, contract_value, ...")
Novo:   Adicionar custom_fields
```

### Expansao da interface Company no CompanyCard

```text
Adicionar: health_score, mrr, last_nps_score, custom_fields
```

---

## Resumo de Mudancas por Arquivo

| Arquivo | Mudanca |
|---------|---------|
| `CustomFieldsDisplay.tsx` | Refatorar para usar definicoes do tenant com labels e formatacao por tipo |
| `CompanyDetailsSheet.tsx` | Passar `target="company"` ao CustomFieldsDisplay |
| `PersonDetailsSheet.tsx` | Passar `target="contact"` ao CustomFieldsDisplay |
| `CompanyCSDetailsSheet.tsx` | Adicionar CNPJ, setor, prioridade, custom_fields na overview |
| `CompanyCard.tsx` | Adicionar Health Score, MRR, NPS badge e custom fields no card |
| `VisitorInfoPanel.tsx` | Adicionar custom_fields da empresa na aba Empresa |
| `Contacts.tsx` | Expandir interface Company para passar novos campos ao CompanyCard |
