
# Runtime de Atribuição Automática — Implementação Completa

## Diagnóstico do Estado Atual

### Fluxo atual de criação de sala
Existem **dois pontos** onde uma `chat_room` é criada com `status: 'waiting'`:

1. **Widget com visitante anônimo** (`ChatWidget.tsx` → `handleStartChat`): insere diretamente na `chat_rooms` via SDK client com `owner_user_id = "00000000..."`.
2. **Widget com visitante resolvido** (`ChatWidget.tsx` → `createLinkedRoom` → `handleNewChat`): também insere diretamente com `contact_id` e `company_contact_id` vindos da URL.
3. **`resolve-chat-visitor` edge function**: apenas resolve/cria o visitor e retorna tokens — NÃO cria a sala. A sala é criada pelo widget no client.

### Dados disponíveis para roteamento
- `chat_rooms.contact_id` → `contacts.service_category_id` → `chat_category_teams.category_id`
- `chat_category_teams.id` → `chat_assignment_configs` (toda a configuração de atribuição)
- `chat_assignment_configs.category_team_id` → `chat_team_members.team_id` → `attendant_profiles`
- `contacts.service_priority` → 'normal' | 'alta' | 'crítica' (para `priority_bypass`)
- `attendant_profiles.status` → 'online' | 'offline'
- `attendant_profiles.active_conversations`, `max_conversations`
- `attendant_profiles.skill_level` → 'junior' | 'pleno' | 'senior'
- `chat_assignment_configs.rr_last_attendant_id` → ponteiro do Round Robin

### Ponto de intervenção: Database Trigger
A melhor forma de aplicar o roteamento é um **trigger PostgreSQL** no `INSERT` em `chat_rooms`. Isso garante que qualquer inserção — seja pelo widget client, seja por edge functions futuras — dispare o roteamento automaticamente, sem depender de modificar múltiplos callers.

O trigger chama uma função PL/pgSQL `assign_chat_room()` com acesso a service role (SECURITY DEFINER), que implementa toda a lógica de seleção de atendente.

---

## Arquitetura da Solução

```text
INSERT INTO chat_rooms (visitor_id, contact_id, status='waiting', ...)
         │
         ▼
   TRIGGER: after_chat_room_insert
         │
         ▼
   FUNCTION: assign_chat_room() [SECURITY DEFINER]
         │
   1. contact_id → contacts.service_category_id
   2. category_id → chat_category_teams (pode ter 1 ou N times)
   3. Para cada category_team → chat_assignment_configs
   4. Se enabled = false → skip (sala fica waiting, atendentes pegam manualmente)
   5. Se enabled = true → executar algoritmo de seleção:
         │
         ├── Filtrar elegíveis: team_members WHERE attendant.status = 'online'
         │                      AND (active_conversations < capacity_limit OR allow_over_capacity)
         │
         ├── Se priority_bypass E contact.service_priority IN ('alta','critica')
         │     → Ordenar: senior first (se advanced_prefer_senior), depois least_busy
         │
         ├── Se model = 'round_robin' → pegar próximo após rr_last_attendant_id
         │
         └── Se model = 'least_busy' → ordenar por active_conversations ASC
         │
   6. Se elegível encontrado:
         └── UPDATE chat_rooms SET attendant_id=?, status='active', assigned_at=now()
             UPDATE attendant_profiles SET active_conversations = active_conversations + 1
             UPDATE chat_assignment_configs SET rr_last_attendant_id = ?
   7. Se nenhum elegível (fallback):
         └── fallback_mode = 'queue_unassigned' → sala fica waiting (nenhum update)
             fallback_mode = 'fallback_team' → repete lógica para fallback_team_id
```

---

## Parte 1 — Migração SQL (Trigger + Função)

### Função `assign_chat_room()`

