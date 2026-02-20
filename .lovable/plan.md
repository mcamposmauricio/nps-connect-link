
# Portal com Paridade de Recursos do Widget Embedado

## Diagnóstico: O que o Widget tem que o Portal não tem

Comparando `ChatWidget.tsx` (iframe embed) com `PortalChatView.tsx` + `PortalChatList.tsx` + `UserPortal.tsx`:

| Recurso | Widget (iframe) | Portal |
|---|---|---|
| **Anexo de arquivos** (upload + preview de imagem + download de doc) | ✅ Paperclip, `uploadFile()`, preview, lightbox | ❌ Ausente |
| **Paginação de mensagens** ("Carregar anteriores" — 10 por página) | ✅ `PAGE_SIZE = 10`, `hasMoreMessages`, `loadMore()` | ❌ Busca tudo sem limite |
| **Renderização de mensagens de arquivo** | ✅ `renderFileMessage()` com imagem/lightbox/download | ❌ Mostra só `msg.content` sem `message_type` |
| **Banners de estado da fila** ("todos ocupados" / "fora do horário") | ✅ `outsideHours`, `allBusy`, `checkRoomAssignment()`, banners coloridos | ❌ Apenas uma mensagem genérica de aguardando |
| **Configurações do widget via `chat_settings`** | ✅ Busca `show_csat`, `show_chat_history`, `allow_file_attachments`, `waiting_message`, etc. | ❌ Não lê nenhuma configuração do `chat_settings` |
| **CSAT condicional** (`show_csat` em `chat_settings`) | ✅ Respeita a config do admin | ❌ CSAT sempre aparece |
| **Lightbox de imagens** | ✅ Clique na imagem abre modal ampliado | ❌ Ausente |
| **`checkRoomAssignment()` ao criar room** | ✅ Chama edge function para verificar fila | ❌ `UserPortal` cria room mas não verifica fila — nunca detecta `allBusy`/`outsideHours` |
| **Timestamp completo nas mensagens** | ✅ `HH:mm` nos balões | ✅ Presente |
| **Histórico de transcrições inline** | ✅ `viewTranscript` phase com back ao history | ✅ Presente (expand inline) |

---

## Implementação Técnica

### 1. `UserPortal.tsx` — Carregar `chat_settings` e `checkRoomAssignment`

```typescript
// Após carregar o contactData, buscar configurações do dono
const { data: cfg } = await supabase
  .from("chat_settings")
  .select("show_csat, allow_file_attachments, waiting_message, show_outside_hours_banner, ...")
  .eq("user_id", contactData.user_id)
  .maybeSingle();

setWidgetConfig(cfg);
```

`widgetConfig` é passado como prop para `PortalChatView`.

Também: ao criar nova room (`handleNewChat`), após inserir a room, chamar a edge function `assign-chat-room` para verificar se há atendente disponível (igual ao widget). Isso habilita os banners `outsideHours` e `allBusy`.

### 2. `PortalChatView.tsx` — Adicionar os 5 recursos ausentes

#### 2a. Paginação de mensagens

```typescript
const PAGE_SIZE = 10;
const [hasMoreMessages, setHasMoreMessages] = useState(false);
const [loadingMore, setLoadingMore] = useState(false);

const fetchMessages = async (before?: string) => {
  let query = supabase
    .from("chat_messages")
    .select("id, content, sender_type, sender_name, created_at, message_type, metadata")
    .eq("room_id", roomId)
    .eq("is_internal", false)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);
  
  if (before) query = query.lt("created_at", before);
  
  const { data } = await query;
  const items = data ?? [];
  const hasMore = items.length > PAGE_SIZE;
  if (hasMore) items.pop();
  items.reverse();
  
  if (before) setMessages(prev => [...items, ...prev]);
  else setMessages(items);
  setHasMoreMessages(hasMore);
};
```

Botão "Carregar anteriores" no topo da lista de mensagens.

#### 2b. Tipo de mensagem — arquivo/imagem

```typescript
interface ChatMessage {
  id: string;
  content: string;
  sender_type: string;
  sender_name: string | null;
  created_at: string;
  message_type?: string | null;             // NOVO
  metadata?: {                              // NOVO
    file_url?: string;
    file_name?: string;
    file_type?: string;
    file_size?: number;
  } | null;
}
```

Função `renderFileMessage()` idêntica ao widget: imagem → thumbnail clicável com lightbox; documento → card com ícone FileText + botão download.

#### 2c. Upload de arquivo

