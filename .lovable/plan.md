
# Relatorio de Revisao de Design - Plataforma Journey CS

## Resumo Executivo

A plataforma Journey CS possui uma base funcional solida com modulos de NPS, Chat, Customer Success e Backoffice. Porem, ha oportunidades significativas de melhoria em consistencia visual, hierarquia de informacao, densidade de tela e padroes de interacao. Este relatorio organiza as melhorias por area e prioridade.

---

## 1. SIDEBAR E NAVEGACAO

### Problemas Identificados
- Logo com 80px de altura (`h-20`) ocupa espaco excessivo no header da sidebar
- Grupos colapsaveis (NPS, Chat, Reports) usam `Collapsible` dentro de `SidebarMenuItem`, causando warning de DOM nesting (`li` dentro de `li`)
- Labels de grupo com `text-[10px]` sao muito pequenas, prejudicando legibilidade
- Item ativo usa borda esquerda de 3px (`border-l-[3px]`), mas o indicador visual e sutil demais em tema claro
- Badges de contagem (chats ativos) usam `text-[9px]`, quase ilegivel
- Footer com seletor de idioma e botao de logout tem interacao confusa (dropdown dentro de dropdown)

### Melhorias Propostas
- Reduzir logo para `h-10` (expandida) e `h-8` (colapsada), liberando ~60px verticais
- Corrigir nesting de DOM removendo `Collapsible` de dentro de `SidebarMenuItem`
- Aumentar labels de grupo para `text-[11px]` com `letter-spacing: 0.08em`
- Substituir borda esquerda por fundo com opacidade mais forte (`bg-primary/12`) + borda esquerda `2px` com cor primaria
- Badges minimas com `text-[10px]` e `min-w-[18px]` para garantir toque acessivel
- Simplificar footer: avatar + nome com menu dropdown unico contendo idioma, perfil e logout

---

## 2. HEADER E LAYOUT PRINCIPAL

### Problemas Identificados
- Header interno (`h-14`) contem apenas o `SidebarTrigger`, desperdicando espaco horizontal
- Nao ha breadcrumbs, dificultando orientacao em paginas aninhadas (ex: Campanha > Detalhes)
- Banner de impersonacao e multi-tenant empilham verticalmente sem limite, empurrando conteudo
- Area de conteudo usa `p-6` fixo, sem responsividade para telas menores

### Melhorias Propostas
- Adicionar breadcrumbs ao header com nome da pagina atual e caminho de navegacao
- Mover notificacoes/alertas globais para o header (ex: chats nao atribuidos)
- Unificar banners de impersonacao e multi-tenant em uma unica barra compacta
- Usar `p-4 md:p-6 lg:p-8` para padding responsivo

---

## 3. PAGINA DE LOGIN (Auth.tsx)

### Problemas Identificados
- Usa `bg-dark-hero` (fundo escuro) enquanto o sistema e 100% tema claro — inconsistencia visual
- Card usa `bg-card/80 backdrop-blur-xl` que faz sentido em dark mas parece lavado no claro
- Nao ha ilustracao ou elemento visual que transmita a identidade do produto
- Campos de formulario sem icones inline, contrastando com o widget redesenhado

### Melhorias Propostas
- Trocar `bg-dark-hero` por um gradiente claro sutil (ex: `from-background to-muted/30`)
- Card com `bg-card shadow-lg border` solido, sem backdrop-blur
- Adicionar icones inline nos inputs (Mail, Lock) seguindo o padrao do widget
- Adicionar ilustracao ou gradiente decorativo lateral para telas > 1024px (split layout)

---

## 4. DASHBOARD NPS (Dashboard.tsx)

### Problemas Identificados
- 909 linhas em um unico arquivo — componente monolitico dificil de manter
- Filtro de modo de visualizacao (campanha/contato) usa `<select>` nativo, quebrando consistencia com `Select` do design system
- 6 stat cards em uma linha, sem hierarquia — NPS Score deveria ter destaque visual
- Dialog de detalhes do contato usa layout denso sem separacao clara de secoes
- Grafico de pizza (NPS) repete informacao ja presente nos stat cards
- Busca de contatos no dashboard e redundante com a pagina de Contatos