```sql
CREATE OR REPLACE FUNCTION public.assign_chat_room()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contact          RECORD;
  v_cat_team         RECORD;
  v_config           RECORD;
  v_eligible         RECORD;
  v_attendant        RECORD;
  v_is_priority      boolean := false;
  v_assigned         boolean := false;
  v_fallback_team_id uuid;
BEGIN
  -- Only process new 'waiting' rooms
  IF NEW.status != 'waiting' THEN RETURN NEW; END IF;
  IF NEW.contact_id IS NULL THEN RETURN NEW; END IF;

  -- 1. Fetch contact for category and priority
  SELECT service_category_id, service_priority
  INTO v_contact
  FROM contacts WHERE id = NEW.contact_id;

  IF NOT FOUND OR v_contact.service_category_id IS NULL THEN RETURN NEW; END IF;

  v_is_priority := v_contact.service_priority IN ('alta', 'critica');

  -- 2. Find category_team links for this category
  FOR v_cat_team IN
    SELECT id, team_id FROM chat_category_teams
    WHERE category_id = v_contact.service_category_id
    ORDER BY priority_order ASC
  LOOP
    -- 3. Get assignment config for this category_team link
    SELECT * INTO v_config
    FROM chat_assignment_configs
    WHERE category_team_id = v_cat_team.id;

    IF NOT FOUND OR NOT v_config.enabled THEN CONTINUE; END IF;

    -- 4. Build eligible attendants list
    -- Select from this team, applying online + capacity filters
    SELECT ap.id, ap.active_conversations, ap.skill_level, ap.user_id
    INTO v_eligible
    FROM attendant_profiles ap
    JOIN chat_team_members ctm ON ctm.attendant_id = ap.id
    WHERE ctm.team_id = v_cat_team.team_id
      AND (NOT v_config.online_only OR ap.status = 'online')
      AND (v_config.allow_over_capacity OR ap.active_conversations < v_config.capacity_limit)
      AND (
        -- Round Robin: prefer after last assigned
        (v_config.model = 'round_robin' AND (
          v_config.rr_last_attendant_id IS NULL
          OR ap.id > v_config.rr_last_attendant_id
        ))
        OR v_config.model = 'least_busy'
        OR (v_is_priority AND v_config.priority_bypass)
      )
    ORDER BY
      -- Priority bypass + prefer senior: senior first
      CASE WHEN v_is_priority AND v_config.priority_bypass AND v_config.advanced_prefer_senior
        THEN CASE ap.skill_level WHEN 'senior' THEN 0 WHEN 'pleno' THEN 1 ELSE 2 END
        ELSE 0
      END ASC,
      -- Least Busy: fewer active chats first
      CASE WHEN v_config.model = 'least_busy' THEN ap.active_conversations ELSE 0 END ASC,
      -- Round Robin: circular order
      CASE WHEN v_config.model = 'round_robin' THEN ap.id ELSE ap.id END ASC
    LIMIT 1;

    -- If Round Robin found nothing after the pointer, wrap around
    IF NOT FOUND AND v_config.model = 'round_robin' AND v_config.rr_last_attendant_id IS NOT NULL THEN
      SELECT ap.id, ap.active_conversations, ap.skill_level, ap.user_id
      INTO v_eligible
      FROM attendant_profiles ap
      JOIN chat_team_members ctm ON ctm.attendant_id = ap.id
      WHERE ctm.team_id = v_cat_team.team_id
        AND (NOT v_config.online_only OR ap.status = 'online')
        AND (v_config.allow_over_capacity OR ap.active_conversations < v_config.capacity_limit)
      ORDER BY ap.id ASC
      LIMIT 1;
    END IF;

    IF FOUND THEN
      -- 5. Assign the room
      NEW.attendant_id := v_eligible.id;
      NEW.status := 'active';
      NEW.assigned_at := now();

      -- 6. Update attendant active_conversations
      UPDATE attendant_profiles
      SET active_conversations = active_conversations + 1, updated_at = now()
      WHERE id = v_eligible.id;

      -- 7. Update Round Robin pointer
      UPDATE chat_assignment_configs
      SET rr_last_attendant_id = v_eligible.id, updated_at = now()
      WHERE id = v_config.id;

      v_assigned := true;
      EXIT; -- Stop after first successful assignment
    END IF;

    -- 8. Fallback: if no eligible in primary team, try fallback team
    IF NOT v_assigned AND v_config.fallback_mode = 'fallback_team' AND v_config.fallback_team_id IS NOT NULL THEN
      SELECT ap.id, ap.active_conversations, ap.skill_level
      INTO v_eligible
      FROM attendant_profiles ap
      JOIN chat_team_members ctm ON ctm.attendant_id = ap.id
      WHERE ctm.team_id = v_config.fallback_team_id
        AND ap.status = 'online'
        AND ap.active_conversations < v_config.capacity_limit
      ORDER BY ap.active_conversations ASC
      LIMIT 1;

      IF FOUND THEN
        NEW.attendant_id := v_eligible.id;
        NEW.status := 'active';
        NEW.assigned_at := now();
        UPDATE attendant_profiles
        SET active_conversations = active_conversations + 1, updated_at = now()
        WHERE id = v_eligible.id;
        v_assigned := true;
        EXIT;
      END IF;
    END IF;

  END LOOP;

  RETURN NEW;
END;
$$;
```

### Trigger

```sql
CREATE TRIGGER trg_assign_chat_room
  BEFORE INSERT ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_chat_room();
```

### Trigger para decrementar `active_conversations` ao fechar sala

