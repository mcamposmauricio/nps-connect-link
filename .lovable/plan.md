

# Corrigir Hierarquia de URLs do Help Center (Atualizado)

## Problema Atual

As URLs publicas do Help Center estao sendo geradas sem o slug do tenant. Por exemplo:
- Atual: `jornadacliente.com.br/help/a/artigo-xyz`
- Correto: `jornadacliente.com.br/teste-do-zerooo/help/a/artigo-xyz`

Cada tenant deve ter seu proprio Help Center com URLs hierarquicas:

```text
/EMPRESA/help                    -> Home do Help Center
/EMPRESA/help/c/colecao-slug     -> Colecao
/EMPRESA/help/a/artigo-slug      -> Artigo
```

As rotas ja existem no React Router (`/:tenantSlug/help/...`), mas a pagina admin gera links sem o slug do tenant. Alem disso, links antigos ja publicados/compartilhados no formato `/help/a/slug` precisam continuar funcionando via redirecionamento.

## Mudancas

### 1. Migration SQL - RLS publica na tabela `tenants`

A tabela `tenants` so permite SELECT para usuarios autenticados. Visitantes anonimos nao conseguem resolver o slug do tenant, quebrando todas as paginas publicas do Help Center.

Adicionar politica PERMISSIVE de SELECT para acesso anonimo (somente leitura de id e slug):

```sql
CREATE POLICY "Public can view tenant slugs"
  ON public.tenants
  FOR SELECT
  USING (true);
```

Isso e seguro: a tabela contem apenas id, slug e nome. Nao permite escrita.

### 2. Redirecionamento retroativo de links antigos

Links ja publicados e compartilhados no formato `/help/a/:articleSlug` (sem tenant slug) precisam continuar funcionando. Em vez de mostrar o artigo diretamente nessa URL, o componente `HelpPublicArticle` (quando acessado sem `tenantSlug`) vai:

1. Buscar o artigo pelo slug
2. Resolver o slug do tenant dono do artigo
3. Fazer um redirect 301 (replace) para `/:tenantSlug/help/a/:articleSlug`

Mesma logica para `HelpPublicHome` e `HelpPublicCollection` sem slug: resolver e redirecionar.

Isso garante que:
- Links antigos continuam funcionando
- O usuario acaba na URL canonica correta
- SEO e mantido com redirect permanente

### 3. `src/pages/HelpPublicArticle.tsx`
- Quando `tenantSlug` nao estiver na URL, apos resolver o tenant do artigo, redirecionar para `/${resolvedSlug}/help/a/${articleSlug}` com `replace: true`
- Manter a logica atual para quando `tenantSlug` ja esta presente

### 4. `src/pages/HelpPublicHome.tsx`
- Quando acessado via `/help` (sem tenant slug), resolver o tenant e redirecionar para `/${resolvedSlug}/help`

### 5. `src/pages/HelpPublicCollection.tsx`
- Quando acessado via `/help/c/:slug` (sem tenant slug), resolver o tenant e redirecionar para `/${resolvedSlug}/help/c/:slug`

### 6. `src/pages/HelpArticles.tsx`
- Ja corrigido: busca o slug do tenant e gera URLs corretas
- Sem mudancas adicionais necessarias

### 7. `src/pages/HelpArticleEditor.tsx`
- Atualizar o link de "copiar URL publica" (se existir) para incluir o slug do tenant

## Resumo

| Item | Mudanca |
|------|---------|
| Migration SQL | Adicionar politica SELECT publica na tabela `tenants` |
| `HelpPublicArticle.tsx` | Redirecionar `/help/a/:slug` para `/:tenant/help/a/:slug` |
| `HelpPublicHome.tsx` | Redirecionar `/help` para `/:tenant/help` |
| `HelpPublicCollection.tsx` | Redirecionar `/help/c/:slug` para `/:tenant/help/c/:slug` |
| `HelpArticleEditor.tsx` | Corrigir link de copia se existente |

## Compatibilidade retroativa

Links antigos no formato sem tenant slug continuarao funcionando indefinidamente gracas ao redirecionamento automatico. Nenhuma acao manual e necessaria para corrigir links ja compartilhados.

