# BLUEPRINT DEFINITIVO — Journey CS

> Documento de reconstrução completa do sistema. Contém especificação funcional, código-fonte dos arquivos críticos, schema do banco, edge functions e mapa do repositório. Projetado para ser fornecido a uma nova instância Lovable para replicar o sistema integralmente.

---

# SEÇÃO 0 — ESPECIFICAÇÃO FUNCIONAL E REGRAS DE NEGÓCIO

## 0.1 Visão Geral do Produto

Journey CS é uma plataforma SaaS multi-tenant de Customer Success composta por 4 módulos integrados:

1. **Chat ao Vivo** — Atendimento em tempo real via widget embedável com atribuição automática
2. **NPS (Net Promoter Score)** — Pesquisas de satisfação com campanhas manuais e automáticas
3. **Customer Success** — Kanban de gestão de carteira, trilhas/jornadas, saúde de clientes
4. **Backoffice Master** — Administração global multi-tenant para o operador da plataforma

Modelo B2B2C: operador (master) provisiona plataformas (tenants), cada tenant tem admins e atendentes, clientes finais interagem via widget de chat ou formulários NPS públicos.

## 0.2 Papéis e Perfis de Acesso

| Papel | Descrição | Acesso |
|-------|-----------|--------|
| **Master** | Operador global da plataforma | Tudo. Ghost Mode para visualizar qualquer tenant. Gerencia plataformas, usuários, operações globais |
| **Admin** | Administrador de um tenant | Acesso total dentro do seu tenant. Configura chat, NPS, equipe, permissões. Convida novos usuários |
| **Attendant** | Atendente de chat | Acessa apenas o workspace e funcionalidades liberadas por permissão granular |

**Regras de acesso**:
- Admin tem acesso total automático — não precisa de permissões granulares
- Attendant depende de permissões configuradas pelo admin (26+ módulos com can_view/edit/delete/manage)
- Permissões usam hierarquia por ponto: conceder `cs` concede automaticamente `cs.kanban`, `cs.trails`, etc.
- Master pode "impersonar" qualquer tenant (Ghost Mode) para visualizar dados sem alterar nada
- Um mesmo usuário pode pertencer a múltiplos tenants (seleção de plataforma no login)

## 0.3 Fluxo de Onboarding

1. **Provisionamento**: Master cria novo tenant no Backoffice e informa email do admin
2. **Convite**: Sistema gera link de convite com token único e envia por email
3. **Aceite**: Admin acessa o link, cria conta (ou aceita com conta existente), sistema automaticamente:
   - Cria perfil com role `admin`
   - Cria registro CSM com `is_chat_enabled = true`
   - Cria `attendant_profile` vinculado (trigger automático `sync_csm_chat_enabled`)
4. **Configuração**: Admin configura marca, email, equipe, horários de atendimento
5. **Convite de equipe**: Admin convida atendentes pela aba Equipe nas configurações

**Não existe registro aberto** — todo acesso é via convite.

## 0.4 Módulo: Chat ao Vivo

### 0.4.1 Widget Embedável

Instalado no site do cliente via tag script HTML (`nps-chat-embed.js`). Funciona como botão flutuante (FAB) que abre janela de conversa em iframe.

**Configurações do widget** (definidas pelo admin via `chat_settings`):
- Posição (direita/esquerda), cor primária, formato do botão (círculo/quadrado)
- Nome da empresa exibido no header
- Campos do formulário: nome (obrigatório), email (opcional), telefone (opcional)
- Texto introdutório do formulário
- Mensagem de espera enquanto aguarda atendente
- Banners de fora de horário e todos ocupados (título + mensagem configuráveis)
- Permitir histórico de conversas anteriores (`show_chat_history`)
- Permitir pesquisa CSAT após encerramento (`show_csat`)
- Permitir anexos de arquivo (`allow_file_attachments`, max 10MB)
- Permitir múltiplos chats simultâneos (`allow_multiple_chats`)

**Árvore de decisão do widget**:

```
Cenário 1: external_id + nome + email fornecidos
  → Backend faz upsert completo (visitante + contato + empresa)
  → Chat inicia direto SEM formulário (auto_start=true)
  → Se tem histórico: exibe lista de conversas anteriores

Cenário 2: external_id fornecido mas SEM nome/email
  → Widget exibe formulário obrigatório (needs_form=true)
  → Ao preencher, backend faz upsert e inicia chat

Cenário 3: nome + email mas SEM external_id
  → Backend busca contato existente por email
  → Se encontra: vincula e inicia direto
  → Se não encontra: retorna para formulário

Cenário 4: Visitante anônimo (nenhum dado)
  → Widget exibe formulário obrigatório
```

**Fases do widget (7)**: Formulário → Histórico (opcional) → Aguardando → Chat Ativo → CSAT (opcional) → Obrigado → Encerrado

**Regras de envio de mensagem**:
- Visitante pode enviar mensagens mesmo na fila de espera (antes de ser atribuído)
- Mensagens entregues em tempo real via Realtime (canal por room_id)
- Atendente pode enviar mensagens internas (visíveis apenas para outros atendentes, `is_internal=true`)
- Indicador de "digitando..." bidirecional via postMessage
- Arquivos: imagens exibidas inline, outros exibem nome + tamanho + botão download
- Timestamps HH:mm em todas as mensagens
- Mensagens de sistema: centralizadas, sem bolha

**Chat proativo**: Atendente pode iniciar conversa selecionando contato do CRM. Widget detecta automaticamente a nova sala.

### 0.4.2 Workspace do Atendente

Tela principal de atendimento (`AdminWorkspace.tsx`) dividida em 3 painéis:
- **Lista de salas**: filas Ativos, Aguardando, Não Atribuído com badges de contagem e preview da última mensagem (não-sistema)
- **Área de conversa**: mensagens com paginação (50 iniciais + "Carregar anteriores"), input com emoji picker, macros (atalhos via `/`), anexos
- **Painel de informações** (`VisitorInfoPanel.tsx`): 3 abas (Contato, Empresa, Timeline) com dados completos do CRM

