

# Revisao do WidgetPreview -- Atualizacao e Melhorias de UI/UX

## Problema Atual

O `WidgetPreview.tsx` exibe apenas 4 estados (Formulario, Fora do Horario, Ocupados, Aguardando), mas o widget real (`ChatWidget.tsx`) possui **8 fases** com funcionalidades que nao estao representadas no preview. O administrador nao consegue visualizar como o widget se comporta nas telas mais importantes.

---

## Estados Faltantes no Preview

| Estado | Descricao |
|---|---|
| **Historico** | Lista de conversas com botao "+ Novo Chat", badges de status, preview da ultima mensagem, badge "Pendente" e botao "Retomar conversa" |
| **Conversa ativa** | Bolhas de mensagem (visitante vs atendente), indicador de "digitando...", area de input com botao de anexo |
| **CSAT** | Avaliacao com 5 estrelas e campo de comentario |
| **Encerrado** | Mensagem de agradecimento |
| **Transcrito** | Visualizacao somente-leitura com botao "Carregar anteriores" |

---

## Plano de Implementacao

### 1. Novos tabs no preview

Atualizar o tipo `PreviewTab` e a lista de tabs:

```text
form | history | outside_hours | all_busy | waiting | chat | csat | closed
```

Reorganizar visualmente os tabs em duas linhas ou com scroll horizontal para caber todos.

### 2. Tab "Historico" (history)

Representar a tela que o visitante ve ao ter conversas anteriores:

- Botao "+ Novo Chat" com a cor primaria (igual ao real)
- 2-3 cards mockados representando conversas:
  - Um com status "Encerrado" + icone CheckCircle + preview de mensagem truncada + data
  - Um com badge "Pendente" laranja + botao "Retomar conversa"
  - Um com status "Em andamento" + icone Clock na cor primaria
- Texto "Nenhuma conversa anterior" como alternativa vazia (opcional)

### 3. Tab "Conversa" (chat)

Simular uma conversa ativa:

- 3-4 bolhas de mensagem mockadas alternando entre visitante (cor primaria, alinhado a direita) e atendente (bg-muted, alinhado a esquerda)
- Nome do atendente acima da bolha do atendente
- Horario no canto inferior de cada bolha
- Indicador "Maria digitando..." com os 3 pontos animados
- Barra de input na parte inferior com icone de anexo (Paperclip) e botao Send na cor primaria

### 4. Tab "CSAT" (csat)

- Titulo "Avalie o atendimento"
- 5 estrelas (3 preenchidas como exemplo)
- Campo de textarea "Comentario (opcional)"
- Dois botoes: "Pular" (outline) e "Enviar Avaliacao" (cor primaria)

### 5. Tab "Encerrado" (closed)

- Mensagem centralizada "Obrigado pelo feedback! Esta conversa foi encerrada."
- Icone de check ou similar

### 6. Melhorias de UI/UX no preview existente

- **Header dinamico**: O subtitulo do header deve mudar conforme a tab ativa (ex: "Suas conversas" no historico, "Chat ativo" no chat, "Suporte" no formulario) -- espelhando o comportamento real
- **Botao voltar**: Exibir icone ArrowLeft no header quando em tabs de chat, historico, transcrito -- como no widget real
- **Mensagens de sistema**: Na tab de chat, incluir uma mensagem de sistema centralizada (ex: "[Sistema] Voce foi conectado com Maria") com o estilo pill/rounded
- **Dimensoes**: Aumentar a largura do painel de preview de 260px para 300px para melhor fidelidade visual

### 7. Melhorias de Layout Geral

- **Agrupamento de tabs**: Organizar os tabs em categorias visuais com separador:
  - Grupo 1 (Entrada): Formulario, Historico
  - Grupo 2 (Status): Fora do Horario, Ocupados, Aguardando
  - Grupo 3 (Conversa): Chat, CSAT, Encerrado
- **Tab ativo com destaque**: Manter o estilo atual de destaque com a cor primaria

---

## Secao Tecnica

### Arquivo alterado

`src/components/chat/WidgetPreview.tsx` -- unico arquivo a ser modificado.

### Novas props (nenhuma necessaria)

Todas as informacoes ja estao disponiveis via props existentes (`primaryColor`, `companyName`, `showEmailField`, etc.). Os novos tabs usam dados mockados estaticos.

### Novos icones importados

Adicionar ao import do lucide-react: `Plus`, `ArrowLeft`, `Star`, `Paperclip`, `Send`, `CheckCircle2`, `FileText`

### Estrutura do codigo

```text
PreviewTab = "form" | "history" | "outside_hours" | "all_busy" | "waiting" | "chat" | "csat" | "closed"

tabs = [
  { id: "form", label: "Formulario", group: "entrada" },
  { id: "history", label: "Historico", group: "entrada" },
  { id: "outside_hours", label: "Fora do horario", group: "status" },
  { id: "all_busy", label: "Ocupados", group: "status" },
  { id: "waiting", label: "Aguardando", group: "status" },
  { id: "chat", label: "Conversa", group: "conversa" },
  { id: "csat", label: "Avaliacao", group: "conversa" },
  { id: "closed", label: "Encerrado", group: "conversa" },
]
```

### Header dinamico

O subtitulo no header muda por tab:
- form: "Suporte"
- history: "Suas conversas"
- chat/waiting: "Chat ativo" / "Aguardando..."
- csat: "Avaliacao"
- closed: "Encerrado"
- outside_hours/all_busy: "Suporte"

### Dados mockados para chat

```text
[
  { sender: "attendant", name: "Maria", content: "Ola! Como posso ajudar?", time: "14:30" },
  { sender: "visitor", content: "Preciso de ajuda com meu pedido", time: "14:31" },
  { sender: "attendant", name: "Maria", content: "Claro! Qual o numero do pedido?", time: "14:31" },
  { sender: "visitor", content: "Pedido #12345", time: "14:32" },
]
```

