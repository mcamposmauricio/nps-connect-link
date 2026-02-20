
# Migrar Sidebar de Fetch Repetitivo para WebSocket Persistente Global

## Diagnóstico Preciso do Problema

### Root Cause — `AppSidebar.tsx` monta/desmonta a cada navegação

O `AppSidebar` é um componente normal dentro do React Router. A cada mudança de rota, o React re-renderiza o layout, e o `useEffect` da linha 184 é re-executado por causa do `chatOpen` e `fetchCounts` nas dependências:

```typescript
useEffect(() => {
  if (!chatOpen) return;
  fetchCounts();          // ← HTTP request TODA vez que o sidebar renderiza
  const roomsChannel = supabase.channel("sidebar-chat-rooms")
    .on(..., () => fetchCounts())   // ← novo canal Realtime criado + destruído
    .subscribe();
  // ...
  return () => {
    supabase.removeChannel(roomsChannel);  // ← canal destruído ao navegar
    supabase.removeChannel(attendantsChannel);
  };
}, [chatOpen, fetchCounts]);  // ← fetchCounts muda quando user.id ou isAdmin mudam
```

**O resultado:**
1. Usuário navega de `/admin/history` → `/cs-dashboard`
2. `AppSidebar` re-renderiza
3. `fetchCounts()` dispara (3–5 HTTP requests para `attendant_profiles`, `chat_team_members`, `chat_rooms`)
4. `teamAttendants` vai para `[]` temporariamente → lista some → dados voltam
5. Canais Realtime são destruídos e recriados (novo `subscribe()`)

### O canal Realtime existe mas não é suficiente

Os canais Realtime já existem (`sidebar-chat-rooms`, `sidebar-attendants`), mas são **recriados a cada renderização** porque vivem dentro do `AppSidebar`. Quando o canal é removido e recriado, há um gap de subscrição onde eventos podem ser perdidos.

---

## Solução: Context Global Persistente (`SidebarDataContext`)

### Arquitetura proposta

```text
App.tsx
 └─ SidebarDataProvider  (monta UMA VEZ, nunca desmonta)
     ├─ Estado: teamAttendants, totalActiveChats
     ├─ Fetch inicial único (sem spinner na sidebar)
     ├─ Canal Realtime permanente (chat_rooms + attendant_profiles)
     └─ AppSidebar         (lê dados via useSidebarData())
         └─ [rotas...]
```

O `SidebarDataProvider` vive **fora** das rotas, na raiz da árvore de componentes. Monta uma única vez quando o usuário faz login e só desmonta no logout. Os canais Realtime nunca são destruídos durante a navegação normal.

---

## Implementação Técnica

### 1. Novo arquivo: `src/contexts/SidebarDataContext.tsx`

Este contexto encapsula toda a lógica de dados da sidebar:

```typescript
// Estado gerenciado pelo contexto:
const [teamAttendants, setTeamAttendants] = useState<TeamAttendant[]>([]);
const [initialized, setInitialized] = useState(false);

// Fetch inicial (único, sem loading state que causa flash)
const initializeData = useCallback(async () => {
  if (!user?.id) return;
  // ... fetch attendants + chat_rooms (counts)
  setTeamAttendants(sorted);
  setInitialized(true);
}, [user?.id, isAdmin]);

useEffect(() => {
  initializeData();
  
  // Canais Realtime PERMANENTES — não são destruídos na navegação
  const roomsChannel = supabase
    .channel("global-sidebar-chat-rooms")
    .on("postgres_changes", { event: "*", table: "chat_rooms" },
      (payload) => {
        // Patch cirúrgico: atualizar apenas os contadores afetados
        // sem refetch completo
        handleRoomChange(payload);
      })
    .subscribe();

  const attendantsChannel = supabase
    .channel("global-sidebar-attendants")
    .on("postgres_changes", { event: "UPDATE", table: "attendant_profiles" },
      (payload) => {
        // Atualizar apenas o atendente específico que mudou
        const updated = payload.new;
        setTeamAttendants(prev => prev.map(a => 
          a.id === updated.id ? { ...a, status: updated.status } : a
        ));
      })
    .subscribe();

  return () => {
    // Só desmonta no logout — não na navegação
    supabase.removeChannel(roomsChannel);
    supabase.removeChannel(attendantsChannel);
  };
}, [user?.id]);  // ← depende só de user.id, não recria ao navegar
```