**Ações do atendente**:
- Encerrar conversa com nota de resolução e status (resolvido/pendente/escalado)
- Transferir para outro atendente (exibe capacidade atual de cada um)
- Adicionar/remover tags na conversa
- Iniciar chat proativo com contato do CRM

**Macros**: Atalhos de texto rápido. Atendente digita `/` seguido do atalho para inserir conteúdo pré-definido.

**Badges**: unread cap em 9+ (exibe "9+" quando ultrapassa). Sort por unread primeiro, depois por last_message_at.

### 0.4.3 Atribuição Automática

Trigger `assign_chat_room` (BEFORE INSERT na tabela `chat_rooms`):

1. Verifica se status = 'waiting' e contact_id não null
2. Resolve tenant_id do owner_user_id
3. Verifica horário comercial (timezone America/Sao_Paulo)
4. Busca `service_category_id` do contato
5. Percorre `chat_category_teams` por `priority_order ASC`
6. Para cada category_team, busca `chat_assignment_configs`:
   - **Round Robin**: seleciona após `rr_last_attendant_id`, com wrap-around
   - **Priority Bypass**: se contato é alta/crítica e `priority_bypass=true`, prefere senior
   - **Least Busy** (default): menor `active_conversations`
7. Filtros: `online_only`, `capacity_limit`, `allow_over_capacity`
8. Se atribui: status → 'active', incrementa `active_conversations`, atualiza `rr_last_attendant_id`
9. Fallback: `fallback_team_id` ou manter na fila

### 0.4.4 Regras Automáticas

3 tipos processados a cada 5 min (`process-chat-auto-rules`):
- **Aviso de inatividade**: Se atendente enviou última msg e visitante não respondeu em X min → envia mensagem de sistema
- **Fechamento automático**: Se não há atividade em X min → fecha sala, libera capacidade
- **Ausência do atendente**: Se visitante enviou última msg e atendente não respondeu em X min → alerta

Deduplicação: não dispara duas vezes para mesma mensagem.

### 0.4.5 Horário Comercial

Tabela `chat_business_hours`: configurável por dia (0-6, domingo-sábado) com start_time/end_time. Fora do horário:
- Widget exibe banner "Fora do horário" (configurável)
- Novas conversas ficam na fila sem atribuição

### 0.4.6 Banners

Banners informativos exibidos no DOM da página hospedeira (fora do iframe, fixed no topo):
- HTML rico, cores personalizáveis, link opcional
- Votação (thumbs up/down) via edge function `vote-banner`
- Atribuídos a contatos específicos (`chat_banner_assignments`)
- Contagem de visualizações

### 0.4.7 Dashboard de Chat

Métricas com filtros por período/atendente/status/prioridade/categoria/tag:
- Total/hoje/ativos/aguardando, CSAT médio, taxa resolução, tempo médio
- Tempo médio de primeira resposta
- Gráficos: chats por dia, CSAT por dia, chats por hora (24h)
- Tabela performance por atendente
- Auto-refresh cada 30s

### 0.4.8 Histórico de Chat

Conversas encerradas com filtros (resolução, atendente, tag, CSAT, busca, período), paginação 20/página, exportação CSV.

## 0.5 Módulo: NPS

### 0.5.1 Campanhas

- **Manual**: seleciona contatos, define mensagem, envia uma vez
- **Automática**: ciclo semanal/quinzenal, N tentativas, processada a cada hora (`process-automatic-campaigns`)

**Fluxo**: cria campanha → adiciona contatos → gera token/link por contato → email via Gmail API ou SMTP → contato avalia 0-10 + comentário → sistema atualiza health_score, trilha, timeline

**Categorias**: Promotor (9-10), Neutro (7-8), Detrator (0-6)

### 0.5.2 Widget NPS Embedável

Script `nps-widget.js`: verifica pesquisa pendente via `check-nps-pending` com `data-api-key` + `data-external-id`. Se há pesquisa: exibe formulário inline. Se não: nada.

### 0.5.3 Triggers Automáticos

Ao receber resposta NPS (trigger `update_contact_nps_on_response`):
- Health Score: promotor +10, neutro =, detrator -10 (capped 0-100)
- Evento na timeline
- Trilha NPS atualizada para 100% + completed
- Se detrator (≤6): cria trilha de recuperação (`create_recovery_trail_for_detractor`)

## 0.6 Módulo: Customer Success

### 0.6.1 Kanban

Colunas por `cs_status` do contato. Cards: nome, Health Score (barra colorida), MRR, badge NPS.
Métricas header: total empresas, MRR total, Health Score médio, clientes em risco (health < 40).

### 0.6.2 Trilhas/Jornadas

Templates com atividades sequenciais. 3 tipos: default, delayed, attention (+ NPS automático).
Trilhas automáticas: ao adicionar contato a campanha → trilha "nps"; ao receber detrator → trilha "recuperação".

### 0.6.3 Timeline

Eventos por empresa: reunião, email, ligação, contrato, pagamento, atividade, nps_response, chat_opened, chat_closed.
Eventos de chat criados automaticamente por trigger `create_chat_timeline_event`.

## 0.7 Módulo: Backoffice Master

Apenas role `master`:
- CRUD tenants + provisionamento admin
- Listagem global usuários auth
- Reset senha, exclusão, limpeza órfãos (dry_run)
- Ghost Mode: impersonar tenant

## 0.8 CRM

### Empresas (contacts com is_company=true)
Dados: nome, fantasia, email, tel, CNPJ, endereço completo, MRR, contrato, renovação, setor, Health Score, NPS, cs_status, service_category, service_priority, custom_fields (JSONB), external_id.
Busca CNPJ via BrasilAPI. Importação CSV (papaparse) e via API (`import-external-data`, max 500/req).

### Pessoas (company_contacts)
Vinculadas a empresas. Dados: nome, email, tel, cargo, departamento, external_id, public_token, chat_total, chat_avg_csat, chat_last_at, custom_fields (JSONB).

