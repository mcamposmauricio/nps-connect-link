

# Widget Dinamico com Campos Auto-Atualizaveis, Novo Fluxo de Entrada e Side Panel de Informacoes

## Resumo

Transformar o widget de chat para que funcione com apenas `data-api-key` e `data-external-id` fixos, buscando os campos customizados dinamicamente do backend. Quando o admin alterar as definicoes de campos, todos os widgets ja implantados refletirao a mudanca automaticamente no proximo carregamento. Reescrever a logica de entrada do chat seguindo a arvore de decisao especificada. Garantir que ao abrir um atendimento, todas as informacoes do visitante, contato e empresa aparecam automaticamente no side panel do atendente.

## Arquitetura da Solucao

```text
Host App                     Embed Script                  Edge Function              Database
   |                              |                              |                        |
   |--- <script data-api-key     |                              |                        |
   |     data-external-id> ----->|                              |                        |
   |                              |-- GET get-widget-config ---->|                        |
   |                              |   (api_key)                  |-- query tenant_id ---->|
   |                              |                              |<-- field_definitions --|
   |                              |<-- { fields[], settings } ---|                        |
   |                              |                              |                        |
   |-- NPSChat.update(data) ---->|                              |                        |
   |                              |-- postMessage to iframe ---->|                        |
   |                              |                              |                        |
   |                     [iframe: ChatWidget.tsx]                |                        |
   |                              |                              |                        |
   |                     User opens chat                         |                        |
   |                              |-- POST resolve-chat-visitor->|                        |
   |                              |   (api_key, external_id,     |-- UPSERT visitor ---->|
   |                              |    name, email, phone,       |-- UPSERT company ---->|
   |                              |    company_data, custom)     |-- UPSERT contact ---->|
   |                              |<-- { visitor_token,          |<-- all IDs ------------|
   |                              |      contact_id,             |                        |
   |                              |      company_contact_id,     |                        |
   |                              |      flags } ---------------|                        |
   |                              |                              |                        |
   |                     [cria chat_room com IDs]                |                        |
   |                              |                              |                        |
   |              [Workspace do Atendente]                       |                        |
   |              VisitorInfoPanel recebe                         |                        |
   |              contact_id + company_contact_id                |                        |
   |              do chat_room e carrega:                         |                        |
   |              - Dados do contato (nome, email, cargo)        |                        |
   |              - Dados da empresa (MRR, Health, NPS)          |                        |
   |              - Campos customizados                          |                        |
   |              - Timeline de eventos                          |                        |
```

## Side Panel: Informacoes do Visitante no Atendimento

### Como funciona hoje

O componente `VisitorInfoPanel` ja existe e exibe dados completos do visitante, contato e empresa. Ele recebe `roomId`, `visitorId`, `contactId` e `companyContactId` como props. Quando esses IDs estao preenchidos no `chat_rooms`, o painel carrega automaticamente:

- **Aba Contato**: nome, email, telefone, cargo, departamento, external_id, metricas de chat (sessoes, CSAT medio), campos customizados do metadata
- **Aba Empresa**: nome, Health Score com barra de progresso, MRR, valor de contrato, data de renovacao, NPS com badge, localizacao, setor, CNPJ, campos customizados (custom_fields JSONB)
- **Aba Timeline**: ultimos 10 eventos da empresa

### O problema atual

Quando um chat e aberto via widget embedado, o `resolve-chat-visitor` atual nao faz upsert -- apenas retorna dados antigos. Os campos `contact_id` e `company_contact_id` do `chat_room` podem ficar vazios se nenhum `NPSChat.update()` com dados de empresa for chamado. Resultado: o side panel mostra apenas nome e email basicos do visitor, sem dados de empresa.

### O que muda com este plano

1. **`resolve-chat-visitor` faz upsert completo**: Todos os dados (nome, email, empresa, campos customizados) sao persistidos ANTES do chat iniciar. O endpoint retorna `contact_id` e `company_contact_id` prontos.

2. **`ChatWidget.tsx` cria o `chat_room` com os IDs**: Ao criar a sala, o frontend usa os IDs retornados pelo resolver para preencher `contact_id` e `company_contact_id` na tabela `chat_rooms`.

