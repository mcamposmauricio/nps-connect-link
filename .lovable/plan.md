

# Adicionar Opcao de Formato do Botao do Widget (Circulo / Quadrado)

## Resumo

Adicionar uma nova configuracao `widget_button_shape` que permite escolher entre botao circular (atual) ou quadrado com cantos levemente arredondados. A mudanca afeta o banco de dados, as configuracoes do admin, o preview, o widget real e o script de embed.

## Alteracoes

### 1. Banco de Dados -- Nova coluna

Adicionar coluna `widget_button_shape` na tabela `chat_settings`:

```sql
ALTER TABLE chat_settings
ADD COLUMN widget_button_shape text NOT NULL DEFAULT 'circle';
```

Valores aceitos: `'circle'` (padrao atual) ou `'square'`.

### 2. `src/pages/AdminSettings.tsx`

- Adicionar `widget_button_shape: "circle"` ao estado inicial (junto com `widget_position`, ~linha 65)
- Carregar o valor do banco ao buscar settings
- Incluir no payload de save
- Adicionar um seletor (RadioGroup) na secao de aparencia do widget (proximo ao seletor de posicao, ~linha 394), com opcoes "Circulo" e "Quadrado"
- Passar a nova prop `buttonShape` ao `WidgetPreview`
- Incluir `data-button-shape` no snippet de embed gerado (~linha 633)

### 3. `src/components/chat/WidgetPreview.tsx`

- Adicionar prop `buttonShape?: "circle" | "square"` a interface `WidgetPreviewProps`
- No botao FAB (~linha 151), trocar `rounded-full` por condicional:
  - `circle` -> `rounded-full` (atual)
  - `square` -> `rounded-lg` (cantos levemente arredondados)

### 4. `src/pages/ChatWidget.tsx`

- Ler novo parametro `buttonShape` do `searchParams` (~linha 40)
- No botao FAB (~linha 688), aplicar `rounded-full` ou `rounded-lg` conforme o valor

### 5. `public/nps-chat-embed.js`

- Ler `data-button-shape` do script tag (~linha 7)
- Passar como query param `&buttonShape=...` na URL do iframe (~linha 196)

## Secao Tecnica

### Condicional de border-radius

```
circle -> className="rounded-full" (border-radius: 9999px)
square  -> className="rounded-lg"  (border-radius: 0.5rem / 8px)
```

### Fluxo de dados

```text
Admin Settings (DB) --> embed script (data-attribute) --> iframe query param --> ChatWidget.tsx (FAB shape)
Admin Settings (DB) --> WidgetPreview.tsx (preview shape)
```

### Arquivos modificados

1. **Migracao SQL** -- nova coluna `widget_button_shape`
2. **`src/pages/AdminSettings.tsx`** -- estado, save, UI de selecao, snippet de embed
3. **`src/components/chat/WidgetPreview.tsx`** -- prop e condicional no FAB
4. **`src/pages/ChatWidget.tsx`** -- leitura do param e condicional no FAB
5. **`public/nps-chat-embed.js`** -- leitura do data-attribute e passagem via query param