## 0.9 Campos Customizáveis

Max 20 campos por tenant. Tabela `chat_custom_field_definitions`:
- `key` (identificador no payload), `label`, `field_type` (text/decimal/integer/date/url/boolean)
- `target`: company ou contact
- `maps_to`: coluna nativa opcional (ex: `mrr`, `contract_value`, `health_score`, `company_sector`, `company_document`)

**Fluxo**: developer envia `NPSChat.update({ mrr: 8500, plano: "Enterprise" })` → embed chama `resolve-chat-visitor` → backend separa: campos com `maps_to` → colunas nativas, demais → merge JSONB em `custom_fields` → atendente vê no painel lateral com formatação inteligente por tipo.

## 0.10 Portal do Cliente

Acesso público via `/portal/{public_token}` (sem autenticação):
- Visualiza dados do contato, empresa, histórico de conversas
- Inicia nova conversa, envia mensagens, avalia CSAT
- Respeita configs do tenant

## 0.11 API Keys

3 prefixos (12 chars exatos): `chat_` (widget/banners), `nps_` (pesquisas), `import_` (importação).
Validação: busca por prefixo + comparação SHA-256 hash completo. `last_used_at` atualizado a cada uso.

## 0.12 Internacionalização

pt-BR (padrão) e en. ~1260 chaves. Preferência no localStorage. Alternância via dropdown na sidebar.

## 0.13 Integração de Email

3 provedores: Default (interno), Gmail API (OAuth - recomendado), SMTP. Email de teste disponível.

## 0.14 Regras Transversais

1. **Isolamento**: tenant_id via trigger `set_tenant_id_from_user` / `set_tenant_id_from_owner` em toda inserção
2. **RLS**: todas tabelas com policies baseadas em `get_user_tenant_id(auth.uid())`
3. **Permissões**: 26+ módulos, hierarquia por ponto
4. **Auditoria**: created_at + updated_at em todas tabelas
5. **Notificações browser**: som + Notification API para msg de visitante em room não selecionado
6. **Persistência**: visitor_token no localStorage
7. **Duplicidade**: external_id único por tenant, email como fallback

## 0.15 Landing Pages

- `/` — ChatLandingPage (produto Chat)
- `/journey` — LandingPage (NPS/CS)
- Hero, features, diferenciais, demonstração visual, CTA, captura de leads

---

# PARTE 1 — CONFIGURAÇÃO BASE

## 1.1 index.html

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Journey CS — Plataforma de Customer Success</title>
    <meta name="description" content="Plataforma estratégica de Customer Success para governança de clientes, NPS e atendimento." />
    <meta name="author" content="Journey CS" />
    <meta property="og:title" content="Journey CS — Plataforma de Customer Success" />
    <meta property="og:description" content="Plataforma estratégica de Customer Success para governança de clientes, NPS e atendimento." />
    <meta property="og:type" content="website" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## 1.2 main.tsx

```tsx
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { LanguageProvider } from "./contexts/LanguageContext";

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);
```

## 1.3 App.tsx — Rotas Completas

Provider stack: `ThemeProvider > QueryClientProvider > LanguageProvider > TooltipProvider > BrowserRouter > AuthProvider`

```
Rotas públicas:
  /                    → ChatLandingPage
  /journey             → LandingPage
  /widget              → ChatWidget
  /pending-approval    → PendingApproval
  /portal/:token       → UserPortal
  /auth                → Auth
  /auth/forgot-password → ForgotPassword
  /auth/reset-password  → ResetPassword
  /nps/:token          → NPSResponse
  /embed               → NPSEmbed

Legacy redirects:
  /dashboard           → /nps/dashboard
  /contacts            → /nps/contacts
  /campaigns           → /nps/campaigns
  /campaigns/:id       → /nps/campaigns/:id
  /settings            → /nps/settings
  /csms                → /nps/settings

Protegidas (SidebarLayout):
  Chat:   /admin/dashboard, /admin/workspace, /admin/workspace/:roomId, /admin/attendants, /admin/settings, /admin/settings/:tab, /admin/gerencial, /admin/history, /admin/banners
  NPS:    /nps/dashboard, /nps/contacts, /nps/people, /nps/campaigns, /nps/campaigns/:id, /nps/settings, /nps/nps-settings
  CS:     /cs-dashboard, /cs-trails, /cs-health, /cs-churn, /cs-financial
  Profile: /profile
  Master:  /backoffice

  *       → NotFound
```

## 1.4 Design System CSS (index.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 220 20% 97%;
    --foreground: 222 25% 12%;
    --card: 0 0% 100%;
    --card-foreground: 222 25% 12%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 25% 12%;
    --primary: 14 95% 55%;            /* Growth Coral */
    --primary-foreground: 0 0% 100%;
    --secondary: 220 15% 94%;
    --secondary-foreground: 222 25% 12%;
    --muted: 220 15% 92%;
    --muted-foreground: 220 10% 45%;
    --accent: 207 80% 42%;            /* Metric Blue */
    --accent-foreground: 0 0% 100%;
    --destructive: 0 85% 55%;
    --destructive-foreground: 0 0% 100%;
    --success: 152 60% 40%;
    --warning: 40 85% 48%;
    --neutral: 220 10% 55%;
    --promoter: 152 60% 40%;
    --passive: 40 85% 48%;
    --detractor: 0 85% 55%;
    --border: 220 14% 85%;
    --input: 220 14% 85%;
    --ring: 207 80% 42%;
    --radius: 0.5rem;
    --sidebar-background: 220 20% 95%;
    --sidebar-foreground: 222 25% 15%;
    --sidebar-primary: 207 80% 42%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 220 15% 88%;
    --sidebar-accent-foreground: 222 25% 12%;
    --sidebar-border: 220 14% 82%;
    --sidebar-ring: 207 80% 42%;
    --gradient-hero: linear-gradient(135deg, hsl(224 47% 5%) 0%, hsl(222 22% 10%) 50%, hsl(224 47% 5%) 100%);
    --gradient-cosmic: radial-gradient(ellipse at 30% 50%, hsl(14 100% 67% / 0.08) 0%, transparent 60%);
    --shadow-sm: 0 1px 2px 0 hsl(0 0% 0% / 0.08);
    --shadow-md: 0 4px 6px -1px hsl(0 0% 0% / 0.1);
    --shadow-lg: 0 10px 20px -3px hsl(0 0% 0% / 0.12);
  }
}

