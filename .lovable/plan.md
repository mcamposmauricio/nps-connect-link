

# Reestruturar Mensagens Automaticas - 10 Tipos Unificados

## Objetivo

Substituir os dois cards atuais ("Mensagens Padrao" usando `chat_settings` e "Regras Automaticas" usando `chat_auto_rules`) por um unico card com 10 tipos fixos de mensagem automatica, todos gerenciados exclusivamente pela tabela `chat_auto_rules`.

## Os 10 Tipos de Mensagem

| # | `rule_type` | Titulo | Descricao para o usuario | Campos |
|---|---|---|---|---|
| 1 | `welcome_message` | Boas-vindas | Enviada automaticamente quando o visitante inicia uma nova conversa | Toggle + Texto |
| 2 | `offline_message` | Offline | Exibida quando o visitante abre o chat fora do horario de atendimento configurado | Toggle + Texto |
| 3 | `inactivity_warning` | Aviso de Inatividade | Enviada ao visitante apos X minutos sem nenhuma resposta na conversa | Toggle + Minutos + Texto |
| 4 | `auto_close` | Fechamento Automatico | Encerra a conversa automaticamente apos X minutos de inatividade total | Toggle + Minutos + Texto |
| 5 | `queue_position` | Fila de Espera | Notifica o visitante sobre sua posicao na fila quando todos os atendentes estao ocupados | Toggle + Texto |
| 6 | `attendant_assigned` | Atendente Atribuido | Enviada ao visitante quando um atendente e atribuido a conversa | Toggle + Texto |
| 7 | `transfer_notice` | Aviso de Transferencia | Notifica o visitante quando a conversa e transferida para outro atendente ou time | Toggle + Texto |
| 8 | `post_service_csat` | Pos-Atendimento (CSAT) | Solicita avaliacao do atendimento apos o encerramento da conversa | Toggle + Texto |
| 9 | `return_online` | Retorno ao Horario | Enviada aos visitantes que deixaram mensagem fora do horario quando o atendimento e retomado | Toggle + Texto |
| 10 | `attendant_absence` | Ausencia do Atendente | Enviada se o atendente atribuido nao responde dentro de X minutos | Toggle + Minutos + Texto |

## Logica de Auto-Seed

Ao carregar a aba, o sistema verifica quais dos 10 tipos ja existem em `chat_auto_rules`. Os tipos ausentes sao criados automaticamente com valores padrao:

- **Ativados por padrao:** `welcome_message`, `offline_message`, `attendant_assigned`
- **Desativados por padrao:** todos os demais
- **Textos padrao** pre-preenchidos com mensagens sugeridas (ex: "Bem-vindo! Em instantes um atendente ira te atender.")
- **Minutos padrao:** inatividade=5, auto_close=30, ausencia_atendente=3

## Alteracoes Tecnicas

### 1. `src/pages/AdminSettings.tsx`

- Remover o card "Mensagens Padrao" (linhas 674-700) que usa `chat_settings.welcome_message` / `offline_message`
- Remover o card "Regras Automaticas" (linhas 702-768) com botoes de adicionar/remover individual
- Criar um array de configuracao `AUTO_MESSAGE_TYPES` com os 10 tipos, seus metadados (titulo, descricao, icone, se tem campo de minutos, texto padrao)
- Adicionar funcao `seedMissingRules()` que roda apos o fetch: para cada tipo do array que nao exista nos dados carregados, faz INSERT no banco com valores padrao
- Renderizar os 10 tipos como cards fixos dentro de um unico card container, cada um com:
  - Icone + Titulo + Descricao explicativa
  - Toggle `is_enabled` (salva imediatamente ao alterar)
  - Campo de minutos (apenas para `inactivity_warning`, `auto_close`, `attendant_absence`)
  - Textarea para `message_content` (todos exceto `auto_close` que pode ter texto opcional)
  - Botao "Salvar" por card ou salvar on blur
- Importar icones adicionais do lucide: `UserCheck`, `ArrowRightLeft`, `Star`, `Sunrise`, `UserX`, `ListOrdered`

### 2. `src/locales/pt-BR.ts`

Adicionar chaves para cada um dos 10 tipos:
- `chat.autoMsg.welcome_message.title` = "Boas-vindas"
- `chat.autoMsg.welcome_message.description` = "Enviada automaticamente quando o visitante inicia uma nova conversa"
- `chat.autoMsg.welcome_message.default` = "Bem-vindo! Em instantes um atendente ira te atender."
- (e assim para os outros 9 tipos)

### 3. `src/locales/en.ts`

Mesmas chaves em ingles.

### 4. Nenhuma alteracao no banco de dados

A tabela `chat_auto_rules` ja suporta qualquer `rule_type` como texto livre, `is_enabled`, `trigger_minutes` e `message_content`.

## Comportamento da UI

- Os 10 cards aparecem sempre na mesma ordem, sem botao de adicionar ou remover
- Cada card tem aparencia consistente: borda sutil, icone colorido, toggle no canto superior direito
- Quando desativado, o conteudo do card fica com opacidade reduzida
- Agrupamento visual: "Mensagens de Sessao" (boas-vindas, fila, atendente atribuido, transferencia), "Mensagens de Tempo" (inatividade, fechamento, ausencia), "Mensagens Especiais" (offline, retorno, pos-atendimento)

