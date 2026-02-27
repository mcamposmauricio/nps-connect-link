
# Auto-vinculacao Fila/Time Padrao + Checks apenas no Workspace

## Problema 1: Fila Padrao e Time Padrao nao estao vinculados automaticamente

Quando o sistema cria a "Fila Padrao" e o "Time Padrao" automaticamente, eles existem como entidades isoladas. Nao ha um registro em `chat_category_teams` conectando os dois, entao o motor de roteamento nao consegue encaminhar chats pela fila padrao para o time padrao.

### Solucao

Alterar `CategoriesTab.tsx`: apos criar a categoria padrao, verificar se o time padrao ja existe. Se sim, criar automaticamente o registro em `chat_category_teams` vinculando a categoria padrao ao time padrao.

Alterar `TeamsTab.tsx`: apos criar o time padrao, verificar se a categoria padrao ja existe. Se sim, criar automaticamente o registro em `chat_category_teams` vinculando-os.

Dessa forma, independente de qual aba o usuario abrir primeiro, a vinculacao sera criada assim que ambas as entidades existirem.

---

## Problema 2: Checks de entregue/lido estao no Widget (lado do visitante)

Atualmente o widget exibe checks de entregue (1 check) e lido (2 checks) nas mensagens do visitante. O pedido e remover esses checks do widget e mover para o workspace do atendente.

### Solucao

**Remover do Widget (`ChatWidget.tsx`):**
- Remover o estado `attendantLastReadAt` e toda a logica de rastreamento de `attendant_last_read_at` no canal Realtime
- Remover os SVGs de check/check duplo da renderizacao das mensagens do visitante (linhas ~1447-1460)

**Adicionar no Workspace (`ChatMessageList.tsx`):**
- Adicionar nova prop `visitorLastReadAt` ao componente
- Nas mensagens do atendente (`sender_type !== "visitor"` e `!= "system"`), exibir:
  - Um check unico = entregue (mensagem existe no banco, confirmada)
  - Check duplo = visitante visualizou (comparando `msg.created_at` com `visitorLastReadAt`)
- Os checks aparecem ao lado do timestamp, apenas nas mensagens do atendente

**Rastrear leitura do visitante (`chat_rooms` + Widget):**
- Adicionar coluna `visitor_last_read_at timestamptz` na tabela `chat_rooms` via migration
- No `ChatWidget.tsx`, quando o visitante esta com o chat aberto e recebe/visualiza mensagens, atualizar `visitor_last_read_at` com o timestamp atual
- No `AdminWorkspace.tsx`, passar o valor de `visitor_last_read_at` da sala selecionada para o `ChatMessageList` via prop, e subscrever atualizacoes Realtime desse campo

---

## Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| Migration SQL | Adicionar `visitor_last_read_at timestamptz` em `chat_rooms` |
| `src/components/chat/CategoriesTab.tsx` | Apos criar categoria padrao, vincular ao time padrao via `chat_category_teams` |
| `src/components/chat/TeamsTab.tsx` | Apos criar time padrao, vincular a categoria padrao via `chat_category_teams` |
| `src/pages/ChatWidget.tsx` | Remover checks de entregue/lido; adicionar update de `visitor_last_read_at` quando visitante visualiza mensagens |
| `src/components/chat/ChatMessageList.tsx` | Adicionar prop `visitorLastReadAt`; renderizar checks nas mensagens do atendente |
| `src/pages/AdminWorkspace.tsx` | Passar `visitor_last_read_at` da sala para ChatMessageList; subscrever updates Realtime |

---

## Fluxo resultante

```text
Categoria Padrao criada -> Verifica se Time Padrao existe -> Se sim, cria chat_category_teams
Time Padrao criado -> Verifica se Categoria Padrao existe -> Se sim, cria chat_category_teams

Novo atendente habilitado -> Vai para Time Padrao (ja implementado)
Nova empresa sem categoria -> Roteada pela Fila Padrao (ja implementado)
Fila Padrao + Time Padrao vinculados -> Roteamento funciona automaticamente

Widget: Visitante envia mensagem -> Sem checks visuais
Widget: Visitante abre/le chat -> Atualiza visitor_last_read_at
Workspace: Atendente ve mensagens proprias com 1 check (entregue) ou 2 checks (visitante leu)
```