@layer base {
  * { @apply border-border; }
  html, body, #root { height: 100%; margin: 0; padding: 0; }
  body {
    @apply bg-background text-foreground;
    font-family: 'Manrope', sans-serif;
    font-size: 15px; font-weight: 400; line-height: 1.6;
  }
  h1 { font-size: clamp(32px, 2.5vw, 40px); font-weight: 500; line-height: 1.2; }
  h2 { font-size: 20px; font-weight: 400; line-height: 1.4; }
  h3 { font-size: 18px; font-weight: 500; line-height: 1.4; }
}

.bg-dark-hero { background: var(--gradient-hero); position: relative; }
.bg-dark-hero::before { content: ''; position: absolute; inset: 0; background: var(--gradient-cosmic); pointer-events: none; }

/* Animations: fade-in-up, pulse-soft, float, fade-in, slide-up, scale-in */
/* Delay classes: delay-0 through delay-500 (100ms increments) */

html[data-embed], html[data-embed] body, html[data-embed] #root {
  background: transparent !important;
}
```

## 1.5 Tailwind Config

Fonte: Manrope. Cores: semantic tokens (hsl vars), literal palette (coral, metric-blue, growth-green, risk-yellow, danger-red, surface, surface-2, app-bg, sidebar-bg). Animations: accordion, fade-in, slide-up, scale-in. Plugin: tailwindcss-animate.

## 1.6 Dependências Principais

React 18, react-router-dom 6, @supabase/supabase-js 2, @tanstack/react-query 5, recharts 2, date-fns 3, date-fns-tz, papaparse 5, react-hook-form 7, zod, sonner, next-themes, lucide-react, shadcn/ui (50+ componentes Radix), embla-carousel-react, react-resizable-panels, vaul, vitest.

---

# PARTE 2 — AUTENTICAÇÃO E MULTI-TENANCY

## 2.1 AuthContext

Estado exportado: `user, isAdmin, isMaster, isChatEnabled, loading, userDataLoading, tenantId, permissions, hasPermission, availableTenants, selectTenant, needsTenantSelection, isImpersonating, impersonatedTenantName, setImpersonation, clearImpersonation`

Lógica:
- `loadUserData`: busca roles → determina master/admin → busca csm → busca permissions (se não admin) → busca ALL accepted profiles → se múltiplos tenants: busca nomes, usa savedTid ou primeiro → atualiza last_sign_in_at
- `effectiveTenantId`: impersonatedTenantId ?? tenantId
- `hasPermission`: admin=true sempre. Attendant: busca exata → hierarquia por ponto (split + slice)
- `selectTenant`: salva no localStorage + state
- `needsTenantSelection`: >1 tenant + sem tenantId + sem impersonação + não master

## 2.2 useAuth

Re-export: `export { useAuthContext as useAuth } from "@/contexts/AuthContext"`

## 2.3 LanguageContext

Lazy loading de traduções via `import(\`../locales/${language}.ts\`)`. Salva no localStorage.

---

# PARTE 3 — LAYOUT PROTEGIDO

## 3.1 SidebarLayout

- Redirect: se !user → /auth; se !tenantId && !isAdmin && !needsTenantSelection → /pending-approval
- Tela de seleção de tenant (se needsTenantSelection)
- Polling `process-chat-auto-rules` a cada 5 min (setTimeout recursivo, início 15s)
- Impersonation banner (amarelo) com botão "Sair"
- Multi-tenant switcher banner (se >1 tenant)
- Loading: logo-icon-dark.svg com animate-pulse

## 3.2 AppSidebar

Grupos condicionais: Backoffice (master), CS, NPS, Chat, Relatórios, Cadastros. Cada grupo verificado com `hasPermission`.
Workspace com sub-items: Não Atribuído + lista de atendentes com status dot (verde/amber/cinza) e badge de active_count.
Footer: perfil, settings, language dropdown, logout.
Collapsible state salvo no localStorage.

## 3.3 SidebarDataContext

Estado: `teamAttendants, totalActiveChats, unassignedCount, initialized`.
Init: busca attendant_profiles + chat_rooms(active/waiting), calcula counts.
Realtime: 2 canais permanentes (chat_rooms *, attendant_profiles *).
Patches cirúrgicos: INSERT/UPDATE/DELETE em rooms → incrementa/decrementa counters sem refetch.
Re-sync periódico: recount a cada 60s como safety net.

---

# PARTE 4 — HOOKS CRÍTICOS

## 4.1 useChatRealtime

3 hooks exportados:

**useChatMessages(roomId)**: Paginação (50 msgs), canal realtime INSERT por room_id. Retorna: messages, loading, hasMore, loadMore.

**useChatRooms(ownerUserId, options?)**: Busca rooms com visitors join, last_message, unread_count. Canais realtime: rooms (INSERT/UPDATE/DELETE com patches cirúrgicos), messages (som + Notification API para visitante em room não selecionado). Sort: unread first, then by last_message_at DESC. markRoomAsRead: upsert chat_room_reads + zera unread local.

**useAttendantQueues()**: Lista attendant_profiles com active_count/waiting_count. Rooms unassigned. Canal realtime para refetch.

## 4.2 useDashboardStats

Filtros: period/attendantId/status/priority/categoryId/tagId. Calcula: totalChats, chatsToday, avgCsat, resolutionRate, avgResolutionMinutes, avgFirstResponseMinutes, chartData (by day), csatByDay, chatsByHour (24h), attendantPerformance, resolutionDistribution. Auto-refresh 30s.

## 4.3 useChatHistory

Filtros: resolutionStatus, attendantId, tagId, search, csatFilter, dateFrom, dateTo. Paginação 20/página. Enriquece com visitor names, attendant names, tags. exportToCSV.

## 4.4 useAttendants

Lista attendant_profiles com CRUD de status. Retorna: attendants, loading, refetch, updateStatus.

---

# PARTE 5 — BANCO DE DADOS

## 5.1 Enums

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'master', 'attendant');
CREATE TYPE public.trail_type AS ENUM ('default', 'delayed', 'attention', 'nps');
CREATE TYPE public.timeline_event_type AS ENUM ('meeting', 'email', 'call', 'contract', 'payment', 'activity', 'nps_response', 'chat_opened', 'chat_closed');
```

## 5.2 Tabelas (40)

Principais: tenants, user_profiles, user_roles, user_permissions, user_email_settings, user_notification_settings, contacts, company_contacts, campaigns, campaign_contacts, campaign_sends, responses, brand_settings, api_keys, csms, attendant_profiles, chat_visitors, chat_rooms, chat_messages, chat_room_reads, chat_room_tags, chat_tags, chat_settings, chat_custom_fields, chat_custom_field_definitions, chat_macros, chat_auto_rules, chat_business_hours, chat_service_categories, chat_teams, chat_team_members, chat_category_teams, chat_assignment_configs, chat_banners, chat_banner_assignments, timeline_events, trails, trail_templates, trail_template_activities, trail_activity_logs, leads.

## 5.3 Database Functions e Triggers (19)

| Função | Propósito |
|--------|-----------|
| `has_role(_user_id, _role)` | Verifica role do usuário |
| `is_master(_user_id)` | Verifica se é master |
| `get_user_tenant_id(_user_id)` | Retorna tenant_id do perfil |
| `set_tenant_id_from_user()` | Trigger: auto-preenche tenant_id via user_id |
| `set_tenant_id_from_owner()` | Trigger: auto-preenche tenant_id via owner_user_id |
| `update_updated_at_column()` | Trigger: atualiza updated_at |
| `assign_chat_room()` | Trigger BEFORE INSERT: Round Robin / Least Busy |
| `decrement_attendant_active_conversations()` | Trigger: decrementa ao fechar room |
| `decrement_on_room_delete()` | Trigger: decrementa ao deletar room |
| `sync_csm_chat_enabled()` | Trigger: cria/remove attendant_profile ao toggle is_chat_enabled |
| `sync_attendant_display_name()` | Trigger: sincroniza display_name CSM → attendant |
| `update_company_contact_chat_metrics()` | Trigger: atualiza chat_total/avg_csat/chat_last_at |
| `create_chat_timeline_event()` | Trigger: cria evento timeline ao abrir/fechar chat |
| `update_contact_nps_on_response()` | Trigger: atualiza health_score, cria timeline, completa trilha NPS |
| `create_recovery_trail_for_detractor()` | Trigger: cria trilha recuperação para score ≤ 6 |
| `create_nps_trail_on_campaign_contact()` | Trigger: cria trilha NPS ao adicionar contato |
| `update_nps_trail_on_email_sent()` | Trigger: progresso 50% quando email enviado |
| `update_campaign_send_response()` | Trigger: atualiza campaign_sends.response_at |
| `update_chat_assignment_configs_updated_at()` | Trigger: updated_at em configs |

## 5.4 RLS

Padrão: `tenant_id = get_user_tenant_id(auth.uid())` para todas as operações CRUD. Exceções:
- Master: `is_master(auth.uid())` para SELECT global
- Anon: `true` para SELECT público (contacts, campaigns, campaign_contacts, chat_visitors, chat_rooms, chat_messages, banners ativos)
- Anon: `true` para INSERT público (chat_visitors, chat_rooms, chat_messages, responses, leads)
- Anon: `true` para UPDATE público (chat_rooms, chat_banner_assignments)

## 5.5 Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendant_profiles;
```

