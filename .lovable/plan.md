

# Corrigir identificacao do atendente no header do widget

## Situacao Atual

O widget **ja possui** a logica de exibir o nome do atendente no header (avatar com iniciais, bolinha verde pulsante e nome no subtitulo). Porem, ha **3 cenarios onde o nome nao e carregado**, causando a impressao de que a funcionalidade nao funciona:

### Cenarios com falha

1. **Auto-atribuicao na criacao da sala** (linha 751): Quando a sala e criada e automaticamente atribuida (status="active"), o widget muda para fase "chat" mas **nao busca o display_name** do atendente.

2. **Reconexao por token salvo** (linha 286-297): Quando o visitante recarrega a pagina e o token salvo recupera uma sala ativa, o widget entra na fase "chat" mas **nao busca o attendant_id/display_name**.

3. **Abertura de sala ativa do historico** (linha 550-591 e proactive rooms): Ao reabrir ou entrar em uma sala que ja esta ativa, o nome do atendente nao e recuperado.

### Cenario que funciona

- Quando a sala muda de "waiting" para "active" via realtime (UPDATE na `chat_rooms`), o callback busca o `attendant_id` e faz `setAttendantName` corretamente.

## Solucao

Adicionar a busca do `attendantName` nos 3 cenarios faltantes, seguindo o mesmo padrao ja usado no realtime subscription.

### Arquivo: `src/pages/ChatWidget.tsx`

**Correcao 1 - Auto-atribuicao na criacao (linha ~749-755)**:
Quando `room.status === "active" && room.attendant_id`, buscar `display_name` do `attendant_profiles` antes de setar a fase.

**Correcao 2 - Reconexao por token salvo (linha ~286-297)**:
Apos encontrar sala ativa, buscar `attendant_id` na query (ja retorna id e status) e fazer fetch do `display_name` caso exista.

**Correcao 3 - Proactive rooms e reopen (linhas ~436-444 e ~586-590)**:
Quando uma sala proativa INSERT chega com status "active" e `attendant_id`, buscar o nome. No reopen, se apos `checkRoomAssignment` a sala estiver ativa, buscar o nome.

### Impacto

- Apenas 1 arquivo modificado: `src/pages/ChatWidget.tsx`
- Nenhuma funcionalidade removida ou alterada
- Nenhuma mudanca no banco de dados
- Adiciona ~15 linhas de codigo (3 blocos de fetch identicos ao padrao existente)

