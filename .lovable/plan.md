

# API Externa para Cadastro de Empresas e Contatos (Revisado)

## Resumo

Criar um endpoint (edge function) para cadastro externo via API, autenticado por uma **chave de API exclusiva com prefixo `import_`** (diferente das chaves `nps_` e `chat_`). Adicionar aba "API Externa" nas configuracoes gerais (`/settings`) visivel apenas para administradores, com gerenciamento da chave de import, documentacao completa do payload esperado, instrucoes claras e explicacao dos campos customizados.

---

## 1. Nova chave de API com prefixo `import_`

O sistema ja possui chaves `nps_` (pesquisas) e `chat_` (atendimento). Sera criado um terceiro tipo com prefixo **`import_`** exclusivo para a API de importacao externa.

### 1.1 Componente `ImportApiKeysTab.tsx` (novo)

Gerenciador de chaves de import embutido na aba "API Externa". Segue o mesmo padrao do `ApiKeysTab` e `ChatApiKeysTab`:

- Gerar chave com prefixo `import_` (12 caracteres: `import_b6a0e`)
- Hash SHA-256 para armazenamento
- Listar, copiar e excluir chaves
- Armazenar na mesma tabela `api_keys` com `.like("key_prefix", "import_%")`

### 1.2 Validacao na edge function

A edge function `import-external-data` so aceita chaves com prefixo `import_`, rejeitando `nps_` e `chat_`.

---

## 2. Edge Function `import-external-data`

### Endpoint

```
POST /functions/v1/import-external-data
```

### Headers

| Header | Obrigatorio | Descricao |
|--------|-------------|-----------|
| `x-api-key` | Sim | Chave de API com prefixo `import_` |
| `Content-Type` | Sim | `application/json` |

### Autenticacao

Mesma logica existente: lookup pelo prefix (12 chars) na tabela `api_keys`, verificacao SHA-256 do hash completo, extracao do `tenant_id` via `user_profiles`.

### Payload -- Empresas

```json
{
  "type": "companies",
  "data": [
    {
      "nome": "Empresa X Ltda",
      "email": "contato@empresax.com",
      "telefone": "(11) 99999-9999",
      "cnpj": "12.345.678/0001-90",
      "nome_fantasia": "Empresa X",
      "setor": "Tecnologia",
      "rua": "Rua das Flores",
      "numero": "123",
      "complemento": "Sala 4",
      "bairro": "Centro",
      "cidade": "Sao Paulo",
      "estado": "SP",
      "cep": "01001-000",
      "custom_fields": {
        "plano": "Enterprise",
        "origem": "Parceiro",
        "segmento": "B2B"
      }
    }
  ],
  "skip_duplicates": true
}
```

#### Campos de empresa

| Campo | Obrigatorio | Tipo | Descricao |
|-------|-------------|------|-----------|
| `nome` | Sim | string | Razao social da empresa |
| `email` | Sim | string | Email principal (identificador unico) |
| `telefone` | Nao | string | Telefone de contato |
| `cnpj` | Nao | string | CNPJ (formato livre) |
| `nome_fantasia` | Nao | string | Nome fantasia |
| `setor` | Nao | string | Setor de atuacao |
| `rua` | Nao | string | Logradouro |
| `numero` | Nao | string | Numero |
| `complemento` | Nao | string | Complemento |
| `bairro` | Nao | string | Bairro |
| `cidade` | Nao | string | Cidade |
| `estado` | Nao | string | Estado (UF) |
| `cep` | Nao | string | CEP |
| `custom_fields` | Nao | objeto | Ate 10 campos customizados livres (chave/valor string) |

### Payload -- Contatos

```json
{
  "type": "contacts",
  "data": [
    {
      "nome": "Joao Silva",
      "email": "joao@empresax.com",
      "telefone": "(11) 98888-7777",
      "cargo": "Diretor Comercial",
      "departamento": "Comercial",
      "contato_principal": true,
      "empresa_email": "contato@empresax.com",
      "external_id": "usr_12345",
      "custom_fields": {
        "nivel_acesso": "admin",
        "data_onboarding": "2025-01-15"
      }
    }
  ],
  "skip_duplicates": true
}
```

#### Campos de contato

| Campo | Obrigatorio | Tipo | Descricao |
|-------|-------------|------|-----------|
| `nome` | Sim | string | Nome completo |
| `email` | Sim | string | Email do contato |
| `empresa_email` | Sim | string | Email da empresa ja cadastrada (usado para vincular) |
| `telefone` | Nao | string | Telefone |
| `cargo` | Nao | string | Cargo na empresa |
| `departamento` | Nao | string | Departamento |
| `contato_principal` | Nao | boolean | Se e o contato principal da empresa |
| `external_id` | Recomendado | string | ID do usuario no sistema externo. Essencial para integracao: quando o widget de Chat ou NPS estiver embedado, o external_id identifica automaticamente o usuario, localiza a empresa vinculada e carrega campanhas, banners e historico. Sem ele, o usuario sera tratado como visitante anonimo |
| `custom_fields` | Nao | objeto | Ate 10 campos customizados livres (chave/valor string) |

### Opcoes do request

| Campo | Tipo | Default | Descricao |
|-------|------|---------|-----------|
| `type` | string | - | `"companies"` ou `"contacts"` (obrigatorio) |
| `data` | array | - | Lista de registros (obrigatorio, max 500 por request) |
| `skip_duplicates` | boolean | `false` | Se `true`, pula registros com email/CNPJ ja existente. Se `false`, retorna erro para duplicatas |

