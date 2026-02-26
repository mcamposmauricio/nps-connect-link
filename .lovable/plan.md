
# Plano: Melhorias no Widget, Workspace e Gestao de Chat

## 7 melhorias identificadas

---

## 1. Notificacao visual no widget minimizado (FAB)

**Problema**: Quando o widget esta minimizado (FAB), nao ha indicacao de novas mensagens.

**Solucao**:
- Adicionar estado `unreadCount` no `ChatWidget.tsx` que incrementa quando mensagens chegam via realtime e o widget esta fechado (`!isOpen`)
- Renderizar badge vermelho com contador sobre o botao FAB (linhas ~848-876)
- Ao abrir o widget (`setIsOpen(true)`), zerar o `unreadCount`
- Na tela de historico, mostrar indicador de "mensagem nova" por room (comparar `last_message_at` com timestamp de ultimo acesso local)

**Arquivos**: `src/pages/ChatWidget.tsx`

---

## 2. Links clicaveis nas mensagens do widget

**Problema**: O `ChatMessageList.tsx` ja implementa `renderTextWithLinks`, mas o widget (`ChatWidget.tsx`) tem sua propria renderizacao inline que nao usa essa funcao.

**Solucao**:
- Extrair `renderTextWithLinks` do `ChatMessageList.tsx` para `src/utils/chatUtils.ts`
- No `ChatWidget.tsx`, importar e usar `renderTextWithLinks` nas bolhas de mensagem (atualmente renderiza `{msg.content}` diretamente, linhas ~1100-1200)
- Estilizar links para visitantes: `text-primary underline` no widget

**Arquivos**: `src/utils/chatUtils.ts`, `src/pages/ChatWidget.tsx`, `src/components/chat/ChatMessageList.tsx`

---

## 3. Notificacao sonora configuravel

**Problema**: Nao existe sinalzacao sonora ao receber mensagens.

**Solucao**:
- Adicionar coluna `sound_enabled` (boolean, default true) na tabela `attendant_profiles` via migration
- No `MyProfile.tsx`, adicionar toggle "Notificacoes sonoras" na secao de chat (junto com status online/busy/offline)
- No `AdminWorkspace.tsx`, ao receber mensagem nova via realtime (hook `useChatRealtime`), tocar um som de notificacao curto usando `new Audio('/notification.mp3').play()` -- apenas se `sound_enabled = true`
- Adicionar arquivo de audio em `public/notification.mp3` (usar um tom curto padrao gerado via Web Audio API como fallback)
- No widget (`ChatWidget.tsx`), tambem tocar som ao receber mensagem do atendente quando widget aberto

**Arquivos**: migration SQL, `src/pages/MyProfile.tsx`, `src/pages/AdminWorkspace.tsx`, `src/hooks/useChatRealtime.ts`, `public/notification.mp3`

---

## 4. Ultimos 5 chats no painel lateral (VisitorInfoPanel)

**Problema**: O painel lateral nao mostra historico de chats do visitante.

**Solucao**:
- Na aba "Contato" do `VisitorInfoPanel.tsx`, adicionar secao "Historico de Chats" abaixo das metricas
- Buscar os ultimos 5 `chat_rooms` do `company_contact_id` ou `visitor_id` (excluindo a sala atual), ordenados por `created_at DESC`
- Exibir cards compactos com: data, status, CSAT, e preview da ultima mensagem
- Botao "Ver conversa" que abre o `ReadOnlyChatDialog`
- Botao "Carregar mais" que busca +5 rooms (paginacao incremental)

**Arquivos**: `src/components/chat/VisitorInfoPanel.tsx`

---

## 5. Gerenciamento de tags (CRUD completo)

**Problema**: Tags so podem ser criadas inline durante o atendimento, sem opcao de editar, desativar ou excluir.

**Solucao**:
- Na pagina `AdminSettings.tsx`, na aba de Macros (ou criar nova sub-secao), adicionar gestao de tags:
  - Tabela listando todas as tags com colunas: Nome, Cor, Criado em, Acoes
  - Acoes: Editar (nome/cor), Excluir (com confirmacao e contagem de usos)
- A exclusao de tags remove tambem os registros de `chat_room_tags` associados (cascade)
- Reutilizar o padrao visual da tabela de macros ja existente

**Arquivos**: `src/pages/AdminSettings.tsx`

---

## 6. Corrigir filtros com "common.all" e labels genericos

**Problema**: Varios selects mostram "Todos" como texto selecionado sem contexto do que esta sendo filtrado.

**Solucao**:
- Em `AdminDashboard.tsx`: trocar `{t("common.all")}` por "Todos Atendentes"
- Em `AdminDashboardGerencial.tsx`: trocar por "Todos Atendentes", "Todas Categorias"  
- Em `AdminChatHistory.tsx`: trocar por "Todos Status", "Todos Atendentes"
- Em `AdminCSATReport.tsx`: trocar por "Todos Atendentes", "Todos Times", "Todas Tags"
- Adicionar chaves de traducao em `pt-BR.ts` e `en.ts` para cada filtro especifico
- Usar o `placeholder` do `SelectTrigger` corretamente para que o valor padrao mostre o label descritivo

**Arquivos**: `src/pages/AdminDashboard.tsx`, `src/pages/AdminDashboardGerencial.tsx`, `src/pages/AdminChatHistory.tsx`, `src/pages/AdminCSATReport.tsx`, `src/locales/pt-BR.ts`, `src/locales/en.ts`

---

## 7. Reabrir chat atribui automaticamente ao usuario logado

**Problema**: Ao reabrir um chat no historico, ele fica em "waiting" sem atendente atribuido.

**Solucao**:
- No `AdminChatHistory.tsx`, metodo `handleReopenChat`: 
  - Buscar o `attendant_profile` do usuario logado (mesmo padrao do `handleAssignRoom` no Workspace)
  - Criar o perfil se nao existir (mesma logica)
  - Ao dar update na room, ja setar `attendant_id`, `status: "active"`, `assigned_at: now()`
  - Incrementar `active_conversations` do atendente
- Mensagem de sistema: "Chat reaberto e atribuido a [nome]"

**Arquivos**: `src/pages/AdminChatHistory.tsx`

---

## Alteracoes no banco de dados

Uma unica migration:
```sql
ALTER TABLE public.attendant_profiles 
ADD COLUMN IF NOT EXISTS sound_enabled boolean DEFAULT true;
```

## Resumo de arquivos

| Arquivo | Tipo |
|---------|------|
| Migration SQL | Novo |
| `src/pages/ChatWidget.tsx` | Modificado |
| `src/utils/chatUtils.ts` | Modificado |
| `src/components/chat/ChatMessageList.tsx` | Modificado |
| `src/components/chat/VisitorInfoPanel.tsx` | Modificado |
| `src/pages/AdminWorkspace.tsx` | Modificado |
| `src/pages/AdminSettings.tsx` | Modificado |
| `src/pages/AdminChatHistory.tsx` | Modificado |
| `src/pages/MyProfile.tsx` | Modificado |
| `src/hooks/useChatRealtime.ts` | Modificado |
| `src/locales/pt-BR.ts` | Modificado |
| `src/locales/en.ts` | Modificado |
| `public/notification.mp3` | Novo (audio curto) |
