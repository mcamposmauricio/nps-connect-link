

# Atualizar Preview do Banner e Permitir Segunda Linha

## Problema

1. O editor rico (`BannerRichEditor`) tem `max-h-[3.5rem]` com `overflow-hidden`, o que impede de visualizar/editar a segunda linha confortavelmente
2. O preview (`BannerPreview`) mostra o HTML mas limita a `maxHeight: 2.8em` - precisa acomodar 2 linhas de forma clara
3. Falta feedback visual no editor de que Enter cria a segunda linha

## Mudancas

### 1. `src/components/chat/BannerRichEditor.tsx`

- Aumentar `max-h` do editor de `3.5rem` para `4.5rem` para acomodar 2 linhas com folga
- Adicionar logica de `onKeyDown` para limitar a 2 linhas: ao pressionar Enter, verificar se ja existem 2 linhas e prevenir a terceira
- Atualizar o texto de ajuda para "Ate 2 linhas. Use Enter para quebrar linha."

### 2. `src/components/chat/BannerPreview.tsx`

- Ajustar `maxHeight` do span de conteudo de `2.8em` para `3em` para garantir que 2 linhas completas sejam visiveis
- Adicionar `word-break: break-word` para textos longos nao estourarem o layout
- Melhorar o preview para que o conteudo HTML respeite quebras de linha (`<br>`, `<div>`) geradas pelo contentEditable

### 3. `public/nps-chat-embed.js`

- Ajustar o `max-height` do texto no banner real de `2.8em` para `3em`
- Adicionar `word-break: break-word` no estilo do texto

## Detalhes Tecnicos

**Limitar a 2 linhas no editor:**
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Enter") {
    const el = editorRef.current;
    if (!el) return;
    // Contar linhas pelo numero de childNodes block-level ou <br>
    const lines = el.innerHTML.split(/<br\s*\/?>|<\/div>|<\/p>/).filter(Boolean);
    if (lines.length >= 2) {
      e.preventDefault();
    }
  }
};
```

**Preview - estilo do conteudo:**
```tsx
<span
  dangerouslySetInnerHTML={{ __html: contentHtml }}
  style={{
    maxHeight: "3em",
    overflow: "hidden",
    display: "block",
    lineHeight: "1.4",
    flex: 1,
    wordBreak: "break-word",
  }}
/>
```

## Arquivos

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/components/chat/BannerRichEditor.tsx` | Aumentar altura do editor, limitar Enter a 2 linhas, melhorar texto de ajuda |
| 2 | `src/components/chat/BannerPreview.tsx` | Ajustar maxHeight para 3em, adicionar word-break |
| 3 | `public/nps-chat-embed.js` | Ajustar max-height e word-break no banner real |

