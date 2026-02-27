

# Reestruturacao das Mensagens Automaticas - Fluxo Sequencial Encadeado

## Conceito Central: Cadeia Sequencial

As 4 regras do fluxo principal operam como uma **cadeia ordenada** onde cada etapa so dispara apos a anterior ter sido enviada e o tempo configurado ter passado sem resposta do cliente. O tempo de cada regra conta **a partir da mensagem da regra anterior**, nao a partir da ultima mensagem humana.

```text
[1] Boas-vindas (imediato ao entrar)
         |
         +-- cliente nao responde por X min apos ultima msg do atendente -->
         |
[2] Inatividade 1 --> envia msg + status = "waiting"
         |
         +-- cliente nao responde por Y min apos msg da regra 2 -->
         |
[3] Inatividade 2 --> envia msg (mantem "waiting")
         |
         +-- cliente nao responde por Z min apos msg da regra 3 -->
         |
[4] Auto-close --> envia msg + status = "closed" + resolution = "archived"
```

**Regra de encadeamento**: A regra N so dispara se a regra N-1 ja foi enviada. O tempo da regra N conta a partir do `created_at` da mensagem de sistema da regra N-1 (exceto a regra 2, que conta a partir da ultima mensagem do atendente).

---

## Estrutura das 4 Regras

| Ordem | rule_type | Gatilho | Tempo Default | Acao no Status | Texto Default |
|-------|-----------|---------|---------------|----------------|---------------|
| 1 | `welcome_message` | Imediato ao iniciar chat | Sem tempo | Nenhuma | "Recebemos sua mensagem! ..." |
| 2 | `inactivity_warning` | Atendente falou, cliente nao respondeu | 10 min | waiting (pendente) | "Voce conseguiu ver minha ultima mensagem? ..." |
| 3 | `inactivity_warning_2` (novo) | Regra 2 ja enviada, cliente nao respondeu | 10 min | Mantem waiting | "Voce ainda esta ai? ..." |
| 4 | `auto_close` | Regra 3 ja enviada, cliente nao respondeu | 10 min | closed + archived | "Nao tivemos seu retorno..." |

---

## Mudancas por Arquivo

### 1. `src/components/chat/AutoMessagesTab.tsx`

- Adicionar novo tipo `inactivity_warning_2` na lista `AUTO_MESSAGE_TYPES`
- Reorganizar grupos visuais:
  - **"Fluxo Principal"** (4 regras com numeracao 1-4 e setas visuais entre elas indicando a sequencia)
  - **"Outras Mensagens"** (queue_position, attendant_assigned, transfer_notice, attendant_absence, offline_message, post_service_csat, return_online -- todas inativas por padrao)
- Defaults atualizados: `inactivity_warning` com 10 min, `inactivity_warning_2` com 10 min, `auto_close` com 10 min
- Na UI do fluxo principal, mostrar visualmente a ordem (1 -> 2 -> 3 -> 4) com indicadores de seta/conector entre os cards

### 2. `supabase/functions/process-chat-auto-rules/index.ts`

Reescrever a logica de processamento para respeitar o encadeamento sequencial:

- Adicionar `inactivity_warning_2` ao filtro de rule_types
- Definir a **ordem de processamento**: `FLOW_ORDER = ["inactivity_warning", "inactivity_warning_2", "auto_close"]`
- Para cada sala, processar as regras **na ordem da cadeia**, nao individualmente:
  - **`inactivity_warning`**: Dispara se o atendente falou por ultimo, sala esta `active`, e o tempo desde a ultima msg do atendente >= `trigger_minutes`. Ao enviar, muda status da sala para `waiting`.
  - **`inactivity_warning_2`**: Dispara **somente se** ja existe mensagem de sistema com `auto_rule === "inactivity_warning"` nesta sala, e o tempo desde essa mensagem de sistema >= `trigger_minutes` da regra 3, e nao houve resposta do cliente depois.
  - **`auto_close`**: Dispara **somente se** ja existe mensagem de sistema com `auto_rule === "inactivity_warning_2"`, e o tempo desde essa mensagem >= `trigger_minutes` da regra 4, e nao houve resposta do cliente depois. Fecha sala como `closed` com `resolution_status: "archived"`.
- Se o cliente respondeu em qualquer ponto (existe msg do visitor depois da ultima msg de sistema), a cadeia e **interrompida** -- nenhuma regra subsequente dispara.
- Processar apenas **uma regra por sala por execucao** (a proxima elegivel na cadeia), evitando disparar 2 e 3 simultaneamente.

### 3. `src/locales/pt-BR.ts` e `src/locales/en.ts`

Adicionar traducoes:
- `chat.autoMsg.mainFlowGroup` / `chat.autoMsg.otherGroup`
- `chat.autoMsg.inactivity_warning_2.title` / `.description` / `.default`
- Atualizar defaults de `welcome_message`, `inactivity_warning`, `auto_close` com os textos fornecidos
- Atualizar descricoes para refletir as acoes de status (pendente, arquivado)

---

## Logica Detalhada da Edge Function (Encadeamento)

Para cada sala, a funcao determina **em que ponto da cadeia a sala esta**:

1. Buscar todas as mensagens de sistema com `auto_rule` in (`inactivity_warning`, `inactivity_warning_2`, `auto_close`) para a sala
2. Buscar a ultima mensagem do visitor (se houver)
3. Determinar o **ultimo passo executado**:
   - Se nao ha nenhuma msg de sistema de cadeia -> proximo passo = `inactivity_warning`
   - Se ha `inactivity_warning` e nao ha resposta do visitor depois -> proximo passo = `inactivity_warning_2`
   - Se ha `inactivity_warning_2` e nao ha resposta do visitor depois -> proximo passo = `auto_close`
   - Se o visitor respondeu depois da ultima msg de sistema -> cadeia resetada, nao dispara nada
4. Verificar se o tempo desde a mensagem-gatilho (msg do atendente para regra 2, msg de sistema anterior para regras 3 e 4) >= `trigger_minutes`
5. Executar apenas esse unico passo

---

## Resumo

| Arquivo | Mudanca |
|---------|---------|
| `src/components/chat/AutoMessagesTab.tsx` | Novo tipo, 2 grupos (Fluxo Principal + Outras), numeracao visual com setas |
| `supabase/functions/process-chat-auto-rules/index.ts` | Logica de cadeia sequencial encadeada, `inactivity_warning_2`, status waiting/archived |
| `src/locales/pt-BR.ts` | Traducoes e defaults atualizados |
| `src/locales/en.ts` | Equivalentes em ingles |

Nenhuma migration de banco necessaria (`rule_type` e texto livre). Nenhuma nova dependencia.

