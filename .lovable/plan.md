

# Atualizar Documentacao do Widget para Refletir o Novo Fluxo Dinamico

## Problema

A pagina de documentacao (`ChatWidgetDocsTab.tsx`) ainda descreve o fluxo antigo do widget. O script embed (`nps-chat-embed.js`) ja foi atualizado com `get-widget-config`, resolver com flags e upsert centralizado, mas a documentacao nao acompanhou.

## Inconsistencias Encontradas

| Item | Estado Atual (errado) | Estado Correto |
|------|----------------------|----------------|
| Fluxo no prompt | "script carrega -> resolve visitante -> cria iframe -> update() envia via postMessage" | "script carrega -> busca config dinamica (get-widget-config) -> resolve visitante (upsert completo) -> cria iframe com flags" |
| Passos internos | 6 passos sem mencionar busca de config | 7 passos: config dinamica como passo 1 |
| Comportamento | Apenas "auto-start se name+email" | Arvore de decisao completa: auto_start, needs_form, has_history |
| Upsert | "Iframe processa e salva" | "Backend centraliza upsert (visitor + contact + company) antes do chat iniciar" |
| Side panel | Nao mencionado | Dados aparecem automaticamente no painel do atendente |

## Mudancas

### Arquivo unico: `src/components/chat/ChatWidgetDocsTab.tsx`

### 1. Atualizar `buildVibecodingPrompt()`

**Secao "Sobre o Widget"** (linha 161):
- De: "Fluxo: script carrega -> resolve visitante (se api-key) -> cria iframe -> update() envia dados"
- Para: "Fluxo: script carrega -> busca configuracao dinamica (campos customizados + settings) -> resolve visitante com upsert completo -> cria iframe com flags de decisao (auto_start, needs_form, has_history)"

**Secao "Comportamento"** (linhas 301-308):
Adicionar a arvore de decisao completa:

```text
### Arvore de Decisao ao Abrir o Chat

1. Se external_id + name + email enviados:
   -> Backend faz upsert (visitor + contato + empresa)
   -> Retorna auto_start: true
   -> Chat inicia direto, sem formulario

2. Se external_id enviado mas SEM name/email:
   -> Backend retorna needs_form: true
   -> Widget exibe formulario obrigatorio
   -> Ao preencher, backend faz upsert e inicia chat

3. Se NAO tem external_id mas tem name + email:
   -> Backend busca contato por email
   -> Se encontrar: vincula e retorna auto_start: true
   -> Se nao: cria novo contato

4. Se nenhum dado enviado:
   -> Widget exibe formulario obrigatorio (modo anonimo)
```

Adicionar nota sobre side panel:
```text
- **Side panel do atendente**: Todos os dados (empresa, MRR, Health Score, campos customizados)
  aparecem automaticamente no painel lateral do atendente assim que ele aceita o chat.
  O backend preenche contact_id e company_contact_id no chat_room durante o upsert.
```

**Secao "Fluxo Interno"** (linhas 424-429):
Atualizar para 7 passos:

```text
1. Script (nps-chat-embed.js) carrega no site do cliente
2. Se data-api-key presente: busca configuracao dinamica (get-widget-config) com campos customizados do tenant
3. Se data-api-key + data-external-id: chama resolve-chat-visitor com upsert completo
4. Backend retorna flags: auto_start (pular form), needs_form (exibir form), has_history (tem historico)
5. Cria iframe com widget de chat, passando flags e IDs resolvidos
6. window.NPSChat.update(payload) envia dados ao iframe e ao backend simultaneamente
7. Dados persistidos: visitor, contato, empresa e campos customizados atualizados via JSONB merge
```

### 2. Atualizar `buildFullDoc()`

A mesma logica se aplica a funcao `buildFullDoc()` (linhas 367-432), que gera a documentacao completa para copiar. Atualizar:

- Secao "Fluxo Interno" (passo 6): mesmos 7 passos acima
- Secao "Comportamento": adicionar arvore de decisao
- Adicionar secao sobre side panel e dados do atendente

### 3. Atualizar secao visual "Fluxo Interno" no JSX

O bloco JSX do "Fluxo Interno" (linhas 573-581) tambem precisa ser atualizado com os mesmos 7 passos para manter consistencia entre o texto copiavel e o que aparece na tela.

### 4. Atualizar secao "Regras de Comportamento" no JSX

O bloco de regras (linhas 651-657) precisa incluir:
- Menção a arvore de decisao (auto_start / needs_form / has_history)
- Nota sobre o side panel do atendente
- Que o upsert e centralizado no backend (nao no iframe)

## Resumo

Apenas um arquivo afetado: `src/components/chat/ChatWidgetDocsTab.tsx`. As mudancas sao textuais -- atualizar strings e descricoes para refletir o fluxo real implementado no `nps-chat-embed.js` e `resolve-chat-visitor`.

