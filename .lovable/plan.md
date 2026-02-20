
# Regras de Atribuição Automática no Menu "Regras de Atendimento"

## Visão Geral da Arquitetura Atual

O sistema já possui:
- `chat_service_categories`: categorias de atendimento (nome, cor, descrição)
- `chat_category_teams`: vínculo N:N entre categoria e time
- `attendant_profiles`: perfis dos atendentes com `status` (online/offline), `max_conversations` e `active_conversations`
- `contacts.service_priority` (valores: normal, alta, crítica, etc.) e `contacts.service_category_id`
- O fluxo hoje é apenas categorial — os atendentes pegam chats manualmente

**O que não existe ainda**: configuração de atribuição automática por categoria-time, tabela de persistência das regras avançadas, e a lógica de roteamento ativa.

---

## Parte 1 — Banco de Dados (Migração)

### Nova tabela: `chat_assignment_configs`

Armazena a configuração de atribuição automática por vínculo categoria→time (referencia a `chat_category_teams`):

```sql
CREATE TABLE public.chat_assignment_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  category_team_id uuid NOT NULL REFERENCES public.chat_category_teams(id) ON DELETE CASCADE,

  -- Toggle principal
  enabled boolean NOT NULL DEFAULT false,

  -- Modelo de distribuição
  model text NOT NULL DEFAULT 'round_robin', -- 'round_robin' | 'least_busy'

  -- Filtros de elegibilidade
  online_only boolean NOT NULL DEFAULT true,
  capacity_limit integer NOT NULL DEFAULT 3,
  allow_over_capacity boolean NOT NULL DEFAULT false,

  -- Prioridade
  priority_bypass boolean NOT NULL DEFAULT false,

  -- Fallback
  fallback_mode text NOT NULL DEFAULT 'queue_unassigned', -- 'queue_unassigned' | 'fallback_team'
  fallback_team_id uuid REFERENCES public.chat_teams(id) ON DELETE SET NULL,

  -- Round Robin pointer (último atendente atribuído)
  rr_last_attendant_id uuid,

  -- Regras avançadas
  advanced_reassign_enabled boolean NOT NULL DEFAULT false,
  advanced_reassign_minutes integer NOT NULL DEFAULT 10,
  advanced_notify_enabled boolean NOT NULL DEFAULT false,
  advanced_prefer_senior boolean NOT NULL DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.chat_assignment_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members manage assignment configs"
  ON public.chat_assignment_configs FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
```

### Adição de coluna `skill_level` em `attendant_profiles` (opcional, para regra senior)

```sql
ALTER TABLE public.attendant_profiles
  ADD COLUMN IF NOT EXISTS skill_level text DEFAULT 'junior'; -- 'junior' | 'pleno' | 'senior'
```

---

## Parte 2 — UI em `CategoriesTab.tsx`

### Estratégia: Expandir o card existente de cada categoria

Cada categoria já renderiza um `<Card>` com times e empresas. Abaixo da seção de times, para **cada vínculo categoria→time**, adicionamos um bloco expansível "Atribuição Automática" controlado por um `Accordion` ou `Collapsible`.

**Por que não criar uma tela separada**: a configuração é naturalmente por "categoria → time", que já é o nível que o card atual representa. Faz sentido UX deixar a config no mesmo lugar.

### Estrutura Visual de Cada Card (nova seção)

```text
┌─────────────────────────────────────────────────────────┐
│ ● Suporte Enterprise                          [edit][del]│
├─────────────────────────────────────────────────────────┤
│ Times responsáveis: [Time Técnico ×] [Time VIP ×] [+]   │
│                                                          │
│ ▼ Atribuição Automática — Time Técnico                   │
│   ┌───────────────────────────────────────────────────┐  │
│   │ ⚡ Ativo: Least Busy · Online only · Cap. 3       │  │  ← mini resumo quando ON
│   │ Toggle: [OFF] Ativar Atribuição Automática         │  │
│   │ Modelo: [Round Robin ▾]                            │  │
│   │ Somente online: [ON]  Capacidade: [3]              │  │
│   │ Permitir lotado: [OFF] ?                           │  │
│   │ ─ Prioridade ─                                     │  │
│   │ Empresa prioritária fura fila: [OFF] ?             │  │
│   │ ─ Fallback ─                                       │  │
│   │ Quando sem elegíveis: [Manter na fila ▾]           │  │
│   │ ► Regras Avançadas (accordion fechado)             │  │
│   │   Reatribuir sem resposta em [10] min: [OFF]       │  │
│   │   Notificar líder se SLA estourar: [OFF]           │  │
│   │   Preferir Senior p/ empresas prioritárias: [OFF]  │  │
│   │ [Salvar configuração]                              │  │
│   └───────────────────────────────────────────────────┘  │
│                                                          │
│ ▼ Atribuição Automática — Time VIP                       │
│   ...                                                    │
│                                                          │
│ Empresas: [Acme ×] [Corp ×] [+ Adicionar]               │
└─────────────────────────────────────────────────────────┘
```

