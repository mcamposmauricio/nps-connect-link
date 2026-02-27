

# Correcoes de UX: Widget Scroll, Badge de Notificacao e Loading do Workspace

## Problema 1: Widget abre na primeira mensagem (scroll incorreto)

**Causa raiz**: O efeito de scroll (linhas 480-489 do `ChatWidget.tsx`) depende apenas de `[messages]`. Quando o usuario minimiza e reabre o widget, ou navega entre telas (historico -> chat -> historico -> chat), as mensagens ja estao carregadas no state e nao disparam uma nova renderizacao. O scroll nao e reexecutado.

**Solucao**: Adicionar um `scrollTrigger` que incrementa sempre que:
- O widget e reaberto (`isOpen` muda de `false` para `true`)
- A fase muda para `chat` ou `viewTranscript` (navegacao interna)

O efeito de scroll passara a depender de `[messages, scrollTrigger]`, garantindo que o scroll para o final sempre execute ao reentrar na conversa.

**Arquivo**: `src/pages/ChatWidget.tsx`

---

## Problema 2: FAB sem badge de mensagens nao lidas

**Causa raiz**: O botao FAB (linhas 956-984) nao possui nenhum mecanismo de contagem de mensagens recebidas enquanto o widget esta minimizado. Mensagens do atendente chegam via realtime subscription (que continua ativa mesmo minimizado), mas nao ha state para contabilizar as nao lidas.

**Solucao**:
- Adicionar state `unreadCount` ao `ChatWidget`
- No handler de realtime INSERT de mensagens (linha 362-379), quando `!isOpen` e a mensagem e do atendente, incrementar `unreadCount`
- Quando o widget abre (`isOpen` muda para `true`), zerar `unreadCount`
- Renderizar um badge vermelho com o numero sobre o FAB quando `unreadCount > 0`
- Enviar `postMessage` para o iframe pai com o `unreadCount` atualizado, para que o embed script tambem possa exibir o badge

No **embed script** (`nps-chat-embed.js`):
- Escutar mensagem `chat-unread-count` do iframe
- Criar/atualizar um badge vermelho no canto superior direito do iframe container quando minimizado

**Arquivos**: `src/pages/ChatWidget.tsx`, `public/nps-chat-embed.js`

---

## Problema 3: Workspace mostra loading excessivo ao trocar abas do navegador

**Causa raiz**: A funcao `fetchRooms` no `useChatRealtime.ts` usa `rooms.length` dentro de um `useCallback` com dependencia `[ownerUserId]`. Isso cria uma closure obsoleta onde `rooms.length` sempre vale `0` (valor inicial). Portanto, toda vez que `fetchRooms(true)` e chamado, a condicao `rooms.length === 0` e verdadeira e `setLoading(true)` e executado, mostrando o spinner.

Alem disso, se o token de autenticacao e renovado quando o usuario volta para a aba (comportamento do Supabase `autoRefreshToken`), o `user?.id` pode piscar brevemente de `null` para o valor real, recriando `fetchRooms` e disparando o useEffect novamente com loading.

**Solucao**:
- Substituir a checagem `rooms.length === 0` por um `useRef` chamado `initialLoadDone`
- `setLoading(true)` so executa quando `initialLoadDone.current === false`
- Apos o primeiro fetch bem-sucedido, setar `initialLoadDone.current = true`
- Isso garante que o spinner aparece **apenas uma vez** na vida do componente, e atualizacoes subsequentes (tab switch, token refresh) sao silenciosas

**Arquivo**: `src/hooks/useChatRealtime.ts`

---

## Resumo de Arquivos

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/ChatWidget.tsx` | scrollTrigger para scroll confiavel + unreadCount state + badge no FAB + postMessage para embed |
| `public/nps-chat-embed.js` | Escutar `chat-unread-count` e renderizar badge no iframe |
| `src/hooks/useChatRealtime.ts` | Usar ref `initialLoadDone` para evitar loading repetido |

**Nenhuma mudanca de banco de dados. Nenhuma nova dependencia.**

