
# Plano: Corrigir formatacao de mensagens no widget do chat

## Problema

A mensagem enviada pelo atendente aparece com quebras de linha corretas no workspace (fundo laranja), mas no widget do cliente (fundo cinza) o texto fica todo corrido, sem nenhuma quebra de linha, apesar do codigo ja ter a classe Tailwind `whitespace-pre-wrap`.

## Causa raiz

O codigo em `ChatWidget.tsx` (linha 1176) usa a classe Tailwind `whitespace-pre-wrap`, porem ha indicios de que essa classe nao esta sendo aplicada corretamente no contexto do iframe do widget. Isso pode ocorrer por:
- Conflito de especificidade CSS (o `App.css` define estilos no `#root` que podem interferir)
- PurgeCSS/JIT do Tailwind nao incluindo a classe no build final

## Solucao

Usar **inline style** `style={{ whiteSpace: 'pre-wrap' }}` diretamente nos elementos `<p>` que renderizam o conteudo das mensagens, garantindo que o estilo seja aplicado independentemente de qualquer conflito CSS. Isso sera feito em 3 arquivos:

### 1. `src/pages/ChatWidget.tsx`
- **Linha 1176**: Substituir `className="whitespace-pre-wrap"` por `className="whitespace-pre-wrap" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}`
- **Linha 1173**: Mesma correcao para mensagens com arquivo + texto
- **Linha 1166**: Adicionar `style={{ whiteSpace: 'pre-wrap' }}` no quote text tambem
- **Linha 1142-1143**: Adicionar no texto de mensagens de sistema

### 2. `src/components/portal/PortalChatView.tsx`
- **Linha 388**: Mesma correcao inline para o portal do cliente
- **Linha 385**: Correcao no texto acompanhando arquivo

### 3. `src/utils/chatUtils.ts`
- Sem alteracao necessaria, a funcao `renderTextWithLinks` preserva os `\n` nos spans corretamente

## Resumo

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/ChatWidget.tsx` | Adicionar inline style `whiteSpace: 'pre-wrap'` + `wordBreak: 'break-word'` |
| `src/components/portal/PortalChatView.tsx` | Mesma correcao inline |

Nenhuma alteracao no banco de dados.
