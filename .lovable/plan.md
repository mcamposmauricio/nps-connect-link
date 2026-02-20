
# Corrigir Flickering + Unread Count de Mensagens do Atendente

## Diagnóstico Completo

### Bug 1 — Flickering (confirmado)

Em `useChatRealtime.ts`, toda vez que uma mensagem chega via Realtime:

```typescript
// linha 252-254
fetchRooms();  // ← chama setLoading(true) → lista some → spinner → lista volta
```

E no `ChatRoomList.tsx`, o `loading` substitui a lista inteira por um spinner:

```typescript
if (loading) {
  return (
    <div className="glass-card h-full flex items-center justify-center">
      <div className="animate-spin ..."/>
    </div>  // ← lista SOME completamente
  );
}
```

**Toda mensagem nova = lista pisca.**

### Bug 2 — Unread Count errado (confirmado + adicionado ao plano)

O handler Realtime chama `fetchRooms()` para qualquer INSERT em `chat_messages`. Quando o atendente logado envia uma mensagem:
- `sender_type = "attendant"`, `sender_id = user.id`
- O `fetchRooms()` dispara novamente e recalcula unread counts com query no banco

O count no banco usa `.eq("sender_type", "visitor")` corretamente, **mas** isso só protege o fetch inicial. Quando a lógica cirúrgica for implementada — onde o estado local é atualizado diretamente sem ir ao banco — mensagens do próprio atendente também incrementarão o badge de não lidas se não houver filtro explícito.

**Adicionalmente**, na lógica atual, mesmo que a query do banco filtre por `sender_type = "visitor"`, o `fetchRooms()` completo é chamado mesmo quando o atendente envia — causando flickering desnecessário para mensagens que definitivamente não geram unread.

---

## Solução Completa

Tudo em um único arquivo: `src/hooks/useChatRealtime.ts`

### 1. Hook `useChatRooms` recebe `currentUserId` como parâmetro adicional

O hook já recebe `ownerUserId` (o dono do workspace = admin). Para o workspace de atendente, `ownerUserId === user.id`. Então `currentUserId` serve para identificar mensagens enviadas pelo próprio usuário logado.

```typescript
export function useChatRooms(
  ownerUserId: string | null,
  options?: { excludeClosed?: boolean; currentUserId?: string }
)
```

No `AdminWorkspace.tsx`, a chamada já passa `user?.id` como `ownerUserId`, então `currentUserId` pode ser derivado do mesmo valor sem alterar a assinatura externa:

```typescript
// No hook internamente, currentUserId = ownerUserId (são o mesmo no contexto de workspace)
const currentUserIdRef = useRef<string | null>(ownerUserId);
```

Ou alternativamente, manter `ownerUserId` como identificador duplo — já que no workspace de atendentes `ownerUserId === user.id`.

### 2. Separar loading inicial de atualizações silenciosas

```typescript
const isFirstLoad = useRef(true);

const fetchRooms = useCallback(async (showLoading = false) => {
  if (!ownerUserId) return;
  if (showLoading) setLoading(true);
  // ...fetch...
  if (showLoading) setLoading(false);
}, [...]);

useEffect(() => {
  fetchRooms(true);  // ← apenas na montagem inicial mostra loading
  // ...subscriptions usam fetchRooms() sem loading
}, [...]);
```

### 3. Handler de `chat_messages INSERT`: patch cirúrgico

```typescript
.on("postgres_changes", { event: "INSERT", table: "chat_messages" }, (payload) => {
  const msg = payload.new as ChatMessage;
  
  // === BUG DO ATENDENTE: ignorar completamente mensagens enviadas pelo próprio usuário ===
  // sender_type "attendant" ou "system" nunca geram unread
  // sender_id === ownerUserId significa que foi o próprio atendente logado que enviou
  const isOwnMessage = msg.sender_type !== "visitor";
  
  // Som apenas para mensagens do visitante em rooms não selecionados
  if (msg.sender_type === "visitor" && msg.room_id !== selectedRoomIdRef.current) {
    // play sound...
  }

  // === SEM FLICKERING: atualizar estado diretamente, sem fetchRooms ===
  setRooms((prev) => {
    const idx = prev.findIndex(r => r.id === msg.room_id);
    if (idx === -1) return prev;  // room não visível, ignorar
    
    const patched = [...prev];
    const room = { ...patched[idx] };
    
    // Atualizar last_message (para qualquer mensagem não-interna)
    if (!msg.is_internal) {
      room.last_message = msg.content;
      room.last_message_at = msg.created_at;
      room.last_message_sender_type = msg.sender_type;
    }
    
    // Incrementar unread APENAS para mensagens do visitante,
    // E APENAS se o room não está selecionado no momento
    if (
      msg.sender_type === "visitor" &&           // ← apenas visitante
      !msg.is_internal &&                        // ← não interno
      msg.room_id !== selectedRoomIdRef.current  // ← room não está aberto
    ) {
      room.unread_count = (room.unread_count ?? 0) + 1;
    }
    // Se isOwnMessage === true → unread_count NÃO é tocado
    
    patched[idx] = room;
    
    // Re-ordenar: unread primeiro, depois por last_message_at
    return patched.sort((a, b) => {
      const aU = a.unread_count ?? 0;
      const bU = b.unread_count ?? 0;
      if (aU > 0 && bU === 0) return -1;
      if (aU === 0 && bU > 0) return 1;
      const aTime = a.last_message_at || a.created_at;
      const bTime = b.last_message_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  });
})
```

**Resultado**: mensagem do atendente → `last_message` atualiza, `unread_count` não muda, zero flickering.

### 4. Handler de `chat_rooms *`: patch por evento

Separar os eventos `INSERT`, `UPDATE`, `DELETE` em vez de sempre chamar `fetchRooms()`:

