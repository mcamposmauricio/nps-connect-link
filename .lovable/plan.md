

# Plano: Tela de Documentacao do Payload para o Cliente (Chat Widget)

## Problema

Quando o admin configura campos customizados (ex: `mrr`, `plano_contratado`, `link_master`), o cliente que integra o widget nao tem como saber:
- Quais keys enviar no `window.NPSChat.update()`
- Qual o tipo esperado de cada campo (decimal, url, boolean, etc.)
- Quais campos sao obrigatorios para identificacao automatica
- Qual o formato correto do payload

Atualmente o admin precisaria comunicar isso manualmente por email/documento, o que e fragil e propenso a erros.

## Solucao

Criar uma secao de **"Documentacao para Desenvolvedores"** dentro da aba "Widget e Instalacao" do AdminSettings, que gera automaticamente a documentacao com base nos campos customizados cadastrados pelo tenant. Similar ao padrao ja existente no `ExternalApiTab`.

## O que sera criado

### Novo componente: `src/components/chat/ChatWidgetDocsTab.tsx`

Uma secao de documentacao que inclui:

**1. Referencia da API `window.NPSChat.update()`**
- Explicacao do metodo
- Campos reservados de identificacao (name, email, phone) -- sempre disponiveis
- Campos reservados de empresa (company_id, company_name) -- sempre disponiveis

**2. Tabela dinamica de campos customizados do tenant**
- Busca `chat_custom_field_definitions` do tenant atual
- Exibe: Key, Label, Tipo, Destino (Empresa/Contato), Obrigatorio
- Se nao ha campos cadastrados, mostra mensagem orientando o admin a configurar primeiro

**3. Payload de exemplo gerado automaticamente**
- Gera um JSON de exemplo usando os campos reais do tenant
- Valores de exemplo por tipo:
  - text: "Exemplo"
  - decimal: 1500.00
  - integer: 10
  - url: "https://exemplo.com"
  - boolean: true
  - date: "2026-01-15"
- Botao de copiar o payload

**4. Snippet JavaScript completo**
- Codigo pronto para copiar com os campos do tenant preenchidos como placeholder
- Exemplo:
```javascript
window.NPSChat.update({
  // Identificacao (pula formulario se name + email presentes)
  name: "Nome do usuario",
  email: "email@empresa.com",
  phone: "(11) 99999-9999",

  // Empresa
  company_id: "ID_DA_EMPRESA",
  company_name: "Nome da Empresa",

  // Campos customizados configurados
  mrr: 5000.00,           // Valor do MRR (decimal)
  plano: "Enterprise",    // Plano Contratado (text)
  link_master: "https://app.com/admin"  // Link Admin (url)
});
```

**5. Tabela de campos reservados**
- Campos que sempre funcionam independente da configuracao:

| Key | Tipo | Descricao |
|-----|------|-----------|
| name | string | Nome do visitante (obrigatorio para auto-start) |
| email | string | Email do visitante (obrigatorio para auto-start) |
| phone | string | Telefone do visitante |
| company_id | string | ID externo da empresa (para vincular ao cadastro) |
| company_name | string | Nome da empresa (cria empresa se nao existir) |
| mrr | number | MRR -- atualiza coluna direta |
| contract_value | number | Valor do contrato -- atualiza coluna direta |
| company_sector | string | Setor -- atualiza coluna direta |
| company_document | string | CNPJ -- atualiza coluna direta |

### Integracao no AdminSettings

Posicionar o novo componente na aba "Widget e Instalacao", logo apos o `CustomFieldDefinitionsTab` e antes do `ChatApiKeysTab`. Ordem final:
1. Configuracao do Widget (aparencia)
2. Codigo de Embed
3. Campos Customizados (definicoes do admin)
4. **Documentacao para Desenvolvedores** (NOVO -- referencia do payload)
5. Chaves de API

### Comportamento dinamico

- Se o tenant tem 0 campos customizados cadastrados: a secao de "Campos Customizados Configurados" mostra um alerta orientando a cadastrar campos primeiro, mas ainda exibe os campos reservados
- Se o tenant tem campos: gera a tabela e os snippets automaticamente
- Botao "Copiar payload" e "Copiar snippet" para facilitar o compartilhamento com o desenvolvedor do cliente

## Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| `src/components/chat/ChatWidgetDocsTab.tsx` | Criar -- componente de documentacao dinamica |
| `src/pages/AdminSettings.tsx` | Modificar -- adicionar o componente na aba widget |

## Detalhes tecnicos

- Buscar campos via `supabase.from("chat_custom_field_definitions").select("*").order("display_order")`
- RLS ja garante que so retorna campos do tenant do usuario logado
- Reutilizar o padrao visual do `ExternalApiTab` (Card com pre/code, CopyButton, Table com Badge)
- Nenhuma mudanca no banco de dados necessaria

