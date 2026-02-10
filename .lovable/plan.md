
# Painel Enriquecido + Melhorias de Usabilidade no Workspace de Chat

## Resumo

Duas frentes de trabalho: (1) enriquecer o painel lateral direito com dados da empresa/contato em abas, e (2) corrigir problemas de usabilidade na area de digitacao e layout geral do workspace.

---

## Parte 1: Painel Lateral Enriquecido (VisitorInfoPanel)

Quando o visitante esta vinculado a um contato/empresa, o painel lateral exibira abas com informacoes ricas, seguindo o mesmo padrao visual do `CompanyCSDetailsSheet`.

### Dados exibidos por aba

**Aba Contato (padrao)**
- Nome, email, telefone, cargo, departamento
- External ID
- Metricas de chat (total de sessoes, CSAT medio)

**Aba Empresa**
- Nome fantasia / Razao social
- Health Score (barra de progresso com cor)
- MRR e Valor de contrato
- Data de renovacao
- Ultimo NPS (score + badge promotor/neutro/detrator)
- Cidade/Estado

**Aba Timeline**
- Ultimos 10 eventos da `timeline_events` usando o componente `TimelineComponent` ja existente

**Fallback**: visitante anonimo (sem vinculo) mantem o layout simples atual.

### Mudancas no arquivo

| Arquivo | Mudanca |
|---------|---------|
| `src/components/chat/VisitorInfoPanel.tsx` | Reescrever com abas (Tabs), queries para `contacts`, `company_contacts`, `timeline_events` |
| `src/pages/AdminWorkspace.tsx` | Passar props `contactId` e `companyContactId` do `selectedRoom` |

---

## Parte 2: Melhorias de Usabilidade

### 2.1 Foco automatico no input apos enviar mensagem
- No `ChatInput`, adicionar `useRef` no campo de texto e chamar `inputRef.current?.focus()` apos o envio.
- Tambem aplicar `autoFocus` no input para focar automaticamente ao abrir a conversa.

### 2.2 Trocar Input por Textarea
- Substituir o `<Input>` por `<Textarea>` no `ChatInput` para permitir mensagens multilinhas.
- Configurar com `rows={1}` e auto-resize (max 4 linhas) para nao ocupar espaco desnecessario.
- Envio com Enter (sem Shift). Shift+Enter para nova linha.

### 2.3 Scroll automatico suave para ultima mensagem
- Usar `scrollIntoView({ behavior: "smooth" })` em um elemento sentinela no final da lista, em vez do `scrollTop = scrollHeight` brusco atual.
- Adicionar um `ref` de sentinela no `ChatMessageList` e usar `useEffect` no `AdminWorkspace`.

### 2.4 Area de chat com borda e fundo definidos
- A area central de mensagens nao tem contorno visual claro. Envolver em um container com `rounded-lg border bg-card` para delimitar visualmente, igual ao header ja faz.
- Isso cria uma "caixa de conversa" coesa: header + mensagens + input dentro de um unico card.

### 2.5 Indicador de digitacao/enviando
- Mostrar feedback visual enquanto a mensagem esta sendo enviada (o botao ja desabilita, mas adicionar um spinner pequeno no botao de envio durante o estado `sending`).

### 2.6 Atalho de teclado para nota interna
- Adicionar `Ctrl+Shift+I` (ou `Cmd+Shift+I` no Mac) como atalho para alternar entre mensagem normal e nota interna, alem do botao.

---

## Arquivos Modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/components/chat/VisitorInfoPanel.tsx` | Reescrever com abas, queries de empresa, contato e timeline |
| 2 | `src/pages/AdminWorkspace.tsx` | Passar props extras ao painel + envolver chat em card coeso |
| 3 | `src/components/chat/ChatInput.tsx` | Textarea com auto-resize, foco apos envio, spinner, atalho de teclado |
| 4 | `src/components/chat/ChatMessageList.tsx` | Adicionar ref sentinela para scroll suave |
