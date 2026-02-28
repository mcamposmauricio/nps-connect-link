
# Help Center / Base de Conhecimento - Plano de Implementacao

## Visao Geral

Funcionalidade completa de Help Center multi-tenant integrada ao produto, com CRUD interno, paginas publicas, editor por blocos, versionamento, analytics e importacao em massa de HTMLs existentes.

---

## FASE 1 - Modelo de Dados (Migration SQL)

### Tabelas a criar

**1. help_collections**
- id (uuid PK), tenant_id (FK tenants, NOT NULL), name (text NOT NULL), slug (text NOT NULL), description (text), icon (text), status (text default 'active' - active/archived), order_index (int default 0), created_at, updated_at
- UNIQUE(tenant_id, slug)

**2. help_articles**
- id (uuid PK), tenant_id (FK tenants, NOT NULL), collection_id (FK help_collections, nullable), title (text NOT NULL), subtitle (text), slug (text NOT NULL), status (text default 'draft' - draft/published/archived/pending_review), visibility (text default 'public'), current_version_id (uuid, nullable), published_at (timestamptz), archived_at (timestamptz), created_by_user_id (uuid NOT NULL), updated_by_user_id (uuid), created_at, updated_at
- UNIQUE(tenant_id, slug)

**3. help_article_versions**
- id (uuid PK), tenant_id (FK tenants, NOT NULL), article_id (FK help_articles ON DELETE CASCADE), version_number (int NOT NULL), editor_schema_json (jsonb NOT NULL), html_snapshot (text), change_summary (text), created_by_user_id (uuid NOT NULL), created_at

**4. help_article_events**
- id (uuid PK), tenant_id (FK tenants, NOT NULL), article_id (FK help_articles ON DELETE CASCADE), version_id (uuid, nullable), event_type (text NOT NULL - page_view/unique_view/link_click/search_click/copy_link), event_meta (jsonb default '{}'), visitor_id (text), session_id (text), occurred_at (timestamptz default now())

**5. help_site_settings**
- tenant_id (uuid PK, FK tenants), public_base_url (text), home_title (text), home_subtitle (text), theme (text default 'light'), brand_logo_url (text), brand_primary_color (text default '#3B82F6'), brand_secondary_color (text), footer_html (text), contact_channels_json (jsonb default '[]'), custom_css (text), created_at, updated_at

### RLS Policies
- Todas as tabelas: tenant members podem CRUD (tenant_id = get_user_tenant_id(auth.uid()))
- help_articles, help_article_versions, help_collections: SELECT publico para status = 'published' / 'active' (role anon)
- help_site_settings: SELECT publico (role anon)
- help_article_events: INSERT publico (role anon) para analytics anonimos

### Realtime
- Habilitar realtime para help_articles (para preview live no editor)

### Permissoes (no PERMISSION_TREE existente)
Adicionar novo grupo no `UserPermissionsDialog.tsx`:
```
{
  key: "help",
  labelKey: "team.module.help",
  actions: ["view", "edit", "delete", "manage"],
  children: [
    { key: "help.articles", actions: ["view", "edit", "delete", "manage"] },
    { key: "help.collections", actions: ["view", "edit", "delete"] },
    { key: "help.settings", actions: ["view", "manage"] },
    { key: "help.analytics", actions: ["view"] },
    { key: "help.import", actions: ["manage"] },
  ]
}
```
A logica de "help_editor nao publica" sera: se usuario tem `help.articles.edit` mas NAO `help.articles.manage`, ao tentar publicar o status muda para `pending_review` em vez de `published`.

---

## FASE 2 - Rotas e Navegacao

### Rotas publicas (sem autenticacao, fora do SidebarLayout)
- `/:tenantSlug/help` - Home do Help Center
- `/:tenantSlug/help/c/:collectionSlug` - Pagina da colecao
- `/:tenantSlug/help/a/:articleSlug` - Pagina do artigo
- `/:tenantSlug/help/sitemap.xml` - Sitemap (via edge function)

### Rotas admin (dentro do SidebarLayout, protegidas)
- `/help/overview` - Visao geral com metricas
- `/help/articles` - Listagem de artigos
- `/help/articles/new` - Criar artigo (editor)
- `/help/articles/:id/edit` - Editar artigo (editor)
- `/help/collections` - Gerenciar colecoes
- `/help/settings` - Configuracoes do site
- `/help/import` - Importacao em massa

### Sidebar
Novo grupo "Help Center" no AppSidebar com icone BookOpen, contendo: Visao Geral, Artigos, Colecoes, Configuracoes, Importar.

---

## FASE 3 - Editor por Blocos

