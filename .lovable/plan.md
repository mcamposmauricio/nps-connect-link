
# Configurações de Exibição do Widget por Tenant

## Diagnóstico do Estado Atual

### O que existe hoje

A aba "Widget" em `/admin/settings` contém:
- Nome da empresa
- Cor primária
- Posição (esquerda/direita)
- Código de integração (embed snippet)

A tabela `chat_settings` armazena apenas: `welcome_message`, `offline_message`, `auto_assignment`, `max_queue_size`, `require_approval`, `widget_position`, `widget_primary_color`.

O `ChatWidget.tsx` exibe banners para `outsideHours` e `allBusy` **sempre** que as condições são verdadeiras — sem qualquer opção de ligar/desligar esses comportamentos.

### O que o usuário quer

Configurações por tenant na aba Widget para controlar **o que o widget exibe** em cada situação — por exemplo, se deve ou não mostrar o banner de "atendentes ocupados", ou o texto personalizado nesses banners.

---

## Mapeamento Completo de Configurações de Exibição

Todas as situações relevantes do widget que podem ser configuradas:

| Situação | Comportamento atual | Configuração desejada |
|---|---|---|
| Fora do horário | Banner azul fixo | Toggle ligar/desligar + texto personalizável |
| Atendentes ocupados | Banner amarelo fixo | Toggle ligar/desligar + texto personalizável |
| Aguardando atendimento | Spinner + texto fixo | Texto personalizável |
| Formulário de entrada | Campos nome/email/telefone fixos | Toggle por campo (email e telefone opcionais) |
| Histórico de conversas | Sempre visível | Toggle: exibir ou não histórico |
| CSAT ao fechar | Sempre exibido | Toggle: pedir ou não avaliação ao fechar |
| Anexos de arquivos | Habilitado fixo | Toggle habilitar/desabilitar envio de arquivos |

---

## Parte 1 — Migração SQL: Novos Campos em `chat_settings`

Adicionar colunas de configuração de exibição na tabela `chat_settings`. Todos com defaults seguros que preservam comportamento atual:

```sql
ALTER TABLE public.chat_settings
  -- Fora do horário
  ADD COLUMN IF NOT EXISTS show_outside_hours_banner boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS outside_hours_title text DEFAULT 'Estamos fora do horário de atendimento.',
  ADD COLUMN IF NOT EXISTS outside_hours_message text DEFAULT 'Sua mensagem ficará registrada e responderemos assim que voltarmos.',

  -- Atendentes ocupados
  ADD COLUMN IF NOT EXISTS show_all_busy_banner boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS all_busy_title text DEFAULT 'Todos os atendentes estão ocupados no momento.',
  ADD COLUMN IF NOT EXISTS all_busy_message text DEFAULT 'Você está na fila e será atendido em breve. Por favor, aguarde.',

  -- Aguardando atendimento
  ADD COLUMN IF NOT EXISTS waiting_message text DEFAULT 'Aguardando atendimento...',

  -- Formulário
  ADD COLUMN IF NOT EXISTS show_email_field boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_phone_field boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS form_intro_text text DEFAULT 'Preencha seus dados para iniciar o atendimento.',

  -- Histórico
  ADD COLUMN IF NOT EXISTS show_chat_history boolean NOT NULL DEFAULT true,

  -- CSAT
  ADD COLUMN IF NOT EXISTS show_csat boolean NOT NULL DEFAULT true,

  -- Anexos
  ADD COLUMN IF NOT EXISTS allow_file_attachments boolean NOT NULL DEFAULT true;
```

**Zero impacto no comportamento atual**: todos os defaults são `true` ou preservam os textos já exibidos.

---

## Parte 2 — Nova Aba "Exibição" dentro da aba Widget em AdminSettings.tsx

A aba "Widget" atual já tem configurações de aparência (cor, posição). Vamos adicionar um segundo card "Comportamento e Mensagens" logo abaixo, organizado em seções com `Separator`:

### Estrutura do card "Comportamento e Mensagens"

```
┌── Comportamento e Mensagens ───────────────────────────────┐
│                                                             │
│  ── Fora do Horário de Atendimento ────────────────────── │
│  Exibir aviso quando fora do horário: [ON]                  │
│  Título: [Estamos fora do horário de atendimento. ______]   │
│  Mensagem: [Sua mensagem ficará registrada ______________ ]  │
│                                                             │
│  ── Atendentes Ocupados ───────────────────────────────── │
│  Exibir aviso quando todos estão ocupados: [ON]             │
│  Título: [Todos os atendentes estão ocupados. ___________]  │
│  Mensagem: [Você está na fila e será atendido em breve. __] │
│                                                             │
│  ── Formulário Inicial ──────────────────────────────────  │
│  Texto introdutório: [Preencha seus dados... ____________]  │
│  Exibir campo Email: [ON]    Exibir campo Telefone: [ON]    │
│                                                             │
│  ── Funcionalidades ────────────────────────────────────── │
│  Histórico de conversas: [ON]    CSAT ao encerrar: [ON]     │
│  Envio de arquivos: [ON]                                    │
│                                                             │
│  [Salvar configurações]                                      │
└─────────────────────────────────────────────────────────────┘
```

### Preview ao vivo

