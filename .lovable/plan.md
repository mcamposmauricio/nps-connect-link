

# Revisao Completa do Chat: Melhorias de Funcionamento, Usabilidade e Experiencia

## 1. FUNCIONAMENTO (Bugs e Logica)

### 1.1 Paginacao de mensagens no Workspace
- `useChatMessages` carrega TODAS as mensagens de uma vez sem paginacao
- Implementar carregamento inicial de 50 mensagens + botao "Carregar anteriores" no topo do `ChatMessageList`
- Usar `.range(offset, offset + limit)` no Supabase query

### 1.2 Nome do atendente usa email truncado
- No `AdminWorkspace`, `sender_name` usa `user.email?.split("@")[0]` como fallback
- Buscar `display_name` do `attendant_profiles` ou `user_profiles` ao montar o workspace e usar como `sender_name` em todas as mensagens enviadas

### 1.3 Nota de encerramento usa email truncado
- Mesmo problema do 1.2, no `handleConfirmClose`
- Corrigir reutilizando o `display_name` ja carregado

### 1.4 Transferencia nao notifica o novo atendente
- Atualmente a mensagem de transferencia e `is_internal: true`
- Manter como `is_internal: true` (o visitante/cliente NAO deve ver)
- Garantir que a mensagem interna apareca para o novo atendente no workspace (ja funciona pois internals sao visiveis para atendentes)
- Nenhuma mensagem publica deve ser inserida sobre a transferencia

### 1.5 Contagem de unreads com limite visual
- Alterar o badge no `ChatRoomList` de cap 99 para cap **9** (exibir "9+" quando acima de 9)
- Linha afetada no `ChatRoomList.tsx`: trocar `unread > 99 ? "99+"` para `unread > 9 ? "9+"`

### 1.6 Polling de auto-rules fora do Workspace
- Mover o polling de `AdminWorkspace` para `SidebarLayout` (que esta sempre montado quando qualquer admin esta logado)
- Garantir que as regras de tempo rodem mesmo se ninguem estiver com o workspace aberto
- Remover o polling duplicado do `AdminWorkspace`

---

## 2. USABILIDADE (Interface Administrativa)

### 2.1 Busca expandida nas conversas
- Expandir o filtro do `ChatRoomList` para buscar tambem por `visitor_email`
- Adicionar opcao de busca por conteudo: fazer um contain de texto nas mensagens (busca em `last_message`)
- Implementar como um toggle ou dropdown junto ao campo de busca: "Buscar em: Nome | Email | Mensagens"

### 2.2 Indicador de "digitando"
- Usar Supabase Realtime Broadcast (canal por room) para enviar/receber eventos de "typing"
- Exibir "digitando..." abaixo da ultima mensagem no `ChatMessageList` e no `ChatRoomList`

### 2.3 Notificacao nativa do navegador
- Usar `Notification API` para alertar quando chega mensagem de visitante e a aba nao esta focada
- Pedir permissao ao usuario na primeira vez
- Exibir nome do visitante e preview da mensagem

### 2.4 Atalhos de teclado documentados
- Adicionar um botao "?" ou icone de teclado visivel na barra de ferramentas do `ChatInput`
- Ao clicar, exibir um popover/dialog com a lista de atalhos:
  - Enter: Enviar mensagem
  - Shift+Enter: Nova linha
  - Ctrl+Shift+I: Alternar nota interna
  - /: Abrir macros
- Posicionar de forma visivel e acessivel na area de digitacao

### 2.5 Painel de informacoes com botao de refresh manual
- Adicionar um botao de refresh (icone RefreshCw) no header do `VisitorInfoPanel`
- Ao clicar, re-executar o `fetchData` para atualizar dados de empresa, contato e timeline
- Sem nenhum refresh automatico, apenas manual

### 2.6 Transferencia mostra capacidade do atendente
- No `ReassignDialog`, buscar `active_conversations` e `max_conversations` do `attendant_profiles`
- Exibir como "3/5 conversas" ao lado do status Online/Offline
- Ajudar o atendente a tomar uma decisao informada