`chat_rooms` com REPLICA IDENTITY FULL (para patches cirúrgicos com old values completos).

## 5.6 Storage

Buckets: `logos` (público), `chat-attachments` (público).

## 5.7 Migrations

52 migrations em ordem cronológica (20251003-20260224). Executar na ordem exata do timestamp.

---

# PARTE 6 — EDGE FUNCTIONS (14)

| Função | Linhas | Propósito |
|--------|--------|-----------|
| `resolve-chat-visitor` | 484 | Upsert centralizado visitor+contact+company com maps_to |
| `get-widget-config` | 137 | Config dinâmica do widget por api_key |
| `assign-chat-room` | 180 | Verifica horário comercial + atendentes disponíveis |
| `process-chat-auto-rules` | 192 | Regras automáticas: inatividade, auto-close |
| `backoffice-admin` | 276 | Operações master: provision, cleanup, invites |
| `process-automatic-campaigns` | 296 | Campanhas NPS automáticas |
| `send-nps-reminder` | 262 | Email NPS via Gmail API OAuth |
| `send-response-notification` | 336 | Notifica admin sobre respostas NPS |
| `check-nps-pending` | 196 | Verifica NPS pendente por api_key+external_id |
| `submit-embedded-response` | 160 | Submete resposta NPS via widget |
| `get-visitor-banners` | 156 | Busca banners ativos por visitor/api_key |
| `vote-banner` | 43 | Registra voto up/down |
| `import-external-data` | 375 | Importação em lote via API (max 500) |
| `test-email-config` | 344 | Testa config Gmail/SMTP |

Todas com `verify_jwt = false` no config.toml.

---

# PARTE 7 — SCRIPTS EMBED

## 7.1 nps-chat-embed.js (335 linhas)

Script IIFE que injeta chat widget (iframe) + banners (DOM direto) na página hospedeira.

**Atributos HTML do script tag**:
- `data-api-key` (obrigatório): chave com prefixo `chat_`
- `data-external-id` (opcional): identificador do usuário no sistema do cliente
- `data-position`: "left" | "right" (default: "right")
- `data-primary-color`: hex (default: "#7C3AED")
- `data-button-shape`: "circle" | "square" (default: "circle")
- `data-company-name`: nome exibido no header (default: "Suporte")

