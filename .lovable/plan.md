
# Corrigir Layout de Scroll e Navegacao no Widget de Chat

## Problema 1: Scroll nas mensagens
O scroll esta aplicado no body inteiro do card (incluindo input, CSAT, etc). O input e botao de envio devem ficar sempre visiveis na base, e apenas a area de mensagens deve ter scroll.

## Problema 2: Voltar ao historico durante chat ativo
Atualmente, so e possivel voltar ao historico fechando o chat. O usuario precisa de um botao de voltar no header quando estiver nas fases `chat` e `waiting`, mantendo a sala ativa.

## Mudancas

### `src/pages/ChatWidget.tsx`

**1. Separar scroll do body - mover input/CSAT/footer para fora do div scrollavel**

Estrutura atual:
```
Card (flex col)
  Header
  Body (flex-1, overflow-auto) ← scroll aqui
    mensagens
    csat form
    closed msg
  File preview bar
  Input bar
```

Nova estrutura:
```
Card (flex col)
  Header
  Messages area (flex-1, overflow-auto, min-h-0) ← scroll APENAS aqui
    mensagens
  CSAT form (dentro do card, fora do scroll)
  Closed msg (dentro do card, fora do scroll)
  File preview bar
  Input bar
```

Concretamente:
- O div do body (linha 493) passa a conter APENAS as mensagens (fases chat/viewTranscript) e as telas de form/history/waiting
- Mover o bloco de CSAT (linhas 619-638) e closed (linhas 640-644) para FORA do div de body, como irmaos do body dentro do Card
- O div de body mantem `flex-1 overflow-auto min-h-0` para scroll apenas nas mensagens

**2. Adicionar botao de voltar no header para fases `chat` e `waiting`**

Na condicao do botao de voltar no header (linha 469), alterar de:
```tsx
{(phase === "viewTranscript") && (
```
Para:
```tsx
{(phase === "viewTranscript" || phase === "chat" || phase === "waiting") && (
```

E ajustar o `onClick` para que nas fases `chat`/`waiting` volte ao historico sem fechar a sala:
```tsx
onClick={() => {
  if (phase === "chat" || phase === "waiting") {
    setPhase("history");
    loadHistory();
  } else {
    handleBackToHistory();
  }
}}
```

Isso permite ao usuario navegar de volta ao historico enquanto a conversa ativa continua listada la (com badge "Ativo"/"Aguardando"), podendo retornar a ela clicando.

## Arquivos Modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/pages/ChatWidget.tsx` | Reestruturar layout para scroll apenas em mensagens; adicionar botao voltar no header durante chat/waiting |
