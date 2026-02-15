
# Correções e Validação de Duplicatas na Importação em Massa

## Problemas Encontrados

### Bug Critico: Tela em branco ao clicar no botão "Adicionar"
O componente `AddDropdown` está definido como uma função dentro do componente `Contacts`, o que faz o React recriar o componente a cada render. Isso causa um erro de DOM (`removeChild`) que resulta em tela branca. O DropdownMenu usa portais do Radix que perdem a referência quando o componente é recriado.

### Falta de validação de duplicatas no cadastro em massa
Atualmente o `BulkImportDialog` não verifica se já existem empresas com o mesmo email ou CNPJ antes de inserir.

---

## Correções Planejadas

### 1. Corrigir crash do botão "Adicionar" (`Contacts.tsx`)

Mover o conteúdo do `AddDropdown` para inline no JSX em vez de ser um componente separado definido dentro do render. Isso evita a recriação do portal a cada render.

Mudar de:
```
const AddDropdown = () => (
  <DropdownMenu>...</DropdownMenu>
);
// usado como <AddDropdown />
```
Para o DropdownMenu diretamente inline no JSX, ou extraí-lo como um componente estável fora do `Contacts`.

### 2. Validação de duplicatas no cadastro em massa (`BulkImportDialog.tsx`)

Adicionar verificação de duplicatas na etapa de **upload/preview** (antes da importação):

**Para empresas:**
- Antes de processar, buscar todos os emails e CNPJs existentes na tabela `contacts` onde `is_company = true`
- Na validação de cada linha do CSV:
  - Se o email já existe no banco, marcar como "Email já cadastrado"
  - Se o CNPJ já existe no banco (e não está vazio), marcar como "CNPJ já cadastrado"
  - Também verificar duplicatas internas no próprio CSV (emails/CNPJs repetidos)
- Linhas duplicadas serão marcadas com erro e não serão importadas

**Para contatos:**
- Verificar se já existe um contato com o mesmo email na mesma empresa (`company_contacts`)
- Marcar como duplicata se encontrado

A validação será feita em duas camadas:
1. **Duplicatas internas** (dentro do próprio CSV) -- checadas no parse
2. **Duplicatas contra o banco** -- checadas com uma query antes da importação

### 3. Melhorias na mensagem de erro

Adicionar chaves de tradução para mensagens de duplicata:
- `bulkImport.errorDuplicateEmail`: "Email já cadastrado no sistema"
- `bulkImport.errorDuplicateCnpj`: "CNPJ já cadastrado no sistema"
- `bulkImport.errorDuplicateInFile`: "Email duplicado no arquivo"
- `bulkImport.errorContactDuplicate`: "Contato com este email já existe nesta empresa"

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Contacts.tsx` | Corrigir AddDropdown inline para evitar crash |
| `src/components/BulkImportDialog.tsx` | Adicionar validação de duplicatas por email/CNPJ |
| `src/locales/pt-BR.ts` | Novas chaves de mensagens de duplicata |
| `src/locales/en.ts` | Novas chaves de mensagens de duplicata |

---

## Detalhes Técnicos

### Fluxo de validação de duplicatas (BulkImportDialog)

Ao fazer o parse do CSV:

1. Buscar dados existentes do banco:
```
SELECT email, company_document FROM contacts WHERE is_company = true
```

2. Para cada linha do CSV, verificar:
   - Email existe no banco? Erro de duplicata
   - CNPJ existe no banco? Erro de duplicata
   - Email já apareceu em linha anterior do CSV? Erro de duplicata interna

3. Marcar linhas com erro na preview (vermelho) com a mensagem específica

4. Linhas com erro de duplicata NÃO são enviadas na importação

### Correção do AddDropdown

O componente `AddDropdown` definido como função dentro do render (linha ~213 do Contacts.tsx) será substituído por uso direto do DropdownMenu no JSX do return, eliminando o problema de recriação de portais do Radix.