3. **`VisitorInfoPanel` carrega tudo automaticamente**: Como o `chat_room` ja tem os IDs corretos, o workspace do atendente exibe o side panel completo no momento em que aceita o chat -- sem atraso, sem dados faltando.

4. **Atualizacoes em tempo real**: Se o `NPSChat.update()` for chamado durante um chat ativo, o handler envia os dados ao `resolve-chat-visitor` em background, que faz o upsert. O atendente pode clicar no botao "Atualizar" (RefreshCw) no painel para ver os dados novos, ou o componente pode ser atualizado via realtime subscription no `chat_visitors`.

### Fluxo visual do atendente

```text
Atendente aceita chat
        |
        v
+---------------------------+     +----------------------------+
|     Chat Messages         |     |    Side Panel (direita)    |
|                           |     |                            |
|  [Visitante]: Ola, ...    |     |  [Avatar] Mauricio Campos  |
|  [Atendente]: Como posso  |     |  Gerente de RH             |
|   ajudar?                 |     |  mcampos@marqhr.com         |
|                           |     |  +55 11 99999-0000          |
|                           |     |                            |
|                           |     |  [Contato] [Empresa] [Time] |
|                           |     |                            |
|                           |     |  Health Score: 85 [=====]  |
|                           |     |  MRR: R$ 15.000            |
|                           |     |  Contrato: R$ 180.000      |
|                           |     |  NPS: 9 (Promotor)         |
|                           |     |  Setor: Tecnologia          |
|                           |     |                            |
|                           |     |  -- Campos Customizados -- |
|                           |     |  Plano: Enterprise          |
|                           |     |  Health Score: 85           |
|                           |     |  Onboarding: 01/03/2025    |
+---------------------------+     +----------------------------+
```

## Cenario: Campos Dinamicos em Acao

### Estado Inicial: Admin configura 2 campos customizados

O admin cria:
- `plano` (tipo: text, target: company)
- `mrr` (tipo: decimal, target: company, maps_to: mrr)

O integrador chama:

```javascript
window.NPSChat.update({
  name: "Mauricio Campos",
  email: "mcampos@marqhr.com",
  company_id: "MARQ-001",
  company_name: "MarQ HR",
  plano: "Enterprise",
  mrr: 12000
});
```

Payload enviado ao `resolve-chat-visitor`:

```json
{
  "api_key": "chat_b6a0eff...",
  "external_id": "6f40436f-1096-4fc7-8b97-e055672bf02f",
  "name": "Mauricio Campos",
  "email": "mcampos@marqhr.com",
  "company_id": "MARQ-001",
  "company_name": "MarQ HR",
  "custom_data": {
    "plano": "Enterprise",
    "mrr": 12000
  }
}
```

Resultado no banco:
- `contacts` (empresa): `mrr = 12000` (campo direto via maps_to), `custom_fields = { "plano": "Enterprise" }`
- `company_contacts`: `name = "Mauricio Campos"`, `email = "mcampos@marqhr.com"`
- `chat_visitors`: `metadata = { "plano": "Enterprise", "mrr": 12000 }`
- `chat_rooms`: `contact_id = <id da empresa>`, `company_contact_id = <id do contato>`

Side panel do atendente mostra tudo instantaneamente.

### Depois: Admin adiciona 3 novos campos (sem tocar no codigo do integrador)

O admin cria:
- `contract_value` (tipo: decimal, target: company, maps_to: contract_value)
- `health_score` (tipo: integer, target: company)
- `onboarding_date` (tipo: date, target: company)

Na proxima carga do widget, `get-widget-config` retorna os 5 campos:

```json
{
  "fields": [
    { "key": "plano", "label": "Plano", "field_type": "text", "target": "company", "maps_to": null },
    { "key": "mrr", "label": "MRR", "field_type": "decimal", "target": "company", "maps_to": "mrr" },
    { "key": "contract_value", "label": "Valor do Contrato", "field_type": "decimal", "target": "company", "maps_to": "contract_value" },
    { "key": "health_score", "label": "Health Score", "field_type": "integer", "target": "company", "maps_to": null },
    { "key": "onboarding_date", "label": "Data Onboarding", "field_type": "date", "target": "company", "maps_to": null }
  ]
}
```

O integrador atualiza o `NPSChat.update()`:

