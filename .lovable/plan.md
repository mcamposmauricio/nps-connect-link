

# Correcoes: Header do Atendente, Boas-vindas e Checks Duplos

## Problema 1: Nome do atendente nao aparece no header

O header mostra "Suporte - Chat ativo" em vez de "Voce esta falando com [Nome]". A logica de `setAttendantName` depende do evento Realtime de UPDATE na `chat_rooms`, mas ha um problema: quando o atendente e atribuido pelo trigger `assign_chat_room` no banco, o widget chama `checkRoomAssignment` (edge function) que retorna `attendant_name`, porem esse valor **nao e usado para setar `attendantName`** no estado do componente. O `setPhase("chat")` acontece na linha 559 mas sem chamar `setAttendantName`. O Realtime eventualmente atualiza, mas pode haver race condition.

### Solucao

No `ChatWidget.tsx`, na funcao `checkRoomAssignment` (linha 556-566):
- Quando `data.assigned === true`, usar `data.attendant_name` para chamar `setAttendantName(data.attendant_name)`
- Isso garante que o nome do atendente e setado imediatamente ao detectar a atribuicao, sem depender do Realtime

---

## Problema 2: Mensagem de boas-vindas nao enviada

A welcome_message esta configurada e habilitada no banco, e o edge function `process-chat-auto-rules` processa corretamente rooms em "waiting". Porem, essa funcao so e chamada por **polling a cada 5 minutos** (com primeiro disparo apos 15 segundos) e apenas quando um usuario admin esta logado no SidebarLayout. Se nenhum admin estiver online, a funcao nunca e chamada.

### Solucao

Enviar a welcome_message diretamente no widget, imediatamente apos a criacao do room, em vez de depender do polling:

No `ChatWidget.tsx`, nas funcoes `handleNewChat` e `handleSubmitForm` (apos criar o room com sucesso):
1. Buscar a regra `welcome_message` habilitada para o tenant do room
2. Verificar se ja existe mensagem com `auto_rule: "welcome_message"` no room
3. Se nao existir, inserir a mensagem de sistema automaticamente

Alternativa mais robusta: chamar o `process-chat-auto-rules` inline logo apos criar o room. Porem, como essa funcao processa TODOS os tenants/rooms, e mais eficiente fazer a insercao direta no widget.

A melhor abordagem e adicionar a logica de welcome_message dentro do `assign-chat-room` edge function, que ja e chamado pelo widget apos criar o room. Dessa forma:
- O edge function `assign-chat-room` verifica se existe regra `welcome_message` habilitada para o tenant
- Se sim, e se o room nao tem mensagem de boas-vindas, insere automaticamente
- Isso garante envio imediato, sem depender de polling ou de admin online

---

## Problema 3: Check duplo aparecendo imediatamente

O `visitor_last_read_at` esta sendo atualizado em excesso, incluindo situacoes em que o visitante **nao esta realmente vendo** as mensagens:

1. **Linha 407-408**: Atualiza em QUALQUER nova mensagem Realtime, incluindo as proprias mensagens do visitante e mensagens do atendente mesmo com widget minimizado. O `isOpenRef.current` e `true` se o widget foi aberto alguma vez e nao foi explicitamente fechado.

2. **Linha 471-474**: Atualiza em QUALQUER UPDATE da `chat_rooms`, incluindo updates do `attendant_last_read_at` ou outros campos. Condicao `room.status === "active" || phase === "chat"` e muito ampla.

3. **Linha 531-532**: Atualiza ao entrar na fase "chat", o que e correto.

### Solucao

No `ChatWidget.tsx`:

1. **Linha 407-408 (nova mensagem)**: Adicionar condicao para so atualizar se:
   - O widget esta realmente aberto (`isOpenRef.current === true`)
   - A mensagem e do atendente (`msg.sender_type === "attendant"` ou `"system"`)
   - O `isOpen` real (nao apenas o ref) esta `true` — verificar que o embed iframe esta expandido

2. **Linha 471-474 (room UPDATE)**: Remover completamente este update. Nao faz sentido atualizar `visitor_last_read_at` em qualquer update de room. O update de leitura ja acontece nos outros pontos (nova mensagem e abertura do widget).

3. **Linha 118-121 (widget abre)**: Manter — correto, o visitante esta abrindo o widget.

4. **Linha 531-532 (fase muda para chat)**: Manter — correto, o visitante esta entrando na tela de chat.

A chave e que `isOpenRef.current` precisa ser sincronizado corretamente com o estado real do widget embed. Quando o usuario minimiza o widget (clica no FAB), `isOpen` deve ser `false` e `isOpenRef` tambem.

---

## Resumo de arquivos

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/ChatWidget.tsx` | Fix `checkRoomAssignment` para setar `attendantName`; remover update de `visitor_last_read_at` no handler de room UPDATE; condicionar update no handler de nova mensagem |
| `supabase/functions/assign-chat-room/index.ts` | Adicionar envio de welcome_message ao processar room recem-criado |

