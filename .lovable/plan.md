
# Plano: Chat ao Vivo no Portal do Cliente

## Objetivo

Permitir que o contato abra um novo chat diretamente pelo portal publico (`/portal/:token`), com experiencia completa de tempo real (mensagens, CSAT), e que todas as informacoes sejam replicadas automaticamente nos locais corretos: timeline da empresa, metricas do contato, workspace do admin, e historico.

---

## Como funciona hoje (base para o plano)

### Triggers existentes que ja garantem a replicacao:

1. **`create_chat_timeline_event`** (INSERT/UPDATE em `chat_rooms`): cria eventos na timeline da empresa quando um chat e aberto ou fechado -- **requer `contact_id` (company) preenchido na room**
2. **`update_company_contact_chat_metrics`** (UPDATE em `chat_rooms`): atualiza `chat_total`, `chat_avg_csat`, `chat_last_at` no `company_contacts` quando a room e fechada -- **requer `company_contact_id` preenchido**
3. **RLS publica**: ja permite INSERT publico em `chat_visitors`, `chat_rooms`, e `chat_messages`

Ou seja, se criarmos o chat com os campos corretos (`contact_id`, `company_contact_id`, `owner_user_id`), **toda a replicacao ja acontece automaticamente**.

### O widget atual (`ChatWidget.tsx`)

Usa `owner_user_id = "00000000..."` (placeholder) e nao vincula a `company_contact_id` nem `contact_id`. No portal, temos essa informacao e podemos preencher corretamente.

---

## O que sera feito

### 1. Reescrever `UserPortal.tsx` para incluir chat ao vivo

A pagina do portal tera dois modos:

- **Modo Lista** (padrao): Mostra o historico de chats (como hoje) + botao "Novo Chat"
- **Modo Chat**: Interface de conversa em tempo real (similar ao widget), com fases: `waiting` -> `chat` -> `csat` -> `closed`

#### Fluxo ao clicar "Novo Chat":

1. Verificar se ja existe um chat ativo/esperando para este contato
   - Se sim, retoma esse chat
2. Se nao, criar um `chat_visitor` com:
   - `name`: nome do contato
   - `email`: email do contato
   - `phone`: telefone (se existir)
   - `owner_user_id`: o `user_id` do `company_contacts` (o admin dono)
   - `company_contact_id`: o ID do contato
   - `contact_id`: o `company_id` (ID da empresa no `contacts`)
3. Criar um `chat_room` com:
   - `visitor_id`: ID do visitor criado
   - `owner_user_id`: mesmo user_id acima
   - `company_contact_id`: ID do contato
   - `contact_id`: company_id (empresa)
   - `status`: "waiting"
4. Iniciar subscricao realtime para mensagens e status da room
5. Quando o admin atribuir a conversa, mudar para fase "chat"
6. Quando o admin fechar, mostrar formulario CSAT
7. Ao submeter CSAT, voltar para a lista

#### Dados que serao replicados automaticamente:

| Onde | O que | Como |
|------|-------|------|
| Timeline da empresa | Evento "Chat iniciado" e "Chat encerrado" | Trigger `create_chat_timeline_event` (ja existe) |
| Metricas do contato | `chat_total`, `chat_avg_csat`, `chat_last_at` | Trigger `update_company_contact_chat_metrics` (ja existe) |
| Workspace do admin | Conversa aparece na fila | Realtime em `chat_rooms` (ja existe) |
| Historico admin | Conversa aparece na listagem | Query em `chat_rooms` (ja existe) |
| Dashboard gerencial | Contabilizada nas metricas | Queries agregadas (ja existe) |
| Portal do contato | Aparece na lista de chats | Query por `company_contact_id` (ja existe) |

**Nenhuma alteracao no banco de dados e necessaria.** Todos os triggers e RLS ja estao prontos.

---

## Detalhes da implementacao

### Arquivo: `src/pages/UserPortal.tsx` (reescrever)

**Novos estados:**
- `chatPhase`: "list" | "waiting" | "chat" | "csat" | "closed"
- `activeRoomId`: ID da room ativa
- `liveMessages`: mensagens em tempo real
- `csatScore`, `csatComment`: para o formulario CSAT

**Novo botao no header da lista:**
- "Iniciar novo atendimento" -- visivel apenas se nao houver chat ativo/esperando

**Interface de chat (quando `chatPhase !== "list"`):**
- Header com status (aguardando / ativo)
- Area de mensagens com scroll automatico
- Input de texto + botao enviar (apenas quando status = "active")
- Formulario CSAT (quando status = "closed" e ainda nao avaliou)
- Botao "Voltar para lista"

**Subscricoes realtime:**
- Canal de mensagens: `INSERT` em `chat_messages` filtrado por `room_id`
- Canal de room: `UPDATE` em `chat_rooms` filtrado por `id` (para detectar mudanca de status)

### Arquivo: `src/locales/pt-BR.ts` e `src/locales/en.ts`

Novas chaves:
- `chat.portal.new_chat`: "Iniciar novo atendimento" / "Start new conversation"
- `chat.portal.waiting`: "Aguardando atendimento..." / "Waiting for an attendant..."
- `chat.portal.waiting_desc`: "Voce sera conectado em breve" / "You will be connected shortly"
- `chat.portal.active_chat`: "Chat ativo" / "Active chat"
- `chat.portal.type_message`: "Digite sua mensagem..." / "Type your message..."
- `chat.portal.rate_service`: "Avalie o atendimento" / "Rate the service"
- `chat.portal.rate_comment`: "Comentario (opcional)" / "Comment (optional)"
- `chat.portal.submit_rating`: "Enviar avaliacao" / "Submit rating"
- `chat.portal.thanks`: "Obrigado pelo feedback!" / "Thank you for your feedback!"
- `chat.portal.back_to_list`: "Voltar" / "Back"
- `chat.portal.has_active`: "Voce ja tem um atendimento em andamento" / "You already have an active conversation"
- `chat.portal.resume_chat`: "Continuar conversa" / "Resume conversation"

---

## Resumo de arquivos

### Modificados:
| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/UserPortal.tsx` | Reescrever com interface de chat ao vivo completa |
| `src/locales/pt-BR.ts` | +12 chaves novas para o portal |
| `src/locales/en.ts` | +12 chaves novas para o portal |

### Sem alteracoes:
- Banco de dados (triggers e RLS ja estao prontos)
- `AdminWorkspace.tsx` (ja recebe as conversas via realtime)
- `PersonDetailsSheet.tsx` (ja exibe chats do contato via query)
- `CompanyCSDetailsSheet.tsx` (timeline ja e populada pelos triggers)

---

## Detalhes Tecnicos

- **Visitor reutilizavel**: antes de criar um novo visitor, verificar se o contato ja tem um `chat_visitor_id` salvo em `company_contacts`. Se sim, reutilizar. Se nao, criar e salvar o `chat_visitor_id` no contato.
- **Campos criticos na room**: `owner_user_id`, `contact_id`, e `company_contact_id` DEVEM ser preenchidos para que os triggers disparem corretamente
- **Realtime**: duas subscricoes -- uma para mensagens novas (INSERT), outra para mudanca de status da room (UPDATE)
- **CSAT**: o formulario e exibido no portal quando o admin fecha a conversa. O contato avalia e o score e salvo na room, disparando o trigger de metricas
- **Sem autenticacao**: todo o fluxo usa as RLS publicas ja configuradas (INSERT publico em visitors, rooms e messages; SELECT publico em rooms e messages)
