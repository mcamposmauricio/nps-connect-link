
# Corrigir Container do Widget de Chat Embed

## Problema

O iframe do chat embed (`nps-chat-embed.js`) e criado com tamanho fixo de `420x700px` e permanece assim o tempo todo, mesmo quando o chat esta fechado e apenas o botao flutuante (FAB) e exibido. Isso cria uma area invisivel que bloqueia cliques e interacoes com o conteudo da pagina por tras.

## Solucao

Comunicar o estado aberto/fechado do widget via `postMessage` e redimensionar o iframe dinamicamente no script embed.

### Mudancas

**1. `src/pages/ChatWidget.tsx`**

- Enviar `postMessage` com tipo `chat-toggle` e o estado `isOpen` sempre que o widget abrir ou fechar
- Quando `isOpen = false`: notificar o parent para encolher o iframe ao tamanho do FAB (~80x80px)
- Quando `isOpen = true`: notificar o parent para expandir ao tamanho do chat (420x700px)

Adicionar `useEffect` que observa `isOpen`:
```tsx
useEffect(() => {
  if (isEmbed) {
    window.parent.postMessage({ type: "chat-toggle", isOpen }, "*");
  }
}, [isOpen, isEmbed]);
```

**2. `public/nps-chat-embed.js`**

- Ao criar o iframe, iniciar com tamanho pequeno (80x80px) em vez de 420x700px
- Configurar `pointer-events: none` no iframe quando estiver no tamanho do FAB (o botao tera `pointer-events: auto`)
- Escutar mensagens `chat-toggle` do iframe para redimensionar:
  - `isOpen = true`: 420px x 700px, pointer-events: auto
  - `isOpen = false`: 80px x 80px, pointer-events: auto (apenas a area do botao)

Listener no embed:
```javascript
window.addEventListener("message", function(event) {
  if (event.data && event.data.type === "chat-toggle") {
    if (event.data.isOpen) {
      iframe.style.width = "420px";
      iframe.style.height = "700px";
    } else {
      iframe.style.width = "80px";
      iframe.style.height = "80px";
    }
  }
});
```

**3. Ajuste no FAB dentro do `ChatWidget.tsx`**

- O FAB (botao flutuante) atualmente usa `position: fixed` dentro do iframe. Como o iframe sera pequeno (80x80px), o botao deve preencher o iframe sem posicionamento fixo:
  - Mudar de `position: fixed; bottom: 20px; right: 20px` para posicionamento relativo simples, centralizado no iframe

## Arquivos Modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/pages/ChatWidget.tsx` | Enviar postMessage ao toggle, ajustar FAB para preencher iframe |
| 2 | `public/nps-chat-embed.js` | Iniciar iframe pequeno, escutar chat-toggle para redimensionar |
