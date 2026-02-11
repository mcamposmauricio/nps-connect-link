

# Alinhar Configuracoes NPS com a Estrutura do Chat

## Objetivo

Replicar no NPS a mesma estrutura de abas do Chat, adicionando uma aba "Widget" com preview visual e codigo de integracao inline. Nenhuma alteracao sera feita nos arquivos do widget externo (`nps-widget.js`, `nps-chat-embed.js`) pois ja existem clientes utilizando-os em producao.

---

## O que muda vs o plano anterior

| Aspecto | Plano anterior | Plano revisado |
|---------|---------------|----------------|
| `public/nps-widget.js` | Possivel alteracao | **Nao sera tocado** |
| `public/nps-chat-embed.js` | Possivel alteracao | **Nao sera tocado** |
| Snippets de integracao | Movidos do dialog | **Duplicados** para a aba Widget (inline) e **mantidos** no ApiKeysTab (dialog por chave especifica) |
| Formato dos snippets | Poderia mudar | Usa exatamente os mesmos templates existentes, sem alterar URLs ou parametros |

---

## Mudancas

### 1. `src/pages/NPSSettings.tsx`

- Adicionar aba "Widget" (icone `Code2`) entre "Notificacoes" e "API Keys"
- Importar o novo componente `NPSWidgetTab`

### 2. `src/components/NPSWidgetTab.tsx` (novo)

Seguindo o layout identico da aba Widget do Chat (`AdminSettings.tsx` linhas 359-456):

**Grid 2 colunas:**
- **Esquerda - Card de Configuracao:**
  - Posicao do widget (right/left) via RadioGroup
  - Cor primaria via color picker + input hex
  - Botao Salvar (persiste em `brand_settings` os valores de posicao e cor)
- **Direita - Card de Preview:**
  - Componente `NPSWidgetPreview` mostrando miniatura do popup NPS

**Abaixo - Card de Codigo de Integracao (inline):**
- Sub-tabs: Script / Programatico / iFrame
- Codigo com placeholders `SUA_NPS_API_KEY` e `CUSTOMER_EXTERNAL_ID`
- Botao de copiar em cada snippet
- Os snippets sao **identicos** aos que ja existem no dialog do `ApiKeysTab`, apenas com placeholder generico no lugar da chave real

### 3. `src/components/NPSWidgetPreview.tsx` (novo)

Preview visual similar ao `WidgetPreview` do Chat, mas mostrando o popup NPS:
- Barra de browser mock (igual ao WidgetPreview)
- Conteudo mock da pagina
- Popup NPS com escala 0-10, campo de feedback e botao de enviar
- Reflete posicao (left/right) e cor primaria em tempo real
- **Nao carrega o widget real** - e apenas um preview estatico em React

### 4. `src/components/ApiKeysTab.tsx`

- **Manter** o dialog de integracao como esta (acessivel pelo botao Code2 em cada chave) - ele mostra o snippet com a chave real preenchida, o que e util
- Adicionar uma nota sutil no rodape: "Veja a aba Widget para opcoes de integracao completas"
- Nenhuma remocao de funcionalidade

---

## Detalhes Tecnicos

### Layout da aba Widget (espelhando o Chat)

```text
+---------------------------+---------------------------+
| Configuracao do Widget    | Preview                   |
| - Cor primaria [picker]   | +---------------------+   |
| - Posicao [right/left]    | | Mock browser bar    |   |
| [Salvar]                  | | [NPS Popup Preview] |   |
|                           | | 0 1 2 ... 9 10      |   |
+---------------------------+---------------------------+
| Codigo de Integracao                                  |
| [Script] [Programatico] [iFrame]                      |
| +---------------------------------------------------+ |
| | <script src=".../nps-widget.js"                   | |
| |   data-api-key="SUA_NPS_API_KEY" ...>             | |
| +---------------------------------------------------+ |
+-------------------------------------------------------+
```

### Persistencia das configuracoes

A posicao e cor do widget NPS serao salvas na tabela `brand_settings` nos campos `nps_widget_position` e `nps_widget_primary_color`. Caso esses campos nao existam, serao adicionados via migration com valores default (`right` e a cor primaria existente do brand).

### Snippets inline (com placeholders)

```javascript
// Script - identico ao existente
`<script src="${baseUrl}/nps-widget.js"
  data-api-key="SUA_NPS_API_KEY"
  data-external-id="CUSTOMER_EXTERNAL_ID">
</script>`

// Programatico - identico ao existente
`<script src="${baseUrl}/nps-widget.js"></script>
<script>
  NPSWidget.init({
    apiKey: "SUA_NPS_API_KEY",
    externalId: loggedUser.id,
    position: "${position}",
    ...
  });
</script>`

// iFrame - identico ao existente
`<iframe src="${baseUrl}/embed?api_key=SUA_NPS_API_KEY&external_id=CUSTOMER_EXTERNAL_ID" ...>`
```

### Arquivos que NAO serao alterados

- `public/nps-widget.js` - widget externo em producao
- `public/nps-chat-embed.js` - embed unificado em producao
- `src/components/chat/WidgetPreview.tsx` - preview do chat (nao sera reutilizado, sera criado um especifico para NPS)

### Arquivos a serem modificados/criados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/pages/NPSSettings.tsx` | Adicionar aba Widget |
| 2 | `src/components/NPSWidgetTab.tsx` | Novo - config + preview + codigo inline |
| 3 | `src/components/NPSWidgetPreview.tsx` | Novo - preview visual do popup NPS |
| 4 | `src/components/ApiKeysTab.tsx` | Adicionar nota de referencia a aba Widget |
| 5 | Migration SQL (se necessario) | Campos `nps_widget_position` e `nps_widget_primary_color` em `brand_settings` |