**Variáveis internas**: resolvedToken, resolvedName, resolvedEmail, resolvedOwnerUserId, resolvedCompanyContactId, resolvedContactId, resolvedAutoStart, resolvedNeedsForm, resolvedHasHistory, fieldDefinitions, widgetSettings, visitorProps, chatIframe.

**Fluxo de inicialização**: `fetchWidgetConfig()` → `resolveVisitor()` → `loadBanners()` + `createChatWidget()`

**API pública `window.NPSChat.update(props)`**:
- Acumula em visitorProps
- Forward via postMessage para iframe
- Se resolvedToken existe: chama resolve-chat-visitor em background para persistir

**Dimensionamento iframe**: Fechado 80x80px (bottom:20px, right/left:20px). Aberto 420x700px (bottom:0, right/left:0). Controlado via postMessage `chat-toggle`.

**RESERVED_KEYS** (não vão para custom_data): name, email, phone, company_id, company_name, user_id.

**supabaseUrl hardcoded**: `https://mfmkxpdufcbwydixbbbe.supabase.co` — DEVE ser atualizado ao migrar.

## 7.2 nps-widget.js (222 linhas)

Classe NPSWidget com init/show/hide/destroy. Auto-init via data attributes. Comunicação postMessage: nps-ready, nps-no-survey, nps-complete, nps-dismiss.

---

# SEÇÃO A — WIDGET DE CHAT (ChatWidget.tsx, ~1326 linhas)

## A.1 Fases (7)

form → history → waiting → active → csat → thanks → closed

## A.2 Inicialização

Lê URL params: embed, position, primaryColor, companyName, buttonShape, visitorToken, visitorName, ownerUserId, companyContactId, contactId, apiKey, autoStart, needsForm, hasHistory.

Se embed=true: seta `document.documentElement.setAttribute("data-embed", "true")` para CSS transparente.

## A.3 widgetConfig

Busca `get-widget-config?api_key=...` para obter settings dinâmicos (show_email_field, show_phone_field, etc.).

## A.4 Regras de Comportamento

- autoStart=true + visitorToken → pula formulário
- hasHistory=true + show_chat_history → mostra lista de conversas
- Visitante pode enviar msg na fase waiting (antes da atribuição)
- CSAT: exibe se show_csat=true e room.csat_score é null, com opção "Pular"
- Arquivo: upload para bucket chat-attachments, mensagem com message_type="file" e metadata {fileName, fileSize, fileType, fileUrl}

## A.5 handleStartChat

Cria chat_visitor (se não existe) → cria chat_room (status: "waiting") → trigger assign_chat_room tenta atribuir → se atribuído: status "active" automaticamente.

## A.6 Realtime Subscriptions

Canal por room_id para INSERT em chat_messages. Canal para UPDATE em chat_rooms (detecta status change, attendant assignment).

## A.7 Comunicação postMessage

- `chat-toggle { isOpen }`: para resize do iframe pelo embed script
- `nps-chat-update { props }`: recebe dados do NPSChat.update()

## A.8 Renderização de Mensagens

Bolhas: visitante à direita (primary), atendente à esquerda (muted). Sistema: centralizado sem bolha. Timestamps HH:mm. Imagens inline. Arquivos com ícone + nome + tamanho.

---

# SEÇÃO B — SCRIPT EMBED DETALHADO

(Conteúdo completo do `nps-chat-embed.js` descrito na Parte 7.1 acima)

---

# SEÇÃO C — CAMPOS CUSTOMIZÁVEIS

## C.1 Tabela chat_custom_field_definitions

Colunas: id, tenant_id, user_id, key, label, field_type, target, maps_to, display_order, is_active, created_at.

## C.2 Colunas Mapeáveis (maps_to)

Colunas nativas da tabela `contacts` que podem ser alvo: mrr, contract_value, health_score, company_sector, company_document. Fallback via KNOWN_DIRECT no resolve-chat-visitor.

## C.3 Fluxo Payload → Banco

1. Developer envia `NPSChat.update({ mrr: 8500, plano: "Enterprise" })`
2. Embed separa: reserved keys (name, email, phone, company_id, company_name, user_id) → params diretos; demais → `custom_data`
3. `resolve-chat-visitor` recebe custom_data
4. Busca field definitions do tenant
5. Para cada key: se tem maps_to → coluna nativa; se tem KNOWN_DIRECT → coluna nativa; senão → merge em custom_fields JSONB

## C.4 Gestão (CustomFieldDefinitionsTab)

Admin configura até 20 campos. Interface: tabela com key, label, tipo, target, maps_to (select), display_order, is_active.

## C.5 Exibição (VisitorInfoPanel)

Formata por tipo: decimal → moeda BRL, url → link clicável, boolean → badge, date → formato local, integer → número.

---

# SEÇÃO D — get-widget-config

Edge function que retorna configuração dinâmica do widget por api_key:
- Valida api_key (prefix + SHA-256 hash)
- Busca tenant_id do owner
- Retorna: tenant_id, owner_user_id, fields (definições ativas), settings (show_email_field, show_phone_field, form_intro_text, company_name, show_chat_history, show_csat, allow_file_attachments, allow_multiple_chats, banners config, waiting_message, primary_color)

---

# SEÇÃO E — resolve-chat-visitor

## E.1 Input

POST body: api_key, external_id, name, email, phone, company_id, company_name, custom_data.

## E.2 Validação

api_key obrigatória. Valida prefix (12 chars) + SHA-256 hash. Atualiza last_used_at.

## E.3 Árvore de decisão

1. Sem external_id + com name+email → busca company_contact por email → se encontra: auto_start=true
2. Sem external_id + sem name+email → retorna user_id + needs_form=true
3. Com external_id → busca company_contact por external_id+user_id
   - Encontrou → upsert dados, upsert company, find/create visitor → auto_start=true
   - Não encontrou + com name+email → cria company, cria company_contact, cria visitor → auto_start=true
   - Não encontrou + sem name+email → needs_form=true

