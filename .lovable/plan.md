
# Widget de Chat: Historico + Novo Chat + Vinculacao de Dados

## Resumo

Adicionar ao widget embarcado a mesma experiencia do portal externo (`/portal/:token`): historico de conversas, botao de novo chat, e vinculacao completa de dados para que triggers de timeline e metricas funcionem.

## Mudancas

### 1. Edge Function `resolve-chat-visitor/index.ts`

Adicionar `user_id` (do dono da API key) na resposta JSON. Esse campo ja existe internamente (`apiKeyData.user_id`) mas nao e retornado. Sera adicionado nas duas respostas (visitante existente e visitante novo).

### 2. Embed Script `public/nps-chat-embed.js`

Capturar os campos extras da resposta do `resolve-chat-visitor` e passa-los como parametros na URL do iframe:

- `ownerUserId` - UUID do dono da API key (para `owner_user_id` na sala)
- `companyContactId` - UUID do company_contact
- `contactId` - UUID da empresa (contacts)

### 3. Widget Principal `src/pages/ChatWidget.tsx`

Refatoracao completa do fluxo para visitantes resolvidos (com `external_id`):

| Mudanca | Detalhe |
|---------|---------|
| Nova fase `history` | Lista de conversas anteriores do visitante, com status e data |
| Botao "Novo Chat" | Cria nova sala com dados completos de vinculacao |
| Fase `viewTranscript` | Permite ver mensagens de conversas encerradas |
| Parametros extras da URL | Ler `ownerUserId`, `companyContactId`, `contactId` |
| Criacao de sala com dados reais | Usar `owner_user_id`, `company_contact_id`, `contact_id` reais em vez do placeholder `00000000-...` |
| Retorno ao historico apos CSAT | Apos enviar avaliacao, voltar para a lista em vez de ficar preso |

#### Fluxo para visitantes resolvidos (external_id):

```text
Visitante identificado
      |
      v
  [Historico]  -- lista + botao "Novo Chat"
   /        \
  v          v
[Chat ativo]  [Ver transcrito]
  |
  v
[CSAT] --> volta ao [Historico]
```

#### Fluxo para visitantes anonimos (sem external_id):

Permanece igual ao atual: formulario -> aguardando -> chat -> CSAT -> botao novo chat.

## Detalhes Tecnicos

**Consulta de historico:**
```sql
SELECT id, status, created_at, closed_at, csat_score
FROM chat_rooms
WHERE visitor_id = :visitorId
ORDER BY created_at DESC
```

**Criacao de sala vinculada:**
```sql
INSERT INTO chat_rooms (visitor_id, owner_user_id, company_contact_id, contact_id, status)
VALUES (:visitorId, :ownerUserId, :companyContactId, :contactId, 'waiting')
```

Isso garante que as triggers `create_chat_timeline_event` e `update_company_contact_chat_metrics` disparem corretamente.

## Arquivos Modificados

| # | Arquivo | Tipo |
|---|---------|------|
| 1 | `supabase/functions/resolve-chat-visitor/index.ts` | Adicionar `user_id` na resposta |
| 2 | `public/nps-chat-embed.js` | Passar campos extras na URL do iframe |
| 3 | `src/pages/ChatWidget.tsx` | Historico, novo chat, vinculacao, transcrito |
