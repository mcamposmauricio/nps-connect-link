
# Plano: Painel de Pendencias Colapsavel + Ctrl+V no Widget

## 1. Componente colapsavel "Com Pendencia" no Workspace

**Problema**: Chats fechados com pendencia nao aparecem na fila do atendente. Ele precisa ir ao Historico para encontra-los.

**Solucao**: Criar um componente colapsavel que fica entre o botao "Novo Chat" e a lista de conversas ativas na coluna esquerda do Workspace.

### Novo componente: `src/components/chat/PendingRoomsList.tsx`
- Busca `chat_rooms` com `status = 'closed'` e `resolution_status = 'pending'` filtrados pelo `attendant_id` do usuario logado
- Exibe um collapsible (usando `@radix-ui/react-collapsible`) com:
  - Header: "Com Pendencia" + badge numerico com a contagem
  - Por padrao, inicia **fechado** (collapsed)
  - Ao expandir, lista cards compactos com: nome do visitante, data de encerramento, preview da ultima mensagem
- Ao clicar em um card:
  - Seleciona a room no painel central (mostra mensagens no mesmo painel de chat normal)
  - No header do chat, exibe botoes: "Reabrir" e "Marcar Resolvido"
- **Reabrir**: atualiza `status: 'active'`, `resolution_status: null`, `closed_at: null`, `assigned_at: now()` e insere mensagem de sistema
- **Marcar Resolvido**: atualiza `resolution_status: 'resolved'` e remove da lista
- Usa realtime subscription para atualizar automaticamente quando pendencias mudam

### Integracao em `src/pages/AdminWorkspace.tsx`
- Importar `PendingRoomsList` e inserir entre o botao "Novo Chat" (linha 388-391) e o `ChatRoomList` (linha 393-395)
- Passar `userAttendantId` e handlers de selecao/acao
- Quando uma room pendente e selecionada, o painel central carrega mensagens normalmente via `useChatMessages`
- Detectar se `selectedRoom` e uma room pendente (closed + pending) para exibir acoes diferentes no header

**Arquivos**:
- `src/components/chat/PendingRoomsList.tsx` (novo)
- `src/pages/AdminWorkspace.tsx` (modificado)

---

## 2. Ctrl+V para colar arquivos/imagens no Widget

**Problema**: O widget do cliente so permite enviar arquivos pelo botao de attach. Ctrl+V com imagens copiadas nao funciona.

**Solucao**: Adicionar handler `onPaste` no input do widget (fase "chat") que detecta arquivos na clipboard e os adiciona como `pendingFile`.

### Mudancas em `src/pages/ChatWidget.tsx`
- Na area de input do chat (linha 1281, o `<Input>`), trocar por um `<textarea>` ou adicionar `onPaste` handler no `<Input>`:

```typescript
const handlePaste = (e: React.ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith("image/") || items[i].type.startsWith("application/")) {
      const file = items[i].getAsFile();
      if (file) {
        e.preventDefault();
        handleFileSelect(file);
        return;
      }
    }
  }
};
```

- Adicionar `onPaste={handlePaste}` ao `<Input>` na linha 1281
- Tambem adicionar no input da fase "waiting" (linha 1096) para consistencia

**Arquivo**: `src/pages/ChatWidget.tsx`

---

## Resumo de mudancas

| Arquivo | Tipo | Mudanca |
|---------|------|---------|
| `src/components/chat/PendingRoomsList.tsx` | Novo | Componente colapsavel com lista de rooms pendentes |
| `src/pages/AdminWorkspace.tsx` | Modificado | Integrar PendingRoomsList + acoes para rooms pendentes no header |
| `src/pages/ChatWidget.tsx` | Modificado | Adicionar onPaste handler para colar arquivos/imagens |

Nenhuma alteracao no banco de dados.
