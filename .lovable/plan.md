
# Correcoes e Melhorias no Widget de Chat

## 1. Botao "Retomar conversa" na visualizacao de transcript pendente

**Problema:** Ao clicar em um chat pendente na lista de historico, o usuario ve o transcript mas so tem "Voltar ao historico" sem opcao de retomar.

**Solucao:** No `ChatWidget.tsx`, na fase `viewTranscript`, verificar se o room visualizado tem `resolution_status === "pending"`. Se sim, exibir dois botoes: "Retomar conversa" e "Voltar ao historico".

**Arquivo:** `src/pages/ChatWidget.tsx` (linhas ~1628-1634 - footer do viewTranscript)
- Guardar `resolution_status` no estado ao abrir transcript via `handleViewTranscript`
- Renderizar botao "Retomar conversa" ao lado do "Voltar ao historico" quando pendente

---

## 2. Foto e nome do atendente no header do widget

**Problema:** O header ja mostra iniciais e nome do atendente em fase "chat", mas apenas no subtitulo. O pedido e deixar mais evidente a identificacao.

**Solucao:** O header ja implementa isso (linhas ~1098-1116). Porem, o subtitulo mostra `attendantName ?? "Chat ativo"` de forma generica. Vou:
- Exibir o nome do atendente de forma mais proeminente no subtitulo (ex: "Voce esta falando com [Nome]")
- Garantir que so aparece para chats ativos com atendente atribuido (ja e o caso com a condicao `phase === "chat" && attendantName`)

**Arquivo:** `src/pages/ChatWidget.tsx` (linha ~1114-1115)

---

## 3. Mensagem de boas-vindas automatica

**Problema:** A regra `welcome_message` existe no banco e esta habilitada, mas nenhum codigo a processa. Ela deve ser enviada imediatamente quando um novo chat room e criado.

**Solucao:** No `process-chat-auto-rules` edge function, adicionar processamento para `welcome_message`:
- Buscar rooms recem-criados (status "waiting") que ainda nao receberam uma mensagem de sistema com `auto_rule: "welcome_message"`
- Se a regra esta habilitada para o tenant, enviar a mensagem automatica imediatamente
- Nao depende de `trigger_minutes` (e imediata)

**Arquivo:** `supabase/functions/process-chat-auto-rules/index.ts`
- Adicionar `welcome_message` na query de regras
- Para rooms em "waiting" sem mensagem de boas-vindas, inserir a mensagem

---

## 4. Checks de entregue/lido no workspace

**Problema:** O check duplo so aparece quando o visitante responde, nao quando visualiza. O `visitor_last_read_at` so e atualizado em momentos especificos.

**Solucao:** No `ChatWidget.tsx`, garantir que `visitor_last_read_at` e atualizado:
- Quando o widget e aberto e ha mensagens (ja existe parcialmente)
- Quando novas mensagens chegam enquanto o widget esta aberto (ja existe)
- Quando o usuario abre/navega para a fase "chat" (adicionar)
- Quando o usuario faz scroll e ve mensagens

O problema principal e que o update so acontece no evento de INSERT de mensagem e no UPDATE de room. Vou adicionar o update tambem:
- Na abertura do widget (`isOpen` muda para true e fase e "chat")
- Na mudanca de fase para "chat"
- Na inicializacao quando o widget carrega com um room ativo

**Arquivo:** `src/pages/ChatWidget.tsx`

---

## 5. Quebra de linha no input do widget

**Problema:** O input do chat no widget e um `<input>` HTML simples que nao suporta quebra de linha. O visitante nao consegue enviar mensagens com multiplas linhas.

**Solucao:** Substituir o `<input>` por `<textarea>` no input da fase "chat" e da fase "waiting":
- Usar `textarea` com auto-resize (altura dinamica baseada no conteudo)
- Shift+Enter para quebra de linha, Enter para enviar
- Manter o mesmo visual (rounded, sem borda, transparente)
- Limitar altura maxima para ~4 linhas

**Arquivo:** `src/pages/ChatWidget.tsx` (linhas ~1592-1614 para fase chat, ~1341-1346 para fase waiting)

---

## Resumo de arquivos

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/ChatWidget.tsx` | Botao retomar em viewTranscript; header com nome atendente; textarea multiline; fix visitor_last_read_at |
| `supabase/functions/process-chat-auto-rules/index.ts` | Processar regra welcome_message para rooms novos |
