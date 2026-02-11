

# Melhorias Detalhadas: Dashboard, Workspace e Historico

Revisao completa das tres abas principais do modulo de atendimento, com foco em usabilidade, agilidade e visibilidade de informacoes criticas.

---

## A. DASHBOARD (Painel de Atendimento)

### A1. Auto-refresh periodico dos KPIs
**Problema:** Os KPIs (conversas ativas, na fila, CSAT) so atualizam no carregamento inicial. O supervisor precisa recarregar a pagina manualmente para ver dados atualizados.

**Solucao:** Adicionar um `setInterval` de 30 segundos no `useDashboardStats` para refazer o fetch automaticamente. Exibir um indicador "Atualizado ha Xmin" no canto do header.

### A2. Variacao percentual nos KPIs (delta)
**Problema:** Os cards de metricas mostram apenas o valor absoluto, sem contexto de tendencia. O supervisor nao sabe se esta melhorando ou piorando.

**Solucao:** Calcular a variacao em relacao ao periodo anterior (ex: "hoje vs ontem", "semana vs semana anterior") e exibir um badge de seta verde (melhora) ou vermelha (piora) ao lado do valor.

### A3. Conversas por atendente com link para o room
**Problema:** A tabela de Status em Tempo Real mostra contadores de conversas ativas por atendente, mas nao permite acessar as salas. O supervisor precisa navegar ate o workspace para encontrar a conversa.

**Solucao:** Adicionar uma sub-lista expansivel em cada linha de atendente mostrando as salas ativas/na fila com nome do visitante, tempo de espera e botao "Ver" (que abre no ReadOnlyChatDialog ou navega para o workspace se for a propria).

### A4. Barra de capacidade visual nos atendentes
**Problema:** A tabela mostra "Ativas" e "Capacidade" como numeros separados. A leitura e lenta para identificar quem esta sobrecarregado.

**Solucao:** Substituir as colunas "Ativas" e "Capacidade" por uma barra de progresso (ex: `3/5`) com cor: verde (< 60%), amarelo (60-80%), vermelho (> 80%).

### A5. Filtro de periodo nao afeta a tabela de tempo real
**Problema:** Os filtros de periodo/status/prioridade afetam os KPIs mas a tabela de "Status em Tempo Real" e a "Fila Geral" sempre mostram dados atuais. Isso pode confundir o supervisor.

**Solucao:** Adicionar uma separacao visual clara (titulo de secao ou divider) entre "Metricas do Periodo" e "Status em Tempo Real", deixando explicito que sao dados de contextos diferentes.

---

## B. WORKSPACE (Atendimento)

### B1. Busca de conversas na lista
**Problema:** Com muitas conversas abertas, o atendente nao tem como buscar por nome do visitante. Precisa rolar a lista inteira.

**Solucao:** Adicionar um campo de busca no topo do `ChatRoomList`, filtrando por `visitor_name` localmente.

### B2. Separador visual entre "waiting" e "active"
**Problema:** Salas com status "waiting" e "active" estao misturadas na mesma lista (ordenadas por unread e atividade recente). O atendente nao consegue distinguir rapidamente o que precisa de acao.

**Solucao:** Agrupar as salas em duas secoes visuais: "Na Fila" (waiting) no topo e "Ativas" abaixo, cada uma com um header leve. Manter a ordenacao inteligente dentro de cada grupo.

### B3. Indicador de digitacao ("typing")
**Problema:** O atendente nao sabe se o visitante esta digitando, o que causa respostas sobrepostas ou esperas desnecessarias.

**Solucao:** Implementar um canal de presenca Supabase Realtime. Quando o visitante digita, enviar um evento de "typing". Exibir "digitando..." na lista de salas e na area de mensagens com animacao de tres pontos.

### B4. Timestamps agrupados por dia nas mensagens
**Problema:** A lista de mensagens (`ChatMessageList`) mostra timestamps individuais em cada mensagem, mas sem separadores de dia. Em conversas longas, e dificil saber quando algo aconteceu.

**Solucao:** Inserir separadores visuais entre mensagens de dias diferentes (ex: "Hoje", "Ontem", "10/02/2026") como badges centralizados entre as mensagens.

### B5. Resposta rapida citando mensagem
**Problema:** Em conversas longas, o atendente nao consegue referenciar uma mensagem especifica do visitante para responder com contexto.

**Solucao:** Adicionar um botao de "Responder" (reply) ao hover de cada mensagem do visitante. Ao clicar, exibir um preview da mensagem citada acima do campo de input, que sera incluida no conteudo enviado como blockquote.

### B6. Contagem de mensagens totais no header
**Problema:** O header do chat mostra nome, status e duracao, mas nao da uma nocao do volume da conversa.

**Solucao:** Adicionar um contador discreto de mensagens (ex: "24 msgs") no header da conversa.

---

## C. HISTORICO

### C1. Visualizar transcricao completa
**Problema:** A tabela de historico mostra metadata das salas (ID, cliente, atendente, CSAT, datas) mas nao permite visualizar as mensagens da conversa. O unico jeito e copiar o ID e buscar de outra forma.

**Solucao:** Tornar cada linha clicavel (ou adicionar um botao "Ver") que abre o `ReadOnlyChatDialog` com as mensagens daquela sala. Isso ja existe no Dashboard e pode ser reutilizado.

### C2. Filtro por data (range)
**Problema:** O historico nao tem filtro por intervalo de datas. Se o supervisor quer ver conversas de uma semana especifica, nao consegue.

