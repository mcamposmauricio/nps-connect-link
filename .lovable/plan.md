

# Fix: Vazamento de Dados na Tabela company_contacts

## Problema

A tabela `company_contacts` possui a politica RLS **"Public can view contacts by public_token"** com:
- Role: `public` (aplica a `anon` E `authenticated`)
- Condicao: `public_token IS NOT NULL`

Como a coluna `public_token` tem default `gen_random_uuid()`, praticamente TODOS os registros possuem token. Isso significa que qualquer usuario autenticado ve TODOS os contatos de TODOS os tenants.

A pagina People.tsx consulta exatamente essa tabela (`company_contacts`), por isso o Chuck ve contatos de outros tenants.

## Solucao

Restringir essa politica ao role `anon` — ela existe para permitir acesso ao portal publico via token, que e um fluxo sem autenticacao.

## Alteracao

### Migracao SQL

```sql
DROP POLICY "Public can view contacts by public_token" ON company_contacts;
CREATE POLICY "Anon can view contacts by public_token"
  ON company_contacts FOR SELECT TO anon
  USING (public_token IS NOT NULL);
```

Nenhuma alteracao de codigo necessaria. O portal publico (`/portal/:token`) usa o client sem autenticacao (role `anon`), entao continuara funcionando.

