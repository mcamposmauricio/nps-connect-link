

# Consolidar Blueprint Definitivo em .lovable/plan.md

## O que sera feito

Substituir o conteudo atual do `.lovable/plan.md` (que ainda contem o plano antigo de atualizacao da documentacao do widget) pelo **Blueprint Definitivo Consolidado** do sistema Journey CS, unificando todas as 7 secoes construidas ao longo da conversa em um unico documento.

## Estrutura do documento final

O arquivo tera a seguinte organizacao:

```text
SECAO 0 — ESPECIFICACAO FUNCIONAL E REGRAS DE NEGOCIO
  0.1  Visao Geral do Produto
  0.2  Papeis e Perfis de Acesso (Master/Admin/Attendant)
  0.3  Fluxo de Onboarding (convite, aceite, provisionamento)
  0.4  Modulo Chat (widget, workspace, atribuicao, auto-rules, horarios, banners, dashboard, historico)
  0.5  Modulo NPS (campanhas, widget, notificacoes, triggers)
  0.6  Modulo Customer Success (kanban, trilhas, timeline, relatorios)
  0.7  Modulo Backoffice Master (tenants, usuarios, operacoes)
  0.8  CRM (empresas, pessoas, CNPJ)
  0.9  Campos Customizaveis (definicao, fluxo, exibicao)
  0.10 Portal do Cliente
  0.11 API Keys (prefixos, validacao)
  0.12 Internacionalizacao
  0.13 Integracao de Email (Gmail/SMTP)
  0.14 Regras Transversais
  0.15 Landing Pages

PARTE 1 — CONFIGURACAO BASE
  1.1 index.html (completo)
  1.2 main.tsx (completo)
  1.3 App.tsx — rotas completas
  1.4 Design System CSS (index.css completo)
  1.5 Tailwind Config (completo)
  1.6 Dependencias (package.json)

PARTE 2 — AUTENTICACAO E MULTI-TENANCY
  2.1 AuthContext (logica completa)
  2.2 useAuth
  2.3 LanguageContext

PARTE 3 — LAYOUT PROTEGIDO
  3.1 SidebarLayout
  3.2 AppSidebar
  3.3 SidebarDataContext

PARTE 4 — HOOKS CRITICOS
  4.1 useChatRealtime
  4.2 useDashboardStats
  4.3 useChatHistory
  4.4 useAttendants

PARTE 5 — BANCO DE DADOS
  5.1 Enums
  5.2 40 Tabelas
  5.3 Database Functions e Triggers (19 funcoes)
  5.4 RLS completo
  5.5 Realtime
  5.6 Storage
  5.7 52 Migrations

PARTE 6 — EDGE FUNCTIONS (14 funcoes)

PARTE 7 — SCRIPTS EMBED
  7.1 nps-chat-embed.js (completo)
  7.2 nps-widget.js (completo)

SECAO A — WIDGET DE CHAT (ChatWidget.tsx)
  A.1 Fases (7)
  A.2 Inicializacao
  A.3 widgetConfig
  A.4 Regras de Comportamento
  A.5 handleStartChat
  A.6 Realtime Subscriptions
  A.7 Comunicacao postMessage
  A.8 Renderizacao de Mensagens

SECAO B — SCRIPT EMBED DETALHADO
  B.1 Atributos HTML
  B.2 Variaveis Internas
  B.3 Fluxo de Inicializacao
  B.4 buildResolverPayload
  B.5 API Publica NPSChat.update()
  B.6 Parametros da URL do iframe
  B.7 Dimensionamento
  B.8 Banners DOM

SECAO C — CAMPOS CUSTOMIZAVEIS
  C.1 Tabela chat_custom_field_definitions
  C.2 Colunas Mapeaveis (maps_to)
  C.3 Fluxo Payload -> Banco
  C.4 Gestao (CustomFieldDefinitionsTab)
  C.5 Exibicao (VisitorInfoPanel)

SECAO D — get-widget-config (detalhado)

SECAO E — resolve-chat-visitor (detalhado)
  E.1-E.6 Input, arvore decisao, helpers, retorno

SECAO F — INTEGRACOES INTERNAS
  F.1 Vinculo Room -> CRM
  F.2 Sync via update()
  F.3 Fluxo completo Cliente -> Atendente
  F.4 supabaseUrl hardcoded

SECAO G — MAPA DO REPOSITORIO GITHUB
  G.1 Arvore raiz
  G.2 Arvore src/ (completa com anotacoes)
  G.3 Arvore supabase/ (52 migrations + 14 functions)
  G.4 Tabela de referencia rapida
  G.5 Arquivos auto-gerados
  G.6 Arquivos que precisam atualizacao ao migrar
  G.7 Ordem de leitura recomendada
  G.8 Contagem de arquivos (~270)
  G.9 Instrucao para o novo Lovable
```

## Conteudo

O conteudo e exatamente o que foi construido e aprovado nas 6 iteracoes anteriores da conversa, consolidado em um unico arquivo. Nenhuma informacao nova sera inventada — apenas a unificacao de todo o material ja validado.

## Arquivo afetado

Apenas `.lovable/plan.md` — substituicao completa do conteudo atual pelo blueprint consolidado.