#### Patch cirúrgico para `chat_rooms`:

Em vez de chamar `fetchCounts()` (3-5 queries) a cada evento Realtime:

```typescript
const handleRoomChange = (payload) => {
  const { eventType, new: newRoom, old: oldRoom } = payload;
  
  if (eventType === "INSERT" && newRoom.attendant_id && newRoom.status === "active") {
    // Incrementar contador do atendente específico
    setTeamAttendants(prev => prev.map(a =>
      a.id === newRoom.attendant_id
        ? { ...a, active_count: a.active_count + 1 }
        : a
    ));
  }
  
  if (eventType === "UPDATE") {
    // Room fechou → decrementar atendente anterior
    if (newRoom.status === "closed" && oldRoom.status !== "closed" && oldRoom.attendant_id) {
      setTeamAttendants(prev => prev.map(a =>
        a.id === oldRoom.attendant_id
          ? { ...a, active_count: Math.max(0, a.active_count - 1) }
          : a
      ));
    }
    // Room foi reatribuído → ajustar ambos os atendentes
    if (newRoom.attendant_id !== oldRoom.attendant_id) {
      setTeamAttendants(prev => prev.map(a => {
        if (a.id === oldRoom.attendant_id) return { ...a, active_count: Math.max(0, a.active_count - 1) };
        if (a.id === newRoom.attendant_id && newRoom.status === "active") return { ...a, active_count: a.active_count + 1 };
        return a;
      }));
    }
  }
};
```

### 2. Modificar `AppSidebar.tsx`

Remover completamente:
- `fetchCounts` callback (linhas 119-182)
- `useEffect` com subscriptions (linhas 184-199)
- Estado local `teamAttendants` (linha 112)

Substituir por:
```typescript
import { useSidebarData } from "@/contexts/SidebarDataContext";
const { teamAttendants, totalActiveChats } = useSidebarData();
```

### 3. Modificar `App.tsx` (ou `SidebarLayout.tsx`)

Envolver o layout com o novo provider:

```tsx
// Em App.tsx, dentro do AuthProvider:
<SidebarDataProvider>
  <AppSidebar />
  <Routes>...</Routes>
</SidebarDataProvider>
```

O provider verifica `user?.id` internamente — se não há usuário logado, não faz nada.

---

## Comportamento Após a Mudança

| Evento | Antes | Depois |
|---|---|---|
| Navegar entre rotas | `fetchCounts()` = 3-5 HTTP requests + lista pisca | Zero requests, lista estável |
| Atendente muda status | Canal recriado + refetch completo | Patch cirúrgico em 1 registro |
| Room fecha/abre | Canal recriado + refetch completo | Patch cirúrgico nos contadores |
| Usuário faz login | Fetch inicial | Fetch inicial (igual) |
| Usuário faz logout | Canais destruídos | Canais destruídos (no cleanup do provider) |
| Reload da página | Fetch único | Fetch único (igual) |

---

## Arquivos a Modificar/Criar

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/contexts/SidebarDataContext.tsx` | CRIAR | Provider global com estado + canais Realtime permanentes + patch cirúrgico |
| `src/components/AppSidebar.tsx` | MODIFICAR | Remover `fetchCounts`, `useEffect`, estado local `teamAttendants`; ler do contexto |
| `src/App.tsx` | MODIFICAR | Envolver com `SidebarDataProvider` no lugar correto da árvore |
