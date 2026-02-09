
# Plano: Widget de Chat Flutuante com Posicionamento Configuravel e Sistema de Banners

## Resumo

Tres grandes entregas:
1. Transformar o widget de chat em um componente flutuante (overlay) com botao de abrir/fechar, posicionavel no canto inferior direito ou esquerdo
2. Criar um sistema de banners configuravel que aparece no topo do widget, atribuido por cliente
3. Adicionar previews ao vivo tanto para o widget quanto para os banners nas paginas de configuracao

---

## 1. Widget de Chat Flutuante (Overlay)

### 1.1 Problema Atual

O widget atual (`ChatWidget.tsx`) renderiza como uma pagina inteira ou um iframe fixo. Nao tem comportamento de "bolha" flutuante que abre/fecha.

### 1.2 Solucao

Transformar o widget em dois modos:
- **Modo bolha**: Botao circular flutuante no canto da tela. Ao clicar, abre o painel de chat com animacao
- **Modo aberto**: Painel de chat com header, corpo e input

**Parametros via query string:**
- `position=right` (default) ou `position=left` -- define canto inferior direito ou esquerdo
- `embed=true` -- ativa modo embed (sem fundo, sem padding)
- `companyName` -- nome exibido no header
- `primaryColor` -- cor do botao e header
- `tenantId` -- identifica o tenant para carregar banners

### 1.3 Novo embed code (gerado na configuracao)

```html
<script>
  (function() {
    var w = document.createElement('iframe');
    w.src = 'https://app.url/widget?embed=true&position=right&tenantId=xxx';
    w.style = 'position:fixed;bottom:0;right:0;width:420px;height:700px;border:none;z-index:99999;';
    w.allow = 'clipboard-write';
    document.body.appendChild(w);
  })();
</script>
```

### 1.4 Mudancas no ChatWidget.tsx

- Adicionar estado `isOpen` (bolha vs painel aberto)
- Ler `position` da query string
- Renderizar botao FAB quando fechado (posicao dinamica: `right:20px` ou `left:20px`)
- Renderizar painel de chat quando aberto (mesma posicao)
- Adicionar animacao de entrada/saida
- Ler `tenantId` para buscar banners ativos

### 1.5 Preview na Configuracao do Widget

Na tab "Widget" do `AdminSettings.tsx`, adicionar:
- Seletor de posicao (direita/esquerda)
- Input para nome da empresa
- Color picker para cor primaria
- **Preview ao vivo** que simula como o widget aparecera na tela do cliente, incluindo o botao FAB e o painel aberto

---

## 2. Sistema de Banners

### 2.1 Conceito

Banners sao mensagens simples (texto + emojis + cor + link opcional + votacao opcional) que aparecem no **topo** do widget de chat. Sao atribuidos a nivel de cliente (contact).

### 2.2 Nova Tabela: `chat_banners`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| tenant_id | uuid | Isolamento multi-tenant |
| user_id | uuid | Criador |
| title | text | Titulo interno |
| content | text | Texto do banner (suporta emojis) |
| bg_color | text | Cor de fundo |
| text_color | text | Cor do texto |
| link_url | text | URL opcional (CTA) |
| link_label | text | Texto do link |
| has_voting | boolean | Ativa votacao (like/dislike) |
| is_active | boolean | Ativo/inativo |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 2.3 Nova Tabela: `chat_banner_assignments`

Cada atribuicao de banner a um cliente gera uma linha separada para rastrear status.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| banner_id | uuid FK | Referencia ao banner |
| contact_id | uuid FK | Cliente atribuido |
| tenant_id | uuid | Isolamento |
| is_active | boolean | Ativo para este cliente |
| views_count | integer | Quantas vezes foi visualizado |
| vote | text nullable | "up", "down" ou null |
| voted_at | timestamptz | |
| created_at | timestamptz | |

### 2.4 RLS Policies

- `chat_banners`: Tenant members podem CRUD; publico pode SELECT (para o widget carregar)
- `chat_banner_assignments`: Tenant members podem CRUD; publico pode SELECT e UPDATE (para registrar votos)

### 2.5 Nova Pagina: Gerenciamento de Banners

**Rota**: `/admin/banners`
**Menu**: Novo item no submenu Chat da sidebar

A pagina tera:
- **Lista de banners** com status, contagem de atribuicoes, votos
- **Criar/editar banner**: Formulario com campos de texto, cor, link, votacao
- **Atribuir a clientes**: Modal com filtro/busca de contacts, selecao multipla
- **Tabela de atribuicoes**: Cada linha mostra contact, status, views, voto
- **Preview ao vivo**: Simulacao do banner no topo de um widget mockado

### 2.6 Preview do Banner

Componente `BannerPreview` que renderiza:

