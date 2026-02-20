
# Teste End-to-End: Diagnóstico e Plano de Correções

## Resultado do Diagnóstico

Após análise completa de todos os arquivos, banco de dados e lógica de runtime, foram identificados **3 bugs críticos** e **4 melhorias** importantes.

---

## Bug 1 — CRÍTICO: Widget não consegue ler as configurações de exibição

**Problema:** A tabela `chat_settings` tem RLS habilitada com apenas uma política: `"Tenant members manage chat settings"` que exige `auth.uid()`. Visitantes do widget são **anônimos** (sem autenticação), então toda leitura de `chat_settings` retorna vazio. O estado `widgetConfig` nunca é preenchido — todos os toggles e textos personalizados configurados pelo admin são **ignorados em produção**.

**Evidência:**
- `pg_policies` confirma: única política é `cmd=ALL`, sem SELECT público
- Widget faz `.from("chat_settings").eq("user_id", ownerUserId)` como usuário anônimo → retorna 0 linhas

**Correção:** Adicionar uma política SELECT pública que permite leitura por `user_id` (não expõe dados sensíveis — apenas configurações visuais):
```sql
CREATE POLICY "Public can read widget config by user_id"
ON public.chat_settings FOR SELECT
USING (true);
```
Como alternativa mais restrita (por segurança, esconder o `welcome_message` e configs internas):
```sql
CREATE POLICY "Public can read widget display config"
ON public.chat_settings FOR SELECT
USING (true);
```

---

## Bug 2 — CRÍTICO: Trigger `assign_chat_room()` referencia coluna inexistente

**Problema:** A função SQL `assign_chat_room()` busca horários de atendimento assim:
```sql
WHERE owner_user_id = NEW.owner_user_id
```
Porém a tabela `chat_business_hours` **não possui a coluna `owner_user_id`** — as colunas são: `id, user_id, day_of_week, start_time, end_time, is_active, created_at, tenant_id`.

**Por que não quebrou ainda:** A tabela `chat_business_hours` está vazia (nenhum horário salvo). Quando a consulta `SELECT EXISTS(...)` roda com uma coluna inexistente, o PostgreSQL lança um erro de compilação — mas **só executa ao encontrar a primeira row**. Com tabela vazia o EXISTS retorna false sem checar as colunas. Assim que o admin salvar qualquer horário de atendimento, o trigger vai quebrar com `ERROR: column "owner_user_id" does not exist`.

**Correção:** Atualizar a função para usar `tenant_id`:
```sql
WHERE tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = NEW.owner_user_id LIMIT 1)
```
(A segunda condição já usa `tenant_id` corretamente; só a primeira `OR owner_user_id = ...` está errada)

---

## Bug 3 — MODERADO: Campo `widget_company_name` não persiste

**Problema:** O estado do `AdminSettings.tsx` inclui `widget_company_name`, e o UI permite editar o nome da empresa. Mas essa coluna **não existe na tabela `chat_settings`**. O campo é enviado no payload de `handleSaveGeneral` mas descartado pelo banco. Ao recarregar a página, o nome volta vazio.

**Evidência:** `SELECT column_name FROM information_schema.columns WHERE table_name = 'chat_settings' AND column_name LIKE '%company%'` → retorna 0 linhas.

**Correção:** Adicionar a coluna:
```sql
ALTER TABLE public.chat_settings
  ADD COLUMN IF NOT EXISTS widget_company_name text DEFAULT '';
```
E incluir no fetchAll:
```typescript
widget_company_name: s.widget_company_name ?? "",
```

---

## Bug 4 — MENOR: Realtime não atualiza status do atendente no sidebar

**Problema:** O sidebar ouve `chat_rooms` via Realtime para atualizar contadores, mas **não ouve `attendant_profiles`**. Quando um atendente muda o status (Online/Offline) em "Meu Perfil", o indicador colorido no sidebar de outros usuários só atualiza no próximo reload ou quando uma sala muda de status.

**Correção:** Adicionar canal Realtime para `attendant_profiles` no `fetchCounts` do sidebar:
```typescript
supabase.channel("sidebar-attendants")
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "attendant_profiles" }, () => fetchCounts())
  .subscribe();
```

