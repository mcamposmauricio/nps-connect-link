

# Plano: Notificacoes Sonoras Parametrizaveis

## Problema
1. O som de notificacao no workspace do atendente existe no codigo (`useChatRealtime.ts` linha 365) mas nao respeita a preferencia `sound_enabled` do `attendant_profiles` — toca sempre.
2. A coluna `sound_enabled` ja existe na tabela `attendant_profiles` mas nunca e lida pelo frontend.
3. O widget do cliente (ChatWidget) nao tem nenhum som de notificacao para novas mensagens recebidas.
4. Nao existe toggle no perfil do atendente para ligar/desligar o som.

## Solucao

### 1. Toggle no Perfil do Atendente (`src/pages/MyProfile.tsx`)
- Adicionar estado `soundEnabled` (default `true`)
- No `fetchProfile`, ler `sound_enabled` do `attendantData`
- Adicionar um Switch (componente ja existente em `ui/switch.tsx`) na card de "Status de Atendimento" com label "Notificacoes sonoras"
- Ao alternar, salvar imediatamente no `attendant_profiles` (mesmo padrao do status)

### 2. Respeitar preferencia no Workspace (`src/hooks/useChatRealtime.ts`)
- Adicionar parametro `soundEnabled: boolean` ao hook (ou receber via props/context)
- Usar `useRef` para manter valor atualizado do `soundEnabled`
- Condicionar o `new Audio(...).play()` (linha 365) a `soundEnabledRef.current === true`
- O hook ja recebe props customizaveis — adicionar `soundEnabled`

### 3. Passar `soundEnabled` do Workspace para o hook (`src/pages/AdminWorkspace.tsx`)
- Ao buscar o `attendant_profiles` do usuario logado (ja feito para obter `attendantId`), tambem ler `sound_enabled`
- Passar como prop para `useChatRealtime`
- Escutar mudancas em tempo real no `attendant_profiles` para refletir toggle sem reload

### 4. Som no Widget do Cliente (`src/pages/ChatWidget.tsx`)
- Adicionar som de notificacao quando uma nova mensagem do tipo `attendant` chegar no realtime do widget
- Tocar sempre (sem toggle para o cliente — conforme requisito)
- Usar o mesmo base64 audio curto ja usado no workspace, ou um tom mais suave
- Condicionar para nao tocar se a aba estiver em foco e o widget aberto (evitar ruido)

## Resumo de Mudancas

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/MyProfile.tsx` | Adicionar Switch de "Notificacoes sonoras" na card de atendimento |
| `src/hooks/useChatRealtime.ts` | Aceitar param `soundEnabled`, condicionar audio a ele |
| `src/pages/AdminWorkspace.tsx` | Ler `sound_enabled` do attendant e passar ao hook |
| `src/pages/ChatWidget.tsx` | Tocar som quando mensagem do atendente chegar |

Nenhuma alteracao no banco de dados (coluna `sound_enabled` ja existe).