### Componente novo: `AssignmentConfigPanel`

Para manter o `CategoriesTab.tsx` limpo, extraímos a configuração por vínculo em um componente separado `src/components/chat/AssignmentConfigPanel.tsx` que recebe:
- `categoryTeamId: string` (id do registro em `chat_category_teams`)
- `teamName: string`
- `allTeams: Team[]` (para o select de fallback_team)

Internamente ele busca/salva em `chat_assignment_configs`.

### Tooltips Explicativos

Usaremos `TooltipProvider + Tooltip + TooltipContent` do Radix (já disponível) em cada campo sensível:
- **Round Robin**: "Distribui os chats em sequência entre os atendentes elegíveis, garantindo divisão equilibrada"
- **Least Busy**: "Envia o chat para o atendente com menos conversas ativas no momento"
- **Somente online**: "Apenas atendentes com status 'Online' receberão novos chats automaticamente"
- **Capacidade**: "Número máximo de chats simultâneos por atendente. Ao atingir o limite, ele é ignorado na fila"
- **Permitir lotado**: "Mesmo com capacidade esgotada, o sistema continuará atribuindo. Use com cautela"
- **Prioridade fura fila**: "Empresas marcadas como 'Alta' ou 'Crítica' em seu cadastro vão para o melhor atendente disponível, ignorando a fila normal"
- **Fallback**: "O que fazer quando não houver atendentes elegíveis disponíveis"
- **Reatribuição**: "Se o atendente atribuído não enviar a primeira resposta nesse tempo, o chat será redistribuído para outro atendente do time"

### Alerta Informativo quando OFF

Quando `enabled = false`, exibe um banner sutil:
```
ℹ️ Atribuição automática desligada. Os atendentes precisarão pegar os chats manualmente ou transferir entre si.
```

### Mini resumo quando ON

Quando `enabled = true`, exibe acima dos controles (desabilitados em modo OFF):
```
⚡ Ativo: Least Busy · Online only · Cap. 3 · Prioridade fura fila: OFF
```

---

## Parte 3 — Arquivos a Criar/Modificar

| Arquivo | Ação | O que muda |
|---|---|---|
| `supabase/migrations/[timestamp].sql` | CRIAR | Tabela `chat_assignment_configs` + RLS + coluna `skill_level` em `attendant_profiles` |
| `src/components/chat/AssignmentConfigPanel.tsx` | CRIAR | Componente de configuração por categoria→time com todos os toggles, tooltips e lógica de save |
| `src/components/chat/CategoriesTab.tsx` | MODIFICAR | Importar e renderizar `AssignmentConfigPanel` para cada vínculo categoria-time abaixo da seção de times |

---

## Parte 4 — Detalhes do `AssignmentConfigPanel`

### Estado local
```typescript
interface AssignmentConfig {
  id: string | null;
  enabled: boolean;
  model: 'round_robin' | 'least_busy';
  online_only: boolean;
  capacity_limit: number;
  allow_over_capacity: boolean;
  priority_bypass: boolean;
  fallback_mode: 'queue_unassigned' | 'fallback_team';
  fallback_team_id: string | null;
  advanced_reassign_enabled: boolean;
  advanced_reassign_minutes: number;
  advanced_notify_enabled: boolean;
  advanced_prefer_senior: boolean;
}
```

### Fluxo de save
1. Se não existir registro → INSERT com `tenant_id` da sessão
2. Se existir → UPDATE pelo `id`
3. Toast de confirmação
4. Reload do estado local

### Comportamento dos inputs desabilitados
Quando `enabled = false`, todos os controles ficam com `disabled` + `opacity-50` + `cursor-not-allowed`, mas os valores são preservados.

### Accordion de Regras Avançadas
Usa `Collapsible` do Radix (já instalado) com trigger "Regras Avançadas (opcional)" e ícone chevron. Fica fechado por padrão.

---

## Parte 5 — O que NÃO está neste plano (runtime)

O prompt pede também a lógica de runtime (aplicar as regras quando um chat entra). Isso envolve modificar `supabase/functions/resolve-chat-visitor/index.ts` ou criar uma nova edge function. **Esta parte da implementação de runtime não está incluída neste plano** — o foco aqui é 100% na **persistência das configurações e na UX da tela de configuração**, que é o requisito principal descrito. A lógica de runtime pode ser feita em seguida como etapa separada, pois ela depende de ter as configs salvas primeiro.

---

## Resumo de Impacto

- Comportamento atual: **zero impacto** (tudo nasce com `enabled = false`)
- Nova tabela: `chat_assignment_configs` (1 registro por vínculo categoria→time)
- Nova coluna: `attendant_profiles.skill_level` (nullable text, default 'junior')
- Novo componente: `AssignmentConfigPanel` (~250 linhas, autocontido)
- Modificação no `CategoriesTab`: +15 linhas para renderizar o painel por vínculo