---

## 3. EXPERIENCIA DO USUARIO (Widget/Visitante)

### 3.1 Horario nas mensagens do Widget
- Adicionar `format(msg.created_at, "HH:mm")` abaixo de cada mensagem no `ChatWidget`

### 3.2 Estilo diferenciado para mensagens do sistema no Widget
- Mensagens com `sender_type === "system"` recebem estilo centralizado, sem bolha, texto menor e cor neutra
- Distinguir visualmente de mensagens humanas do atendente

### 3.3 Permitir envio de mensagens na fase "waiting"
- Habilitar o campo de input durante o status "waiting" para que o visitante possa fornecer contexto antes de ser atendido

### 3.4 Confirmacao visual de mensagem enviada
- Estado otimista: mensagem aparece imediatamente em estilo "pendente" (opacidade reduzida)
- Apos confirmacao do servidor, estilo normal

### 3.5 Opcao de pular CSAT
- Adicionar botao "Pular" na pesquisa de satisfacao que fecha a conversa sem avaliacao

### 3.6 Preview de ultima mensagem no historico
- Na lista de conversas anteriores do Widget/Portal, exibir a ultima mensagem truncada como preview

---

## 4. MELHORIAS NA CONFIGURACAO (AdminSettings)

### 4.1 Salvar automaticamente ao desativar/ativar switches
- Atualmente, ao alterar switches no card "Comportamento e Mensagens", o admin precisa scrollar ate o botao "Salvar" la embaixo
- Cada secao (Fora do Horario, Atendentes Ocupados, Formulario, Funcionalidades) deve ter seu proprio botao "Salvar" inline ou salvar automaticamente com debounce

### 4.2 Feedback visual de alteracoes nao salvas
- Adicionar indicador "unsaved changes" (dot ou asterisco) nas abas/secoes que foram editadas mas nao salvas
- Prevenir navegacao entre abas sem salvar (ou auto-salvar)

### 4.3 Preview do Widget atualiza em tempo real
- O `WidgetPreview` ja recebe props dos settings, mas nao reflete mudancas em "Comportamento e Mensagens" (ex: waiting_message, form_intro_text)
- Garantir que todas as propriedades editaveis atualizem o preview ao vivo

### 4.4 Organizacao visual da aba "Widget e Instalacao"
- O card "Comportamento e Mensagens" e muito longo com secoes misturadas
- Usar Accordion/Collapsible para cada secao (Fora do Horario, Ocupados, Formulario, Funcionalidades), permitindo expandir/colapsar
- Reduz scroll e melhora escaneabilidade

### 4.5 Horarios de atendimento com "Copiar para todos"
- Na aba Horarios, adicionar botao "Copiar para todos os dias ativos"
- Ao definir horario de um dia, poder replicar para os demais com um clique

### 4.6 Macros com preview de conteudo na tabela
- A tabela de macros mostra apenas titulo, atalho e categoria
- Adicionar coluna ou tooltip com preview truncado do conteudo para facilitar identificacao

### 4.7 Busca de macros na tabela de configuracao
- Com muitas macros, fica dificil encontrar
- Adicionar campo de busca/filtro acima da tabela de macros

### 4.8 Bug: double setLoading(false) no fetchAll
- Linha 153-155 do `AdminSettings.tsx` tem `setLoading(false)` duplicado
- Remover a duplicata

---

## 5. MELHORIAS TECNICAS

### 5.1 Query N+1 na Edge Function de auto-rules
- Reescrever para usar uma unica query com subquery que retorne a ultima mensagem nao-system de cada sala ativa
- Reduzir de ~150 queries para 2-3 queries por execucao

### 5.2 Deduplicacao de codigo de arquivos
- Extrair `renderFileMessage`, `formatFileSize`, `isImage`, `uploadFile` para `src/utils/chatUtils.ts`
- Reutilizar em Widget, Portal e Workspace

