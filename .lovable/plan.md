

# Corrigir Layout Full-Height e Botao "Carregar Anteriores" no Widget

## Problemas Identificados

### 1. Widget nao preenche a altura do iframe
O Card tem `height: "100%"` mas o `html` e `body` do iframe nao tem `height: 100%` definido. Isso faz com que o Card encolha ao conteudo em vez de preencher os 700px do iframe. E necessario garantir que a cadeia completa de containers tenha altura 100%.

### 2. Botao "Carregar anteriores" nao aparece
O `fetchMessages` para `viewTranscript` e chamado pelo `useEffect` na linha 208 que depende de `roomId`, mas o filtro do botao na linha 634 exclui `viewTranscript`. Alem disso, quando o usuario entra na fase `chat`, o `fetchMessages` e chamado corretamente, porem a condicao `hasMoreMessages && phase !== "viewTranscript"` esta correta para `chat`. O problema pode estar em que o `hasMoreMessages` nao esta sendo setado corretamente - preciso verificar se a query retorna `PAGE_SIZE + 1` items. A logica parece correta. O botao deve aparecer se houver mais de 10 mensagens. Pode ser que o estilo do botao nao esteja visivel (texto `text-primary` sem fundo pode nao se destacar).

## Solucao

### Arquivo: `src/pages/ChatWidget.tsx`

**1. Garantir altura 100% em toda a cadeia**

O wrapper embed (linha 762-771) ja tem `height: 100%`, mas o Card na linha 490 precisa ter `height: "100%"` garantido. Verificando o codigo, o Card ja tem `height: "100%"` no style do embed. O problema e que o container React root (`#root`) e o `body`/`html` do iframe provavelmente nao tem `height: 100%`.

### Arquivo: `src/index.css`

Adicionar regras CSS globais para garantir que `html`, `body` e `#root` tenham `height: 100%`:

```css
html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
}
```

Isso garante que a cadeia `html > body > #root > div embed wrapper > Card` tenha 100% de altura em todos os niveis.

### Arquivo: `src/pages/ChatWidget.tsx`

**2. Melhorar visibilidade do botao "Carregar anteriores"**

O botao existe mas pode nao estar visivel. Vou melhorar o estilo para ficar mais claro e garantir que o `hasMoreMessages` tambem funcione na fase `viewTranscript`:

- Remover a condicao `phase !== "viewTranscript"` do botao de carregar mais (para que transcripts antigos tambem possam paginar)
- Estilizar o botao com borda e padding para ficar mais visivel
- Garantir que `fetchMessages` na fase `viewTranscript` tambem use paginacao

**3. Garantir que a rota `/widget` renderize sem layout extra**

Verificar se o componente `ChatWidget` e renderizado sem wrappers que adicionem padding/margin que impedem o preenchimento total.

## Mudancas Concretas

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/index.css` | Adicionar `html, body, #root { height: 100%; margin: 0; padding: 0; }` |
| 2 | `src/pages/ChatWidget.tsx` | Remover filtro `phase !== "viewTranscript"` do botao carregar mais; melhorar estilo do botao para ser visivel |

