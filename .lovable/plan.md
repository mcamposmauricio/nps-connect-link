

# Melhorias Completas nos Guias de Implementacao e Prompt de Vibecoding

## Contexto

O componente `ChatWidgetDocsTab.tsx` tem 3 passos hoje: (1) Instalar Widget, (2) Identificar Usuario, (3) Prompt Vibecoding. O conteudo e funcional mas basico. As melhorias abaixo tornam os guias muito mais completos, especialmente o prompt de vibecoding que precisa ser um documento auto-suficiente para uma IA implementar a integracao sem perguntas.

## Melhorias Planejadas

### 1. Prompt de Vibecoding (Passo 3) -- Reescrever Completamente

O prompt atual e superficial. O novo prompt sera um documento completo com:

- **Secao de contexto**: explicar o que e o widget, como funciona, o que o `update()` faz
- **Instrucoes de instalacao**: dois modos (anonimo vs identificado) com explicacao de quando usar cada um
- **Fluxo de identificacao**: explicar que `name` + `email` disparam auto-start e pulam formulario
- **Referencia de `company_id`**: explicar que `company_id` e o identificador unico da empresa (`external_id`) -- se existir, vincula; se nao, cria
- **Tabela completa de campos**: reservados + diretos da empresa + customizados do tenant, com tipo, obrigatoriedade e descricao
- **Exemplos de codigo por framework**: snippets para React (useEffect), Vue (onMounted), e JavaScript puro
- **Regras de merge**: explicar que campos customizados sao mesclados (JSONB merge), nao substituidos
- **Comportamento do auto-start**: detalhar as condicoes (name + email presentes, sem visitor existente)
- **Notas sobre `company_name` vs `company_id`**: explicar prioridades e fallbacks

### 2. Snippet de Update (Passo 2) -- Melhorar

- Adicionar campos diretos da empresa no snippet (`mrr`, `contract_value`, `company_sector`, `company_document`)
- Separar visualmente os blocos: identificacao, empresa, campos diretos, campos customizados
- Adicionar comentarios explicativos em cada bloco

### 3. Guia de Instalacao (Passo 1) -- Melhorar

- Adicionar nota explicativa sobre quando usar anonimo vs identificado
- Adicionar tabela com os `data-*` attributes do script e o que cada um faz
- Adicionar nota sobre `data-api-key` e `data-external-id`

### 4. Referencia Completa (Collapsible) -- Melhorar

- Adicionar secao explicando o fluxo completo: script carrega -> resolve visitor -> cria iframe -> `update()` envia dados
- Melhorar descricoes dos campos reservados com mais contexto
- Adicionar exemplos de valores para cada campo no payload

### 5. Full Doc (Copiar Tudo) -- Incluir tudo

- O `buildFullDoc()` precisa incluir todas as melhorias acima
- Incluir a referencia de campos customizados com exemplos
- Incluir as notas sobre auto-start e merge

## Detalhes Tecnicos

### Arquivo unico a modificar
`src/components/chat/ChatWidgetDocsTab.tsx`

### Funcoes a alterar

1. **`buildVibecodingPrompt()`** (linhas 140-198): reescrever completamente para gerar um documento Markdown auto-suficiente com ~80-100 linhas, incluindo:
   - Contexto do produto
   - Instrucoes de instalacao (2 modos)
   - Codigo de identificacao com exemplos por framework (React, Vue, JS puro)
   - Tabela completa de campos (reservados + diretos + customizados do tenant)
   - Regras de comportamento (auto-start, merge de custom_fields, fallbacks)
   - Secao de troubleshooting basico

2. **`buildUpdateSnippet()`** (linhas 112-137): adicionar campos diretos da empresa e separar em blocos com comentarios

3. **`buildFullDoc()`** (linhas 230-252): expandir para incluir todas as secoes novas

4. **`buildPayloadJson()`** (linhas 201-227): manter mas melhorar com comentarios inline

5. **Constante `RESERVED_FIELDS`** (linhas 45-55): melhorar descricoes para serem mais explicativas

### UI: Passo 1 (Instalacao)
- Adicionar mini-tabela abaixo dos code blocks explicando os `data-*` attributes:
  - `data-api-key`: Chave de API para identificacao automatica
  - `data-external-id`: ID do usuario no sistema do cliente
  - `data-position`: Posicao do botao (left/right)
  - `data-primary-color`: Cor principal do widget
  - `data-company-name`: Nome exibido no cabecalho
  - `data-button-shape`: Formato do botao (circle/square)

### UI: Passo 3 (Vibecoding)
- Manter o layout visual atual (border amber, badge "Novo")
- O pre/code com o prompt tera `max-h-96` (mais alto) para mostrar mais conteudo
- Adicionar um botao secundario "Copiar para Cursor/Lovable" ao lado do "Copiar" existente (mesmo comportamento, label diferente para clareza)

### Conteudo do novo prompt de vibecoding (estrutura)

```
# Integracao: Widget de Chat ao Vivo

## Sobre
[Widget embeddable que permite chat em tempo real entre visitantes e atendentes]

## Instalacao
### Modo Anonimo (visitante sem identificacao)
[script tag sem api-key]

### Modo Identificado (usuario autenticado)
[script tag com api-key e external-id]

## Identificacao do Usuario via JavaScript
[Explicar window.NPSChat.update()]
[Exemplo React com useEffect]
[Exemplo JavaScript puro]

## Campos do Payload

### Campos de Identificacao (obrigatorios para auto-start)
| Campo | Tipo | Descricao |
| name | string | Nome do visitante |
| email | string | Email do visitante |

### Campos Opcionais do Visitante
| phone | string | Telefone |

### Campos da Empresa
| company_id | string | ID externo unico da empresa (external_id) |
| company_name | string | Nome da empresa |
| mrr | number | MRR da empresa |
| contract_value | number | Valor do contrato |
| company_sector | string | Setor |
| company_document | string | CNPJ |

### Campos Customizados (configurados pelo admin)
[Tabela dinamica gerada a partir dos chat_custom_field_definitions]

## Comportamento
- Se name + email presentes: formulario e pulado (auto-start)
- company_id vincula a empresa existente ou cria nova
- Campos customizados sao mesclados (merge), nao sobrescritos
- update() pode ser chamado multiplas vezes
- Funciona sem update() (modo visitante anonimo)

## Exemplo Completo
[Payload JSON completo]
```

### Nenhuma mudanca no banco ou backend
Apenas alteracoes no componente de documentacao (front-end).

