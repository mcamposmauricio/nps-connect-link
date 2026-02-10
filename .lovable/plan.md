

# Corrigir Overflow de Mensagens no Widget de Chat

## Problema

Quando o chat esta aberto com muitas mensagens, o conteudo ultrapassa os limites do card e cria um scroll externo ao componente, fazendo as mensagens "vazarem" para fora da area visivel (como mostra o screenshot). O widget deveria ter apenas 2 estados visuais: FAB fechado (80x80) e chat aberto (420x700) com scroll interno contido.

## Causa Raiz

O layout flexbox do Card nao esta restringindo corretamente o overflow. O div `flex-1 overflow-auto` precisa de `min-h-0` para que o flex item respeite o limite do container pai e ative o scroll interno. Alem disso, o wrapper externo (linha 708-715) precisa de `overflow: hidden` para garantir que nada vaze.

## Mudancas

### 1. `src/pages/ChatWidget.tsx`

| Local | Mudanca |
|-------|---------|
| Wrapper do embed (linha ~708-715) | Adicionar `overflow: hidden` no style |
| Body div (linha 493) | Adicionar `min-h-0` na className para forcar o flex item a respeitar o container |
| Card (linha 460-462) | Adicionar `min-h-0` para garantir que o Card tambem respeite o flex container |

**Wrapper embed (linha ~708):**
```
- style={{ width: "100%", height: "100%" }}
+ style={{ width: "100%", height: "100%", overflow: "hidden" }}
```

**Body div (linha 493):**
```
- <div className="flex-1 overflow-auto p-4" ref={scrollRef}>
+ <div className="flex-1 overflow-auto p-4 min-h-0" ref={scrollRef}>
```

**Card (linha 461):**
```
- className="flex flex-col overflow-hidden border-0 rounded-xl shadow-2xl"
+ className="flex flex-col overflow-hidden border-0 rounded-xl shadow-2xl min-h-0"
```

Essas mudancas garantem que o scroll de mensagens fique contido dentro do card, sem afetar o tamanho do iframe ou vazar conteudo.

## Arquivos Modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/pages/ChatWidget.tsx` | Adicionar `min-h-0` no Card e body div, `overflow: hidden` no wrapper embed |

