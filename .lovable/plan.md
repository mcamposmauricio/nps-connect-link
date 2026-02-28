

# Substituir Editor de Blocos por Editor Rich Text (WYSIWYG)

## Problema atual
O editor de artigos usa um sistema de blocos individuais (heading, paragraph, list, image...) com cards separados, controles de reordenacao e formularios por bloco. Isso cria uma experiencia fragmentada, distante da escrita fluida de um artigo de blog. Imagens so podem ser inseridas via URL.

## Solucao

Substituir o editor de blocos por um editor rich text baseado no **Tiptap** (framework headless sobre ProseMirror), que oferece:
- Escrita fluida como um editor de texto (similar ao Notion/Medium)
- Ctrl+C / Ctrl+V de imagens diretamente no corpo do texto
- Upload automatico de imagens coladas para storage
- Toolbar flutuante para formatacao (bold, italic, headings, listas, etc.)
- Redimensionamento inline de imagens
- Suporte a todos os elementos existentes (callouts, tabelas, divisores)

## Mudancas tecnicas

### 1. Instalar dependencias Tiptap
Pacotes necessarios:
- `@tiptap/react` - core React bindings
- `@tiptap/starter-kit` - extensoes basicas (headings, bold, italic, lists, blockquote, etc.)
- `@tiptap/extension-image` - suporte a imagens inline
- `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header` - tabelas
- `@tiptap/extension-placeholder` - placeholder text
- `@tiptap/extension-link` - links clicaveis
- `@tiptap/extension-text-align` - alinhamento de texto
- `@tiptap/extension-underline` - sublinhado

### 2. Criar bucket de storage `help-images`
- Migration SQL para criar bucket publico `help-images`
- Policies: qualquer usuario autenticado pode fazer upload; leitura publica

### 3. Criar componente `src/components/help/RichTextEditor.tsx`
- Editor Tiptap com toolbar fixa no topo (formatacao, inserir imagem, tabela, divisor, callout)
- Handler de paste para interceptar imagens do clipboard:
  1. Detectar `clipboardData.files` com tipo `image/*`
  2. Fazer upload para bucket `help-images` via Supabase Storage
  3. Inserir `<img>` no editor com a URL publica
- Botao "Inserir imagem" que abre file picker, faz upload, insere no editor
- Redimensionamento de imagens via handles visuais (drag corners)
- Estilizacao com Tailwind para parecer um editor de blog limpo
- Output: HTML sanitizado

### 4. Criar componente `src/components/help/EditorToolbar.tsx`
Toolbar com botoes para:
- Headings (H2, H3)
- Bold, Italic, Underline
- Lista ordenada/nao-ordenada
- Link
- Imagem (upload)
- Tabela
- Divisor (HR)
- Callout (blockquote estilizado)
- Alinhamento (esquerda, centro, direita)

### 5. Reescrever `src/pages/HelpArticleEditor.tsx`
- Remover todo o sistema de blocos (BlockEditorItem, addBlock, moveBlock, etc.)
- Substituir por o componente RichTextEditor
- O conteudo sera armazenado como HTML (no campo `html_snapshot`)
- Manter `editor_schema_json` com formato `{ html: "..." }` para compatibilidade
- Manter toda a logica de metadados (titulo, subtitulo, slug, colecao)
- Manter sidebar de versoes
- Layout: titulo e subtitulo no topo, editor WYSIWYG ocupando o corpo inteiro da pagina

### 6. Atualizar `src/utils/helpBlocks.ts`
- Adicionar funcao `blocksToTiptapHtml()` que converte o formato de blocos antigo para HTML compativel com Tiptap
- Manter `htmlToBlocks()` e `blocksToHtml()` para compatibilidade retroativa
- Adicionar funcao `editorSchemaToHtml()` que detecta o formato (blocos vs HTML puro) e retorna HTML

### 7. Migrar artigos existentes
- Ao carregar um artigo, verificar se `editor_schema_json` contem blocos antigos
- Se sim, converter para HTML usando `blocksToHtml()` e carregar no Tiptap
- Ao salvar, gravar no novo formato HTML
- Nenhuma migration de banco necessaria - a conversao acontece on-the-fly no frontend

### 8. Atualizar `src/pages/HelpPublicArticle.tsx`
- Adicionar estilos CSS para elementos do Tiptap (callouts, tabelas, etc.)
- O `html_snapshot` ja e renderizado via `dangerouslySetInnerHTML`, entao a exibicao publica continua funcionando

## Resultado esperado

```text
+-----------------------------------------------+
|  Titulo do artigo                              |
|  Subtitulo / descricao curta                   |
+-----------------------------------------------+
| [B] [I] [U] | H2 H3 | Lista | Img | Tabela   |  <- Toolbar
+-----------------------------------------------+
|                                                |
|  Aqui voce escreve como se fosse um blog.      |
|  Pode colar imagens diretamente (Ctrl+V).      |
|                                                |
|  [imagem colada aqui, redimensionavel]          |
|                                                |
|  Continue escrevendo naturalmente...            |
|                                                |
+-----------------------------------------------+
```

## Arquivos criados/modificados

| Arquivo | Acao |
|---------|------|
| `src/components/help/RichTextEditor.tsx` | Criar - componente principal do editor |
| `src/components/help/EditorToolbar.tsx` | Criar - barra de ferramentas |
| `src/pages/HelpArticleEditor.tsx` | Reescrever - remover blocos, usar RichTextEditor |
| `src/utils/helpBlocks.ts` | Atualizar - adicionar funcoes de conversao |
| `src/index.css` | Atualizar - adicionar estilos do editor Tiptap |
| Migration SQL | Criar bucket `help-images` com policies |

## Compatibilidade
- Artigos existentes (152 importados) serao convertidos automaticamente de blocos para HTML ao serem abertos
- A visualizacao publica continua usando `html_snapshot` (sem mudanca)
- O historico de versoes continua funcionando normalmente

