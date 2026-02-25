
# Plano: Remocao Completa de 5 Usuarios do Sistema

## Resumo

Remover completamente os usuarios `felipe@marqponto.com.br`, `lucas@marqponto.com.br`, `thaina@marqponto.com.br`, `matheus@marqponto.com.br` e `mauricio@marqponto.com.br` de todas as tabelas do sistema e do auth, para que possam ser cadastrados novamente do zero.

## Usuarios encontrados

| Email | user_id | Tenant | Status |
|-------|---------|--------|--------|
| felipe@marqponto.com.br | c1e05a0e-... | 9d0bacc... | Aceito |
| lucas@marqponto.com.br | 4941b9ad-... | 9d0bacc... | Aceito |
| matheus@marqponto.com.br | c4644e4d-... | 9d0bacc... | Aceito |
| mauricio@marqponto.com.br | 0f04ffe2-... | 34d971f... | Aceito |
| thaina@marqponto.com.br | -- | -- | Nao encontrada |

**Nota:** `thaina@marqponto.com.br` nao possui perfil no sistema. Sera verificada apenas no auth.

## Ordem de exclusao (respeitando dependencias)

A exclusao precisa seguir uma ordem especifica para nao violar foreign keys e constraints:

### Passo 1 -- Limpar referencias em chat_assignment_configs
Dois registros de `rr_last_attendant_id` apontam para attendant_profiles destes usuarios. Setar para NULL antes de deletar os attendants.

### Passo 2 -- Deletar chat_team_members
3 registros vinculando attendant_profiles a times.

### Passo 3 -- Nullificar attendant_id em chat_rooms
~20 rooms historicas que foram atendidas por estes usuarios. Em vez de deletar as rooms (que contem historico de conversa), setar `attendant_id = NULL` para preservar o historico.

### Passo 4 -- Deletar chat_room_reads
~18 registros de leitura de salas.

### Passo 5 -- Deletar attendant_profiles
3 registros (Felipe, Lucas, Matheus).

### Passo 6 -- Deletar user_permissions
~50+ registros de permissoes por modulo.

### Passo 7 -- Deletar user_roles
2 registros (Matheus admin, Mauricio admin).

### Passo 8 -- Deletar csms
3 registros (Felipe, Lucas, Matheus).

### Passo 9 -- Deletar user_profiles
4 registros.

### Passo 10 -- Deletar usuarios do auth
Usar a Edge Function `backoffice-admin` com action `delete-auth-user` para cada user_id. Para `thaina@marqponto.com.br`, verificar se existe no auth e deletar se existir.

## Implementacao

Sera criada uma Edge Function temporaria ou usada a funcao `backoffice-admin` existente para executar a limpeza via service_role_key, ja que as tabelas possuem RLS e as operacoes precisam de acesso administrativo.

A abordagem mais segura sera executar as queries SQL diretamente via migration tool (que usa service role), garantindo a ordem correta.

## Tabelas afetadas

| Tabela | Acao | Quantidade |
|--------|------|-----------|
| chat_assignment_configs | UPDATE rr_last_attendant_id = NULL | 2 |
| chat_team_members | DELETE | 3 |
| chat_rooms | UPDATE attendant_id = NULL | ~20 |
| chat_room_reads | DELETE | ~18 |
| attendant_profiles | DELETE | 3 |
| user_permissions | DELETE | ~50 |
| user_roles | DELETE | 2 |
| csms | DELETE | 3 |
| user_profiles | DELETE | 4 |
| auth.users | DELETE via Edge Function | 4-5 |

## Impacto

- Historico de chat preservado (rooms e mensagens permanecem, apenas attendant_id fica NULL)
- Nenhuma empresa/contato sera afetada (nenhum CSM estava vinculado a contatos)
- Apos a limpeza, os emails ficam livres para novo cadastro/convite
