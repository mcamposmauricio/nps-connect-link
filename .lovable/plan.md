

# Layout Responsivo, Upload de Arquivos e Status de Resolucao no Workspace

## Resumo

Tres frentes: (1) corrigir layout/responsividade do workspace, (2) adicionar envio e visualizacao de arquivos no chat, (3) solicitar status de resolucao ao encerrar conversa.

---

## 1. Layout e Responsividade

### Problemas atuais
- Lista de conversas: `w-80` fixo (320px) - estreita demais em desktop, quebra em telas menores
- Painel de informacoes: `w-72` fixo (288px) - dados da empresa ficam comprimidos
- Area de chat: `flex-1` comprime entre os dois paineis fixos
- Sem tratamento mobile: os tres paineis ficam lado a lado mesmo em telas pequenas

### Solucao

**`src/pages/AdminWorkspace.tsx`**

| Mudanca | Detalhe |
|---------|---------|
| Layout responsivo com `useIsMobile` | Em mobile: mostrar apenas um painel por vez (lista OU chat OU info) |
| Larguras proporcionais em desktop | Lista: `w-72 xl:w-80`, Chat: `flex-1 min-w-0`, Info: `w-80 xl:w-96` |
| Painel de info colapsavel | Botao toggle para mostrar/esconder o painel lateral direito, liberando espaco para o chat |
| Overflow correto | Adicionar `min-w-0` no flex-1 central para evitar que conteudo force largura |
| Altura total corrigida | Usar `h-[calc(100vh-3.5rem)]` (header de 14 = 3.5rem) em vez de `8rem` |

**Mobile (< 768px)**:
- Lista de conversas ocupa tela inteira
- Ao selecionar conversa, mostra chat com botao de voltar
- Painel de info acessivel via botao no header do chat (abre em sheet/drawer)

**Desktop**:
- Painel de info com largura aumentada para `w-80 xl:w-96` (320-384px)
- Lista de conversas com `w-72 xl:w-80`
- Botao para colapsar painel de info quando quiser mais espaco para chat

### `src/components/chat/VisitorInfoPanel.tsx`
- Remover largura fixa do container interno (deixar `w-full`)
- Ajustar `MetricCard` para usar texto responsivo

### `src/components/chat/ChatRoomList.tsx`
- Remover `max-w-[60%]` do truncate do nome (usar `flex-1 min-w-0 truncate`)
- Badge de status mais compacto em telas menores

---

## 2. Upload de Arquivos no Chat

### Infraestrutura

**Nova migration: bucket de storage**
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);
-- RLS: qualquer um pode fazer upload (visitantes nao autenticados)
CREATE POLICY "Public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-attachments');
CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');
```

### Fluxo de envio

A coluna `message_type` e `metadata` ja existem em `chat_messages`. Usaremos:
- `message_type = 'file'` para mensagens com arquivo
- `metadata = { file_url, file_name, file_type, file_size }` para os dados do arquivo

### Mudancas nos componentes

**`src/components/chat/ChatInput.tsx`** (workspace admin)

| Mudanca | Detalhe |
|---------|---------|
| Botao de anexo (clip) | Ao lado do botao de nota interna, abre file picker |
| Estado de upload | Mostrar progresso/preview antes de enviar |
| Preview inline | Imagens mostram thumbnail; outros arquivos mostram icone + nome |
| Prop `onSend` expandida | Aceitar `metadata` opcional com dados do arquivo |
| Drag and drop | Aceitar arquivos arrastados para a area do input |

**`src/components/chat/ChatMessageList.tsx`** (workspace admin)

| Mudanca | Detalhe |
|---------|---------|
| Renderizar `message_type = 'file'` | Mostrar preview de imagem (se for imagem) ou card de download |
| Suporte a tipos | Imagens: thumbnail clicavel; PDF/doc: icone + nome + tamanho + link download |
| Lightbox simples | Clicar na imagem abre em tamanho maior (dialog) |

**`src/pages/ChatWidget.tsx`** (widget do visitante)

| Mudanca | Detalhe |
|---------|---------|
| Botao de anexo no input | Icone de clip no input de mensagem do visitante |
| Upload para storage | Mesmo bucket `chat-attachments` |
| Renderizar mensagens de arquivo | Preview de imagem / card de download |

### Tipos de arquivo suportados
- Imagens: jpg, png, gif, webp - preview inline
- Documentos: pdf, doc, docx, xls, xlsx - icone + download
- Outros: link de download generico
- Limite: 10MB por arquivo

---

## 3. Status de Resolucao ao Encerrar Chat

A coluna `resolution_status` ja existe em `chat_rooms` (default `'pending'`). Ja e usada no historico e dashboard, mas nunca e definida pelo atendente ao fechar.

### Mudancas

**`src/pages/AdminWorkspace.tsx`**

| Mudanca | Detalhe |
|---------|---------|
| Dialog de confirmacao ao fechar | Em vez de fechar direto, abrir dialog perguntando o status |
| Opcoes de status | "Resolvido" (`resolved`) ou "Com pendencia" (`pending`) |
| Campo opcional de observacao | Textarea curta para o atendente anotar |
| Salvar na sala | `resolution_status` e opcionalmente uma ultima mensagem interna |

**Fluxo**:
1. Atendente clica "Encerrar"
2. Dialog aparece: "Como encerrar esta conversa?"
3. Dois botoes: "Resolvido" (verde) e "Com pendencia" (amarelo)
4. Campo opcional de observacao
5. Ao confirmar, atualiza `chat_rooms.status = 'closed'`, `resolution_status` e `closed_at`
6. Se houver observacao, insere como mensagem interna automatica

---

## Arquivos Modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/pages/AdminWorkspace.tsx` | Layout responsivo, dialog de encerramento, mobile |
| 2 | `src/components/chat/VisitorInfoPanel.tsx` | Remover larguras fixas internas |
| 3 | `src/components/chat/ChatRoomList.tsx` | Ajustar truncate e layout responsivo |
| 4 | `src/components/chat/ChatInput.tsx` | Botao de anexo, upload, preview, drag-and-drop |
| 5 | `src/components/chat/ChatMessageList.tsx` | Renderizar mensagens de arquivo com preview |
| 6 | `src/pages/ChatWidget.tsx` | Anexo no widget do visitante, renderizar arquivos |
| 7 | Migration SQL | Criar bucket `chat-attachments` com policies publicas |

