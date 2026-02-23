

# Corrigir Regra de Inatividade: Apenas Quando Cliente Nao Responde

## Problema

A regra `inactivity_warning` esta disparando independentemente de quem enviou a ultima mensagem. No cenario reportado, o **cliente** enviou a ultima mensagem e ficou aguardando o atendente -- nesse caso, a mensagem de inatividade nao deveria ser enviada ao cliente, pois ele ja esta esperando uma resposta.

## Correcao

No arquivo `supabase/functions/process-chat-auto-rules/index.ts`, adicionar uma verificacao de `sender_type` na regra `inactivity_warning`:

- A mensagem de inatividade so deve ser enviada quando a **ultima mensagem e do atendente** (`sender_type = 'attendant'`), indicando que o cliente nao respondeu.
- Se a ultima mensagem for do visitante (`sender_type = 'visitor'`), significa que o cliente esta aguardando o atendente -- nao faz sentido cobrar o cliente por inatividade.
- Mensagens do tipo `system` devem ser ignoradas ao determinar "quem falou por ultimo" -- a funcao deve buscar a ultima mensagem com `sender_type` diferente de `system`.

## Alteracao Tecnica

### `supabase/functions/process-chat-auto-rules/index.ts`

1. Alterar a query de ultima mensagem (linha 66-71) para buscar a ultima mensagem **nao-system** (`sender_type != 'system'`), garantindo que mensagens automaticas anteriores nao influenciem a logica.

2. No bloco `inactivity_warning` (linhas 90-93), adicionar a condicao:
   - `if (lastMsg.sender_type !== 'attendant') continue;`
   - Isso garante que o aviso so e enviado quando o atendente falou por ultimo e o cliente nao respondeu.

### Logica corrigida resumida

| Ultima mensagem de | inactivity_warning | attendant_absence |
|---|---|---|
| Visitante (cliente) | Nao dispara | Dispara (atendente nao respondeu) |
| Atendente | Dispara (cliente nao respondeu) | Nao dispara |
| Sistema | Ignora, busca a anterior | Ignora, busca a anterior |

Isso tambem corrige a simetria com `attendant_absence`, que ja verifica corretamente `sender_type === 'visitor'`.

