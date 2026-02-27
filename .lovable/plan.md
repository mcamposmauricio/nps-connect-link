
# Revisao e Melhorias do Gerenciamento de Banners

## Contexto Atual

O sistema de banners hoje funciona como uma barra de notificacao fixa no topo da pagina do cliente (via embed script), com suporte a texto rico, links, votacao e atribuicao manual por contato. Porem, o conceito esta limitado: sem agendamento, sem segmentacao automatica, sem tipos visuais diferenciados, sem metricas de engajamento claras, e a UI de gerenciamento e basica.

---

## Melhorias Propostas

### 1. TIPOS DE BANNER (visual e semantico)

Adicionar um campo `type` ao banner com opcoes pre-definidas que alteram automaticamente o icone e estilo visual:

| Tipo | Icone | Uso |
|------|-------|-----|
| `info` | Info circle | Avisos gerais, novidades |
| `warning` | AlertTriangle | Alertas importantes |
| `success` | CheckCircle | Confirmacoes, boas noticias |
| `promo` | Megaphone | Promocoes, ofertas |
| `update` | Sparkles | Atualizacoes de produto |

**Impacto**: Novo campo `banner_type` na tabela `chat_banners` (default `info`). O preview e o embed script renderizam um icone a esquerda do texto baseado no tipo. No formulario, um seletor visual com os 5 tipos.

### 2. AGENDAMENTO (inicio e fim)

Adicionar campos `starts_at` e `expires_at` para controlar quando o banner fica visivel:
- Se `starts_at` for nulo, fica ativo imediatamente
- Se `expires_at` for nulo, nao expira
- A edge function `get-visitor-banners` filtra por data atual

**Impacto**: 2 novos campos na tabela. Inputs de data/hora no formulario. Filtro SQL na edge function.

### 3. PRIORIDADE / ORDEM

Adicionar campo `priority` (1-10, default 5) para controlar a ordem de exibicao quando multiplos banners estao ativos para o mesmo contato. Banners com maior prioridade aparecem primeiro (no topo).

**Impacto**: 1 campo novo. Order by na query da edge function.

### 4. SEGMENTACAO AUTOMATICA - "Todos os clientes"

Adicionar opcao de atribuir o banner a **todos os contatos** sem precisar selecionar um a um. Checkbox "Exibir para todos os clientes" no formulario, que seta um campo `target_all` na tabela. A edge function verifica este flag antes de checar assignments individuais.

**Impacto**: 1 campo novo `target_all` (boolean, default false). Logica condicional na edge function.

### 5. LIMITE DE EXIBICOES

Adicionar campo `max_views` (nullable) para limitar quantas vezes o banner e exibido para cada contato. Quando `views_count >= max_views`, a edge function nao retorna mais aquele banner.

**Impacto**: 1 campo novo na tabela `chat_banners`. Filtro na edge function.

### 6. DISMISS PERMANENTE

Quando o cliente fecha o banner (clica no X), registrar um `dismissed_at` no assignment para nao exibir novamente. Hoje o close so remove do DOM e reaparece no proximo carregamento.

**Impacto**: 1 campo novo `dismissed_at` na tabela `chat_banner_assignments`. Nova edge function `dismiss-banner`. Filtro na query existente.

### 7. UI/UX DO GERENCIAMENTO (AdminBanners.tsx)

**7a. PageHeader padronizado**: Usar componente `PageHeader` em vez de markup manual.

**7b. Cards redesenhados**: Cada banner card mostra:
- Icone do tipo (colorido) a esquerda
- Titulo + badge de status (Ativo/Inativo/Agendado/Expirado)
- Preview inline do texto com a cor de fundo como barra lateral
- Metricas compactas: destinatarios, views, taxa de voto (se habilitado)
- Periodo de exibicao (se agendado)

**7c. Confirmacao de exclusao**: Adicionar `AlertDialog` antes de deletar (hoje deleta sem confirmar).

**7d. Duplicar banner**: Botao para clonar um banner existente com todas as configs (sem assignments).

**7e. Empty state melhorado**: Ilustracao + descricao + CTA "Criar primeiro banner".

**7f. Formulario reorganizado**: Separar em secoes visuais com `Separator`:
- Secao 1: Tipo + Titulo
- Secao 2: Conteudo (rich editor)
- Secao 3: Aparencia (cores)
- Secao 4: Link + Votacao
- Secao 5: Agendamento
- Secao 6: Segmentacao (todos ou selecionados)

### 8. PREVIEW MELHORADO (BannerPreview.tsx)

- Adicionar o icone do tipo selecionado no preview
- Mostrar badge de "Agendado" ou "Expira em X dias" se datas estiverem preenchidas

### 9. METRICAS NO CARD

Adicionar calculo de taxa de engajamento:
- `CTR` = cliques no link / views (se tiver link)
- `Favorabilidade` = upvotes / (upvotes + downvotes) em % (se tiver votacao)

### 10. EMBED SCRIPT (nps-chat-embed.js)

- Adicionar icone SVG a esquerda do texto baseado no `banner_type`
- Implementar dismiss permanente via nova edge function
- Respeitar a ordem de `priority`

---

## Banco de Dados

### Migracao 1: `chat_banners` - novos campos
```text
ALTER TABLE chat_banners
  ADD COLUMN banner_type text NOT NULL DEFAULT 'info',
  ADD COLUMN starts_at timestamptz DEFAULT NULL,
  ADD COLUMN expires_at timestamptz DEFAULT NULL,
  ADD COLUMN priority integer NOT NULL DEFAULT 5,
  ADD COLUMN target_all boolean NOT NULL DEFAULT false,
  ADD COLUMN max_views integer DEFAULT NULL;
```

### Migracao 2: `chat_banner_assignments` - dismissed_at
```text
ALTER TABLE chat_banner_assignments
  ADD COLUMN dismissed_at timestamptz DEFAULT NULL;
```

---

## Edge Functions

### Atualizar `get-visitor-banners`
- Filtrar `starts_at <= now() OR starts_at IS NULL`
- Filtrar `expires_at > now() OR expires_at IS NULL`
- Filtrar `dismissed_at IS NULL` nos assignments
- Filtrar `max_views IS NULL OR views_count < max_views`
- Suportar `target_all = true` (buscar banners sem assignment individual)
- Ordenar por `priority DESC`
- Retornar `banner_type` no payload

### Nova edge function `dismiss-banner`
- Recebe `assignment_id`
- Seta `dismissed_at = now()` e `is_active = false`

---

## Arquivos Impactados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/AdminBanners.tsx` | Redesign completo do gerenciamento |
| `src/components/chat/BannerPreview.tsx` | Adicionar icone de tipo e badges |
| `src/components/chat/BannerRichEditor.tsx` | Sem mudancas |
| `supabase/functions/get-visitor-banners/index.ts` | Filtros de data, dismiss, target_all, priority |
| `supabase/functions/dismiss-banner/index.ts` | Nova edge function |
| `public/nps-chat-embed.js` | Icone de tipo, dismiss permanente, ordenacao |
| `src/locales/pt-BR.ts` | Novas chaves de traducao |
| `src/locales/en.ts` | Novas chaves de traducao |

**2 migracoes de banco. 1 nova edge function. ~8 arquivos modificados.**