---

## Melhorias Sugeridas

### Melhoria 1 — Auto-assign: configuração ausente precisa de aviso no UI

**Problema:** O fluxo de atribuição automática requer que a categoria do contato tenha um time vinculado com config habilitada (`chat_assignment_configs.enabled = true`). O diagnóstico mostrou que a única categoria_team existente tem `enabled = NULL` — nunca foi configurada. O admin não tem nenhum aviso sobre isso.

**Melhoria:** Na aba Categorias (`CategoriesTab.tsx`) ou Regras de Atendimento (`AssignmentConfigPanel`), exibir um badge "⚠ Sem config de atribuição" nas categorias que têm times mas nenhum `assignment_config` habilitado.

### Melhoria 2 — Indicador visual "Fora do horário" nas configurações

**Problema:** Na aba "Horários", o admin não tem feedback do horário atual vs. configurado. Não sabe se "agora" está dentro do horário ativo.

**Melhoria:** Mostrar no topo da aba um badge dinâmico: "● Agora: dentro do horário de atendimento" ou "● Agora: FORA do horário" calculado no browser, sem fetch adicional.

### Melhoria 3 — Preview do widget mostra apenas formulário; deveria mostrar também o banner de "fora do horário"

**Problema:** O `WidgetPreview.tsx` mostra apenas o estado do formulário inicial. Não há como o admin visualizar como ficará o banner de "fora do horário" ou "atendentes ocupados" com os textos personalizados.

**Melhoria:** Adicionar tabs no preview: "Formulário" / "Fora do horário" / "Atendentes ocupados", cada um mostrando o respectivo estado com as mensagens configuradas ao vivo.

### Melhoria 4 — Contagem de conversas ativas desincronizada

**Problema:** O campo `attendant_profiles.active_conversations` é gerenciado pelos triggers (incrementa no INSERT, decrementa no CLOSE). Mas se uma sala for deletada diretamente (sem passar por `status = 'closed'`), o contador não é decrementado.

**Melhoria:** Adicionar trigger `AFTER DELETE` em `chat_rooms` para decrementar o contador se a sala tinha um `attendant_id`.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | O que muda |
|---|---|---|
| `supabase/migrations/[timestamp].sql` | CRIAR | 1) Policy SELECT pública em `chat_settings`; 2) Corrigir `assign_chat_room()` — remover `owner_user_id`, usar apenas `tenant_id`; 3) Adicionar coluna `widget_company_name` em `chat_settings`; 4) Trigger `AFTER DELETE` para decrementar `active_conversations` |
| `src/pages/AdminSettings.tsx` | MODIFICAR | Incluir `widget_company_name` no fetch (`fetchAll`) para carregar do banco corretamente |
| `src/components/AppSidebar.tsx` | MODIFICAR | Adicionar canal Realtime para `attendant_profiles` ao lado do canal de `chat_rooms` |
| `src/pages/AdminSettings.tsx` | MODIFICAR | Adicionar indicador de horário atual na aba "Horários" |
| `src/components/chat/WidgetPreview.tsx` | MODIFICAR | Adicionar tabs de preview: Formulário / Fora do horário / Ocupado |

---

## Prioridade de Execução

1. **Bug 1 + Bug 2 + Bug 3** em uma única migração SQL — são os que impactam o funcionamento real em produção
2. **Melhoria de Realtime no sidebar** — low-risk, alto benefício UX
3. **Preview com múltiplos estados** — melhoria de DX para o admin
4. **Indicador de horário atual** — melhoria de UX menor

---

## Resumo dos Bugs por Impacto

| ID | Tipo | Impacto | Status atual |
|---|---|---|---|
| Bug 1 | RLS faltando | Widget nunca aplica configs personalizadas | Silencioso — admin não percebe |
| Bug 2 | SQL inválido | Trigger quebra quando admin salvar horários | Latente — escondido por tabela vazia |
| Bug 3 | Coluna faltando | Nome da empresa não persiste | Visível — campo sempre volta vazio |
| Bug 4 | Realtime ausente | Status desatualizado no sidebar | UX menor |
