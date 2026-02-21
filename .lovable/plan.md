

# Plano: 3 Correções no Chat

## 1. Transferir chat não atribuído para outro atendente

**Problema:** Quando um chat está "Na Fila" (waiting/sem atendente), o único botão disponível é "Atender" que atribui para si mesmo. Não há opção de direcionar para outro atendente.

**Solução:** Adicionar um botão "Transferir" ao lado do botão "Atender" quando o chat estiver em status `waiting`. Ao clicar, abre o `ReassignDialog` existente. Ao confirmar, o chat é atribuído diretamente ao atendente escolhido (status muda para `active`, `attendant_id` é preenchido, `assigned_at` é definido).

**Arquivos:**
- `src/pages/AdminWorkspace.tsx` -- Adicionar botão "Transferir" nos headers desktop e mobile quando `selectedRoom.status === "waiting"`. Reutilizar o `ReassignDialog` existente. Ajustar `handleReassign` para também definir `status: "active"` quando a room anterior era `waiting`.

## 2. Indicador visual de status (bolinha colorida) nos atendentes

**Problema:** Na sidebar do workspace e no dashboard, o status dos atendentes aparece apenas como texto ou badge sem destaque visual imediato.

**Solução:** Adicionar uma bolinha colorida (dot indicator) antes do nome de cada atendente:
- Verde para `online`
- Amarelo para `busy` (ocupado)
- Cinza para `offline`

**Arquivos:**
- `src/components/AppSidebar.tsx` (linhas 282-294) -- Adicionar um `<span>` com classe `h-2 w-2 rounded-full` com cor condicional antes do nome do atendente na lista do workspace.
- `src/pages/AdminDashboard.tsx` (linhas 348-361) -- Adicionar a mesma bolinha antes do nome na tabela de atendentes, mantendo o badge de status textual existente.

Mapeamento de cores:
```text
online  -> bg-green-500
busy    -> bg-amber-500
offline -> bg-gray-400
```

## 3. Mensagem com imagem + texto no widget e portal

**Problema:** Quando o visitante envia uma mensagem com arquivo (imagem) e texto simultaneamente, o `ChatMessageList.tsx` (lado do atendente) exibe ambos corretamente. Porém, o `ChatWidget.tsx` (iframe embed) e o `PortalChatView.tsx` mostram apenas a imagem, ignorando o texto.

**Causa raiz:** Em ambos os componentes, `renderFileMessage` renderiza apenas o arquivo. O `ChatMessageList.tsx` resolve isso verificando `hasTextWithFile` e renderizando o texto abaixo do arquivo -- essa logica nao existe no widget nem no portal.

**Solução:** Nos dois arquivos, ao renderizar mensagens do tipo `file`, verificar se `msg.content` difere de `msg.metadata.file_name`. Se sim, renderizar o texto abaixo da imagem/arquivo.

**Arquivos:**
- `src/pages/ChatWidget.tsx` (linhas 807-809) -- Ajustar o bloco de renderização de mensagem para exibir texto apos o arquivo quando houver conteudo textual.
- `src/components/portal/PortalChatView.tsx` (linhas ~330-335) -- Mesma correção: renderizar texto abaixo do componente de arquivo.

## Resumo de Alterações

| Arquivo | Mudança |
|---|---|
| `AdminWorkspace.tsx` | Botão "Transferir" para chats waiting + logica de assign direto |
| `AppSidebar.tsx` | Bolinha de status antes do nome dos atendentes |
| `AdminDashboard.tsx` | Bolinha de status antes do nome na tabela |
| `ChatWidget.tsx` | Exibir texto junto com imagem em mensagens de arquivo |
| `PortalChatView.tsx` | Exibir texto junto com imagem em mensagens de arquivo |

Nenhuma migração de banco necessária. Todas as alterações são puramente de interface e lógica frontend.