## E.4 Helpers

- `findOrCreateVisitor`: busca por company_contact_id, atualiza dados, verifica histórico (count rooms)
- `upsertCompany`: busca por external_id → cria se não existe → aplica custom_data
- `applyCustomData`: separa maps_to vs custom_fields JSONB, faz merge

## E.5 Retorno

```json
{
  "visitor_token": "uuid",
  "visitor_name": "string",
  "visitor_email": "string",
  "contact_id": "uuid",
  "company_contact_id": "uuid",
  "user_id": "uuid",
  "auto_start": true,
  "has_history": true
}
```

---

# SEÇÃO F — INTEGRAÇÕES INTERNAS

## F.1 Vínculo Room → CRM

chat_rooms tem: contact_id (empresa), company_contact_id (pessoa), visitor_id. Preenchidos pelo resolve-chat-visitor.

## F.2 Sync via update()

NPSChat.update() → postMessage para iframe → resolve-chat-visitor em background → dados visíveis no VisitorInfoPanel em tempo real.

## F.3 Fluxo completo Cliente → Atendente

1. Cliente acessa site → embed carrega → fetchWidgetConfig → resolveVisitor → createChatWidget
2. Visitante preenche formulário (ou auto_start) → cria visitor + room
3. Trigger assign_chat_room → atribui atendente
4. Atendente vê room na sidebar (via SidebarDataContext realtime)
5. Atendente clica → useChatMessages carrega mensagens → VisitorInfoPanel carrega dados CRM
6. Conversa em tempo real via Realtime channels
7. Encerramento → trigger decrementa active_conversations → trigger cria timeline event → trigger atualiza chat metrics

## F.4 supabaseUrl hardcoded

Em `nps-chat-embed.js` linha 10: `var supabaseUrl = "https://mfmkxpdufcbwydixbbbe.supabase.co"` — ATUALIZAR ao migrar.

---

# SEÇÃO G — MAPA DO REPOSITÓRIO

## G.1 Árvore raiz

```
/
├── .lovable/plan.md              # Este blueprint
├── public/                        # Assets + scripts embed
│   ├── favicon.ico, favicon.svg
│   ├── logo-dark.{png,svg}, logo-light.{png,svg}
│   ├── logo-icon-dark.{png,svg}, logo-icon-light.{png,svg}
│   ├── nps-chat-embed.js         # *** CRÍTICO *** Script embed chat (335 linhas)
│   ├── nps-widget.js             # *** CRÍTICO *** Script embed NPS (222 linhas)
│   ├── placeholder.svg, robots.txt
├── src/                           # Frontend
├── supabase/                      # Backend
├── index.html, tailwind.config.ts, vite.config.ts, vitest.config.ts
├── tsconfig.json, tsconfig.app.json, tsconfig.node.json
├── components.json, eslint.config.js, postcss.config.js
```

## G.2 Árvore src/

```
src/
├── main.tsx, App.tsx, App.css, index.css, vite-env.d.ts
├── contexts/
│   ├── AuthContext.tsx            # *** CRÍTICO ***
│   ├── LanguageContext.tsx
│   └── SidebarDataContext.tsx     # *** CRÍTICO ***
├── hooks/
│   ├── useAuth.ts, useAttendants.ts
│   ├── useChatRealtime.ts        # *** CRÍTICO *** (534 linhas)
│   ├── useChatHistory.ts, useDashboardStats.ts
│   ├── use-mobile.tsx, use-toast.ts
├── integrations/supabase/         # AUTO-GERADO
│   ├── client.ts, types.ts
├── lib/utils.ts
├── locales/pt-BR.ts, en.ts       # ~1260 chaves cada
├── utils/chatUtils.ts, campaignUtils.ts
├── test/setup.ts
├── pages/ (34 arquivos)
│   ├── ChatWidget.tsx             # *** CRÍTICO *** (~1326 linhas)
│   ├── AdminWorkspace.tsx         # *** CRÍTICO ***
│   ├── Auth.tsx, ForgotPassword.tsx, ResetPassword.tsx, PendingApproval.tsx
│   ├── ChatLandingPage.tsx, LandingPage.tsx
│   ├── AdminDashboard.tsx, AdminDashboardGerencial.tsx
│   ├── AdminAttendants.tsx, AdminSettings.tsx, AdminChatHistory.tsx, AdminBanners.tsx
│   ├── Dashboard.tsx, Campaigns.tsx, CampaignDetails.tsx
│   ├── Contacts.tsx, People.tsx, Results.tsx
│   ├── CSDashboard.tsx, CSTrailsPage.tsx, CSHealthPage.tsx, CSChurnPage.tsx, CSFinancialPage.tsx, CSMsPage.tsx
│   ├── Settings.tsx, NPSSettings.tsx, MyProfile.tsx
│   ├── NPSResponse.tsx, NPSEmbed.tsx, UserPortal.tsx
│   ├── Backoffice.tsx             # *** CRÍTICO ***
│   ├── NotFound.tsx
│   └── __tests__/ChatWidget.test.tsx
├── components/
│   ├── SidebarLayout.tsx          # *** CRÍTICO ***
│   ├── AppSidebar.tsx             # *** CRÍTICO *** (494 linhas)
│   ├── CompanyCard/Form/DetailsSheet/ContactForm/ContactsList/Selector.tsx
│   ├── PersonDetailsSheet.tsx, QuickContactForm.tsx
│   ├── CustomFieldsDisplay/Editor.tsx
│   ├── BulkImportDialog.tsx, CNPJInput/Preview.tsx, PhoneInput.tsx
│   ├── NPSForm/HeatMap/WidgetPreview/WidgetTab.tsx, BrazilMap.tsx
│   ├── CampaignForm/Scheduler.tsx, DashboardMockup.tsx
│   ├── TeamSettings/OrganizationSettings/BrandSettings/EmailSettings/NotificationSettings Tab.tsx
│   ├── ApiKeysTab/ChatApiKeysTab/ImportApiKeysTab/ExternalApiTab.tsx
│   ├── UserPermissionsDialog.tsx
│   ├── chat/ (24 arquivos)
│   │   ├── VisitorInfoPanel.tsx   # *** CRÍTICO ***
│   │   ├── CustomFieldDefinitionsTab.tsx
│   │   ├── AssignmentConfigPanel.tsx
│   │   ├── ChatWidgetDocsTab.tsx
│   │   ├── ChatRoomList/MessageList/Input.tsx
│   │   ├── CloseRoomDialog/ReassignDialog/ProactiveChatDialog/ReadOnlyChatDialog.tsx
│   │   ├── WidgetPreview/ChatTagSelector/EmojiPicker/FileMessage.tsx
│   │   ├── AttendantsTab/TeamsTab/CategoriesTab/AutoMessagesTab.tsx
│   │   ├── BannerPreview/BannerRichEditor.tsx
│   │   └── __tests__/
│   ├── cs/ (6 arquivos) — CSKanbanBoard/Card, CSMetricsHeader, CompanyCSDetailsSheet, NPSTrailCard, TimelineComponent
│   ├── backoffice/ (5 arquivos) — TenantManagement, UserManagement, GlobalSettings/Metrics, Operations
│   ├── portal/ (3 arquivos) — PortalChatList/ChatView/CSATForm
│   ├── landing/ (4 arquivos) — LandingFeatures/Differentials/Kanban/Timeline
│   └── ui/ (50 componentes shadcn + metric-card.tsx + page-header.tsx)
```