O `WidgetPreview.tsx` existente renderiza o formulário estático. Vamos estender para receber as novas props e refletir as configurações:
- Se `showEmailField = false` → ocultar campo email no preview
- Se `showPhoneField = false` → ocultar campo telefone no preview

---

## Parte 3 — `ChatWidget.tsx`: Consumir as Configurações

O widget precisa buscar as configurações de `chat_settings` ao inicializar e usá-las para controlar os renders.

### Novo fetch ao carregar o widget

O widget recebe `ownerUserId` via query param. Deve buscar `chat_settings` pelo `owner_user_id` para obter as configs. Isso é feito **uma vez** no `useEffect` de init.

```typescript
// Buscar configurações de exibição pelo tenant
const { data: chatConfig } = await supabase
  .from("chat_settings")
  .select("show_outside_hours_banner, outside_hours_title, outside_hours_message, show_all_busy_banner, all_busy_title, all_busy_message, waiting_message, show_email_field, show_phone_field, form_intro_text, show_chat_history, show_csat, allow_file_attachments")
  .eq("user_id", ownerUserId)  // ou tenant_id quando disponível
  .maybeSingle();
```

### Uso no render

Nos pontos exatos do `ChatWidget.tsx`:

- **Linha ~681** (banner `outsideHours`): envolver em `{chatConfig?.show_outside_hours_banner !== false && outsideHours && ...}`, usando os textos `outside_hours_title` e `outside_hours_message`
- **Linha ~685** (banner `allBusy`): envolver em `{chatConfig?.show_all_busy_banner !== false && allBusy && ...}`, usando os textos `all_busy_title` e `all_busy_message`
- **Linha ~589** (formulário): usar `form_intro_text`, mostrar/ocultar email e telefone com `show_email_field` e `show_phone_field`
- **Linha ~610** (histórico): envolver o render de histórico em `{chatConfig?.show_chat_history !== false && ...}`
- **Fase `csat`**: pular para `closed` diretamente se `show_csat = false`
- **Botão de attachment** (linha ~750+): ocultar se `allow_file_attachments = false`

---

## Parte 4 — `WidgetPreview.tsx`: Receber Props de Configuração

Estender o componente de preview para receber props opcionais que refletem as configurações e alternar os campos no formulário do preview:

```typescript
interface WidgetPreviewProps {
  position: "left" | "right";
  primaryColor: string;
  companyName: string;
  // Novas props opcionais
  showEmailField?: boolean;
  showPhoneField?: boolean;
  formIntroText?: string;
}
```

Isso permite que ao desabilitar um campo no formulário de configurações, o preview já reflita a mudança instantaneamente.

---

## Parte 5 — Arquivos a Criar/Modificar

| Arquivo | Ação | O que muda |
|---|---|---|
| `supabase/migrations/[timestamp].sql` | CRIAR | ALTER TABLE `chat_settings` para adicionar 13 novas colunas de configuração de exibição com defaults seguros |
| `src/pages/AdminSettings.tsx` | MODIFICAR | Adicionar segundo card "Comportamento e Mensagens" na aba Widget, com todos os toggles e campos de texto; expandir o `settings` state e `fetchAll`/`handleSaveGeneral` para incluir as novas colunas; passar novas props ao `WidgetPreview` |
| `src/components/chat/WidgetPreview.tsx` | MODIFICAR | Aceitar props opcionais `showEmailField`, `showPhoneField`, `formIntroText` e refletir no preview do formulário |
| `src/pages/ChatWidget.tsx` | MODIFICAR | Adicionar estado `widgetConfig`, fetch das configs de exibição no init, usar `widgetConfig` para controlar render de cada banner/seção/funcionalidade |

---

## Detalhes Técnicos

### Fetch no widget sem `owner_user_id`

Para visitantes anônimos (sem `ownerUserId` na URL), o widget não consegue buscar as configs diretamente. Nesse caso usa os defaults — o comportamento atual é preservado. Para visitantes resolvidos (com `ownerUserId`), a busca usa `eq("user_id", ownerUserId)`.

Como alternativa mais robusta: a edge function `assign-chat-room` pode retornar as configs de exibição junto com o response. Mas para simplicidade e sem alterar a edge function, o widget faz seu próprio fetch de `chat_settings` onde disponível.

### Defaults no estado de AdminSettings

Para preservar compatibilidade com tenants que ainda não salvaram as novas configs, os defaults no state são exatamente os textos que o widget usa hoje:

```typescript
show_outside_hours_banner: true,
outside_hours_title: "Estamos fora do horário de atendimento.",
outside_hours_message: "Sua mensagem ficará registrada e responderemos assim que voltarmos.",
show_all_busy_banner: true,
all_busy_title: "Todos os atendentes estão ocupados no momento.",
all_busy_message: "Você está na fila e será atendido em breve. Por favor, aguarde.",
waiting_message: "Aguardando atendimento...",
show_email_field: true,
show_phone_field: true,
form_intro_text: "Preencha seus dados para iniciar o atendimento.",
show_chat_history: true,
show_csat: true,
allow_file_attachments: true,
```

### Input desabilitado condicionalmente

Quando `show_outside_hours_banner = false`, os campos de título e mensagem ficam desabilitados (`disabled`) com `opacity-50`, mas os valores são preservados para quando reativado.

### Sem migration destrutiva

Apenas `ADD COLUMN IF NOT EXISTS` — nenhuma coluna existente é alterada.