### Sobre `custom_fields`

Os campos customizados sao um objeto JSON livre com ate 10 pares chave/valor. Eles sao salvos na coluna `custom_fields` (JSONB) das tabelas `contacts` e `company_contacts`.

Pontos importantes:
- As chaves devem ser strings descritivas (ex: `"plano"`, `"origem"`, `"segmento"`)
- Os valores devem ser strings
- Maximo de 10 campos por registro
- Os mesmos campos aparecem nos formularios de edicao manual da empresa/contato
- Campos enviados via API podem ser editados depois pela interface web e vice-versa
- Nao ha necessidade de pre-configurar os campos -- qualquer chave e aceita

### Resposta de sucesso (200)

```json
{
  "success": true,
  "summary": {
    "total": 10,
    "imported": 8,
    "skipped": 1,
    "errors": [
      {
        "row": 3,
        "email": "invalido@",
        "reason": "Email invalido"
      }
    ]
  }
}
```

### Respostas de erro

| Status | Cenario | Body |
|--------|---------|------|
| 401 | Chave invalida ou inativa | `{ "error": "Invalid or inactive API key" }` |
| 400 | Payload invalido | `{ "error": "type and data are required" }` |
| 400 | Tipo invalido | `{ "error": "type must be 'companies' or 'contacts'" }` |
| 400 | Array vazio | `{ "error": "data must be a non-empty array" }` |
| 400 | Excede limite | `{ "error": "Maximum 500 records per request" }` |
| 500 | Erro interno | `{ "error": "Internal server error" }` |

### Logica interna

1. Validar `x-api-key` (prefix `import_` + SHA-256)
2. Extrair `tenant_id` do `user_id` via `user_profiles`
3. Validar campos obrigatorios e formato de email
4. Validar `custom_fields` (max 10 chaves, valores string)
5. Verificar duplicatas (email/CNPJ contra banco)
6. Para contatos: resolver `empresa_email` -> `company_id`
7. Inserir em lotes de 50
8. Retornar resumo

---

## 3. Aba "API Externa" em `Settings.tsx`

Adicionar nova aba **"API Externa"** na pagina `/settings`, visivel **somente para administradores**.

### Componente `ExternalApiTab.tsx` (novo)

#### Secao 1 -- Chaves de API para Import

Gerenciador de chaves com prefixo `import_` (componente `ImportApiKeysTab` embutido):
- Criar nova chave
- Listar chaves existentes com copiar/excluir
- Aviso: "Esta chave permite cadastrar dados na sua conta. Compartilhe apenas com sistemas de confianca."

#### Secao 2 -- Endpoint e Autenticacao

Card com:
- URL do endpoint e botao copiar
- Instrucoes de autenticacao: "Envie a chave no header `x-api-key`"
- Exemplo cURL basico

#### Secao 3 -- Payloads esperados (com tabs)

Tabs interativas com exemplos completos:
- **Empresas**: payload JSON completo com todos os campos, incluindo `custom_fields`
- **Contatos**: payload JSON completo com destaque para `empresa_email`, `external_id` e `custom_fields`
- **cURL Empresas**: comando pronto para copiar
- **cURL Contatos**: comando pronto para copiar

Cada exemplo com botao de copiar.

#### Secao 4 -- Referencia de campos

Duas tabelas (empresas e contatos) com:
- Nome do campo
- Obrigatorio/Opcional/Recomendado
- Tipo
- Descricao

Destaque especial para:
- `custom_fields`: "Objeto JSON livre com ate 10 pares chave/valor. As chaves serao os nomes dos campos e os valores, o conteudo. Esses campos podem ser editados depois pela interface web."
- `external_id`: explicacao completa sobre integracao com widgets
- `empresa_email`: "Deve ser o email de uma empresa ja cadastrada no sistema"

#### Secao 5 -- Respostas da API

Exemplos de resposta de sucesso e tabela de erros possiveis.

---

## 4. Configuracao

Adicionar ao `supabase/config.toml`:

```toml
[functions.import-external-data]
verify_jwt = false
```

---

## 5. Traducoes

Novas chaves em `pt-BR.ts` e `en.ts`:

- Labels da aba (API Externa, titulo, descricao)
- Documentacao (endpoint, autenticacao, payloads, referencia de campos, respostas)
- Labels da chave import (criar, excluir, aviso de seguranca)
- Descricoes de campos (custom_fields, external_id, empresa_email, skip_duplicates)

---

## Arquivos criados/modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `supabase/functions/import-external-data/index.ts` | Nova edge function com validacao de chave `import_` |
| 2 | `src/components/ExternalApiTab.tsx` | Novo -- aba com gerenciamento de chave import + documentacao completa |
| 3 | `src/pages/Settings.tsx` | Adicionar aba "API Externa" (somente admin) |
| 4 | `supabase/config.toml` | Config da nova function |
| 5 | `src/locales/pt-BR.ts` | Novas chaves |
| 6 | `src/locales/en.ts` | Novas chaves |

## Seguranca

- Chave exclusiva com prefixo `import_` (nao aceita `nps_` nem `chat_`)
- Hash SHA-256 para validacao (mesmo padrao do sistema)
- Tenant isolation via `user_id` -> `user_profiles.tenant_id`
- Limite de 500 registros por request
- Validacao de custom_fields (max 10 chaves, valores string)
- Aba visivel somente para admin (`isAdmin`)