## G.3 Árvore supabase/

```
supabase/
├── config.toml                    # AUTO-GERADO
├── migrations/ (52 arquivos)      # 20251003 → 20260224
└── functions/ (14 funções)
    ├── resolve-chat-visitor/      # *** CRÍTICO *** (484 linhas + test)
    ├── get-widget-config/         # 137 linhas
    ├── assign-chat-room/          # 180 linhas
    ├── process-chat-auto-rules/   # 192 linhas
    ├── backoffice-admin/          # 276 linhas
    ├── process-automatic-campaigns/ # 296 linhas
    ├── send-nps-reminder/         # 262 linhas + README
    ├── send-response-notification/ # 336 linhas
    ├── check-nps-pending/         # 196 linhas
    ├── submit-embedded-response/  # 160 linhas
    ├── get-visitor-banners/       # 156 linhas
    ├── vote-banner/               # 43 linhas
    ├── import-external-data/      # 375 linhas
    └── test-email-config/         # 344 linhas
```

## G.4 Referência Rápida

| Funcionalidade | Arquivo(s) |
|---|---|
| Rotas | src/App.tsx |
| Design system | src/index.css + tailwind.config.ts |
| Auth + multi-tenant | src/contexts/AuthContext.tsx |
| Layout protegido | src/components/SidebarLayout.tsx |
| Sidebar + badges | src/components/AppSidebar.tsx + src/contexts/SidebarDataContext.tsx |
| Widget chat (7 fases) | src/pages/ChatWidget.tsx |
| Workspace atendimento | src/pages/AdminWorkspace.tsx |
| Realtime chat | src/hooks/useChatRealtime.ts |
| Dashboard métricas | src/hooks/useDashboardStats.ts |
| Histórico + CSV | src/hooks/useChatHistory.ts |
| Painel atendente (CRM) | src/components/chat/VisitorInfoPanel.tsx |
| Campos customizáveis | src/components/chat/CustomFieldDefinitionsTab.tsx |
| Round Robin / Least Busy | src/components/chat/AssignmentConfigPanel.tsx |
| Kanban CS | src/pages/CSDashboard.tsx |
| Timeline | src/components/cs/TimelineComponent.tsx |
| Campanhas NPS | src/pages/Campaigns.tsx + CampaignDetails.tsx |
| Portal cliente | src/pages/UserPortal.tsx + src/components/portal/* |
| Backoffice master | src/pages/Backoffice.tsx + src/components/backoffice/* |
| Script embed chat | public/nps-chat-embed.js |
| Script embed NPS | public/nps-widget.js |
| Resolver visitante | supabase/functions/resolve-chat-visitor/ |
| Config widget | supabase/functions/get-widget-config/ |
| Atribuição automática | supabase/functions/assign-chat-room/ |
| Regras automáticas | supabase/functions/process-chat-auto-rules/ |
| Traduções | src/locales/pt-BR.ts, src/locales/en.ts |

## G.5 Arquivos AUTO-GERADOS (não editar)

.env, supabase/config.toml, src/integrations/supabase/client.ts, src/integrations/supabase/types.ts

## G.6 Arquivos que PRECISAM atualização ao migrar

| Arquivo | O que mudar |
|---|---|
| public/nps-chat-embed.js | `var supabaseUrl = "https://..."` → nova URL |
| public/nps-widget.js | BASE_URL se hospedado em domínio diferente |

## G.7 Ordem de Leitura Recomendada

1. index.html → 2. index.css → 3. tailwind.config.ts → 4. main.tsx → 5. App.tsx → 6. AuthContext.tsx → 7. SidebarLayout.tsx → 8. AppSidebar.tsx → 9. SidebarDataContext.tsx → 10. useChatRealtime.ts → 11. ChatWidget.tsx → 12. nps-chat-embed.js → 13. resolve-chat-visitor → 14. get-widget-config → 15. VisitorInfoPanel.tsx → 16. CustomFieldDefinitionsTab.tsx → 17. migrations/ (em ordem)

## G.8 Contagem: ~270 arquivos

## G.9 Instrução para novo Lovable

> "Replique INTEGRALMENTE todos os arquivos listados na Seção G. Arquivos *** CRÍTICO *** primeiro. Arquivos em src/integrations/supabase/ e .env serão auto-gerados. Os 52 arquivos em supabase/migrations/ devem ser executados em ordem cronológica exata. Scripts em public/ precisam ter supabaseUrl atualizado."
