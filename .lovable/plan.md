
# Correção do Fundo Transparente no Chat Widget Embedado

## Problema

O widget de chat é renderizado dentro de um `<iframe>` injetado pelo script `nps-chat-embed.js`. O iframe, por padrão, herda o `background-color` do documento HTML (`<body>`) — que no tema escuro é preto (`#0F1115` ou similar, definido pelo CSS global no `index.css`).

Dois problemas distintos:

### 1. FAB (botão flutuante fechado) — fundo preto visível

O `div` wrapper do FAB (linhas 460–483 de `ChatWidget.tsx`) não tem `background: transparent`, e o `<html>` e `<body>` do iframe têm a cor de fundo aplicada pelo Tailwind/CSS global.

### 2. Chat aberto — container externo com fundo escuro

Na linha 763–773, o wrapper `div` do chat embedado tem `overflow: hidden` mas também herda o background escuro do body, criando uma área preta ao redor do `<Card>` do chat.

## Soluções

### Fix 1 — Tornar o `<body>` e `<html>` transparentes via CSS global (apenas em modo embed)

A forma mais limpa é adicionar um CSS específico para a rota `/widget` que force `html, body { background: transparent !important; }`. Isso elimina o fundo preto em ambos os casos (FAB e chat aberto) sem afetar nenhuma outra página.

Isso pode ser feito adicionando `background: transparent` inline no próprio wrapper JSX do ChatWidget, e também garantindo que o `<html>` e `<body>` fiquem transparentes no modo embed.

### Fix 2 — Adicionar `background: transparent` nos wrappers JSX do ChatWidget

**FAB wrapper (linhas 460–468):**
```tsx
// ANTES
<div
  style={{
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>

// DEPOIS
<div
  style={{
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
  }}
>
```

**Chat aberto wrapper (linhas 763–773):**
```tsx
// ANTES
<div
  style={{
    width: "100%",
    height: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  }}
>

// DEPOIS
<div
  style={{
    width: "100%",
    height: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    background: "transparent",
  }}
>
```

### Fix 3 — Forçar `background: transparent` no `<html>` e `<body>` quando em modo embed

A raiz do problema é que o CSS global do projeto aplica a cor de fundo ao `body`. Para o widget funcionar como iframe transparente, é necessário que o `<html>` e `<body>` também sejam transparentes. Isso é feito adicionando um `useEffect` no `ChatWidget` que, quando `isEmbed === true`, injeta:

```tsx
useEffect(() => {
  if (isEmbed) {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }
}, [isEmbed]);
```

Isso sobrepõe o background aplicado pelo Tailwind/CSS global apenas para a rota `/widget?embed=true`, sem afetar nenhuma outra página do sistema.

## Arquivos a Modificar

| Arquivo | Linha | Mudança |
|---|---|---|
| `src/pages/ChatWidget.tsx` | ~104 (após inicialização) | Adicionar `useEffect` que seta `background: transparent` no html/body quando `isEmbed` |
| `src/pages/ChatWidget.tsx` | 460–468 | Adicionar `background: "transparent"` no estilo do wrapper do FAB |
| `src/pages/ChatWidget.tsx` | 763–773 | Adicionar `background: "transparent"` no estilo do wrapper do chat embedado |

## O que NÃO é alterado

- Lógica de comunicação com o parent iframe (postMessage)
- Cores do Card do chat, header, botões
- Qualquer outra página ou componente do sistema
- CSS global (`index.css`) — nenhuma mudança lá
