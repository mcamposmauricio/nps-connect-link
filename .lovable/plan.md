
# Adicionar botao de Tags ao lado de Transferir no header do chat

## Resumo

Adicionar um botao "Tags" no header do chat (ao lado do botao "Transferir"), que ao ser clicado abre um Popover com o `ChatTagSelector` para gerenciar tags da conversa.

## Alteracoes

### 1. `src/pages/AdminWorkspace.tsx`

- Importar `ChatTagSelector`, `Popover`, `PopoverTrigger`, `PopoverContent` e o icone `Tag`
- Adicionar um botao "Tags" com Popover em 4 posicoes do header (desktop active, desktop waiting, mobile active, mobile waiting), ao lado do botao "Transferir"
- O botao tera icone `Tag` e texto "Tags"
- Ao clicar, abre popover com `<ChatTagSelector roomId={selectedRoom.id} compact />`

Layout resultante dos botoes no header (exemplo status active):
```text
[Info] [Transferir] [Tags] [Encerrar]
```

Para status waiting:
```text
[Info] [Atender] [Transferir] [Tags]
```

### 2. `src/components/chat/VisitorInfoPanel.tsx`

- Remover o `ChatTagSelector` da aba de contato (se presente), ja que agora ficara no header

Nenhuma migracao de banco necessaria.
