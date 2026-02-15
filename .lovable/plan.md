

# Campos Customizados e Cadastro Manual/Massa (Revisado v3)

## Resumo

Tres frentes: (1) campos customizados nos formularios de empresa e contato com gestao centralizada de ate 10 campos, (2) botao "Adicionar" unificado com 4 opcoes, e (3) importacao em massa via CSV que inclui os campos customizados configurados como colunas extras no modelo.

---

## 1. Campos Customizados -- Gestao Centralizada

A ideia central e que os campos customizados sejam **definidos uma vez** e reutilizados em todos os lugares: formularios manuais, importacao CSV, e telas de detalhes.

### 1.1 Componente `CustomFieldsManager.tsx` (novo)

Componente que permite ao administrador configurar ate **10 campos customizados** para empresas e ate **10 para contatos**. Sera exibido dentro do formulario de cadastro (manual e massa) como uma secao expansivel.

- Cada campo tem: **nome** (label) e **valor**
- Maximo de 10 campos por entidade (empresa ou contato)
- Os campos sao salvos na coluna `custom_fields` (JSONB) de `contacts` ou `company_contacts`

### 1.2 Componente `CustomFieldsEditor.tsx` (novo)

Editor reutilizavel usado nos formularios manuais:
- Recebe `value: Record<string, string>`, `onChange`, e opcionalmente `fieldNames: string[]` (nomes pre-definidos)
- Se `fieldNames` for passado, exibe esses campos como inputs fixos (vindos da configuracao da empresa ou do import)
- Permite adicionar campos extras (ate o limite de 10)
- Botao "+ Adicionar campo" para nova linha e botao remover (X)

### 1.3 Componente `CustomFieldsDisplay.tsx` (novo)

Exibicao somente leitura dos campos customizados:
- Recebe `fields: Record<string, string>`
- Renderiza lista de label/valor

### 1.4 Integracoes nos formularios

- **CompanyForm.tsx**: adicionar `custom_fields` ao `CompanyFormData`, renderizar `CustomFieldsEditor` abaixo do campo "Setor"
- **CompanyContactForm.tsx**: adicionar `custom_fields` ao `CompanyContactFormData`, renderizar `CustomFieldsEditor` abaixo do "external_id"
- **QuickContactForm.tsx**: adicionar `custom_fields` ao formulario

### 1.5 Integracoes nas telas de detalhes

- **CompanyDetailsSheet.tsx**: na aba overview, apos dados de contato, exibir `CustomFieldsDisplay` se houver campos
- **PersonDetailsSheet.tsx**: na aba overview, exibir `CustomFieldsDisplay` se houver campos

### 1.6 Integracoes nos handlers de insert/update

- **Contacts.tsx**: incluir `custom_fields` nos `handleAddCompany` e `handleEditCompany`
- **CompanyDetailsSheet.tsx**: incluir `custom_fields` nos `handleAddContact` e `handleEditContact`

---

## 2. Botao "Adicionar" Unificado

### Mudanca no `Contacts.tsx`

O botao "Adicionar Empresa" sera substituido por um **DropdownMenu** com label **"Adicionar"** e 4 opcoes:

| Opcao | Acao |
|-------|------|
| Empresa (manual) | Abre dialog com `CompanyForm` |
| Contato (manual) | Abre dialog com `QuickContactForm` (com seletor de empresa) |
| Empresas em massa (CSV) | Abre `BulkImportDialog` no modo "companies" |
| Contatos em massa (CSV) | Abre `BulkImportDialog` no modo "contacts" |

Novos states: `addContactDialogOpen`, `bulkImportType` (`'companies' | 'contacts' | null`).

O botao do estado vazio (sem empresas) tambem usara o mesmo DropdownMenu.

---

## 3. Cadastro em Massa via CSV (com campos customizados)

### 3.1 Componente `BulkImportDialog.tsx` (novo)

Dialog que recebe `type: 'companies' | 'contacts'` como prop.

### 3.2 Fluxo do wizard

**Etapa 1 -- Configurar campos customizados**

Antes de baixar o modelo, o usuario pode definir ate **10 campos customizados** que serao adicionados como colunas extras no CSV. Exemplo:

- O usuario adiciona: "Plano", "Segmento", "Origem"
- O modelo CSV gerado tera as colunas fixas + essas 3 colunas extras

Interface: lista de inputs para nomear os campos (ate 10), com botao "+ Adicionar campo" e remover (X). Os nomes definidos aqui serao usados como headers no CSV e como chaves no `custom_fields` JSONB ao importar.

**Etapa 2 -- Instrucoes e download do modelo**

Instrucoes passo a passo:

```text
1. Configure os campos customizados na etapa anterior (opcional)
2. Baixe o modelo CSV clicando no botao abaixo
3. Preencha os dados seguindo o formato do modelo
4. Campos marcados com * sao obrigatorios
5. Para contatos: a coluna "empresa_email" deve conter o email
   de uma empresa ja cadastrada no sistema
6. A coluna "external_id" e o identificador do usuario no seu
   sistema externo. Ele sera usado para vincular automaticamente
   o chat e o NPS quando esses modulos estiverem embedados na
   sua aplicacao. Sem ele, o usuario sera tratado como visitante
   anonimo.
7. Faca upload do arquivo preenchido na etapa seguinte
```

