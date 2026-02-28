

# Correcoes: Double Check Instantaneo, Header do Atendente, Boas-vindas

## Problema 1: Double check so aparece ao reabrir o widget

**Causa raiz:** Na linha 407, a condicao `isOpenRef.current && isOpen` usa `isOpen` como variavel de estado React. Porem, o callback do Realtime e criado dentro de um `useEffect` com dependencias `[roomId, fetchMessages]` — ou seja, `isOpen` e capturado com o valor do momento da criacao do callback (closure stale). O `isOpenRef.current` esta correto, mas `isOpen` sempre tem o valor antigo.

**Solucao:** Remover `isOpen` da condicao e usar apenas `isOpenRef.current`, que ja reflete o estado real do widget em tempo real.

---

## Problema 2: Nome do atendente nao aparece no header

**Causa raiz:** A funcao `handleStartChat` (linhas 702-865) cria o room via INSERT e le o resultado. O trigger `assign_chat_room` no banco muda `status` para "active" e atribui `attendant_id`, mas o SELECT retornado pelo INSERT mostra o valor ANTES do trigger executar (Supabase retorna o row pre-trigger para INSERT). Entao `room.status` e "waiting" e o codigo entra no `else` (linha 858), setando fase "waiting" sem buscar o atendente. A funcao `checkRoomAssignment` (que busca o estado real do room e retorna o nome do atendente) so e chamada em `handleNewChat`, nao em `handleStartChat`.

**Solucao:** Adicionar `await checkRoomAssignment(room.id)` apos criar o room em ambos os caminhos de `handleStartChat` (linha 805 e linha 861), exatamente como `handleNewChat` ja faz na linha 626. Isso garante que:
- O edge function le o estado real do room (pos-trigger)
- Retorna `attendant_name` que e setado no estado
- Envia a welcome_message automaticamente

---

## Problema 3: Mensagem de boas-vindas nao enviada

**Causa raiz:** A welcome_message e enviada pelo edge function `assign-chat-room`, que so e chamado via `checkRoomAssignment`. Como `handleStartChat` nao chama `checkRoomAssignment`, a welcome_message nunca e disparada para rooms criados pelo formulario inicial.

**Solucao:** Corrigida automaticamente pelo fix do Problema 2 — ao chamar `checkRoomAssignment` em todos os caminhos de criacao de room, o edge function `assign-chat-room` sera invocado e enviara a welcome_message.

---

## Resumo de mudancas

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/ChatWidget.tsx` | Linha 407: remover `&& isOpen` da condicao de update de `visitor_last_read_at`, manter apenas `isOpenRef.current` |
| `src/pages/ChatWidget.tsx` | `handleStartChat` path 1 (linha ~803-805): apos `setPhase("waiting")`, chamar `await checkRoomAssignment(room.id)` |
| `src/pages/ChatWidget.tsx` | `handleStartChat` path 2 (linha ~858-860): apos `setPhase("waiting")`, chamar `await checkRoomAssignment(room.id)` |

Total: 3 edits simples no mesmo arquivo.

