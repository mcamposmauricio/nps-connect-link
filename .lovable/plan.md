

# Formatacao Rica e Alinhamento nos Banners

## Resumo

Adicionar suporte a texto rico (negrito, sublinhado, italico, cor de texto inline) e alinhamento (esquerda, centro, direita) na criacao de banners. O conteudo formatado sera armazenado como HTML sanitizado.

## Mudancas

### 1. Banco de dados

Adicionar duas colunas na tabela `chat_banners`:

- `content_html` (text, nullable) - conteudo com HTML formatado
- `text_align` (text, default `'left'`) - alinhamento: `left`, `center`, `right`

### 2. Formulario de criacao/edicao (`src/pages/AdminBanners.tsx`)

Substituir o `Textarea` do conteudo por um editor simples com barra de ferramentas:

- Toolbar com botoes: **Negrito (B)**, *Italico (I)*, Sublinhado (U), Cor do texto (color picker inline)
- Seletor de alinhamento: esquerda, centro, direita (3 botoes com icones)
- O editor usara um `div` com `contentEditable=true` para capturar a formatacao
- Ao salvar, o `innerHTML` do div sera armazenado em `content_html` e o `textContent` em `content` (fallback)
- Limitado a 2 linhas visuais via `max-height` e indicacao no label

Novo estado no form:
```
text_align: "left" | "center" | "right"
content_html: string
```

### 3. Componente de toolbar rico (`src/components/chat/BannerRichEditor.tsx`)

Novo componente encapsulando:
- `contentEditable` div com estilo de input
- Barra de formatacao acima com `document.execCommand` para bold, italic, underline, foreColor
- Callback `onChange(html: string, text: string)` para o pai
- Prop `initialHtml` para edicao
- Limite visual de 2 linhas (altura maxima com overflow hidden)

### 4. Preview (`src/components/chat/BannerPreview.tsx`)

- Aceitar nova prop `contentHtml` (opcional) e `textAlign`
- Se `contentHtml` existir, renderizar com `dangerouslySetInnerHTML` (conteudo vem do admin, nao de usuario externo)
- Aplicar `text-align` no container do conteudo

### 5. Edge function (`supabase/functions/get-visitor-banners/index.ts`)

- Incluir `content_html` e `text_align` no select da query de banners
- Retornar os campos no response

### 6. Embed script (`public/nps-chat-embed.js`)

- No `renderBanner`, usar `banner.content_html` se disponivel (via `innerHTML`) em vez de `textContent`
- Aplicar `text-align` do banner no container de conteudo
- Permitir ate 2 linhas de texto (remover `white-space: nowrap` se houver)

## Seguranca

O HTML e gerado apenas pelo admin via `contentEditable` com comandos limitados (bold, italic, underline, foreColor). Nao ha input de HTML bruto pelo usuario. O conteudo e exibido apenas em banners controlados, nao em contextos onde usuarios externos possam injetar conteudo.

## Arquivos

| # | Arquivo | Tipo | Descricao |
|---|---------|------|-----------|
| 1 | Migration SQL | DB | Adicionar `content_html` e `text_align` |
| 2 | `src/components/chat/BannerRichEditor.tsx` | Novo | Editor contentEditable com toolbar |
| 3 | `src/pages/AdminBanners.tsx` | Editar | Usar BannerRichEditor, adicionar text_align ao form |
| 4 | `src/components/chat/BannerPreview.tsx` | Editar | Renderizar HTML e alinhamento |
| 5 | `supabase/functions/get-visitor-banners/index.ts` | Editar | Retornar content_html e text_align |
| 6 | `public/nps-chat-embed.js` | Editar | Renderizar HTML e alinhamento |

