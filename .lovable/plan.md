

# Fix: Fundo do Widget Sempre Transparente

## Problema

O `useEffect` atual (linhas 104-109 do `ChatWidget.tsx`) usa apenas `style.background = "transparent"`, mas a regra do Tailwind no `index.css` (`@apply bg-background` na linha 128) compila para `background-color`, que tem precedencia sobre a shorthand `background` definida inline. No tema dark, isso resulta no quadrado preto visivel atras do FAB.

## Alteracoes

### 1. `src/pages/ChatWidget.tsx` (linhas 104-109)

Substituir o useEffect de transparencia:

**De:**
```typescript
useEffect(() => {
  if (isEmbed) {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }
}, [isEmbed]);
```

**Para:**
```typescript
useEffect(() => {
  if (isEmbed) {
    document.documentElement.setAttribute("data-embed", "true");
    [document.documentElement, document.body, document.getElementById("root")].forEach((el) => {
      if (el) {
        el.style.setProperty("background", "transparent", "important");
        el.style.setProperty("background-color", "transparent", "important");
      }
    });
  }
}, [isEmbed]);
```

Mudancas:
- Marca o `html` com atributo `data-embed` para targeting CSS
- Aplica transparencia em `html`, `body` e `#root`
- Usa `setProperty` com `!important` para vencer qualquer regra do Tailwind/tema

### 2. `src/index.css` (adicionar ao final do arquivo)

Regra CSS de seguranca que garante transparencia independente do tema:

```css
/* Embedded widget: force transparent background regardless of theme */
html[data-embed],
html[data-embed] body,
html[data-embed] #root {
  background: transparent !important;
  background-color: transparent !important;
}
```

Esta regra funciona como dupla protecao: mesmo que o JS demore a executar, ou que futuras regras CSS sejam adicionadas, o fundo permanecera transparente quando o atributo `data-embed` estiver presente. Cobre tanto o tema light quanto o dark.

## Resultado

O botao FAB e o container do chat flutuarao diretamente sobre o conteudo do site hospedeiro, sem nenhum fundo colorido ou escuro visivel, em qualquer configuracao de tema.