Botao "Baixar modelo CSV" -- gera o arquivo com PapaParse incluindo os campos customizados como colunas adicionais.

#### Modelo CSV de Empresas (colunas fixas + customizados)

| Coluna | Obrigatoria | Descricao |
|--------|-------------|-----------|
| nome | Sim | Razao social |
| email | Sim | Email principal (identificador unico) |
| telefone | Nao | Telefone |
| cnpj | Nao | CNPJ |
| nome_fantasia | Nao | Nome fantasia |
| setor | Nao | Setor de atuacao |
| rua | Nao | Logradouro |
| numero | Nao | Numero |
| complemento | Nao | Complemento |
| bairro | Nao | Bairro |
| cidade | Nao | Cidade |
| estado | Nao | Estado (UF) |
| cep | Nao | CEP |
| *campo_custom_1* | Nao | Definido pelo usuario |
| *campo_custom_N* | Nao | Ate 10 campos extras |

#### Modelo CSV de Contatos (colunas fixas + customizados)

| Coluna | Obrigatoria | Descricao |
|--------|-------------|-----------|
| nome | Sim | Nome completo |
| email | Sim | Email do contato |
| telefone | Nao | Telefone |
| cargo | Nao | Cargo na empresa |
| departamento | Nao | Departamento |
| contato_principal | Nao | "sim" ou "nao" |
| empresa_email | Sim | Email da empresa cadastrada (resolve `company_id`) |
| external_id | Recomendado | ID no sistema externo -- vincula Chat e NPS embedados |
| *campo_custom_1* | Nao | Definido pelo usuario |
| *campo_custom_N* | Nao | Ate 10 campos extras |

**Etapa 3 -- Upload e pre-visualizacao**

- Zona de upload (drag & drop ou clique) para `.csv`
- Parse com PapaParse
- Colunas extras (que nao sao fixas) sao automaticamente mapeadas para `custom_fields`
- Tabela de preview com as primeiras 5 linhas
- Validacao visual: linhas com erro em vermelho
- Contador: "X registros validos / Y com erro"

**Etapa 4 -- Processamento**

- Botao "Importar X registros"
- Lotes de 50 registros
- Ao inserir, as colunas extras sao agrupadas em um objeto `custom_fields` JSONB
- Barra de progresso
- Resumo final: sucesso vs. falhas com motivo

### 3.3 Conexao com o cadastro manual

Os campos customizados definidos no CSV tambem podem ser editados depois no cadastro manual da empresa/contato via `CustomFieldsEditor`. Como tudo fica em `custom_fields` JSONB, os dados se conversam naturalmente -- qualquer campo adicionado via CSV aparece no formulario de edicao e vice-versa.

---

## 4. Traducoes novas

Chaves a adicionar em `pt-BR.ts` e `en.ts`:

- Labels do dropdown (Adicionar, Empresa manual, Contato manual, Empresas em massa, Contatos em massa)
- Titulo e instrucoes do bulk import
- Labels de campos customizados (titulo, adicionar campo, nome do campo, valor, maximo 10 campos)
- Texto explicativo sobre external_id
- Mensagens de validacao, progresso e resumo do import

---

## Arquivos criados/modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/components/CustomFieldsEditor.tsx` | Novo -- editor de campos customizados chave/valor reutilizavel |
| 2 | `src/components/CustomFieldsDisplay.tsx` | Novo -- exibicao somente leitura de campos customizados |
| 3 | `src/components/BulkImportDialog.tsx` | Novo -- dialog de importacao CSV com wizard, config de campos customizados, dois modelos, instrucoes e validacao |
| 4 | `src/components/CompanyForm.tsx` | Adicionar `custom_fields` ao formulario com `CustomFieldsEditor` |
| 5 | `src/components/CompanyContactForm.tsx` | Adicionar `custom_fields` ao formulario com `CustomFieldsEditor` |
| 6 | `src/components/QuickContactForm.tsx` | Adicionar `custom_fields` ao formulario com `CustomFieldsEditor` |
| 7 | `src/components/CompanyDetailsSheet.tsx` | Exibir `CustomFieldsDisplay` na overview + incluir `custom_fields` nos handlers |
| 8 | `src/components/PersonDetailsSheet.tsx` | Exibir `CustomFieldsDisplay` na overview |
| 9 | `src/pages/Contacts.tsx` | DropdownMenu "Adicionar" com 4 opcoes, dialog de contato manual, dialog de import, `custom_fields` no insert/update |
| 10 | `src/locales/pt-BR.ts` | Novas chaves |
| 11 | `src/locales/en.ts` | Novas chaves |

## Nenhuma mudanca no banco de dados

As colunas `custom_fields` (JSONB) e `external_id` ja existem nas tabelas `contacts` e `company_contacts`. Nenhuma migracao necessaria.