### 5.3 useChatMessages limpa ao trocar de sala
- Ao trocar `roomId`, limpar `setMessages([])` imediatamente antes do novo fetch para evitar flash de mensagens da sala anterior

---

## Secao Tecnica - Arquivos Afetados

| Arquivo | Alteracoes |
|---|---|
| `src/hooks/useChatRealtime.ts` | Paginacao de mensagens (1.1), limpeza ao trocar sala (5.3) |
| `src/components/chat/ChatRoomList.tsx` | Badge cap 9 (1.5), busca expandida (2.1) |
| `src/components/chat/ChatInput.tsx` | Botao de atalhos visivel (2.4) |
| `src/components/chat/VisitorInfoPanel.tsx` | Botao refresh manual (2.5) |
| `src/components/chat/ReassignDialog.tsx` | Exibir capacidade (2.6) |
| `src/components/chat/ChatMessageList.tsx` | Indicador digitando (2.2), paginacao (1.1) |
| `src/pages/AdminWorkspace.tsx` | Remover polling (1.6), sender_name fix (1.2/1.3), notificacoes (2.3), typing broadcast (2.2) |
| `src/components/SidebarLayout.tsx` | Adicionar polling de auto-rules (1.6) |
| `src/pages/AdminSettings.tsx` | Accordion nas secoes (4.4), salvar por secao (4.1), unsaved indicator (4.2), copiar horarios (4.5), busca macros (4.7), fix double setLoading (4.8) |
| `src/components/chat/AutoMessagesTab.tsx` | Sem alteracoes adicionais |
| `src/pages/ChatWidget.tsx` | Timestamps (3.1), estilo sistema (3.2), input na fase waiting (3.3), estado otimista (3.4), pular CSAT (3.5) |
| `supabase/functions/process-chat-auto-rules/index.ts` | Otimizar N+1 (5.1) |
| `src/utils/chatUtils.ts` | Novo arquivo com funcoes compartilhadas (5.2) |

## Resumo de Prioridades

| Prioridade | Item | Impacto |
|---|---|---|
| Alta | 1.1 Paginacao no Workspace | Performance |
| Alta | 1.5 Badge cap 9 | UX visual |
| Alta | 1.6 Polling no SidebarLayout | Confiabilidade |
| Alta | 3.1 Horario nas msgs do Widget | UX basica |
| Alta | 3.2 Estilo msg sistema | Clareza |
| Alta | 4.4 Accordion nas configuracoes | Usabilidade admin |
| Alta | 4.8 Fix double setLoading | Bug |
| Media | 1.2/1.3 Nome atendente correto | Profissionalismo |
| Media | 2.1 Busca expandida com contain | Produtividade |
| Media | 2.2 Indicador digitando | UX conversacional |
| Media | 2.3 Notificacoes nativas | Produtividade |
| Media | 2.4 Atalhos visiveis | Discoverability |
| Media | 2.5 Refresh manual no painel | Praticidade |
| Media | 2.6 Capacidade na transferencia | Decisao informada |
| Media | 3.3 Input na fase waiting | Contexto |
| Media | 4.1 Salvar por secao | Praticidade |
| Media | 4.5 Copiar horarios | Praticidade |
| Media | 5.1 Query N+1 | Performance backend |
| Baixa | 3.4 Estado otimista | UX refinada |
| Baixa | 3.5 Pular CSAT | Satisfacao |
| Baixa | 3.6 Preview no historico | Navegacao |
| Baixa | 4.2 Unsaved indicator | UX admin |
| Baixa | 4.3 Preview tempo real | UX admin |
| Baixa | 4.6 Preview macros | UX admin |
| Baixa | 4.7 Busca macros | UX admin |
| Baixa | 5.2 Deduplicacao codigo | Manutencao |
| Baixa | 5.3 Limpar msgs ao trocar sala | UX refinada |

