

# Corrigir Contador de Conversas Ativas Dessincronizado

## Problema Identificado

O atendente **Felipão** (`felipe@marqponto.com.br`) tem `active_conversations = 3` na tabela `attendant_profiles`, porem possui **zero salas ativas** atribuidas a ele. O contador ficou "preso" em um valor alto, fazendo com que o sistema de atribuicao automatica o ignore por achar que ele ja esta no limite de capacidade (`capacity_limit = 2`).

Enquanto isso, o **Lucas** (`lucas@marqponto.com.br`) recebeu todas as atribuicoes corretamente porque seu contador estava sincronizado.

## Solucao

### 1. Corrigir o contador do Felipe (migracao SQL)

Executar um UPDATE que recalcula o `active_conversations` baseado nas salas realmente ativas:

```sql
UPDATE attendant_profiles
SET active_conversations = (
  SELECT COUNT(*)
  FROM chat_rooms
  WHERE chat_rooms.attendant_id = attendant_profiles.id
    AND chat_rooms.status IN ('active', 'waiting')
),
updated_at = now()
WHERE id = '5c8ab003-a237-436e-9a74-4309a5317ebf';
```

### 2. Prevencao: reconciliar todos os atendentes

Para evitar o mesmo problema com outros atendentes, aplicar a reconciliacao para todos:

```sql
UPDATE attendant_profiles
SET active_conversations = (
  SELECT COUNT(*)
  FROM chat_rooms
  WHERE chat_rooms.attendant_id = attendant_profiles.id
    AND chat_rooms.status IN ('active', 'waiting')
),
updated_at = now();
```

### Arquivos alterados

Nenhum arquivo de codigo sera alterado. Apenas uma migracao SQL para corrigir os dados.

### Causa raiz provavel

Os triggers `decrement_attendant_active_conversations` e `decrement_on_room_delete` existem no banco, mas podem ter falhado em algum cenario especifico (ex: sala fechada diretamente via update em batch, ou race condition). A reconciliacao corrige o estado atual.