**Solucao:** Adicionar um DateRangePicker (usando o `Calendar` do shadcn) que filtra por `closed_at` ou `created_at`. Adicionar os campos `dateFrom` e `dateTo` ao `HistoryFilter`.

### C3. Coluna de duracao da conversa
**Problema:** A tabela mostra "Inicio" e "Encerramento" separados. Para calcular quanto tempo levou, o supervisor precisa fazer a conta mentalmente.

**Solucao:** Adicionar uma coluna "Duracao" calculada como `closed_at - created_at`, exibida como "32min" ou "1h45min".

### C4. Filtro por CSAT score
**Problema:** Nao ha como filtrar conversas por nota de CSAT. O supervisor que quer revisar atendimentos com CSAT baixo precisa percorrer tudo.

**Solucao:** Adicionar um Select com opcoes: "Todos", "1-2 (Ruim)", "3 (Neutro)", "4-5 (Bom)" que filtra pelo range de `csat_score`.

### C5. Destaque visual para CSAT baixo
**Problema:** A coluna CSAT mostra "3/5" como texto simples. Notas baixas (1-2) nao se destacam visualmente.

**Solucao:** Colorir o valor de CSAT: vermelho para 1-2, amarelo para 3, verde para 4-5. Adicionar um icone de estrela preenchida proporcional.

### C6. Exportacao paginada
**Problema:** O botao "Exportar CSV" exporta apenas os rooms carregados na pagina atual (20 por pagina). Se o supervisor quer exportar todos, nao consegue.

**Solucao:** Ao clicar em exportar, buscar TODAS as salas fechadas (respeitando filtros) em lotes de 100 e gerar o CSV completo. Exibir feedback de progresso durante a exportacao.

---

## Priorizacao

| # | Melhoria | Impacto | Esforco |
|---|---------|---------|---------|
| C1 | Visualizar transcricao no historico | Alto | Baixo |
| B1 | Busca na lista de conversas | Alto | Baixo |
| B2 | Separar waiting/active na lista | Alto | Baixo |
| A1 | Auto-refresh dos KPIs | Alto | Baixo |
| C3 | Coluna de duracao | Medio | Baixo |
| C5 | Destaque visual CSAT | Medio | Baixo |
| A4 | Barra de capacidade visual | Medio | Baixo |
| C2 | Filtro por data | Alto | Medio |
| B4 | Timestamps agrupados por dia | Medio | Baixo |
| A2 | Variacao percentual (delta) | Medio | Medio |
| C4 | Filtro por CSAT | Medio | Baixo |
| C6 | Exportacao completa | Medio | Medio |
| A3 | Conversas por atendente expansivel | Medio | Medio |
| B6 | Contagem de msgs no header | Baixo | Baixo |
| A5 | Separacao visual metricas vs realtime | Baixo | Baixo |
| B3 | Indicador de digitacao | Alto | Alto |
| B5 | Resposta citando mensagem | Medio | Alto |

---

## Detalhes Tecnicos

### Arquivos a serem modificados

| # | Arquivo | Melhorias |
|---|---------|-----------|
| 1 | `src/hooks/useDashboardStats.ts` | A1 (auto-refresh), A2 (variacao) |
| 2 | `src/pages/AdminDashboard.tsx` | A1, A2, A3, A4, A5 |
| 3 | `src/components/chat/ChatRoomList.tsx` | B1 (busca), B2 (agrupamento) |
| 4 | `src/components/chat/ChatMessageList.tsx` | B4 (timestamps), B5 (reply) |
| 5 | `src/pages/AdminWorkspace.tsx` | B3, B5, B6 |
| 6 | `src/pages/AdminChatHistory.tsx` | C1, C2, C3, C4, C5, C6 |
| 7 | `src/hooks/useChatHistory.ts` | C2 (dateRange), C4 (csatFilter), C6 (full export) |
| 8 | `src/hooks/useChatRealtime.ts` | B3 (typing channel) |

### C1 - Reutilizar ReadOnlyChatDialog

O componente `ReadOnlyChatDialog` ja existe e funciona. Basta adicionar estado local no `AdminChatHistory` e abrir o dialog ao clicar em uma linha:

```typescript
const [readOnlyRoom, setReadOnlyRoom] = useState<{ id: string; name: string } | null>(null);
// Na TableRow: onClick={() => setReadOnlyRoom({ id: room.id, name: room.visitor_name })}
```

### B2 - Agrupamento no ChatRoomList

```typescript
const waitingRooms = rooms.filter(r => r.status === "waiting");
const activeRooms = rooms.filter(r => r.status === "active");

return (
  <>
    {waitingRooms.length > 0 && (
      <>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1">
          Na Fila ({waitingRooms.length})
        </p>
        {waitingRooms.map(room => <RoomItem ... />)}
      </>
    )}
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1">
      Ativas ({activeRooms.length})
    </p>
    {activeRooms.map(room => <RoomItem ... />)}
  </>
);
```

### A1 - Auto-refresh

```typescript
useEffect(() => {
  const interval = setInterval(fetchStats, 30000);
  return () => clearInterval(interval);
}, [fetchStats]);
```

### C3 - Duracao calculada

```typescript
const duration = room.closed_at && room.created_at
  ? Math.floor((new Date(room.closed_at).getTime() - new Date(room.created_at).getTime()) / 60000)
  : null;
// Exibir: duration < 60 ? `${duration}min` : `${Math.floor(duration/60)}h${duration%60}min`
```