### Arquitetura
Implementar editor customizado com blocos manipulaveis via React state (sem dependencia de libs externas pesadas tipo TipTap/Plate para manter o bundle leve).

### Tipos de blocos (BlockType)
```typescript
type BlockType = 
  | 'heading'      // H2/H3 com nivel
  | 'paragraph'    // texto rico (bold, italic, links)
  | 'list'         // ordered/unordered com itens
  | 'image'        // url + alt + legenda + link opcional
  | 'gif'          // url
  | 'button'       // texto + link + variante
  | 'callout'      // tipo (info/warn/success/error) + texto
  | 'divider'      // hr
  | 'steps'        // lista numerada com titulo por passo
  | 'table'        // linhas/colunas simples
  | 'icon_text'    // icone + texto destacado
```

### Schema JSON (editor_schema_json)
```json
{
  "blocks": [
    { "id": "uuid", "type": "heading", "data": { "level": 2, "text": "Titulo" } },
    { "id": "uuid", "type": "paragraph", "data": { "html": "<p>Texto <strong>bold</strong></p>" } },
    { "id": "uuid", "type": "image", "data": { "src": "url", "alt": "desc", "caption": "legenda", "link": "url" } }
  ]
}
```

### Componentes do editor
- `HelpArticleEditor.tsx` - pagina completa do editor
- `BlockEditor.tsx` - container dos blocos com drag-and-drop (reordenar)
- `BlockRenderer.tsx` - renderiza um bloco individual com toolbar
- `BlockToolbar.tsx` - barra de adicionar bloco (menu dropdown)
- Um componente por tipo de bloco para edicao inline

### Geracao de HTML
Funcao `blocksToHtml(blocks)` que converte o schema JSON em HTML sanitizado (html_snapshot). Usar sanitizacao basica removendo scripts/event handlers.

### Versionamento
- Ao salvar, criar nova versao com version_number incrementado
- Painel lateral "Historico" com lista de versoes (data, autor, summary)
- Acao "Restaurar" cria nova versao baseada na selecionada

---

## FASE 4 - Telas Admin

### 4.1 Visao Geral (`/help/overview`)
- Cards: total artigos por status (draft/published/archived), total colecoes
- Grafico de views (7/30 dias) usando Recharts (ja instalado)
- Top 10 artigos por views e cliques
- Artigos pendentes de revisao (se houver)

### 4.2 Listagem de Artigos (`/help/articles`)
- Filtros: status, colecao, busca por titulo/subtitulo
- Tabela: Titulo, Colecao, Status (badge colorido), Atualizado em, Views 7d/30d
- Acoes: Editar, Duplicar, Arquivar/Publicar, Copiar link publico
- Botao "Novo Artigo"

### 4.3 Colecoes (`/help/collections`)
- CRUD com nome, slug (auto-gerado, editavel), icone, descricao
- Lista com drag-and-drop para reordenar (order_index)
- Dialog para criar/editar

### 4.4 Editor de Artigo (`/help/articles/new` e `/help/articles/:id/edit`)
- Header: titulo, subtitulo, selecao de colecao, slug (editavel com validacao)
- Corpo: BlockEditor
- Sidebar: status, versoes, preview, acoes
- Botoes: Salvar rascunho, Publicar (ou Solicitar revisao), Arquivar, Pre-visualizar

### 4.5 Configuracoes (`/help/settings`)
- Formulario: home_title, home_subtitle, tema, logo, cores, footer_html, canais de contato
- Preview do layout publico

### 4.6 Importacao (`/help/import`)
- Upload de arquivos HTML via drag-and-drop
- Preview: tabela com titulo detectado, colecao inferida, warnings
- Toggle "Auto-publicar" (default off)
- Botao importar + relatorio pos-import

---

## FASE 5 - Paginas Publicas

### Layout publico
Componente `HelpPublicLayout.tsx` com:
- Header: logo, titulo, barra de busca
- Footer: canais de contato, links

### Home (`/:tenantSlug/help`)
- Hero customizavel (titulo, subtitulo, busca)
- Grid de colecoes com icone + nome + contagem de artigos
- Artigos em destaque (mais recentes publicados)

### Colecao (`/:tenantSlug/help/c/:collectionSlug`)
- Titulo + descricao da colecao
- Lista de artigos publicados da colecao

### Artigo (`/:tenantSlug/help/a/:articleSlug`)
- Renderizacao do html_snapshot
- Breadcrumb: Home > Colecao > Artigo
- Meta SEO: title, description, OpenGraph
- Analytics: registrar page_view e unique_view (cookie 24h)
- Interceptar cliques em links para registrar link_click

### Artigo arquivado
- Exibir mensagem "Artigo nao encontrado" e redirecionar para home

