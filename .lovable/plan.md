
# Corrigir URLs publicas do Help Center e adicionar link na pagina de artigos

## Problema 1: URLs publicas dando 404

A URL publica dos artigos esta no formato `/help/a/slug` (sem tenant slug), mas as rotas no React Router exigem `/:tenantSlug/help/a/:articleSlug`. Como o dominio `jornadacliente.com.br` e customizado, nao ha tenant slug no path.

**Solucao:** Adicionar rotas alternativas **sem** tenant slug que resolvem o tenant automaticamente. As rotas `/help`, `/help/a/:slug` e `/help/c/:slug` serao adicionadas ao App.tsx, e os componentes publicos serao atualizados para funcionar tanto com `tenantSlug` do URL quanto com deteccao automatica do tenant.

A deteccao automatica funcionara assim:
1. Se `tenantSlug` existir no URL, usar como hoje
2. Se nao existir, buscar o tenant pela tabela `help_site_settings` com `custom_domain` igual ao hostname atual, ou usar um fallback configuravel

Como ainda nao existe campo `custom_domain` na tabela, a solucao inicial sera: quando nao houver tenant slug, buscar o unico tenant que tenha artigos publicados (ou o primeiro encontrado). Isso funciona para single-tenant. Futuramente, um campo `custom_domain` pode ser adicionado.

**Mudancas:**

### `src/App.tsx`
- Adicionar 3 novas rotas sem tenant slug:
  - `/help` -> HelpPublicHome
  - `/help/a/:articleSlug` -> HelpPublicArticle  
  - `/help/c/:collectionSlug` -> HelpPublicCollection

### `src/pages/HelpPublicArticle.tsx`
- Quando `tenantSlug` nao existir nos params, buscar o artigo diretamente pelo slug sem filtrar por tenant (a RLS ja garante que so artigos publicados sao vistos)
- Ajustar breadcrumb para funcionar sem tenantSlug

### `src/pages/HelpPublicHome.tsx`
- Quando `tenantSlug` nao existir, carregar usando o hostname ou buscar o primeiro tenant com help_site_settings
- Ajustar links internos

### `src/pages/HelpPublicCollection.tsx`
- Mesma logica de fallback sem tenantSlug

## Problema 2: Link para a home publica na pagina de artigos

Na pagina admin de artigos (`/help/articles`), adicionar no topo um banner/link para a home publica do Help Center.

### `src/pages/HelpArticles.tsx`
- Buscar o slug do tenant ao carregar
- Adicionar abaixo do PageHeader um link clicavel para `/${tenantSlug}/help` (e tambem para `/help` no dominio custom)
- O link abrira em nova aba com icone ExternalLink
- Formato: card discreto com icone de link externo e texto "Abrir Help Center publico"

## Resumo de arquivos

| Arquivo | Acao |
|---------|------|
| `src/App.tsx` | Adicionar 3 rotas sem tenantSlug |
| `src/pages/HelpPublicArticle.tsx` | Suportar acesso sem tenantSlug |
| `src/pages/HelpPublicHome.tsx` | Suportar acesso sem tenantSlug |
| `src/pages/HelpPublicCollection.tsx` | Suportar acesso sem tenantSlug |
| `src/pages/HelpArticles.tsx` | Adicionar link para home publica no topo |