### Melhorias Propostas
- Extrair componentes: `NPSStatsGrid`, `NPSPieChart`, `RecentResponsesList`, `ContactSearchDialog`
- Substituir `<select>` nativo pelo componente `Select` do design system
- Destacar NPS Score com card maior (col-span-2) e cor condicional (verde/amarelo/vermelho)
- Remover busca de contatos do dashboard, linkando para a pagina de Contatos
- Adicionar sparkline ou mini-grafico de tendencia no card de NPS Score

---

## 5. PAGINA DE CONTATOS (Contacts.tsx)

### Problemas Identificados
- 7 filtros em uma linha causam overflow horizontal em telas < 1440px
- Filtros de Health Score e NPS aparecem mesmo quando nenhuma empresa tem esses dados
- Cards de empresa mostram ID truncado com botao de copiar — informacao tecnica desnecessaria para maioria dos usuarios
- Nao ha paginacao — todas as empresas carregam de uma vez
- PageHeader nao usa o componente `PageHeader` (usa `<h1>` e `<p>` direto)

### Melhorias Propostas
- Agrupar filtros em um `FilterBar` colapsavel com botao "Mais filtros"
- Esconder filtros de Health/NPS quando nenhuma empresa possui dados
- Remover ID visivel do `CompanyCard`, mover para `CompanyDetailsSheet`
- Implementar paginacao ou scroll infinito (limite de 50 por pagina)
- Usar componente `PageHeader` consistentemente

---

## 6. WORKSPACE DE CHAT (AdminWorkspace.tsx)

### Problemas Identificados
- 578 linhas — outro componente monolitico
- Lista de salas e painel de chat divididos por `ResizablePanelGroup` sem larguras minimas, podendo colapsar paineis
- Status de sala ("active", "waiting") exibido em ingles no badge
- Toolbar de acoes (Transferir, Tags, Fechar) mistura botoes de tamanhos diferentes
- Painel de informacoes do visitante (`VisitorInfoPanel`) nao tem scroll independente
- Nao ha indicador visual de mensagens nao lidas na lista de salas

### Melhorias Propostas
- Definir `minSize` nos paineis (lista: min 280px, chat: min 400px, info: min 260px)
- Traduzir status de sala para pt-BR nos badges
- Padronizar toolbar com botoes `size="sm"` e icones consistentes
- Adicionar scroll independente no `VisitorInfoPanel` com `overflow-y-auto`
- Adicionar badge de "nao lido" com ponto azul na lista de salas

---

## 7. KANBAN CS (CSDashboard + CSKanbanBoard)

### Problemas Identificados
- Colunas do Kanban nao tem altura maxima, causando scroll vertical extenso
- Drag and drop nativo (sem biblioteca) pode falhar em touch/mobile
- Cards do Kanban nao mostram informacao suficiente (falta MRR, CSM responsavel)
- Nao ha filtro por CSM ou busca dentro do Kanban

### Melhorias Propostas
- Limitar altura das colunas com `max-h-[calc(100vh-280px)]` e scroll interno
- Adicionar busca inline acima do Kanban
- Enriquecer cards com avatar do CSM, MRR e ultimo NPS em formato compacto
- Adicionar filtro por CSM no header da pagina

---

## 8. PAGINA DE RESULTADOS (Results.tsx)

### Problemas Identificados
- Titulo usa `text-4xl font-bold` — inconsistente com `PageHeader` (que usa `text-2xl font-semibold`)
- Cards de resposta nao tem agrupamento visual por tipo (promotor/neutro/detrator)
- Nao ha paginacao — todas as respostas carregam de uma vez
- Nao usa o componente `PageHeader`

### Melhorias Propostas
- Usar `PageHeader` para consistencia
- Adicionar abas ou filtros rapidos por tipo (Promotor/Neutro/Detrator)
- Implementar paginacao com "Carregar mais" (20 por vez)
- Adicionar indicador de contagem por tipo no topo

---

## 9. CONFIGURACOES (Settings.tsx)

### Problemas Identificados
- Tabs com `hidden sm:inline` escondem labels em mobile, mostrando so icones sem tooltip
- Apenas 3 abas — layout subutilizado
- Nenhuma descricao ou ajuda contextual nas abas