```typescript
// UPDATE: patch cirúrgico
.on("postgres_changes", { event: "UPDATE", table: "chat_rooms" }, (payload) => {
  const updated = payload.new as ChatRoom;
  
  setRooms((prev) => {
    const idx = prev.findIndex(r => r.id === updated.id);
    
    // Room passou para closed e excludeClosed=true → remover da lista
    if (options?.excludeClosed && updated.status === "closed") {
      return prev.filter(r => r.id !== updated.id);
    }
    
    if (idx === -1) {
      // Room não está na lista mas agora é active/waiting → adicionar via mini-fetch
      fetchSingleRoom(updated.id);
      return prev;
    }
    
    // Patch preservando campos enriquecidos (visitor_name, last_message, unread_count)
    const patched = [...prev];
    patched[idx] = {
      ...patched[idx],
      status: updated.status,
      attendant_id: updated.attendant_id,
      priority: updated.priority,
      assigned_at: updated.assigned_at,
      closed_at: updated.closed_at,
      updated_at: updated.updated_at,
      // Preservar campos que não vêm do banco no payload:
      visitor_name: patched[idx].visitor_name,
      visitor_email: patched[idx].visitor_email,
      last_message: patched[idx].last_message,
      last_message_at: patched[idx].last_message_at,
      last_message_sender_type: patched[idx].last_message_sender_type,
      unread_count: patched[idx].unread_count,
    };
    return patched;
  });
})

// INSERT: buscar apenas o novo room (mini-fetch de 1 registro)
.on("postgres_changes", { event: "INSERT", table: "chat_rooms" }, (payload) => {
  if (options?.excludeClosed && payload.new.status === "closed") return;
  fetchSingleRoom(payload.new.id as string);
})

// DELETE: remover do state
.on("postgres_changes", { event: "DELETE", table: "chat_rooms" }, (payload) => {
  setRooms((prev) => prev.filter(r => r.id !== (payload.old.id as string)));
})
```

### 5. Função auxiliar `fetchSingleRoom` (mini-fetch sem loading)

```typescript
const fetchSingleRoom = useCallback(async (roomId: string) => {
  const { data } = await supabase
    .from("chat_rooms")
    .select("*, chat_visitors!visitor_id(name, email)")
    .eq("id", roomId)
    .maybeSingle();
  
  if (!data) return;
  
  const visitor = (data as any).chat_visitors as { name?: string; email?: string } | null;
  const enriched: ChatRoom = {
    ...data,
    visitor_name: visitor?.name ?? undefined,
    visitor_email: visitor?.email ?? undefined,
    unread_count: 0,
  } as ChatRoom;
  
  setRooms((prev) => {
    const filtered = prev.filter(r => r.id !== roomId);  // deduplicar
    const updated = [enriched, ...filtered];
    return updated.sort((a, b) => {
      const aTime = a.last_message_at || a.created_at;
      const bTime = b.last_message_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  });
}, []);
```

### 6. Otimização: unread count com query única no fetch inicial

Substituir o loop de N queries `COUNT` por uma query única que traz os `room_id` + `created_at` de todas as mensagens não lidas:

```typescript
// Atual: N queries — uma por room
for (const roomId of roomIds) {
  const { count } = await supabase.from("chat_messages")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("sender_type", "visitor")...

// Novo: 1 query com todos os rooms
const oldestReadAt = Object.values(readMap).length > 0
  ? Object.values(readMap).reduce((a, b) => a < b ? a : b)
  : "1970-01-01T00:00:00Z";

const { data: unreadMsgs } = await supabase
  .from("chat_messages")
  .select("room_id, created_at")
  .in("room_id", roomIds)
  .eq("sender_type", "visitor")
  .eq("is_internal", false)
  .gt("created_at", oldestReadAt);  // filtra pela mais antiga lida

// Contar por room no JS
for (const msg of (unreadMsgs ?? []) as { room_id: string; created_at: string }[]) {
  const lastRead = readMap[msg.room_id] || "1970-01-01T00:00:00Z";
  if (msg.created_at > lastRead) {
    unreadCounts[msg.room_id] = (unreadCounts[msg.room_id] ?? 0) + 1;
  }
}
```

Reduz de N queries para 1 — carregamento inicial muito mais rápido.

---

## Arquivos a Modificar

| Arquivo | O que muda |
|---|---|
| `src/hooks/useChatRealtime.ts` | Único arquivo a modificar: (1) `fetchRooms` só usa `setLoading(true)` no primeiro load; (2) handler `chat_messages INSERT` → patch cirúrgico + filtro `sender_type !== "visitor"` para não incrementar unread; (3) handler `chat_rooms *` → separar INSERT/UPDATE/DELETE com patches individuais; (4) `fetchSingleRoom` auxiliar; (5) unread count com query única |

**Nenhum outro arquivo precisa ser alterado** — `ChatRoomList`, `AdminWorkspace`, e `ChatInput` continuam exatamente iguais.

---

## Comportamento Esperado

| Evento | Antes | Depois |
|---|---|---|
| Visitante envia mensagem | Lista pisca (loading) + badge incrementa | Badge incrementa suavemente, lista reordena, sem flash |
| **Atendente envia mensagem** | **Lista pisca (loading) + badge incrementa incorretamente** | **last_message atualiza, badge NÃO muda, zero flickering** |
| Atendente seleciona room | Marca como lido, badge some | Igual, mas sem causar refetch adicional |
| Novo room entra (visitor abre chat) | Lista pisca, refetch completo | Novo card aparece no topo suavemente via mini-fetch |
| Room fecha | Lista pisca, refetch completo | Card desaparece suavemente via filter local |
| Atendente atribuído muda | Lista pisca, refetch completo | Card atualiza status inline sem flash |