```javascript
window.NPSChat.update({
  name: "Mauricio Campos",
  email: "mcampos@marqhr.com",
  company_id: "MARQ-001",
  company_name: "MarQ HR",
  plano: "Enterprise",
  mrr: 15000,
  contract_value: 180000,
  health_score: 85,
  onboarding_date: "2025-03-01"
});
```

Novo payload ao `resolve-chat-visitor`:

```json
{
  "api_key": "chat_b6a0eff...",
  "external_id": "6f40436f-1096-4fc7-8b97-e055672bf02f",
  "name": "Mauricio Campos",
  "email": "mcampos@marqhr.com",
  "company_id": "MARQ-001",
  "company_name": "MarQ HR",
  "custom_data": {
    "plano": "Enterprise",
    "mrr": 15000,
    "contract_value": 180000,
    "health_score": 85,
    "onboarding_date": "2025-03-01"
  }
}
```

Resultado no banco (UPSERT com merge):
- `contacts`: `mrr = 15000` (atualizado), `contract_value = 180000` (novo), `custom_fields = { "plano": "Enterprise", "health_score": 85, "onboarding_date": "2025-03-01" }`
- `chat_visitors`: `metadata` atualizado com todos os 5 campos

Side panel do atendente mostra MRR, Contrato, e os campos customizados atualizados.

### Cenario: Admin remove campo e renomeia outro

Admin remove "plano" e renomeia "health_score" para "nota_saude". Proximo `get-widget-config` retorna 4 campos sem "plano" e com "nota_saude" em vez de "health_score".

Resultado no banco (merge preserva historico):
- `contacts.custom_fields`: dados antigos permanecem (merge nao remove), novos sao adicionados

## Mudancas Detalhadas

### 1. Nova Edge Function: `get-widget-config`

Novo arquivo `supabase/functions/get-widget-config/index.ts`

**Input:** `api_key` (query param)
**Output:**
```json
{
  "tenant_id": "uuid",
  "owner_user_id": "uuid",
  "fields": [
    { "key": "mrr", "label": "MRR", "field_type": "decimal", "target": "company", "maps_to": "mrr" }
  ],
  "settings": {
    "show_email_field": true,
    "show_phone_field": true,
    "form_intro_text": "...",
    "company_name": "Acme Corp"
  }
}
```

Logica: validar API key (SHA-256), buscar tenant_id, buscar `chat_custom_field_definitions` ativas, buscar `chat_settings`.

### 2. Reescrever `resolve-chat-visitor` (Upsert Completo)

**Novo input:**
```json
{
  "api_key": "chat_xxx...",
  "external_id": "user-uuid-123",
  "name": "Mauricio",
  "email": "m@empresa.com",
  "phone": "+5511...",
  "company_id": "empresa-ext-id",
  "company_name": "MarQ HR",
  "custom_data": { "mrr": 5000, "plano": "Enterprise" }
}
```

**Arvore de decisao:**

```text
1. Validar api_key -> obter owner_user_id + tenant_id

2. IF external_id fornecido:
   a. Buscar company_contact por external_id + user_id
   b. IF encontrou:
      - UPSERT: atualizar name, email, phone se diferentes
      - Buscar/criar chat_visitor vinculado
      - Atualizar chat_visitor com dados novos (name, email, metadata)
      - Se company_id/company_name: upsert na contacts (empresa)
        - Campos com maps_to -> colunas diretas
        - Demais campos -> merge JSONB em custom_fields
      - Retornar visitor_token + contact_id + company_contact_id + "auto_start: true"
   c. IF nao encontrou:
      - IF name E email fornecidos:
        - Criar company_contact com external_id
        - Se company_id/company_name: upsert na contacts (empresa)
        - Criar chat_visitor vinculado
        - Retornar visitor_token + contact_id + company_contact_id + "auto_start: true"
      - ELSE:
        - Retornar user_id + "needs_form: true"

3. IF external_id NAO fornecido:
   - IF name E email fornecidos:
     - Buscar company_contact por email + user_id
     - IF encontrou: vincular, retornar IDs
     - ELSE: sera criado no handleStartChat
     - Retornar com "auto_start: true"
   - ELSE:
     - Retornar user_id + "needs_form: true"
```

**Retorno enriquecido (garante side panel):**

