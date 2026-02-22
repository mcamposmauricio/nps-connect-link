

# Reestruturacao das Configuracoes do Chat

## Resumo do Problema

As abas de configuracao do chat estao fragmentadas e com conteudo disperso em locais que nao fazem sentido intuitivo:

- **Times** e **Atendentes** sao abas separadas, mas tratam do mesmo assunto (equipe)
- **API Keys** esta isolada, mas deveria estar junto do Widget (instalacao)
- **Geral** mistura mensagens (welcome/offline) com comportamento (auto_assignment), sendo que:
  - As mensagens deveriam ficar em **Msgs Automaticas** (aba "rules") como modelos default
  - O toggle de atribuicao automatica deveria ficar em **Regras de Atendimento** (aba "categories"), que ja tem o `AssignmentConfigPanel`

## Nova Estrutura de Abas

Abas atuais (9):
```text
Geral | Widget | Macros | Horarios | Msgs Automaticas | API Keys | Atendentes | Times | Regras de Atendimento
```

Abas propostas (6):
```text
Widget e Instalacao | Equipe | Regras de Atendimento | Msgs Automaticas | Macros | Horarios
```

## Detalhamento das Mudancas

### 1. Eliminar a aba "Geral"

O conteudo atual da aba Geral sera redistribuido:

- **Mensagens** (welcome_message, offline_message) -> movidas para a aba **Msgs Automaticas** como cards de modelos default pre-existentes, junto das regras `chat_auto_rules`
- **Comportamento** (auto_assignment toggle, max_queue_size) -> movido para a aba **Regras de Atendimento**, como uma secao global no topo antes das categorias

### 2. Fundir "Widget" + "API Keys" em "Widget e Instalacao"

A aba de Widget ja contem configuracao visual, preview e codigo embed. A API Key e necessaria para instalar o widget. Faz sentido unificar:

- Manter todo o conteudo atual do Widget
- Adicionar o componente `ChatApiKeysTab` como uma secao abaixo do codigo embed, com titulo "Chaves de API"
- Remover a aba separada de API Keys

### 3. Fundir "Atendentes" + "Times" em "Equipe"

Uma unica aba com duas sub-secoes ou um layout unificado:

- **Secao 1: Atendentes** - cards dos CSMs com toggle, status, skill, capacidade e times vinculados (conteudo atual do `AttendantsTab`)
- **Secao 2: Times** - lista de times com membros (conteudo atual do `TeamsTab`)
- Usar `Collapsible` ou sub-tabs internas para organizar

### 4. Mover atribuicao automatica global para "Regras de Atendimento"

- O toggle `auto_assignment` e o campo `max_queue_size` da aba Geral serao movidos para o topo da aba "Regras de Atendimento" (`CategoriesTab`), como um card "Configuracao Global" acima das categorias
- Faz sentido conceitual: as regras de atendimento (categorias + times + atribuicao automatica por time) ficam todas no mesmo lugar

### 5. Msgs Automaticas absorve mensagens default

- A aba de regras (`rules`) passa a incluir no topo os campos de `welcome_message` e `offline_message` como "Modelos Padrao" que ja vem criados
- Abaixo, manter a estrutura atual de `chat_auto_rules` (inactivity_warning, auto_close, etc.)

## Arquivos a Modificar

| Arquivo | Mudanca |
|---|---|
| `src/pages/AdminSettings.tsx` | Reestruturar abas: remover Geral, fundir Widget+API Keys, fundir Atendentes+Times, mover campos de mensagens para rules, mover auto_assignment para categories |
| `src/components/chat/CategoriesTab.tsx` | Receber e exibir props de `auto_assignment` e `max_queue_size` como secao global no topo |
| Nenhum arquivo novo | Apenas reorganizacao de conteudo existente |

## Resultado Final

A tela tera 6 abas claras e intuitivas:

1. **Widget e Instalacao** - aparencia, preview, codigo embed, API keys
2. **Equipe** - atendentes (toggle, status, skill, capacidade) + times
3. **Regras de Atendimento** - config global (auto_assignment, fila max) + categorias com times e atribuicao automatica por time
4. **Msgs Automaticas** - mensagens padrao (boas-vindas, offline) + regras automaticas (inatividade, auto-close)
5. **Macros** - atalhos de resposta rapida (sem mudanca)
6. **Horarios** - horario de funcionamento (sem mudanca)

