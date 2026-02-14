
# Melhorias no Workspace de Chat - 11 Funcionalidades

## Resumo

Conjunto de melhorias no workspace de atendimento cobrindo: entrada de midia, exibicao de mensagens, reorganizacao de layout, reatribuicao de chats, emoji, ordenacao, paineis redimensionaveis, envio por outros atendentes, visao de equipe no menu e links clicaveis.

---

## 1. Colar imagem via Ctrl+V

**Arquivo:** `src/components/chat/ChatInput.tsx`

Adicionar listener `onPaste` no Textarea que detecta `clipboardData.items` com tipo `image/*`, cria um `File` a partir do blob e chama `handleFileSelect(file)` existente.

---

## 2. Fix: Texto enviado junto com imagem nao aparece

**Arquivo:** `src/pages/AdminWorkspace.tsx` (funcao `handleSendMessage`)

Problema atual: quando ha arquivo + texto, o `content` e enviado mas o `message_type` e setado como `"file"`, e no `ChatMessageList` mensagens do tipo `file` renderizam apenas o `FileMessage` sem exibir o texto.

**Correcao em 2 pontos:**
- `AdminWorkspace.tsx` `handleSendMessage`: enviar o texto no campo `content` normalmente (ja faz isso)
- `ChatMessageList.tsx`: quando `message_type === "file"` e `content` difere de `file_name`, renderizar tanto o `FileMessage` quanto o texto `content` abaixo da imagem/arquivo

---

## 3. Links clicaveis no painel de infos da empresa

**Arquivo:** `src/components/chat/VisitorInfoPanel.tsx`

Na aba "Empresa", transformar os dados relevantes em links clicaveis:
- Nome da empresa: link para `/nps/contacts` com filtro ou para `CompanyDetailsSheet`
- Health Score: link para `/cs-health`
- MRR/Contrato: link para `/cs-financial`
- NPS Score: link para `/nps/dashboard`

Usar `<Link>` do react-router ou `onClick` com `navigate()`.

---

## 4. Botao de emoji no chat

**Arquivo:** `src/components/chat/ChatInput.tsx`

Adicionar um botao de emoji (icone Smile) ao lado dos botoes existentes. Ao clicar, abre um `Popover` com uma grade de emojis comuns organizados por categoria (rostos, maos, objetos). Ao selecionar, insere o emoji na posicao do cursor no textarea.

Implementacao leve sem dependencia externa: grade fixa de ~80 emojis populares em categorias.

---

## 5. Reatribuicao de chat ("Enviar para")

**Arquivos:** `src/pages/AdminWorkspace.tsx`, novo componente `src/components/chat/ReassignDialog.tsx`

Adicionar botao "Transferir" no header do chat (ao lado de "Encerrar") que abre um dialog listando os atendentes online (via `attendant_profiles`). Ao confirmar:
- Atualiza `chat_rooms.attendant_id` para o novo atendente
- Atualiza `chat_rooms.assigned_at`
- Insere mensagem de sistema: "[Sistema] Chat transferido de X para Y"
- Toast de confirmacao

---

## 6. Ordenacao do workspace

**Arquivo:** `src/components/chat/ChatRoomList.tsx`

Adicionar um seletor de ordenacao (dropdown) no header da lista:
- Opcoes: "Ultima mensagem" ou "Abertura do chat"
- Direcao: crescente ou decrescente
- Aplicar `sort()` na lista filtrada antes de renderizar
- Manter a logica de "nao lidos primeiro" como opcao padrao

---

## 7. Paineis redimensionaveis (arrastar largura)

**Arquivo:** `src/pages/AdminWorkspace.tsx`

Substituir o layout `flex` fixo por `react-resizable-panels` (ja instalado no projeto). Os 3 blocos (lista, chat, info) serao `Panel` com `PanelResizeHandle` entre eles, permitindo redimensionar arrastando.

Tamanhos padrao:
- Lista: ~20%
- Chat: ~50%
- Info: ~30%

Limites minimos para evitar colapso total.

---

## 8. Outros atendentes podem enviar mensagens (nao so notas)

