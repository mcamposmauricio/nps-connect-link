

# Fixar Layout Full-Height e Paginacao de Mensagens no Widget

## Problema

1. O Card do widget ainda encolhe quando tem pouco conteudo - precisa SEMPRE preencher 100% do iframe/container
2. Com muitas mensagens, o scroll e no componente todo (empurra input pra baixo) em vez de ser apenas na lista de mensagens
3. Sem paginacao: todas as mensagens sao carregadas de uma vez

## Solucao

### 1. Forcar Card a ocupar 100% da altura

O Card hoje usa `flex-1` no embed mas nao tem `h-full`. No modo standalone, usa `height: 600px` que funciona. No embed, precisa garantir `height: 100%` no style alem do `flex-1`.

### 2. Body div precisa de `overflow: hidden` e conteudo interno com scroll

O problema principal: o body div (linha 504) tem `overflow-auto` o que faz TODO o conteudo do body scrollar (form, history, waiting, mensagens). A solucao:

- Body div: `flex-1 min-h-0 overflow-hidden flex flex-col` (sem scroll proprio)
- Dentro do body, cada secao que precisa de scroll (mensagens, historico) tera seu proprio container com `flex-1 overflow-y-auto min-h-0`
- Secoes que nao precisam de scroll (form, waiting) usam `flex-1` para centralizar

### 3. Paginacao de mensagens (top 10 + carregar mais)

- Carregar apenas as 10 mensagens mais recentes inicialmente
- Mostrar botao "Carregar anteriores" no topo da lista de mensagens
- Ao clicar, carregar mais 10 mensagens anteriores (prepend na lista)
- Manter scroll position apos carregar mais
- Mensagens em tempo real continuam sendo adicionadas ao final normalmente

## Mudancas em `src/pages/ChatWidget.tsx`

### Estado e logica de paginacao

Adicionar constante `PAGE_SIZE = 10` e estados:
- `hasMoreMessages: boolean` - indica se ha mais mensagens para carregar
- `loadingMore: boolean` - loading do "carregar mais"

Refatorar `fetchMessages` para usar `.range()` e ordenar desc, depois reverter:
```typescript
const PAGE_SIZE = 10;

const fetchMessages = async (before?: string) => {
  let query = supabase
    .from("chat_messages")
    .select("id, content, sender_type, sender_name, created_at, message_type, metadata")
    .eq("room_id", roomId)
    .eq("is_internal", false)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1); // +1 para saber se tem mais

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data } = await query;
  const items = (data as ChatMsg[]) ?? [];
  const hasMore = items.length > PAGE_SIZE;
  if (hasMore) items.pop(); // remove o extra
  items.reverse(); // mais antigas primeiro

  if (before) {
    setMessages(prev => [...items, ...prev]);
  } else {
    setMessages(items);
  }
  setHasMoreMessages(hasMore);
};
```

Funcao `loadMore`:
```typescript
const loadMore = async () => {
  if (messages.length === 0 || loadingMore) return;
  setLoadingMore(true);
  await fetchMessages(messages[0].created_at);
  setLoadingMore(false);
};
```

### Reestruturar layout do body

**De:**
```tsx
<div className="flex-1 overflow-auto p-4 min-h-0" ref={scrollRef}>
  {/* form, history, waiting, messages - tudo junto */}
</div>
```

**Para:**
```tsx
<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
  {phase === "form" && (
    <div className="flex-1 overflow-y-auto p-4">
      {/* formulario */}
    </div>
  )}

  {phase === "history" && (
    <div className="flex-1 overflow-y-auto p-4 min-h-0">
      {/* historico com scroll */}
    </div>
  )}

  {phase === "waiting" && (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      {/* centralizado sem scroll */}
    </div>
  )}

  {(phase === "chat" || phase === "csat" || phase === "closed" || phase === "viewTranscript") && (
    <div className="flex-1 overflow-y-auto p-4 min-h-0" ref={scrollRef}>
      {/* Botao carregar mais */}
      {hasMoreMessages && phase !== "viewTranscript" && (
        <button onClick={loadMore} className="w-full text-xs text-primary mb-3">
          {loadingMore ? <Loader2 /> : "Carregar anteriores"}
        </button>
      )}
      {/* mensagens */}
    </div>
  )}
</div>
```

### Garantir Card height 100% no embed

```tsx
style={isEmbed ? { width: "100%", height: "100%", minHeight: 0 } : { ... }}
```

## Arquivos Modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/pages/ChatWidget.tsx` | Layout full-height, scroll isolado por secao, paginacao de mensagens com "carregar anteriores" |