### Busca
- Barra de busca na home
- Busca por titulo/subtitulo via query SQL (ILIKE)
- Registrar search_click nos resultados

---

## FASE 6 - Analytics

### Edge Function `track-help-event`
- Endpoint publico (sem JWT) para registrar eventos
- Recebe: tenant_slug, article_id, event_type, event_meta, visitor_id, session_id
- Valida que o artigo pertence ao tenant
- Para unique_view: verificar se ja existe evento do mesmo visitor_id + article_id nas ultimas 24h

### Dashboard admin
- Queries agregadas no componente de Visao Geral
- Filtro por periodo (7/30/90 dias)
- Top links clicados por artigo
- Taxa de clique (link_clicks / page_views)

---

## FASE 7 - Importacao em Massa

### Parsing HTML -> Blocos
Edge function `import-help-articles` ou logica client-side:

1. Para cada arquivo .html:
   - Parse via DOMParser (client-side)
   - Extrair h1 como titulo, h4 como subtitulo
   - Converter tags para blocos conforme regras definidas
   - Detectar footer por heuristica (blocos finais com "duvida", "chat", "email", horarios)
   - Sanitizar HTML (remover scripts, atributos perigosos)

2. Gerar slug a partir do titulo (slugify), com sufixo incremental se duplicado

3. Criar colecoes baseadas nas pastas (artigos 1 / artigos 2 como colecoes)

4. Salvar como draft (ou published se toggle ativo)

5. Armazenar HTML original no campo auxiliar (event_meta da versao ou campo extra)

### UI de importacao
- Leitura dos arquivos .html das pastas do projeto (ja estao no repo)
- Como os arquivos estao no repo, criar uma tela que lista os HTMLs disponiveis para importacao
- Preview com warnings (sem h1, sem h4, etc.)
- Relatorio pos-import

---

## FASE 8 - SEO

### Meta tags
- Componente `HelpSEO.tsx` usando react-helmet ou manipulacao direta do DOM
- Meta title: `{titulo do artigo} | {nome do tenant}`
- Meta description: subtitulo ou primeiros 160 chars
- OpenGraph: og:title, og:description, og:type=article

### Sitemap
- Edge function `help-sitemap` que retorna XML com todos os artigos publicados do tenant
- Rota: `/:tenantSlug/help/sitemap.xml`

---

## Resumo de Arquivos

### Novos arquivos (~25-30)

**Paginas:**
- `src/pages/HelpOverview.tsx`
- `src/pages/HelpArticles.tsx`
- `src/pages/HelpArticleEditor.tsx`
- `src/pages/HelpCollections.tsx`
- `src/pages/HelpSettings.tsx`
- `src/pages/HelpImport.tsx`
- `src/pages/HelpPublicHome.tsx`
- `src/pages/HelpPublicCollection.tsx`
- `src/pages/HelpPublicArticle.tsx`

**Componentes:**
- `src/components/help/BlockEditor.tsx`
- `src/components/help/BlockRenderer.tsx`
- `src/components/help/BlockToolbar.tsx`
- `src/components/help/blocks/` (um componente por tipo de bloco)
- `src/components/help/HelpPublicLayout.tsx`
- `src/components/help/HelpSEO.tsx`
- `src/components/help/ArticleVersionHistory.tsx`
- `src/components/help/CollectionDialog.tsx`
- `src/components/help/ImportPreviewTable.tsx`

**Utils:**
- `src/utils/helpBlocks.ts` (tipos, blocksToHtml, htmlToBlocks)
- `src/utils/helpSlug.ts` (slugify, validacao)

**Edge Functions:**
- `supabase/functions/track-help-event/index.ts`
- `supabase/functions/help-sitemap/index.ts`

### Arquivos modificados
- `src/App.tsx` - novas rotas
- `src/components/AppSidebar.tsx` - grupo Help Center
- `src/components/UserPermissionsDialog.tsx` - permissoes help.*
- `src/locales/pt-BR.ts` e `en.ts` - traducoes

---

## Ordem de implementacao sugerida

Dado o tamanho, sugiro implementar em etapas incrementais:

1. **Migration SQL** (tabelas + RLS + realtime)
2. **Utils** (tipos de blocos, conversores, slug)
3. **Colecoes CRUD** (tela simples)
4. **Editor de artigos** (core da funcionalidade)
5. **Listagem de artigos + Visao Geral**
6. **Paginas publicas** (home, colecao, artigo)
7. **Sidebar + rotas + permissoes**
8. **Analytics** (edge function + dashboard)
9. **Configuracoes do site**
10. **Importacao em massa**
11. **SEO + Sitemap**

Cada etapa sera funcional independentemente, permitindo testar incrementalmente.
