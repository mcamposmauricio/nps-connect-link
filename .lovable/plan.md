
# Plano: Mover API Keys para NPS Settings e Criar API Keys no Chat Settings

## Resumo

A tab "API Keys" atualmente esta nas configuracoes gerais (`/nps/settings`). Como as API Keys sao dedicadas ao widget NPS, devem ser movidas para as configuracoes NPS (`/nps/nps-settings`). Alem disso, sera criada uma nova tab de API Keys nas configuracoes do Chat (`/admin/settings`) para o widget de chat.

---

## Mudancas

### 1. Mover API Keys para NPSSettings

**`src/pages/NPSSettings.tsx`**
- Adicionar import do `ApiKeysTab`
- Adicionar nova tab "API Keys" com icone `Key`
- Respeitar permissao `settings.manage` ou `isAdmin` para exibir a tab

### 2. Remover API Keys das configuracoes gerais

**`src/pages/Settings.tsx`**
- Remover import do `ApiKeysTab` e icone `Key`
- Remover a tab e o conteudo "apikeys"
- Ajustar `defaultTab` para "team" (unicas tabs restantes sao Team e Organization, ambas admin-only)
- Como so restam tabs de admin, a pagina inteira fica condicionada a `isAdmin`

### 3. Criar tab API Keys no AdminSettings (Chat)

**`src/pages/AdminSettings.tsx`**
- Adicionar nova tab "API Keys" apos as tabs existentes (general, widget, macros, hours, rules)
- O conteudo sera similar ao widget tab existente mas focado em gerar codigo de integracao do chat widget
- Criar um componente inline com:
  - Codigo de embed do chat widget (iframe)
  - Instrucoes de integracao
- Nota: o chat widget nao usa API keys do banco -- ele usa a URL direta do widget. A tab "Widget" ja existente faz exatamente isso. A solucao e **renomear** a tab "Widget" para "Integracao/API" e expandir com mais opcoes de configuracao, ou criar uma tab separada com chaves de API dedicadas ao chat.

**Decisao:** Como o chat widget ja possui a tab "Widget" com codigo de integracao, a melhor abordagem e adicionar uma nova tab "API Keys" que permita gerar chaves especificas para o chat (prefixo `chat_` ao inves de `nps_`). Isso reutiliza a mesma tabela `api_keys` mas com um campo de contexto.

### 4. Criar ChatApiKeysTab

**`src/components/ChatApiKeysTab.tsx`** (novo)
- Componente similar ao `ApiKeysTab` mas:
  - Gera chaves com prefixo `chat_` ao inves de `nps_`
  - Mostra codigo de integracao do widget de chat (nao do NPS)
  - Filtra API keys por prefixo `chat_`

### 5. Atualizar locales

**`src/locales/pt-BR.ts`** e **`src/locales/en.ts`**
- Adicionar chaves para a tab de API Keys do chat

---

## Arquivos Modificados

| # | Arquivo | Mudanca |
|---|---------|--------|
| 1 | `src/pages/NPSSettings.tsx` | Adicionar tab API Keys |
| 2 | `src/pages/Settings.tsx` | Remover tab API Keys, simplificar para admin-only |
| 3 | `src/pages/AdminSettings.tsx` | Adicionar tab API Keys do chat |
| 4 | `src/components/ChatApiKeysTab.tsx` | **Novo** - Componente de API Keys para chat |
| 5 | `src/locales/pt-BR.ts` | Novas chaves |
| 6 | `src/locales/en.ts` | Novas chaves |

---

## Secao Tecnica

### Reutilizacao da tabela `api_keys`

Ambos os modulos (NPS e Chat) usarao a mesma tabela `api_keys`. A diferenciacao sera feita pelo prefixo da chave:
- NPS: `nps_...`
- Chat: `chat_...`

O `ApiKeysTab` existente ja filtra por tenant via RLS. Para separar as chaves, cada componente filtrara pelo `key_prefix` que comeca com `nps_` ou `chat_`.

### ChatApiKeysTab

Baseado no `ApiKeysTab` existente, com as seguintes diferencas:
- Prefixo de chave: `chat_` ao inves de `nps_`
- Codigo de integracao mostra o embed do chat widget
- Filtra chaves exibidas por prefixo `chat_`
