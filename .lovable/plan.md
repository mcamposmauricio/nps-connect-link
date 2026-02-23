

# Revisao Completa do Chat: Melhorias de Funcionamento, Usabilidade e Experiencia

## 1. FUNCIONAMENTO (Bugs e Logica)

### ✅ 1.1 Paginacao de mensagens no Workspace
- Implementado carregamento inicial de 50 mensagens + botao "Carregar anteriores"
- useChatMessages agora usa paginacao com cursor (created_at)
- Limpeza automática de mensagens ao trocar de sala (item 5.3 incluso)

### ✅ 1.2 Nome do atendente usa email truncado
- AdminWorkspace agora busca display_name do attendant_profiles/user_profiles
- Usado em todas as mensagens enviadas (chat e notas internas)

### ✅ 1.3 Nota de encerramento usa email truncado
- Corrigido reutilizando o display_name carregado

### 1.4 Transferencia nao notifica o novo atendente
- Manter como is_internal: true (visitante NAO deve ver)
- Ja funciona corretamente (internals visiveis para atendentes)

### ✅ 1.5 Contagem de unreads com limite visual
- Badge alterado de cap 99 para cap 9 (exibe "9+")

### ✅ 1.6 Polling de auto-rules fora do Workspace
- Movido de AdminWorkspace para SidebarLayout
- Roda enquanto qualquer admin estiver logado

---

## 2. USABILIDADE (Interface Administrativa)

### ✅ 2.1 Busca expandida nas conversas
- Busca agora inclui visitor_name, visitor_email e last_message
- Placeholder atualizado para indicar os campos de busca

### 2.2 Indicador de "digitando"
- Usar Supabase Realtime Broadcast (canal por room) para enviar/receber eventos de "typing"
- Exibir "digitando..." abaixo da ultima mensagem no ChatMessageList e no ChatRoomList

### 2.3 Notificacao nativa do navegador
- Usar Notification API para alertar quando chega mensagem de visitante e a aba nao esta focada

### 2.4 Atalhos de teclado documentados
- Adicionar botao "?" visivel na barra do ChatInput com popover de atalhos

### 2.5 Painel de informacoes com botao de refresh manual
- Adicionar botao RefreshCw no header do VisitorInfoPanel

### 2.6 Transferencia mostra capacidade do atendente
- Exibir "3/5 conversas" no ReassignDialog

---

## 3. EXPERIENCIA DO USUARIO (Widget/Visitante)

### ✅ 3.1 Horario nas mensagens do Widget
- Timestamps HH:mm adicionados a todas as mensagens no Widget

### ✅ 3.2 Estilo diferenciado para mensagens do sistema no Widget
- Mensagens system aparecem centralizadas, sem bolha, texto menor, cor neutra

### 3.3 Permitir envio de mensagens na fase "waiting"
- Habilitar campo de input durante status "waiting"

### 3.4 Confirmacao visual de mensagem enviada
- Estado otimista com opacidade reduzida

### 3.5 Opcao de pular CSAT
- Adicionar botao "Pular" na pesquisa de satisfacao

### 3.6 Preview de ultima mensagem no historico
- Exibir ultima mensagem truncada nas conversas anteriores

---

## 4. MELHORIAS NA CONFIGURACAO (AdminSettings)

### 4.1 Salvar automaticamente ao desativar/ativar switches
- Cada secao com botao "Salvar" inline ou auto-save com debounce

### 4.2 Feedback visual de alteracoes nao salvas
- Indicador "unsaved changes" nas secoes editadas

### 4.3 Preview do Widget atualiza em tempo real
- Garantir que todas propriedades editaveis atualizem o preview

### ✅ 4.4 Organizacao visual da aba "Widget e Instalacao"
- Sections "Comportamento e Mensagens" convertidas em Collapsible/Accordion
- Reduz scroll e melhora escaneabilidade

### ✅ 4.5 Horarios de atendimento com "Copiar para todos"
- Botao "Copiar horario para todos" adicionado na aba Horarios

### 4.6 Macros com preview de conteudo na tabela
- Adicionar tooltip com preview truncado do conteudo

### 4.7 Busca de macros na tabela de configuracao
- Adicionar campo de busca/filtro acima da tabela

### ✅ 4.8 Bug: double setLoading(false) no fetchAll
- Duplicata removida

---

## 5. MELHORIAS TECNICAS

### 5.1 Query N+1 na Edge Function de auto-rules
- Reescrever para usar query unica com subquery

### 5.2 Deduplicacao de codigo de arquivos
- Extrair funcoes compartilhadas para src/utils/chatUtils.ts

### ✅ 5.3 useChatMessages limpa ao trocar de sala
- Implementado junto com a paginacao (1.1)

---

## Resumo de Prioridades

| Prioridade | Item | Status |
|---|---|---|
| Alta | 1.1 Paginacao no Workspace | ✅ |
| Alta | 1.5 Badge cap 9 | ✅ |
| Alta | 1.6 Polling no SidebarLayout | ✅ |
| Alta | 3.1 Horario nas msgs do Widget | ✅ |
| Alta | 3.2 Estilo msg sistema | ✅ |
| Alta | 4.4 Accordion nas configuracoes | ✅ |
| Alta | 4.8 Fix double setLoading | ✅ |
| Media | 1.2/1.3 Nome atendente correto | ✅ |
| Media | 2.1 Busca expandida com contain | ✅ |
| Media | 2.2 Indicador digitando | Pendente |
| Media | 2.3 Notificacoes nativas | Pendente |
| Media | 2.4 Atalhos visiveis | Pendente |
| Media | 2.5 Refresh manual no painel | Pendente |
| Media | 2.6 Capacidade na transferencia | Pendente |
| Media | 3.3 Input na fase waiting | Pendente |
| Media | 4.1 Salvar por secao | Pendente |
| Media | 4.5 Copiar horarios | ✅ |
| Media | 5.1 Query N+1 | Pendente |
| Baixa | 3.4 Estado otimista | Pendente |
| Baixa | 3.5 Pular CSAT | Pendente |
| Baixa | 3.6 Preview no historico | Pendente |
| Baixa | 4.2 Unsaved indicator | Pendente |
| Baixa | 4.3 Preview tempo real | Pendente |
| Baixa | 4.6 Preview macros | Pendente |
| Baixa | 4.7 Busca macros | Pendente |
| Baixa | 5.2 Deduplicacao codigo | Pendente |
| Baixa | 5.3 Limpar msgs ao trocar sala | ✅ |