### Melhorias Propostas
- Adicionar tooltips nos icones de tabs em mobile
- Adicionar descricao breve abaixo de cada titulo de aba
- Considerar layout de lista lateral para desktop (sidebar settings pattern)

---

## 10. PERFIL (MyProfile.tsx)

### Problemas Identificados
- Card de status de chat e card de perfil sao componentes separados sem conexao visual
- Titulo usa `text-2xl font-bold` — inconsistente com o resto (que usa `font-semibold`)
- Botao "Salvar" no final da pagina, longe dos campos editados
- Nao ha feedback de campos alterados (dirty state)

### Melhorias Propostas
- Unificar em um unico card com secoes separadas por `Separator`
- Padronizar titulo com `PageHeader`
- Adicionar botao "Salvar" fixo no topo quando ha alteracoes pendentes
- Adicionar indicador visual de campos modificados

---

## 11. COMPONENTES UI GLOBAIS

### Problemas Identificados
- `MetricCard` usa `border-white/[0.06]` — heranca de tema escuro, invisivel no claro
- `Button` variants `outline` e `secondary` usam `border-white/15` e `bg-white/5` — inadequados para tema claro
- Loading states inconsistentes: alguns usam `Loader2 animate-spin`, outros usam `border-b-2 border-primary` circular
- Cards usam `shadow-sm` globalmente, sem variacao para cards interativos vs informativos
- `PageHeader` e usado em ~60% das paginas; as demais usam markup manual diferente

### Melhorias Propostas
- Corrigir `MetricCard`: trocar `border-white/[0.06]` por `border-border`
- Corrigir `Button` variants para tema claro:
  - `outline`: `border-border bg-transparent hover:bg-muted/50`
  - `secondary`: `bg-secondary text-secondary-foreground hover:bg-secondary/80`
  - `ghost`: `hover:bg-muted/50`
- Padronizar loading com componente `Spinner` reutilizavel
- Usar `PageHeader` em TODAS as paginas internas
- Cards interativos: `hover:shadow-md transition-shadow`; cards informativos: `shadow-sm` estatico

---

## 12. RESPONSIVIDADE

### Problemas Identificados
- Sidebar colapsada usa icone de 80x80px — desproporcional
- Kanban CS nao tem scroll horizontal em telas < 1024px
- Filtros de Contacts transbordam horizontalmente
- Workspace de chat em mobile perde acoes importantes (Tags, Transferir ficam em Sheet)
- Tabelas do dashboard (AdminDashboard) nao tem scroll horizontal

### Melhorias Propostas
- Icone colapsado: `h-8 w-8`
- Kanban: `overflow-x-auto` com `min-w-[200px]` por coluna
- Filtros: drawer/popover "Filtros" em mobile
- Tabelas: `overflow-x-auto` com `min-w-[600px]`

---

## Prioridades de Implementacao

| Prioridade | Area | Impacto |
|-----------|------|---------|
| Alta | Corrigir Button/MetricCard para tema claro | Visual quebrado em todo o sistema |
| Alta | Padronizar PageHeader em todas as paginas | Consistencia visual |
| Alta | Corrigir Auth.tsx (login) para tema claro | Primeira impressao do usuario |
| Media | Sidebar: reduzir logo, corrigir nesting DOM | UX de navegacao |
| Media | Contatos: agrupar filtros, paginacao | Usabilidade com volume de dados |
| Media | Workspace: minSize paineis, traduzir status | UX do atendente |
| Media | Dashboard NPS: extrair componentes, destacar NPS | Legibilidade e manutencao |
| Baixa | Kanban: scroll colunas, filtro CSM | UX com muitas empresas |
| Baixa | Responsividade geral | Usuarios mobile |
| Baixa | Settings: tooltips mobile, layout lateral | Refinamento |

---

## Resumo Tecnico

**Arquivos impactados**: ~25 arquivos entre pages e components
**Sem mudanca de banco de dados**: todas as melhorias sao puramente frontend
**Abordagem**: implementar por prioridade, comecando pelas correcoes de tema claro nos componentes base (Button, MetricCard) que propagam para todo o sistema