```json
{
  "visitor_token": "xxx",
  "visitor_name": "Mauricio Campos",
  "visitor_email": "mcampos@marqhr.com",
  "contact_id": "uuid-da-empresa",
  "company_contact_id": "uuid-do-contato",
  "user_id": "uuid-do-tenant",
  "auto_start": true,
  "has_history": true
}
```

Os campos `contact_id` e `company_contact_id` sao usados pelo frontend para criar o `chat_room` com vinculos corretos, que o `VisitorInfoPanel` le automaticamente.

### 3. Atualizar `nps-chat-embed.js`

- Na `init()`, chamar `get-widget-config` para obter campos dinamicos
- O `NPSChat.update()` separa campos reservados dos custom_data
- O `resolveVisitor` ampliado envia todos os dados ao resolver
- Passa flags (`auto_start`, `needs_form`, `has_history`) para o iframe via URL params

### 4. Refatorar `ChatWidget.tsx`

**Novo fluxo de entrada baseado em flags:**

```text
IF paramVisitorToken (ja resolvido pelo embed com auto_start):
  -> Carregar visitor, historico, entrar direto
  -> Se has_history: mostrar tela de historico
  -> Se auto_start: pular formulario, criar room

ELSE IF needs_form:
  -> Mostrar formulario obrigatorio (nome + email)
  -> Ao submeter: POST resolve-chat-visitor com dados completos
  -> Backend faz upsert e retorna IDs
  -> Frontend cria chat_room com contact_id + company_contact_id

ELSE (modo anonimo):
  -> Mostrar formulario
  -> Fluxo atual
```

**Criacao do chat_room com IDs do resolver:**

```typescript
const { data: room } = await supabase.from("chat_rooms").insert({
  visitor_id: visitorId,
  owner_user_id: ownerUserId,
  contact_id: resolverResponse.contact_id,           // <-- novo
  company_contact_id: resolverResponse.company_contact_id,  // <-- novo
  status: "waiting",
}).select().single();
```

Isso garante que quando o atendente abre o chat, o `VisitorInfoPanel` recebe os IDs via `chat_room` e carrega todos os dados automaticamente.

**Remocao do `upsertCompany` do frontend**: toda logica migra para `resolve-chat-visitor`.

**Handler `nps-chat-update` atualizado**: se `visitorId` ja existe, envia POST para `resolve-chat-visitor` em background para persistir mudancas. Atualiza tambem `chat_rooms.contact_id` e `company_contact_id` se retornados.

### 5. Side Panel: Nenhuma mudanca necessaria

O `VisitorInfoPanel` ja esta completo. Ele:
- Recebe `contactId` e `companyContactId` como props (vindos do `chat_room`)
- Carrega dados da empresa (`contacts`), contato (`company_contacts`), visitor (`chat_visitors`)
- Exibe campos customizados usando `chat_custom_field_definitions`
- Mostra timeline de eventos
- Tem botao de refresh manual

A unica coisa que faltava era o preenchimento correto dos IDs no `chat_room` -- que este plano resolve.

### 6. Config TOML

Adicionar:
```toml
[functions.get-widget-config]
verify_jwt = false
```

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/functions/get-widget-config/index.ts` | Criar | Nova edge function para retornar campos dinamicos do tenant |
| `supabase/functions/resolve-chat-visitor/index.ts` | Reescrever | Upsert completo, retornar contact_id + company_contact_id + flags |
| `public/nps-chat-embed.js` | Reescrever | Buscar config dinamica, enviar dados completos ao resolver |
| `src/pages/ChatWidget.tsx` | Refatorar | Novo fluxo com flags, criar room com IDs, remover upsertCompany |

## Sem Migracoes SQL

Nenhuma mudanca de schema. Todas as tabelas ja possuem as colunas necessarias.

## Beneficios

1. **Side panel completo desde o primeiro momento**: O atendente ve nome, empresa, MRR, Health Score, NPS, campos customizados e timeline assim que aceita o chat
2. **Campos dinamicos sem reimplantacao**: Admin muda definicoes, proximo carregamento do widget ja reflete
3. **Upsert centralizado no backend**: Elimina logica duplicada, garante consistencia
4. **company_contacts atualizado**: name, email e phone sincronizados no upsert
5. **Retrocompativel**: Widgets sem `data-api-key` continuam funcionando no modo anonimo

