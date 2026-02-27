

# Categoria Padrao e Time Padrao por Tenant

## Objetivo

Cada tenant tera automaticamente uma **"Fila Padrao"** (categoria de servico) e um **"Time Padrao"** (time de atendentes) criados como entidades reais no banco e visiveis na UI. Essas entidades nao podem ser excluidas. Empresas sem categoria e atendentes sem time serao vinculados a elas automaticamente.

---

## 1. Migracao de Banco de Dados

Adicionar coluna `is_default boolean NOT NULL DEFAULT false` em ambas as tabelas:

```sql
ALTER TABLE public.chat_service_categories ADD COLUMN is_default boolean NOT NULL DEFAULT false;
ALTER TABLE public.chat_teams ADD COLUMN is_default boolean NOT NULL DEFAULT false;
```

Nenhum dado existente sera alterado -- as entidades padrao serao criadas sob demanda pela UI.

---

## 2. CategoriesTab.tsx -- Auto-criacao da Fila Padrao

No `fetchAll`, apos carregar categorias, incluir `is_default` no select. Se nenhuma categoria com `is_default = true` existir para o tenant, criar automaticamente:

- Nome: "Fila Padrao"
- Cor: `#6B7280` (cinza)
- `is_default: true`

Essa categoria aparecera **sempre no topo** da lista com um badge "Padrao" ao lado do nome. Na UI:

- O botao de **excluir** sera desabilitado para a categoria padrao (com tooltip explicativo)
- O nome pode ser editado normalmente
- O campo `is_default` nunca e alterado pela UI

---

## 3. TeamsTab.tsx -- Auto-criacao do Time Padrao

Mesma logica: no `fetchTeams`, incluir `is_default` no select. Se nenhum time com `is_default = true` existir, criar automaticamente:

- Nome: "Time Padrao"
- `is_default: true`

O time padrao aparece no topo da lista com badge "Padrao". Nao pode ser excluido (botao desabilitado). Nome editavel.

---

## 4. AttendantsTab.tsx -- Atribuicao automatica ao Time Padrao

Quando um atendente e habilitado para chat (`toggleChatEnabled` com `enabled = true`):

1. Aguardar a criacao do `attendant_profile` pelo trigger do banco
2. Verificar se o atendente ja pertence a algum time
3. Se nao pertencer a nenhum, adiciona-lo automaticamente ao time com `is_default = true` do tenant

Isso garante que todo atendente novo ja tenha pelo menos um time associado, tornando-o elegivel para o motor de roteamento desde o inicio.

---

## 5. Roteamento -- Fallback para Categoria Padrao

### DB Function `assign_chat_room`

No trecho onde verifica `v_contact.service_category_id IS NULL` e retorna sem atribuir (linha `IF NOT FOUND OR v_contact.service_category_id IS NULL THEN RETURN NEW; END IF;`):

- Em vez de retornar, buscar a categoria com `is_default = true` e `tenant_id = v_tenant_id`
- Usar o `id` dessa categoria para o roteamento via `chat_category_teams`
- Se nao existir categoria padrao, manter comportamento atual (sala fica em waiting)

### Edge Function `assign-chat-room/index.ts`

Mesma logica: quando `contact.service_category_id` for `null`, buscar a categoria `is_default = true` do tenant da sala e usar para verificar atendentes elegiveis.

---

## 6. Traducoes

### pt-BR.ts
- `chat.categories.default`: "Padrao"
- `chat.categories.defaultQueue`: "Fila Padrao"
- `chat.categories.cannotDeleteDefault`: "A fila padrao nao pode ser excluida"
- `chat.teams.default`: "Padrao"
- `chat.teams.defaultTeam`: "Time Padrao"
- `chat.teams.cannotDeleteDefault`: "O time padrao nao pode ser excluido"

### en.ts
- Equivalentes em ingles

---

## Fluxo Resumido

```text
Tenant abre a aba "Categorias" pela primeira vez
  -> Sistema cria "Fila Padrao" (is_default=true) automaticamente
  -> Aparece na UI como primeiro item com badge "Padrao"

Tenant abre a aba "Times" pela primeira vez
  -> Sistema cria "Time Padrao" (is_default=true) automaticamente
  -> Aparece na UI como primeiro item com badge "Padrao"

Atendente habilitado para chat sem time
  -> Automaticamente adicionado ao "Time Padrao"

Empresa sem service_category_id no roteamento
  -> Motor usa "Fila Padrao" para buscar times e atendentes elegiveis
```

---

## Resumo de Arquivos

| Arquivo | Mudanca |
|---------|---------|
| Migration SQL | `ADD COLUMN is_default boolean DEFAULT false` em `chat_service_categories` e `chat_teams`; atualizar funcao `assign_chat_room` com fallback |
| `supabase/functions/assign-chat-room/index.ts` | Fallback para categoria padrao quando `service_category_id IS NULL` |
| `src/components/chat/CategoriesTab.tsx` | Select `is_default`; auto-criar categoria padrao; badge "Padrao"; bloquear exclusao |
| `src/components/chat/TeamsTab.tsx` | Select `is_default`; auto-criar time padrao; badge "Padrao"; bloquear exclusao |
| `src/components/chat/AttendantsTab.tsx` | Ao habilitar atendente sem time, adiciona-lo ao time padrao |
| `src/locales/pt-BR.ts` | Novas traducoes |
| `src/locales/en.ts` | Equivalentes em ingles |

