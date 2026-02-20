

# Lógica de Horário de Atendimento + Status Online/Offline do Atendente

## Diagnóstico do Estado Atual

### O que já existe
- `chat_business_hours`: tabela com horários por dia da semana (start_time, end_time, is_active), já editável na aba "Horários" de AdminSettings — mas **não está integrada a nenhuma lógica de runtime**
- `attendant_profiles.status`: coluna `text` com default `'offline'` — existe no banco, mas **nunca é atualizada pela UI**; todos os atendentes estão como `offline` no banco
- `attendant_profiles.skill_level`: coluna já criada, igualmente sem UI para editar
- `assign_chat_room()` trigger: já respeita `online_only` e filtra por `status = 'online'` — se ninguém estiver online, nenhum chat é atribuído automaticamente
- `AttendantsTab.tsx`: mostra atendentes mas **não exibe nem permite mudar status/skill_level**
- `MyProfile.tsx`: permite editar nome, telefone, departamento, especialidades — mas **não tem campo de status do chat**
- `AppSidebar.tsx`: footer com link para /profile mas sem indicador de status de chat

### O que falta (o que o usuário pediu)
1. **Horário de atendimento integrado ao runtime**: o widget deve mostrar mensagem offline/fora do horário quando nenhum dia ativo está no horário atual
2. **Status online/offline do atendente na UI**:
   - O próprio atendente pode mudar seu status em "Meu Perfil" (`/profile`)
   - O admin pode mudar o status de qualquer atendente na aba "Atendentes" das configurações de chat
3. **Outras configurações pertinentes do atendente** (admin pode configurar via aba Atendentes): skill_level (Junior/Pleno/Sênior), capacidade máxima
4. O **assign-chat-room** e o **trigger** já respeitam o status — o que falta é a UI para definir esse status

---

## Arquitetura da Solução

```text
RUNTIME (quando novo chat entra via trigger assign_chat_room):
  1. Verificar business hours → fora do horário? → chat fica em waiting + sinaliza "offline"
  2. Verificar attendant.status = 'online' → trigger já faz isso
  3. assign-chat-room edge function → já retorna all_busy / assigned

UI CHANGES:
  A. MyProfile (/profile)                → card "Status de Atendimento" se isChatEnabled
  B. AttendantsTab (AdminSettings)       → mostrar + editar status, skill_level, max_conversations por atendente
  C. assign-chat-room edge function      → adicionar check de business hours (retornar outside_hours)
  D. ChatWidget.tsx                      → mostrar banner "fora do horário" quando outside_hours = true
  E. assign_chat_room() SQL trigger      → adicionar check de business hours antes de tentar atribuir
```

---

## Parte 1 — Migração SQL: Business Hours no Trigger

O trigger `assign_chat_room()` atual não verifica business hours. É preciso adicionar essa checagem **antes** de tentar atribuir:

```sql
-- Dentro de assign_chat_room(), após verificar contact_id:
-- Checar se está dentro do horário de atendimento do tenant
DECLARE
  v_now_dow integer;
  v_now_time time;
  v_bh_active boolean;

BEGIN
  v_now_dow := extract(dow from now() AT TIME ZONE 'America/Sao_Paulo')::integer;
  v_now_time := (now() AT TIME ZONE 'America/Sao_Paulo')::time;

  SELECT is_active INTO v_bh_active
  FROM public.chat_business_hours
  WHERE day_of_week = v_now_dow
    AND is_active = true
    AND start_time::time <= v_now_time
    AND end_time::time >= v_now_time
  LIMIT 1;

  -- Se não há horário ativo agora, sair sem atribuir
  -- (sala fica waiting com status offline implícito)
  IF NOT FOUND OR NOT v_bh_active THEN RETURN NEW; END IF;
  -- ... continua com lógica atual
```

**Importante**: a timezone precisa corresponder à configurada no tenant. Inicialmente usamos `America/Sao_Paulo` como default. Pode ser externalizado depois.

---

## Parte 2 — Edge Function `assign-chat-room`: Adicionar `outside_hours`

A edge function já retorna `{ assigned, all_busy, room_status }`. Adicionamos `outside_hours: boolean`:

```typescript
// Verificar business hours (mesma lógica do trigger, em JS)
const nowSaoPaulo = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
const now = new Date(nowSaoPaulo);
const dow = now.getDay(); // 0=Sun
const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

const { data: bh } = await supabase
  .from("chat_business_hours")
  .select("is_active, start_time, end_time")
  .eq("day_of_week", dow)
  .eq("is_active", true)
  .single();

const outside_hours = !bh || timeStr < bh.start_time || timeStr > bh.end_time;
```

Retorna `{ assigned, all_busy, outside_hours, room_status }`.

---

## Parte 3 — ChatWidget.tsx: Banner "Fora do Horário"

No `checkRoomAssignment`, quando `outside_hours = true`:
- Estado `outsideHours = true` → mostra banner diferente do `allBusy`
- Banner: "Estamos fora do horário de atendimento. Sua mensagem ficará registrada e responderemos assim que voltarmos."

---

## Parte 4 — AttendantsTab.tsx: Status + Skill Level + Capacidade (Admin)