```sql
CREATE OR REPLACE FUNCTION public.decrement_attendant_active_conversations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status != 'closed' AND OLD.attendant_id IS NOT NULL THEN
    UPDATE attendant_profiles
    SET active_conversations = GREATEST(0, active_conversations - 1),
        updated_at = now()
    WHERE id = OLD.attendant_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decrement_attendant_on_close
  AFTER UPDATE ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_attendant_active_conversations();
```

---

## Parte 2 — Nova Edge Function `assign-chat-room`

Além do trigger (que cobre o caso principal), criamos uma **edge function** `assign-chat-room` para:
- Ser chamada pelo widget imediatamente após criar a sala (para obter o resultado em tempo real)
- Casos em que o trigger não se aplica (ex: room criada via API externa)
- Futuro: reatribuição por timeout

A edge function recebe `{ room_id }`, lê a sala recém-criada e retorna se foi atribuída ou ficou em fila.

**Por que edge function E trigger?**
- O trigger garante consistência mesmo se o widget falhar em chamar a edge function
- A edge function permite retorno em tempo real para o widget mostrar ao visitante ("aguardando atendente" ou "conectado")

---

## Parte 3 — Adaptação do `ChatWidget.tsx`

### Exibir mensagem de fila quando `allow_over_capacity = false` e não houver elegíveis

Após criar a sala, o widget já ouve `UPDATE` no `chat_rooms` via Realtime. Se o status ainda for `waiting` após ~2 segundos, exibir na tela de "waiting":
```
"Todos os atendentes estão ocupados no momento. Você está na fila e será atendido em breve."
```

Isso é implementado com um state `allBusy` que é ativado se o room update não chegar em 5 segundos.

### Atualizar `createLinkedRoom` para incluir `priority`

O widget resolvido já passa `contact_id`, que o trigger usa para buscar prioridade automaticamente. Nenhuma mudança adicional necessária no widget.

---

## Parte 4 — Arquivos a Criar/Modificar

| Arquivo | Ação | Conteúdo |
|---|---|---|
| `supabase/migrations/[timestamp]_auto_assign_trigger.sql` | CRIAR | Função `assign_chat_room()` + trigger BEFORE INSERT + função `decrement_attendant_active_conversations()` + trigger AFTER UPDATE |
| `supabase/functions/assign-chat-room/index.ts` | CRIAR | Edge function que recebe `room_id`, lê estado atual, executa mesma lógica de atribuição e retorna `{ assigned: bool, attendant_name?: string }` |
| `supabase/config.toml` | MODIFICAR | Adicionar `[functions.assign-chat-room] verify_jwt = false` |
| `src/pages/ChatWidget.tsx` | MODIFICAR | Após criar sala (waiting), chamar `assign-chat-room` e exibir banner "na fila" se `assigned = false` |

---

## Detalhes Técnicos Importantes

### Por que BEFORE INSERT (não AFTER)?
Com `BEFORE INSERT`, modificamos `NEW.attendant_id`, `NEW.status` e `NEW.assigned_at` antes de persistir — evitando um segundo UPDATE e eliminando o race condition entre o INSERT e o UPDATE. A sala já nasce com status `active` se houver atendente disponível.

### Round Robin com wrap-around
O ponteiro `rr_last_attendant_id` guarda o UUID do último atendente atribuído. O algoritmo:
1. Busca atendentes com `id > rr_last_attendant_id` (ordenados por UUID, que é determinístico)
2. Se não encontrar (chegou ao fim da lista), recomeça do início com `id` menor — wrap-around completo

### Decremento de `active_conversations`
O trigger `AFTER UPDATE` em `chat_rooms` detecta a transição `status != 'closed' → status = 'closed'` e decrementa o contador do atendente. Isso mantém o contador sempre atualizado para o algoritmo Least Busy.

### Fallback para time secundário
Apenas Least Busy é usado no fallback team (mais simples, o time de fallback não tem configuração própria para esse contexto).

### Compatibilidade com fluxo atual
- Salas sem `contact_id` (visitantes anônimos): o trigger retorna `NEW` sem modificar → comportamento atual preservado
- Salas com `contact_id` mas sem `service_category_id`: idem
- Categoria com configs `enabled = false`: idem
- Tudo funciona exatamente como hoje para qualquer caso não coberto pelas novas regras

---

## Resumo de Arquivos

- **1 migração SQL** com 2 funções + 2 triggers
- **1 nova edge function** `assign-chat-room` (status check + fallback visual para widget)
- **1 modificação** em `ChatWidget.tsx` (banner "na fila" + chamada à edge function)
- **1 linha** em `supabase/config.toml`
