

# Plano: Expor IDs da Empresa e Consolidar Visao de Detalhes

## Resumo

Atualmente existem **duas visoes diferentes** para detalhes de empresa:
- **Contacts page** (`Contacts.tsx`): Sheet simples com dados cadastrais + lista de contatos, sem historico/NPS/timeline
- **CS Dashboard** (`CompanyCSDetailsSheet.tsx`): Sheet completo com overview, NPS, trilhas, timeline, mas sem mostrar IDs ou lista de contatos clicaveis

O objetivo e **consolidar ambas** em um unico componente rico que:
1. Mostra o **ID interno** (UUID) da empresa e o **external_id** dos contatos para facilitar integracao
2. Tem **contatos clicaveis** que abrem o `PersonDetailsSheet`
3. Inclui **todas as abas importantes**: Overview (com IDs), Contatos, NPS, Trilhas/Jornadas, Timeline

---

## Mudancas

### 1. Criar componente unificado `CompanyDetailsSheet`

**`src/components/CompanyDetailsSheet.tsx`** (novo)

Componente consolidado que une o melhor de ambas as visoes:

**Tab Overview:**
- ID interno da empresa (UUID) com botao de copia
- Dados cadastrais (email, telefone, endereco, CNPJ, setor)
- Health Score e status CS
- Dados financeiros (MRR, valor contrato, renovacao)
- Ultimo NPS

**Tab Contatos:**
- Lista de contatos (`company_contacts`) **clicaveis**
- Cada contato mostra: nome, email, cargo, departamento, `external_id`, `public_token`
- Ao clicar em um contato, abre o `PersonDetailsSheet` existente
- Botoes de acao (editar, excluir, definir primario) respeitando permissoes

**Tab NPS:**
- Trilhas NPS ativas
- Historico de respostas NPS com score e comentarios

**Tab Timeline:**
- Eventos da timeline da empresa

### 2. Atualizar Contacts page para usar o novo componente

**`src/pages/Contacts.tsx`**
- Substituir o Sheet inline pelo `CompanyDetailsSheet`
- Manter todos os dialogs de add/edit/delete como estao

### 3. Atualizar CS Dashboard para usar o novo componente

**`src/components/cs/CSKanbanBoard.tsx`** ou onde o `CompanyCSDetailsSheet` e usado
- Substituir por `CompanyDetailsSheet`

### 4. Adicionar IDs ao CompanyCard

**`src/components/CompanyCard.tsx`**
- Mostrar o ID interno da empresa (UUID truncado) com botao de copia
- Sutil, nao poluir visualmente

### 5. Mostrar external_id na lista de contatos

**`src/components/CompanyContactsList.tsx`**
- Exibir `external_id` quando presente, com icone e label "ID Externo"
- Botao de copia para o external_id

---

## Arquivos

| # | Arquivo | Mudanca |
|---|---------|---------|
| 1 | `src/components/CompanyDetailsSheet.tsx` | **Novo** -- Componente unificado de detalhes da empresa |
| 2 | `src/pages/Contacts.tsx` | Usar `CompanyDetailsSheet` no lugar do Sheet inline |
| 3 | `src/components/cs/CompanyCSDetailsSheet.tsx` | Remover (substituido pelo componente unificado) |
| 4 | `src/components/CompanyCard.tsx` | Adicionar ID interno com copia |
| 5 | `src/components/CompanyContactsList.tsx` | Exibir `external_id` com copia |
| 6 | `src/locales/pt-BR.ts` | Novas chaves de traducao |
| 7 | `src/locales/en.ts` | Novas chaves de traducao |
| 8 | Componentes CS que referenciam `CompanyCSDetailsSheet` | Atualizar imports |

---

## Secao Tecnica

### CompanyDetailsSheet -- Dados carregados

O componente recebera o `company.id` e fara queries para:
- `contacts` (dados da empresa)
- `company_contacts` (lista de pessoas vinculadas)
- `trails` (trilhas/jornadas)
- `responses` JOIN `campaigns` (historico NPS)
- `timeline_events` (timeline)

### IDs expostos

| Campo | Origem | Exibicao |
|-------|--------|----------|
| ID Interno (empresa) | `contacts.id` (UUID) | Texto truncado + botao copiar na tab Overview e no CompanyCard |
| External ID (pessoa) | `company_contacts.external_id` | Na lista de contatos e no PersonDetailsSheet |

### Contatos clicaveis

Ao clicar em um contato na tab "Contatos", o componente abrira o `PersonDetailsSheet` passando os dados da pessoa. Como ambos sao Sheets, o `PersonDetailsSheet` sera aberto em uma segunda camada (overlay sobre o CompanyDetailsSheet).

### Snippet de integracao

Na tab Overview, alem do ID, havera uma secao "Integracao" que mostra o de-para:
- ID da empresa no sistema: `contacts.id`
- IDs externos dos contatos: lista de `company_contacts.external_id`

Isso facilita o mapeamento para quem esta integrando via API/widget.

