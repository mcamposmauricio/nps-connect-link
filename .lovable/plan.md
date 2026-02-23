
# Fix: Widget Nao Recebe Chat Proativo -- Visitantes Duplicados

## Causa Raiz

Existem **duas fontes que criam visitantes** para o mesmo contato, e elas nao se sincronizam:

1. **`resolve-chat-visitor`** (edge function): Busca visitante por `company_contact_id`, cria um novo se nao existe, mas **nao atualiza** `company_contacts.chat_visitor_id`
2. **`ProactiveChatDialog`** (frontend): Busca visitante por `company_contacts.chat_visitor_id`, cria um novo se nao existe

Resultado: visitantes duplicados com IDs diferentes para o mesmo contato. O widget se inscreve no Realtime com o `visitor_id` de um, mas o chat proativo cria a sala com o `visitor_id` de outro. O filtro `visitor_id=eq.X` nao bate, e o widget nunca recebe a notificacao.

O banco ja tem **dezenas de visitantes duplicados** confirmando o problema.

## Alteracoes

### 1. `supabase/functions/resolve-chat-visitor/index.ts`

Ao criar um novo visitante (linha 104-114), atualizar tambem `company_contacts.chat_visitor_id` para manter o vinculo bidirecional:

```typescript
// Apos criar o novo visitor (linha 114), adicionar:
await supabase
  .from("company_contacts")
  .update({ chat_visitor_id: newVisitor.id })
  .eq("id", companyContact.id);
```

### 2. `src/components/chat/ProactiveChatDialog.tsx`

Alterar a logica de busca do visitante existente (linhas 68-101) para tambem procurar por `company_contact_id` na tabela `chat_visitors`, nao apenas por `chat_visitor_id` do contato. Isso garante que, se `resolve-chat-visitor` ja criou um visitante, ele sera reutilizado:

```typescript
// Antes de criar um novo visitor, tentar buscar por company_contact_id
if (!visitorId) {
  const { data: byContact } = await supabase
    .from("chat_visitors")
    .select("id")
    .eq("company_contact_id", contact.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byContact) {
    visitorId = byContact.id;
    // Sincronizar o link no contato
    await supabase
      .from("company_contacts")
      .update({ chat_visitor_id: visitorId })
      .eq("id", contact.id);
  }
}
```

### 3. Limpeza de dados: Migracao SQL

Limpar visitantes duplicados no banco, mantendo apenas o mais recente por `company_contact_id` e atualizando `company_contacts.chat_visitor_id`:

```sql
-- Atualizar company_contacts.chat_visitor_id para o visitante mais recente
WITH latest_visitors AS (
  SELECT DISTINCT ON (company_contact_id) id, company_contact_id
  FROM chat_visitors
  WHERE company_contact_id IS NOT NULL
  ORDER BY company_contact_id, created_at DESC
)
UPDATE company_contacts cc
SET chat_visitor_id = lv.id
FROM latest_visitors lv
WHERE cc.id = lv.company_contact_id;

-- Deletar visitantes duplicados (manter apenas o mais recente por company_contact_id)
DELETE FROM chat_visitors
WHERE company_contact_id IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (company_contact_id) id
    FROM chat_visitors
    WHERE company_contact_id IS NOT NULL
    ORDER BY company_contact_id, created_at DESC
  );
```

## Fluxo Corrigido

```text
1. Usuario abre pagina externa com widget
2. resolve-chat-visitor encontra/cria visitor (id=AAA)
   -> Atualiza company_contacts.chat_visitor_id = AAA
3. Widget se inscreve em Realtime: visitor_id=eq.AAA

4. Atendente abre ProactiveChatDialog
5. Busca contact.chat_visitor_id -> encontra AAA (ja sincronizado)
   OU busca chat_visitors por company_contact_id -> encontra AAA
6. Cria sala com visitor_id = AAA
7. Widget recebe INSERT via Realtime -> abre o chat automaticamente
```

## Arquivos Modificados

1. `supabase/functions/resolve-chat-visitor/index.ts` -- atualizar `chat_visitor_id` ao criar visitor
2. `src/components/chat/ProactiveChatDialog.tsx` -- busca fallback por `company_contact_id`
3. Migracao SQL -- limpeza de duplicatas e sincronizacao
