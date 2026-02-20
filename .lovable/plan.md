

# Corrigir: Contadores de chat so contam para cima

## Causa Raiz

A tabela `chat_rooms` usa **REPLICA IDENTITY DEFAULT** (apenas primary key). Quando o Supabase Realtime envia um evento UPDATE ou DELETE, o campo `old` contem **apenas o `id`** da row -- campos como `attendant_id` e `status` chegam como `undefined`.

O codigo em `SidebarDataContext.tsx` depende desses campos para decrementar:

```text
// Linha 130-131 — nunca executa porque oldRoom.status === undefined
if (newRoom.status === "closed" && oldRoom.status !== "closed") {
  if (oldRoom.attendant_id) {  // oldRoom.attendant_id === undefined
```

O mesmo problema afeta reassignments (linha 142) e deletes (linha 167).

**Resultado:** contadores so incrementam (INSERT/assign) mas nunca decrementam (close/reassign/delete).

## Solucao

### 1. Alterar REPLICA IDENTITY para FULL na tabela `chat_rooms`

Uma unica migracao SQL resolve o problema na raiz:

```sql
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
```

Com REPLICA IDENTITY FULL, o Supabase Realtime envia **todos os campos** no `old` record, permitindo que a logica de decremento funcione corretamente.

### 2. Adicionar fallback defensivo no handleRoomChange

Como medida de seguranca (caso o Realtime falhe ou perca eventos), adicionar um fallback que usa `newRoom` quando `oldRoom` nao tem os campos esperados. Isso cobre cenarios de reconexao onde eventos podem ser perdidos.

No `SidebarDataContext.tsx`, ajustar o `handleRoomChange`:

- Para UPDATE de fechamento: se `oldRoom.status` for undefined, usar heuristica baseada apenas em `newRoom` (se `newRoom.status === "closed"` e `newRoom.attendant_id` existe, decrementar esse attendant)
- Para reassignment: se `oldRoom.attendant_id` for undefined, nao tentar decrementar o antigo (o REPLICA IDENTITY FULL resolve isso, mas o fallback evita bugs silenciosos)

### 3. Sincronizacao periodica como safety net

Adicionar um re-sync leve a cada 60 segundos que reconta as rooms ativas do banco e corrige qualquer drift nos contadores. Isso garante que mesmo que um evento Realtime seja perdido, os contadores convergem para o valor correto rapidamente.

## Arquivos a Modificar

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | `ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL` |
| `src/contexts/SidebarDataContext.tsx` | Fallback defensivo no handleRoomChange + re-sync periodico |

## Impacto

- **Performance:** REPLICA IDENTITY FULL aumenta marginalmente o tamanho do payload WAL para a tabela chat_rooms, mas o impacto e negligivel para o volume de dados deste sistema
- **Visual:** Contadores passam a decrementar em tempo real ao fechar/reatribuir chats
- **Compatibilidade:** Nenhuma mudanca de schema, apenas configuracao de replicacao

