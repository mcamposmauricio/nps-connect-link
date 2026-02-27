
# Correcoes: Badge Duplicado no Widget + Melhoria de UX nas Mensagens Automaticas

## Problema 1: Badge de notificacao duplicado no FAB

**Causa raiz**: Existem **duas implementacoes** do badge de mensagens nao lidas rodando simultaneamente:
1. Dentro do iframe (`ChatWidget.tsx`, linhas 1013-1036) - renderiza um badge no canto superior direito do botao FAB
2. Fora do iframe (`nps-chat-embed.js`, linhas 293-314) - o embed script cria um elemento DOM separado no documento pai, tambem posicionado sobre o FAB

Ambos sao visiveis ao mesmo tempo, resultando em dois badges.

**Solucao**: Remover o badge do `nps-chat-embed.js` (o badge externo) e manter apenas o que esta dentro do iframe (`ChatWidget.tsx`), que ja esta posicionado corretamente no canto superior direito do FAB. O `postMessage` de `chat-unread-count` pode continuar sendo enviado para uso futuro, mas o embed script nao renderizara mais badge visual proprio.

**Arquivo**: `public/nps-chat-embed.js`
- Remover a variavel `unreadBadge` e toda a funcao `updateUnreadBadge`
- Remover o listener de `chat-unread-count` que cria/atualiza o badge
- Manter o restante do listener de `message` intacto (para `chat-toggle`)

---

## Problema 2: Melhoria de UI/UX da tela AutoMessagesTab

Melhorias planejadas para a experiencia de configuracao das mensagens automaticas:

### 2a. Accordion colapsavel para cada regra

Substituir os cards sempre-abertos por um layout com **Accordion** (ja disponivel via `@radix-ui/react-accordion`). Cada regra mostra apenas o cabecalho (icone, titulo, switch on/off) por padrao. Clicar expande para mostrar os campos de edicao (minutos + texto). Isso reduz a poluicao visual e facilita a navegacao, especialmente com 11 regras na tela.

### 2b. Drag-and-drop para reordenacao do Fluxo Principal

Adicionar a possibilidade de reordenar as 4 regras do Fluxo Principal arrastando os cards. Isso sera implementado com um campo `sort_order` (integer) no banco de dados para persistir a ordem.

- Cada card do fluxo principal tera um icone de "grip" (arrastar) no lado esquerdo
- A reordenacao atualiza o `sort_order` no banco e o numero visual (1, 2, 3, 4)
- Utilizaremos botoes de seta (mover para cima / mover para baixo) ao inves de drag-and-drop nativo, para simplicidade e confiabilidade

### 2c. Indicador visual de status inline

No cabecalho de cada regra (dentro do accordion), mostrar um mini-badge de status:
- Verde com texto "Ativa" quando `is_enabled = true`
- Cinza com texto "Inativa" quando `is_enabled = false`

### 2d. Salvar todas as alteracoes de uma vez

Adicionar um botao "Salvar tudo" fixo no topo do card quando houver qualquer alteracao pendente em qualquer regra. Isso complementa o botao individual "Salvar" de cada regra.

### 2e. Fluxo visual melhorado

No grupo "Fluxo Principal", substituir as setas simples por uma **linha vertical continua** com pontos numerados (timeline), conectando visualmente as 4 etapas em sequencia. Cada ponto tera o numero da etapa e a linha indicara o fluxo de cima para baixo.

---

## Mudanca de Banco de Dados

Adicionar coluna `sort_order` na tabela `chat_auto_rules`:

```sql
ALTER TABLE chat_auto_rules ADD COLUMN sort_order integer DEFAULT 0;
```

Isso permite persistir a ordem configurada pelo usuario para as regras do fluxo principal.

---

## Resumo de Arquivos

| Arquivo | Mudanca |
|---------|---------|
| `public/nps-chat-embed.js` | Remover badge duplicado (manter apenas o do iframe) |
| `src/components/chat/AutoMessagesTab.tsx` | Accordion, timeline visual, reordenacao com setas, badge de status, botao "salvar tudo" |
| `src/locales/pt-BR.ts` | Novas chaves: "Ativa", "Inativa", "Salvar tudo", "Mover para cima", "Mover para baixo" |
| `src/locales/en.ts` | Equivalentes em ingles |
| Migration SQL | Adicionar coluna `sort_order` em `chat_auto_rules` |