A aba Atendentes atualmente só mostra nome, email, toggle de chat habilitado e times. Adiciona-se por atendente:

### Status Online/Offline
- Indicador colorido (verde = online, cinza = offline, amarelo = ocupado/busy)
- Switch ou Select para mudar status: Online / Ocupado / Offline
- O admin pode mudar diretamente inline no card

### Nível (Skill Level)
- Select inline: Junior / Pleno / Sênior
- Relevante para a regra "Preferir Sênior para empresas prioritárias"

### Capacidade Máxima
- Input numérico para `max_conversations`
- Atualmente o valor está no `csms.chat_max_conversations` mas o trigger usa `attendant_profiles.capacity_limit` configurado em `chat_assignment_configs` — aqui o campo é o `attendant_profiles.max_conversations` que serve de referência
- Editar `max_conversations` no `attendant_profiles`

### Conversas Ativas (read-only)
- Exibir `active_conversations` como contador informativo

Layout por card de atendente quando `is_chat_enabled = true`:
```
[ Nome do Atendente ]          ● Online [toggle]
email@empresa.com
Status: [Online ▾]   Nível: [Pleno ▾]   Cap.: [5]   Ativas: 2
Times: [Time A ×] [Time B ×] [+ Adicionar]
```

---

## Parte 5 — MyProfile.tsx: Card de Status de Atendimento

Mostrar um novo card **somente quando o usuário tem `isChatEnabled = true`** (vindo do AuthContext).

Card "Status de Atendimento":
- Busca `attendant_profiles` pelo `user_id`
- Selector de status com indicador colorido: **Online** / **Ocupado** / **Offline**
  - Online → ativo para receber chats automaticamente
  - Ocupado → visível mas não recebe automático
  - Offline → não aparece para atribuição
- Tooltip explicativo: "Seu status define se você receberá novos chats automaticamente. Atendentes Online são priorizados na fila de atribuição automática."
- Salvar com UPDATE em `attendant_profiles.status`

Indicador visual no header do card:
- Bolinha colorida ao lado do nome/avatar indicando status atual

---

## Parte 6 — Sidebar: Indicador de Status (bonus UX)

No `AppSidebar`, o footer do `myAttendant` pode exibir um indicador de status:

No link "Meu Perfil" do footer, adicionar bolinha colorida baseada no status do `myAttendant` (já carregado em `teamAttendants`):

```tsx
// No footer, ao lado de "Meu Perfil"
<User className="h-4 w-4" />
<span>{t("profile.title")}</span>
{myAttendant && (
  <span className={cn("ml-auto h-2 w-2 rounded-full", 
    myAttendant.status === 'online' ? 'bg-green-500' : 'bg-muted-foreground/40')} />
)}
```

**Nota**: `teamAttendants` já está carregado no sidebar mas não inclui `status`. Será necessário incluir `status` no fetch do sidebar.

---

## Arquivos a Modificar/Criar

| Arquivo | Ação | O que muda |
|---|---|---|
| `supabase/migrations/[timestamp].sql` | CRIAR | Adicionar verificação de business hours no trigger `assign_chat_room()` via `CREATE OR REPLACE FUNCTION` |
| `supabase/functions/assign-chat-room/index.ts` | MODIFICAR | Adicionar check de `chat_business_hours` e retornar `outside_hours` no JSON |
| `src/pages/ChatWidget.tsx` | MODIFICAR | Adicionar estado `outsideHours`, exibir banner específico de "fora do horário" na fase `waiting` |
| `src/components/chat/AttendantsTab.tsx` | MODIFICAR | Adicionar fetch de `attendant_profiles` completo (status, skill_level, max_conversations, active_conversations) e UI inline para editar status, skill_level e max_conversations por atendente |
| `src/pages/MyProfile.tsx` | MODIFICAR | Adicionar card "Status de Atendimento" condicional (só se `isChatEnabled`), com fetch do próprio `attendant_profile` e select de status |
| `src/components/AppSidebar.tsx` | MODIFICAR | Incluir `status` no fetch de `teamAttendants` e exibir indicador colorido de status no link "Meu Perfil" |

---

## Detalhes UX Importantes

### Tratamento de Business Hours sem registros
- Se `chat_business_hours` estiver vazio (nunca configurado), o sistema não deve bloquear os chats — considerar `outside_hours = false` como default seguro
- O banner de "fora do horário" só aparece se houver regras configuradas E o horário atual não bater

### Status "Ocupado" (busy)
- Não existe no banco como valor — adicionamos além de `online/offline` o valor `busy`
- O trigger atual só filtra por `status = 'online'`; `busy` seria tratado como "não elegível para auto-atribuição" mas o atendente ainda pode pegar manualmente

### Permissões
- Admin e quem tem `chat.manage` pode mudar status de outros atendentes (via AttendantsTab)
- Qualquer usuário com `is_chat_enabled` pode mudar o próprio status (via MyProfile)

---

## Resumo de Impacto

- Comportamento atual: **zero impacto** — business hours sem registros = não bloqueia; status continua offline por padrão até ser mudado manualmente
- A atribuição automática do trigger já funcionará com horário assim que tiver registros e atendentes online
- Nenhuma migration destrutiva — apenas `CREATE OR REPLACE FUNCTION` no trigger existente

