

# Redesign do Widget de Chat - UI/UX Moderno

## Visao Geral

Redesign visual completo do `ChatWidget.tsx` para uma experiencia moderna, mantendo 100% das funcionalidades existentes. O foco e em micro-interacoes, tipografia, espacamento e acabamento visual que transmitam profissionalismo.

---

## 1. FAB (Floating Action Button)

**Atual**: Circulo solido com icone `MessageSquare` estatico.

**Novo**:
- Gradiente sutil usando `primaryColor` (base -> 10% mais escuro)
- Sombra elevada com cor (`box-shadow: 0 4px 14px {primaryColor}40`)
- Animacao de entrada `scale-in` ao carregar
- Icone com transicao suave: `MessageSquare` quando fechado, `X` com rotacao ao abrir
- Badge de mensagens nao lidas com animacao `pulse` (manter logica existente)
- Hover: `scale(1.08)` + sombra expandida

## 2. Header

**Atual**: Fundo solido `primaryColor` com icone + textos simples.

**Novo**:
- Gradiente no header: `linear-gradient(135deg, primaryColor, primaryColor-escurecido-15%)`
- Avatar do atendente: quando `attendantName` existe, mostrar circulo com iniciais (ex: "MA" para "Maria Alves") ao lado do nome
- Status indicator: bolinha verde pulsante ao lado do nome do atendente quando fase `chat`
- Texto do subtitulo com animacao `fade-in` ao trocar de fase
- Botao de fechar (X) com `backdrop-filter: blur` e borda semi-transparente
- Cantos arredondados superiores maiores: `rounded-t-2xl`

## 3. Formulario Inicial (phase: form)

**Atual**: Labels + inputs padrao empilhados com botao ao final.

**Novo**:
- Ilustracao/icone decorativo no topo: icone `MessageSquare` grande com opacidade 8% como background decorativo
- Inputs com icones inline (User, Mail, Phone) a esquerda dentro do campo
- Labels flutuantes acima do input com tipografia `text-xs font-medium uppercase tracking-wide text-muted-foreground`
- Botao "Iniciar Conversa" com icone `ArrowRight` e hover com deslocamento sutil (`translateX(2px)` no icone)
- Espacamento vertical aumentado entre campos (gap-5)
- Texto introdutorio com `text-sm leading-relaxed`

## 4. Lista de Historico (phase: history)

**Atual**: Cards com borda simples, icones pequenos, informacoes densas.

**Novo**:
- Cards com hover lift (`translateY(-1px)` + sombra)
- Indicador visual lateral: barra colorida a esquerda (verde para ativo, cinza para encerrado, laranja para pendente)
- Preview da ultima mensagem com `line-clamp-1` e fonte italic
- Data em formato relativo quando < 24h ("ha 2 horas") e absoluto quando > 24h
- CSAT score com estrelas miniaturas preenchidas
- Separacao visual entre chats ativos (topo, com destaque) e encerrados
- Botao "Novo Chat" com estilo pill (mais arredondado) e icone `Plus`

## 5. Area de Mensagens (phase: chat)

**Atual**: Bolhas basicas com cores solidas, timestamps pequenos.

**Novo**:
- **Bolhas do visitante**: cantos assimetricos (`rounded-2xl rounded-br-md`) para efeito de balao de fala moderno
- **Bolhas do atendente**: `rounded-2xl rounded-bl-md` com fundo `bg-muted/60` e borda sutil `border border-border/50`
- **Sistema**: pill centralizada com `backdrop-filter: blur(8px)` e fundo semi-transparente
- **Agrupamento temporal**: quando mensagens consecutivas do mesmo remetente tem < 2 min de diferenca, omitir nome e reduzir gap (gap-1 em vez de gap-3)
- **Timestamp**: mostrar apenas na ultima mensagem de cada grupo, com animacao hover para revelar em mensagens intermediarias
- **Imagens**: preview com `rounded-xl` e overlay escuro no hover com icone de zoom
- **Arquivos**: card com icone por tipo de arquivo, barra de progresso durante upload
- **Typing indicator**: tres pontos com animacao mais suave (wave em vez de bounce)
- **Scroll**: botao "Novas mensagens" flutuante quando usuario esta scrollado para cima
- **Load more**: botao com estilo ghost e animacao de loading inline

## 6. Barra de Input

**Atual**: Input + botoes lado a lado com espacamento basico.

**Novo**:
- Container com `rounded-full` ou `rounded-2xl` e fundo `bg-muted/30` com borda interna
- Input sem borda propria, integrado ao container
- Botao de envio circular com gradiente `primaryColor`
- Botao de anexo com tooltip
- Preview de arquivo pendente como chip inline acima do input (com miniatura para imagens)
- Transicao suave do botao enviar: opacidade reduzida quando desabilitado, scale ao clicar

## 7. Telas de Estado (waiting, csat, closed)

### Waiting
- Animacao de ondas concentricas saindo do icone central (CSS puro)
- Texto "Aguardando atendimento..." com animacao de reticencias
- Progress bar indeterminada sutil no topo

### CSAT
- Estrelas com animacao de scale ao selecionar (`scale(1.2)` momentaneo)
- Emoji correspondente ao score abaixo das estrelas (triste -> neutro -> feliz)
- Textarea com contador de caracteres

### Closed
- Icone de check animado (draw SVG)
- Mensagem de agradecimento com fade-in

## 8. Responsividade e Micro-interacoes

- Todos os botoes com `active:scale-95` para feedback tatil
- Transicoes de fase com `animate-fade-in` (ja existente)
- Focus rings visiveis e acessiveis em todos os elementos interativos
- Suporte a tema claro (manter consistencia com identidade Journey)

---

## Resumo Tecnico

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/ChatWidget.tsx` | Redesign completo da camada de apresentacao (JSX + classes Tailwind). Nenhuma logica de negocio ou estado alterada |
| `src/index.css` | Adicionar keyframes para animacoes novas (wave-dots, ripple, check-draw) |

**Nenhuma funcionalidade sera removida ou alterada.** Todas as fases, handlers, realtime subscriptions e integracao com o embed permanecem identicos. Apenas classes CSS e estrutura JSX de apresentacao serao modificadas.

