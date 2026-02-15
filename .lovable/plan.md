

# Reorganizar Menu de Relatorios

## Objetivo

Unificar todos os relatorios em um unico menu "Relatorios" na sidebar, com visibilidade baseada nas permissoes individuais de cada sub-item. O relatorio de atendimento (Gerencial) sai do submenu de Chat e passa para este menu unificado. Atendentes com permissao `chat.view` passam a ver o relatorio de atendimento.

## Mudancas

### 1. Sidebar (`src/components/AppSidebar.tsx`)

**Remover do submenu Chat:**
- O item "Gerencial" (linha 280-284) sai do bloco `hasPermission('chat', 'manage')` dentro do Chat.

**Substituir a secao "CS Reports" (linhas 148-164) por um menu unificado "Relatorios":**

O novo menu sera um Collapsible (como NPS e Chat) com os seguintes sub-itens, cada um com sua propria verificacao de permissao:

| Sub-item | Rota | Permissao necessaria | Icone |
|----------|------|---------------------|-------|
| Health Score | `/cs-health` | `cs.view` | Heart |
| Risco (Churn) | `/cs-churn` | `cs.view` | TrendingDown |
| Receita | `/cs-financial` | `cs.view` | DollarSign |
| Atendimento (Gerencial) | `/admin/gerencial` | `chat.view` | TrendingUp |

**Visibilidade do menu pai:** O grupo "Relatorios" aparece se o usuario tiver `cs.view` OU `chat.view`. A logica sera:

```text
const showReports = hasPermission('cs', 'view') || hasPermission('chat', 'view');
```

Cada sub-item so renderiza se a permissao correspondente existir. Exemplo: usuario com apenas `chat.view` vera somente "Atendimento".

**Estado do Collapsible:** aberto por padrao se a rota atual for uma das rotas de relatorio (`/cs-health`, `/cs-churn`, `/cs-financial`, `/admin/gerencial`).

### 2. Nenhuma outra mudanca necessaria

- As rotas ja existem em `App.tsx`
- As paginas ja existem
- Nenhuma mudanca no banco de dados
- Traducoes: reutilizar as chaves existentes (`cs.reports`, `nav.health`, `nav.risk`, `nav.revenue`, `chat.gerencial.title`)

## Arquivo modificado

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/components/AppSidebar.tsx` | Remover "Gerencial" do Chat, remover secao "CS Reports", criar menu unificado "Relatorios" com permissoes granulares |

## Resultado esperado

- Usuario com `cs.view` + `chat.view`: ve todos os 4 sub-itens de relatorios
- Usuario apenas com `chat.view`: ve o menu "Relatorios" com apenas "Atendimento"
- Usuario apenas com `cs.view`: ve "Relatorios" com Health, Risco e Receita (sem Atendimento)
- Usuario sem nenhuma das duas permissoes: nao ve o menu "Relatorios"
- Admin: ve tudo (ja coberto pelo `hasPermission` que retorna `true` para admins)

