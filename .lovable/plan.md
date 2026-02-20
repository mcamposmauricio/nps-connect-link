
# Plano: Fila "Não Atribuído", Contagem Correta, Performance e Melhorias no Widget

## Resumo dos Problemas

1. **Fila "Não Atribuído" ausente na sidebar** -- chats sem atendente se misturam com os do atendente logado
2. **Contagem de chats incorreta** -- chats fechados saem da contagem mas deveriam manter o total de ativos+na fila
3. **Recarregamento visual ao trocar de aba** -- loading spinner aparece toda vez que o usuário volta para a aba do sistema
4. **Imagens no widget (iframe) não abrem em nova aba** -- lightbox abre dentro do iframe pequeno, difícil de visualizar
5. **Respostas com citação no widget (iframe) aparecem em formato bruto** -- visitante vê `> texto citado` em vez de um bloco visual formatado

---

## 1. Fila "Não Atribuído" na Sidebar

**Arquivo:** `src/contexts/SidebarDataContext.tsx`

Adicionar contagem de rooms sem `attendant_id` (status `active` ou `waiting`) ao `initializeData`. Novo campo `unassignedCount` no contexto.

Na query de rooms para contagem:
```typescript
// Contar rooms sem attendant_id
const { data: unassignedRooms } = await supabase
  .from("chat_rooms")
  .select("id")
  .in("status", ["active", "waiting"])
  .is("attendant_id", null);
const unassignedCount = unassignedRooms?.length ?? 0;
```

Os patches de Realtime (`handleRoomChange`) tambem devem incrementar/decrementar `unassignedCount` quando `attendant_id` muda de/para `null`.

**Arquivo:** `src/components/AppSidebar.tsx`

Adicionar item "Não Atribuído" no submenu do Workspace, antes da lista de atendentes:

```
-- Estacao de Trabalho [badge: total]
   -- Nao Atribuido [badge: unassignedCount]
   -- (Voce) Fulano [badge: N]
   -- Ciclano [badge: N]
```

Clicar em "Nao Atribuido" navega para `/admin/workspace?queue=unassigned`.

**Arquivo:** `src/pages/AdminWorkspace.tsx`

Ler o query param `queue=unassigned`. Quando presente, filtrar rooms para mostrar apenas `attendant_id === null`. Badge do workspace principal (`totalActiveChats`) deve incluir os nao atribuidos.

---

## 2. Contagem Correta de Chats

**Arquivo:** `src/contexts/SidebarDataContext.tsx`

A contagem de cada atendente (`active_count`) ja conta rooms com status `active` ou `waiting` atribuidos a ele. O `totalActiveChats` soma todos. O problema e que o `totalActiveChats` nao inclui rooms sem atendente.

Correcao: `totalActiveChats = soma de active_count de todos + unassignedCount`.

---

## 3. Parar de Recarregar ao Trocar de Aba

**Arquivo:** `src/hooks/useChatRealtime.ts` (funcao `useChatRooms`)

O primeiro `fetchRooms(true)` mostra loading apenas no mount. Mas o `useEffect` que chama `fetchRooms` tem `ownerUserId` como dependencia e esse valor pode mudar quando o componente remonta ao trocar de aba/rota.

Correcao:
- Usar um `ref` para rastrear se ja fez o primeiro fetch (`initialFetchDone`)
- `fetchRooms(true)` apenas na primeira vez; nas subsequentes, `fetchRooms(false)` para atualizar sem spinner

```typescript
const initialFetchRef = useRef(false);

useEffect(() => {
  if (!ownerUserId) return;
  const showLoading = !initialFetchRef.current;
  initialFetchRef.current = true;
  fetchRooms(showLoading);
  // ... subscribe ...
}, [ownerUserId, fetchRooms, fetchSingleRoom]);
```

Porem o componente `AdminWorkspace` esta dentro do `SidebarLayout` que remonta ao navegar. A solucao real e: se `rooms` ja tem dados (do cache Realtime), nao mostrar loading.

Ajuste simples: mudar `setLoading` para so mostrar loading se rooms estiver vazio:

```typescript
if (showLoading && rooms.length === 0) setLoading(true);
```

Como o estado e local ao hook e o hook remonta, a abordagem com `initialFetchRef` resolve. Mas como o componente desmonta e remonta, o ref se perde. Alternativa: verificar `rooms.length === 0` antes de setar loading.

---

## 4. Imagens no Widget Abrem em Nova Aba

**Arquivo:** `src/pages/ChatWidget.tsx`

Atualmente o `renderFileMessage` abre um lightbox (`setLightboxUrl`) ao clicar na imagem. Dentro de um iframe pequeno, isso e ruim.

Correcao: em vez de lightbox, abrir a imagem em nova aba com `window.open(url, '_blank')`:

```typescript
// De:
onClick={() => setLightboxUrl(meta.file_url!)}
// Para:
onClick={() => window.open(meta.file_url!, '_blank', 'noopener,noreferrer')}
```

Remover o Dialog de lightbox do widget ja que nao sera mais usado.

---

## 5. Citacoes no Widget com Formato Visual

**Arquivo:** `src/pages/ChatWidget.tsx`

Atualmente as mensagens do atendente que contêm citacoes (`> texto original\n\nresposta`) sao renderizadas como texto puro com `<p>{msg.content}</p>`.

Correcao: aplicar a mesma logica de parsing de citacoes que ja existe no `ChatMessageList.tsx` (linhas 105-118):

```typescript
// No loop de renderizacao de mensagens do widget:
const hasQuote = msg.content.startsWith("> ");
let quoteText = "";
let mainContent = msg.content;
if (hasQuote) {
  const lines = msg.content.split("\n");
  const quoteLines: string[] = [];
  let i = 0;
  while (i < lines.length && lines[i].startsWith("> ")) {
    quoteLines.push(lines[i].slice(2));
    i++;
  }
  if (i < lines.length && lines[i].trim() === "") i++;
  quoteText = quoteLines.join("\n");
  mainContent = lines.slice(i).join("\n");
}
```

E no JSX, renderizar o bloco de citacao com estilo visual:

```tsx
{hasQuote && quoteText && (
  <div className="text-[11px] rounded px-2 py-1 mb-1 border-l-2 bg-black/5 border-white/30 opacity-70">
    {quoteText}
  </div>
)}
<p>{mainContent || msg.content}</p>
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---|---|
| `src/contexts/SidebarDataContext.tsx` | Adicionar `unassignedCount` ao contexto; contar rooms sem attendant; patches Realtime |
| `src/components/AppSidebar.tsx` | Adicionar item "Nao Atribuido" com badge no submenu Workspace |
| `src/pages/AdminWorkspace.tsx` | Filtrar por `queue=unassigned`; ajustar filteredRooms |
| `src/hooks/useChatRealtime.ts` | Evitar loading spinner se rooms ja carregados |
| `src/pages/ChatWidget.tsx` | Imagens abrem em nova aba; citacoes com formato visual |

Nenhuma migracao de banco necessaria.
