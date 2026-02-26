
# Plano: 3 Correções no Widget e Tag Selector

## 1. Scroll do widget sempre na mensagem mais recente

**Problema**: Ao abrir um chat existente no widget, o scroll fica na mensagem mais antiga (topo) em vez da mais recente (fundo).

**Causa**: O `fetchMessages` busca em ordem `DESC` e reverte, mas o `scrollRef` so faz scroll no `useEffect([messages])`. Quando o widget abre e carrega mensagens, o scroll e disparado antes do layout terminar de renderizar.

**Solução**: Adicionar um `setTimeout` no scroll effect para garantir que o scroll ocorra apos a renderizacao completa. Tambem adicionar scroll explicito apos `fetchMessages` quando entrando em um chat existente.

**Arquivo**: `src/pages/ChatWidget.tsx`
- Linha 426-428: Melhorar o `useEffect` de auto-scroll com `requestAnimationFrame` ou `setTimeout(..., 0)` para garantir scroll apos paint.

---

## 2. Tag Selector com interface de lista/dropdown

**Problema**: O `ChatTagSelector` exibe TODAS as tags como badges simultaneamente, ocupando muito espaco visual. O atendente precisa de uma interface mais limpa tipo dropdown/combobox.

**Solução**: Redesenhar o componente para:
- Mostrar apenas as tags ja selecionadas como badges compactos (com X para remover)
- Botao "+ Adicionar tag" que abre um Popover com lista de tags disponiveis (nao selecionadas) para selecionar
- Na lista, cada tag com checkbox e cor
- Manter a opcao de criar nova tag dentro do popover

**Arquivo**: `src/components/chat/ChatTagSelector.tsx`
- Substituir o layout de "todas as badges clicaveis" por: badges selecionados + Popover com lista filtrada

---

## 3. Formatacao de mensagens no widget (whitespace/quebra de linha)

**Problema**: Mensagens com quebras de linha (`\n`), paragrafos e texto estruturado aparecem como texto corrido sem formatacao no widget. O workspace (ChatMessageList) ja usa `whitespace-pre-wrap` e `renderTextWithLinks`, mas o widget nao.

**Solução**:
- Adicionar `whitespace-pre-wrap` na tag `<p>` que renderiza o conteudo da mensagem no widget (linha ~1168)
- Importar e usar `renderTextWithLinks` do `ChatMessageList` (ou extrair para `chatUtils.ts`) para tambem renderizar links clicaveis
- Aplicar o mesmo tratamento no `PortalChatView.tsx`

**Arquivos**: 
- `src/pages/ChatWidget.tsx` - adicionar `whitespace-pre-wrap` e `renderTextWithLinks`
- `src/utils/chatUtils.ts` - extrair `renderTextWithLinks` para cá
- `src/components/chat/ChatMessageList.tsx` - importar de chatUtils em vez de definir localmente
- `src/components/portal/PortalChatView.tsx` - mesma correcao de whitespace

---

## Resumo de mudancas

| Arquivo | Tipo | Mudanca |
|---------|------|---------|
| `src/pages/ChatWidget.tsx` | Modificado | Scroll fix + whitespace-pre-wrap + renderTextWithLinks |
| `src/components/chat/ChatTagSelector.tsx` | Modificado | Redesign para Popover com lista |
| `src/utils/chatUtils.ts` | Modificado | Extrair renderTextWithLinks |
| `src/components/chat/ChatMessageList.tsx` | Modificado | Importar renderTextWithLinks de chatUtils |
| `src/components/portal/PortalChatView.tsx` | Modificado | whitespace-pre-wrap nas mensagens |

Nenhuma alteracao no banco de dados.
