

# Mensagens Automaticas: Minimo 5 Minutos + Edge Function Eficiente

## Alteracoes

### 1. `src/components/chat/AutoMessagesTab.tsx` -- Minimo de 5 minutos

- Alterar o input de minutos para ter `min={5}` em vez de `min={1}`
- Na funcao `saveRule`, validar que `trigger_minutes >= 5` antes de salvar; se menor, forcar o valor para 5
- Atualizar os defaults: `attendant_absence` de 3 para 5 minutos
- Adicionar texto auxiliar abaixo do campo de minutos: "Minimo: 5 minutos"

### 2. Nova Edge Function: `supabase/functions/process-chat-auto-rules/index.ts`

Funcao leve que sera chamada periodicamente e processa as 3 regras baseadas em tempo:

- Busca regras ativas (`inactivity_warning`, `auto_close`, `attendant_absence`) agrupadas por tenant
- Para cada tenant, busca salas ativas com a ultima mensagem via uma unica query SQL usando subquery
- Compara o tempo decorrido com `trigger_minutes`
- Insere mensagem `system` se elegivel (verificando duplicatas via `metadata->auto_rule`)
- Para `auto_close`, fecha a sala e decrementa o contador do atendente

Prevencao de duplicatas: antes de inserir, verifica se ja existe mensagem com `metadata->auto_rule = tipo` posterior a ultima mensagem real na sala.

### 3. `src/pages/AdminWorkspace.tsx` -- Polling eficiente

Para manter baixo impacto na performance:

- Intervalo de **5 minutos** (300 segundos) em vez de 60 segundos -- ja que o minimo configuravel e 5 minutos, nao faz sentido verificar mais frequentemente
- Usar `setTimeout` recursivo em vez de `setInterval` para evitar chamadas sobrepostas
- Adicionar cleanup no unmount

### 4. `supabase/config.toml`

Adicionar entrada para a nova funcao:
```
[functions.process-chat-auto-rules]
verify_jwt = false
```

### 5. Localizacao

Adicionar chave `chat.autoMsg.minutesMin` = "Minimo: 5 minutos" em pt-BR e "Minimum: 5 minutes" em en.

## Resumo da estrategia de performance

- Polling a cada 5 min (nao 1 min) -- suficiente pois o trigger minimo e 5 min
- Edge function faz queries eficientes (uma por tenant, nao uma por sala)
- Prevencao de chamadas sobrepostas com `setTimeout` recursivo
- So roda enquanto o workspace esta aberto

