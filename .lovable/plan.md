
# Corrigir Layout Full-Height e Scroll Isolado no Widget de Chat

## Problema

1. **Widget nao preenche o iframe**: Quando aberto, o Card nao ocupa toda a altura do iframe (700px) - ele encolhe conforme o conteudo (poucas mensagens ou poucos itens no historico).
2. **Scroll no componente todo**: O scroll ainda esta no body inteiro em vez de apenas nas listagens de mensagens/historico. Header e footer (input bar) devem ser sempre visiveis.

## Solucao

### 1. Garantir que o wrapper embed force altura total (`src/pages/ChatWidget.tsx`)

O wrapper embed (linhas 720-728) precisa usar `display: flex` e `flex-direction: column` para que o Card preencha 100% do iframe:

```
style={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}
```

### 2. Card deve usar `flex: 1` no modo embed

Adicionar `flex-1` ao Card quando em modo embed para que ele estique e ocupe todo o espaco disponivel (linha 461-462). Tambem garantir `h-full` no style embed.

### 3. Body div precisa de estrutura correta

O div do body (linha 504) ja tem `flex-1 overflow-auto min-h-0`. O problema e que ele precisa ter `overflow-y: auto` apenas quando mostrando mensagens/historico, e as telas de waiting/form devem centralizar o conteudo sem scroll desnecessario.

Manter o body como `flex-1 min-h-0 overflow-y-auto` - isso garante:
- Ele ocupa todo o espaco restante entre header e footer
- Quando o conteudo excede, scroll interno aparece
- Header e input bar ficam fixos

### Mudancas concretas em `src/pages/ChatWidget.tsx`

| Local | Mudanca |
|-------|---------|
| Wrapper embed (linha 720-728) | Adicionar `display: flex; flexDirection: column` ao style |
| Card (linha 461-462) | No modo embed, adicionar `flex-1` via className condicional |
| Body div (linha 504) | Manter `flex-1 overflow-y-auto min-h-0` (ja esta OK, so garantir) |
| Tela waiting (linha 591) | Remover `h-full` e `py-12` fixo, usar `flex-1 flex items-center justify-center` para centralizar sem forcar altura |

## Arquivos Modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/pages/ChatWidget.tsx` | Wrapper embed com flex column, Card flex-1 no embed, centralizar waiting sem h-full |
