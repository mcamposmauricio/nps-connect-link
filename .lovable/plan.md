
# Plano: Documentacao Completa e Intuitiva do Widget + Prompt para Vibecoding

## Problema Atual

A secao de documentacao (`ChatWidgetDocsTab`) existe mas e basica demais:
- Nao tem o codigo de embed completo (script tag) -- o cliente precisa rolar para cima para ver
- Falta um guia passo-a-passo claro ("1, 2, 3")
- Nao tem um prompt pronto para vibecoding (copiar e colar no Cursor/Lovable/etc.)
- O design e uma unica Card sem hierarquia visual -- tudo parece igual
- Nao ha separacao clara entre "o que o admin faz" e "o que enviar ao desenvolvedor"

## Solucao

Reescrever completamente o `ChatWidgetDocsTab.tsx` com UX profissional orientada a acao, organizada em steps numerados com copy-paste em cada bloco, e adicionar um prompt pronto para ferramentas de vibecoding.

## Novo Design -- Estrutura Visual

### Secao 1: Guia Rapido (3 steps numerados)

Cards numerados com icones, cada um com botao "Copiar":

```text
+---------------------------------------------------+
| 1. Instale o Widget                               |
| Cole este script no HTML do seu site, antes de     |
| </body>:                                          |
|                                                    |
| [bloco de codigo com script tag completo]  [Copiar]|
+---------------------------------------------------+
| 2. Identifique o Usuario (opcional)                |
| Quando o usuario logar na sua plataforma, envie    |
| os dados dele para pular o formulario:             |
|                                                    |
| [bloco de codigo window.NPSChat.update()]  [Copiar]|
+---------------------------------------------------+
| 3. Prompt para Vibecoding (IA)                     |
| Copie este prompt e cole na sua ferramenta de IA   |
| (Cursor, Lovable, etc.) para implementar           |
| automaticamente:                                   |
|                                                    |
| [bloco com prompt completo]                [Copiar]|
+---------------------------------------------------+
```

### Secao 2: Referencia Completa (Collapsible)

Dentro de um Collapsible "Ver referencia completa da API":
- Tabela de campos reservados (name, email, phone, company_id, etc.)
- Tabela de campos customizados do tenant (dinamica)
- Payload JSON de exemplo (dinamico)

## Detalhes do Prompt para Vibecoding

O prompt gerado sera algo como:

```text
Preciso integrar um widget de chat na minha aplicacao web.

## Script de Embed
Adicione o seguinte script antes do </body> em todas as paginas:

<script src="https://[DOMINIO]/nps-chat-embed.js"
  data-position="right"
  data-primary-color="#7C3AED"
  data-company-name="Suporte"
  data-button-shape="circle">
</script>

## Identificacao do Usuario
Quando o usuario logar, chame:

window.NPSChat.update({
  name: usuario.nome,
  email: usuario.email,
  phone: usuario.telefone,
  company_id: usuario.empresa_id,
  company_name: usuario.empresa_nome,
  [campos customizados do tenant aqui]
});

## Campos Aceitos
- name (string, obrigatorio para auto-start)
- email (string, obrigatorio para auto-start)
- phone (string, opcional)
- company_id (string, opcional - vincula ao cadastro)
- company_name (string, opcional - cria empresa)
- mrr (number, opcional)
- contract_value (number, opcional)
[+ campos customizados do tenant]

## Comportamento
- Se name + email forem enviados, o formulario de identificacao e pulado
- Campos de empresa atualizam automaticamente o cadastro
- O widget funciona mesmo sem chamar update() (modo anonimo)
```

## Mudancas no Design/UX

1. **Steps numerados** com circulo colorido + titulo + descricao + bloco de codigo + botao copiar
2. **Botao "Copiar tudo"** proeminente no topo para copiar a documentacao inteira de uma vez
3. **Collapsible** para referencia detalhada (tabelas de campos) -- nao polui a view principal
4. **Visual de "step cards"** com borda left colorida e numeracao
5. **Prompt de vibecoding** com icone de sparkles/wand e destaque visual diferenciado
6. **Embed code integrado** no Step 1 (elimina necessidade de rolar ate o card separado acima)

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/chat/ChatWidgetDocsTab.tsx` | Reescrita completa com steps, prompt vibecoding, UX melhorada |
| `src/pages/AdminSettings.tsx` | Remover o Card de "Embed Code" separado (agora integrado no DocsTab) |

## Detalhes Tecnicos

### Props do ChatWidgetDocsTab

O componente precisara receber as settings do widget para gerar o codigo de embed correto:

```text
interface ChatWidgetDocsTabProps {
  widgetPosition: string;
  widgetPrimaryColor: string;
  widgetCompanyName: string;
  widgetButtonShape: string;
}
```

### Geracao do Prompt de Vibecoding

Funcao `buildVibecodingPrompt()` que gera um prompt markdown completo contendo:
- Script de embed com as configs reais do tenant
- Codigo `window.NPSChat.update()` com todos os campos (reservados + customizados)
- Descricao de cada campo com tipo esperado
- Notas sobre comportamento (auto-start, upsert de empresa)

### Integracao no AdminSettings

A ordem final na aba "Widget e Instalacao" ficara:
1. Config do Widget + Preview (grid 2 colunas)
2. Comportamento e Mensagens (Collapsible)
3. Campos Customizados (CustomFieldDefinitionsTab)
4. **Documentacao e Integracao** (ChatWidgetDocsTab reescrito -- inclui embed + docs + vibecoding)
5. Chaves de API (ChatApiKeysTab)

O Card separado de "Codigo de Embed" (linhas 647-673) sera removido pois o conteudo esta agora integrado no Step 1 da documentacao.
