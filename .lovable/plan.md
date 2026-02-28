

# Corrigir Hierarquia de URLs do Help Center

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

As rotas ja existem no React Router (`/:tenantSlug/help/...`), mas a pagina admin gera links sem o slug do tenant.

## Mudancas

### 1. `src/pages/HelpArticles.tsx`
- Buscar o `slug` do tenant atual via query na tabela `tenants` usando o `tenantId` do contexto de auth
- Atualizar `publicHelpUrl` para usar `/${tenantSlug}/help`
- Atualizar `handleCopyLink` para gerar URLs com o slug do tenant: `${origin}/${tenantSlug}/help/a/${articleSlug}`

### 2. `src/pages/HelpPublicHome.tsx`
- Quando acessado sem `tenantSlug` (rota `/help`), apos resolver o tenant_id, buscar tambem o slug do tenant para usar nos links internos
- Garantir que os links para colecoes e artigos usem `/${tenantSlug}/help/...` mesmo quando acessado via `/help`

### 3. `src/pages/HelpPublicCollection.tsx`
- Mesma logica: ao resolver o tenant sem slug na URL, buscar o slug e usar nos links para artigos

### 4. `src/pages/HelpPublicArticle.tsx`
- Ao resolver o tenant sem slug na URL, buscar o slug para usar no breadcrumb (links de volta para Home e Colecao)

### 5. `src/pages/HelpArticleEditor.tsx`
- Atualizar o link de "copiar URL publica" (se existir) para incluir o slug do tenant

## Resumo

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/HelpArticles.tsx` | Buscar slug do tenant, corrigir URLs de copia e link publico |
| `src/pages/HelpPublicHome.tsx` | Resolver slug do tenant para links internos |
| `src/pages/HelpPublicCollection.tsx` | Resolver slug do tenant para links internos |
| `src/pages/HelpPublicArticle.tsx` | Resolver slug do tenant para breadcrumb |
| `src/pages/HelpArticleEditor.tsx` | Corrigir link de copia se existente |