```typescript
const uploadFile = async (file: File) => {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  await supabase.storage.from("chat-attachments").upload(path, file, { contentType: file.type });
  const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
  return { file_url: urlData.publicUrl, file_name: file.name, file_type: file.type, file_size: file.size };
};
```

Barra de input recebe:
- `<input type="file" ref={fileInputRef} className="hidden" />`
- Botão Paperclip (somente se `widgetConfig?.allow_file_attachments ?? true`)
- Preview bar quando `pendingFile` não é null (nome + botão X para remover)

#### 2d. Banners de fila (`outsideHours` / `allBusy`)

```typescript
const [allBusy, setAllBusy] = useState(false);
const [outsideHours, setOutsideHours] = useState(false);
```

Props recebidas de `UserPortal` após `checkRoomAssignment()`.

Tela de `waiting` exibe:
- Banner azul se `outsideHours && cfg.show_outside_hours_banner`
- Banner âmbar se `allBusy && cfg.show_all_busy_banner`
- Mensagem padrão configurável `cfg.waiting_message` caso neutro

#### 2e. CSAT condicional

```typescript
// Exibir form CSAT somente se habilitado na config
{phase === "csat" && (widgetConfig?.show_csat ?? true) && <PortalCSATForm onSubmit={handleCSATSubmit} />}

// Se CSAT desabilitado, mostrar direto a mensagem de encerramento
{phase === "csat" && !(widgetConfig?.show_csat ?? true) && (
  <div className="text-center ...">
    <Button onClick={() => { setPhase("closed"); onBack(); }}>Concluir</Button>
  </div>
)}
```

#### 2f. Lightbox de imagem

```typescript
const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

// Dialog modal (Dialog do Radix) — idêntico ao widget
<Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
  <DialogContent className="max-w-3xl p-2">
    {lightboxUrl && <img src={lightboxUrl} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain rounded" />}
  </DialogContent>
</Dialog>
```

### 3. `UserPortal.tsx` — Passar props de configuração e estado de fila

```typescript
// Novo estado
const [widgetConfig, setWidgetConfig] = useState<ChatConfig | null>(null);
const [allBusy, setAllBusy] = useState(false);
const [outsideHours, setOutsideHours] = useState(false);

// handleNewChat após criar a room:
const result = await checkRoomAssignment(room.id, contact.user_id);
setAllBusy(result.all_busy ?? false);
setOutsideHours(result.outside_hours ?? false);

// Passar para PortalChatView:
<PortalChatView
  roomId={activeRoomId}
  visitorId={activeVisitorId}
  contactName={contact?.name ?? "Visitante"}
  onBack={handleBackToList}
  widgetConfig={widgetConfig}      // NOVO
  allBusy={allBusy}                // NOVO
  outsideHours={outsideHours}      // NOVO
/>
```

---

## Fluxo de Dados Completo

```text
UserPortal (carregamento)
  ├── busca company_contacts por token
  ├── busca contacts (nome empresa)
  ├── busca chat_settings do owner (widgetConfig)  ← NOVO
  └── busca chat_rooms

handleNewChat()
  ├── cria visitor (se necessário)
  ├── cria chat_room
  ├── chama assign-chat-room edge function         ← NOVO
  │    └── retorna { assigned, all_busy, outside_hours }
  ├── setAllBusy / setOutsideHours                 ← NOVO
  └── abre PortalChatView

PortalChatView
  ├── paginação (10 msgs iniciais, "Carregar anteriores")  ← NOVO
  ├── renderFileMessage() com lightbox              ← NOVO
  ├── banners de fila (outsideHours / allBusy)     ← NOVO
  ├── upload de arquivo via Supabase Storage        ← NOVO
  └── CSAT condicional via widgetConfig.show_csat  ← NOVO
```

---

## Arquivos a Modificar

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/pages/UserPortal.tsx` | MODIFICAR | Buscar `chat_settings`; chamar `assign-chat-room`; passar `widgetConfig`, `allBusy`, `outsideHours` para `PortalChatView` |
| `src/components/portal/PortalChatView.tsx` | MODIFICAR | Paginação; upload + renderFileMessage; banners de fila; CSAT condicional; lightbox; interface `ChatMessage` com `message_type` e `metadata` |
| `src/components/portal/PortalCSATForm.tsx` | SEM MUDANÇA | Já está correto |
| `src/components/portal/PortalChatList.tsx` | SEM MUDANÇA | Não impactado por essas features |

Nenhuma migração de banco é necessária — `chat_settings`, `chat-attachments` (Storage) e a edge function `assign-chat-room` já existem.