```text
+------------------------------------------+
| [emoji] Texto do banner com link [CTA]   |
|         [thumbsUp] [thumbsDown]          |
+------------------------------------------+
```

- Mostra cores configuradas em tempo real
- Mostra votacao se habilitada
- Mostra link clicavel se configurado

---

## 3. Widget Carregando Banners

### 3.1 Fluxo no ChatWidget

1. Ao carregar, o widget le `tenantId` da query string
2. Se o visitante tem `visitor_token` salvo, busca o `contact_id` associado
3. Busca banners ativos atribuidos a esse contact: `chat_banner_assignments` JOIN `chat_banners`
4. Renderiza os banners ativos no topo do widget (acima do chat)
5. Ao visualizar, incrementa `views_count`
6. Ao votar, atualiza `vote` e `voted_at`

### 3.2 Banner no Widget (visual)

```text
+------------------------------------------+
| [X] Texto do banner aqui com emojis      |  <-- topo, cor de fundo
|     [Link CTA] [thumbsUp] [thumbsDown]   |
+------------------------------------------+
| Header: Empresa - Chat ativo             |
+------------------------------------------+
| Mensagens do chat...                     |
+------------------------------------------+
| [Input de mensagem]            [Enviar]  |
+------------------------------------------+
```

---

## 4. Preview na Configuracao do Widget (AdminSettings)

Na tab "Widget" existente do AdminSettings:

- **Seletor de posicao**: Radio group (Direita / Esquerda)
- **Nome da empresa**: Input
- **Cor primaria**: Color picker
- **Preview interativo**: Div simulando uma tela de site com o widget no canto selecionado
  - Mostra o botao FAB
  - Ao clicar no FAB no preview, abre o painel mockado
  - Se ha banners ativos do tenant, mostra-os no preview

Salvar posicao e cor na tabela `chat_settings` (adicionar colunas `widget_position` e `widget_primary_color`).

---

## 5. Arquivos

### Novos Arquivos (4)
1. `src/pages/AdminBanners.tsx` -- Pagina de gerenciamento de banners
2. `src/components/chat/BannerPreview.tsx` -- Componente de preview de banner
3. `src/components/chat/WidgetPreview.tsx` -- Componente de preview do widget na config
4. `src/components/chat/WidgetBanner.tsx` -- Componente de banner dentro do widget

### Arquivos Modificados (7)
1. `src/pages/ChatWidget.tsx` -- Modo bolha, posicao configuravel, carregamento de banners
2. `src/pages/AdminSettings.tsx` -- Tab Widget com preview, seletor de posicao, cor
3. `src/components/AppSidebar.tsx` -- Adicionar item "Banners" no submenu Chat
4. `src/App.tsx` -- Rota `/admin/banners`
5. `src/locales/pt-BR.ts` -- Chaves de traducao
6. `src/locales/en.ts` -- Chaves de traducao
7. `src/components/ChatApiKeysTab.tsx` -- Atualizar embed code com novos parametros

### Migracoes de Banco (1)
- Criar tabelas `chat_banners` e `chat_banner_assignments`
- Adicionar colunas `widget_position` e `widget_primary_color` em `chat_settings`
- RLS policies
- Habilitar realtime para `chat_banner_assignments`

---

## Secao Tecnica

### Schema SQL (migracao)

```sql
-- chat_banners
CREATE TABLE public.chat_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  bg_color text DEFAULT '#3B82F6',
  text_color text DEFAULT '#FFFFFF',
  link_url text,
  link_label text,
  has_voting boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- chat_banner_assignments
CREATE TABLE public.chat_banner_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id uuid NOT NULL REFERENCES public.chat_banners(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  is_active boolean DEFAULT true,
  views_count integer DEFAULT 0,
  vote text,
  voted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Colunas novas em chat_settings
ALTER TABLE public.chat_settings
  ADD COLUMN widget_position text DEFAULT 'right',
  ADD COLUMN widget_primary_color text DEFAULT '#7C3AED';
```

### RLS

- `chat_banners`: Tenant CRUD + public SELECT (para widget)
- `chat_banner_assignments`: Tenant CRUD + public SELECT/UPDATE (para widget registrar votos/views)

### Trigger

- `set_tenant_id_from_user` em `chat_banners`

### ChatWidget - Logica de Posicao

O widget le `position` da query string e aplica:
- `position=right`: `right: 20px; bottom: 20px`
- `position=left`: `left: 20px; bottom: 20px`

O FAB usa a mesma logica de posicao.

### WidgetPreview Component

Renderiza um `div` simulando uma pagina web (fundo cinza claro, barra de endereco mockada) com o widget miniaturizado no canto configurado. Reage em tempo real a mudancas de posicao e cor.

### BannerPreview Component

Recebe props do formulario de banner e renderiza uma simulacao do banner dentro de um widget mockado, mostrando exatamente como o cliente vera.