**Arquivo:** `src/components/chat/ChatInput.tsx`, `src/pages/AdminWorkspace.tsx`

Atualmente `handleSendMessage` verifica se o chat esta atribuido ao usuario logado? Nao, ele envia para qualquer `selectedRoom`. O problema e que o botao `is_internal` forca nota interna.

**Ajuste:** Remover restricao que force notas internas para atendentes nao-donos. Qualquer atendente do tenant pode enviar mensagem normal ou nota interna em qualquer sala. A RLS ja permite isso (tenant members can manage messages).

---

## 9. Visao de workspace de outros atendentes no menu

**Arquivos:** `src/components/AppSidebar.tsx`, `src/pages/AdminWorkspace.tsx`

No menu lateral, dentro do submenu Chat, abaixo de "Workspace":
- Listar atendentes da equipe com badge mostrando numero de chats ativos
- Ao clicar em um atendente, navegar para `/admin/workspace?attendant=<id>` que filtra a lista de salas mostrando apenas chats desse atendente
- Visivel para perfis com permissao `chat.manage` (gestores) ou todos do tenant
- Na fila "Na fila" do workspace do usuario logado, filtrar salas que ja estejam atribuidas a outro atendente (mostrar apenas as nao-atribuidas + as do proprio usuario)

**Detalhes:**
- Buscar `attendant_profiles` com contagem de salas ativas
- Exibir como sub-itens colapsaveis sob "Workspace"
- Badge com contagem ao lado do nome

---

## 10. Caixa de mensagem expansivel em altura

**Arquivo:** `src/components/chat/ChatInput.tsx`

Atualmente o textarea tem `resize-none` e `max-h-[96px]`. Mudancas:
- Trocar `resize-none` por `resize-y`
- Aumentar `max-h` para `max-h-[200px]`
- Manter auto-resize mas permitir que o usuario arraste para expandir manualmente

---

## 11. Links clicaveis nas mensagens

**Arquivo:** `src/components/chat/ChatMessageList.tsx`

Substituir a renderizacao de texto plano por uma funcao que detecta URLs (regex) e as transforma em tags `<a>` clicaveis com `target="_blank"` e estilizacao (underline, cor). Aplicar tanto para mensagens de visitante quanto de atendente.

---

## Detalhes Tecnicos

### Arquivos a serem criados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/components/chat/ReassignDialog.tsx` | Dialog de reatribuicao de chat |
| 2 | `src/components/chat/EmojiPicker.tsx` | Picker de emojis leve inline |

### Arquivos a serem modificados

| # | Arquivo | Mudancas |
|---|---------|----------|
| 1 | `src/components/chat/ChatInput.tsx` | Paste de imagem, emoji picker, textarea expansivel |
| 2 | `src/components/chat/ChatMessageList.tsx` | Links clicaveis, fix texto+imagem |
| 3 | `src/pages/AdminWorkspace.tsx` | Paineis redimensionaveis, reatribuicao, envio por outros atendentes, filtro de salas |
| 4 | `src/components/chat/ChatRoomList.tsx` | Ordenacao configuravel |
| 5 | `src/components/chat/VisitorInfoPanel.tsx` | Links nas infos da empresa |
| 6 | `src/components/AppSidebar.tsx` | Sub-menu de atendentes com contagem |
| 7 | `src/locales/pt-BR.ts` | Novas chaves de traducao |
| 8 | `src/locales/en.ts` | Novas chaves de traducao |

### Sem mudancas no banco de dados

Todas as funcionalidades usam tabelas e RLS existentes. A reatribuicao usa `chat_rooms.attendant_id` ja existente. A visao de outros atendentes usa `attendant_profiles` ja disponivel.

### Dependencias

`react-resizable-panels` ja esta instalado no projeto (v2.1.9).

### Ordem de implementacao sugerida

1. Fixes primeiro (texto+imagem, links clicaveis nas mensagens)
2. Melhorias de input (Ctrl+V imagem, emoji, textarea expansivel)
3. Funcionalidades de gestao (reatribuicao, ordenacao)
4. Layout (paineis redimensionaveis)
5. Visao de equipe (sidebar + filtro de salas)
6. Links no painel de infos
