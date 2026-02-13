

# Tornar a Landing Page mais dinamica com imagem de apoio

## Objetivo

Adicionar dinamismo visual a landing page mantendo o tom "Early Access / Em Breve", com animacoes de entrada (fade-in + slide-up), uma imagem ilustrativa de apoio (dashboard mockup) e elementos visuais animados (pulso nos badges, gradiente animado no fundo).

## Mudancas

### 1. Animacoes CSS (`src/index.css`)

Adicionar keyframes e classes utilitarias:
- `animate-fade-in-up` - elementos surgem de baixo com fade (hero text, badges, form)
- `animate-pulse-soft` - pulso suave nos badges "Em breve"
- `animate-float` - flutuacao sutil na imagem de apoio
- Delays escalonados para os elementos do hero (stagger effect)

### 2. Imagem de apoio (`src/pages/LandingPage.tsx`)

No lado esquerdo do hero (texto), adicionar abaixo dos badges "Em breve" uma imagem ilustrativa que simula um dashboard/interface do produto:
- Usar uma imagem SVG inline ou um mockup estilizado com divs que representam um painel com graficos e metricas (sem dependencia externa)
- Alternativa: um "browser frame" estilizado com CSS mostrando uma interface mockada do Journey CS
- A imagem tera animacao `float` para dar vida

**Abordagem escolhida**: Criar um componente visual inline que simula uma janela de navegador com um mini-dashboard dentro (barras de graficos, cards de metricas), tudo em CSS/Tailwind. Isso evita dependencias externas e fica alinhado com o design system.

### 3. Layout reestruturado

```
Desktop (lg:grid-cols-2):
+--------------------------------+---------------------------+
| [Early Access badge]           |                           |
| Titulo animado                 |  +---------------------+  |
| Subtitulo animado              |  | [Browser frame]     |  |
|                                |  | Mini dashboard mock |  |
| [NPS - Em breve] [Chat]       |  | com graficos e KPIs |  |
|   (badges com pulso)           |  +---------------------+  |
|                                |     (animacao float)      |
| +------------------------+    |                           |
| | Formulario de lead     |    |                           |
| | Nome / Email / Empresa |    |                           |
| | [CTA button]           |    |                           |
| +------------------------+    |                           |
+--------------------------------+---------------------------+

Mobile:
Texto -> Imagem -> Formulario (empilhados)
```

### 4. Elementos dinamicos adicionados

| Elemento | Animacao | Descricao |
|----------|----------|-----------|
| Badge "Early Access" | fade-in-up (delay 0ms) | Surge primeiro |
| Titulo h1 | fade-in-up (delay 100ms) | Surge em seguida |
| Subtitulo | fade-in-up (delay 200ms) | Efeito cascata |
| Badges "Em breve" | fade-in-up (delay 300ms) + pulse-soft | Chamam atencao com pulso |
| Imagem mockup | fade-in-up (delay 400ms) + float | Flutuacao constante |
| Card formulario | fade-in-up (delay 500ms) | Ultimo a surgir |
| Fundo gradient | animacao de cor suave | Gradiente que se movimenta lentamente |

### 5. Mockup visual do dashboard (componente inline)

Um "browser frame" estilizado contendo:
- Barra de titulo com 3 bolinhas (vermelho, amarelo, verde)
- Mini sidebar com itens
- Area principal com:
  - 3 mini cards de KPI (NPS Score, Clientes Ativos, CSAT)
  - Mini grafico de barras estilizado em CSS
- Tudo em cores do design system (primary green, muted, border)
- Sombra e rounded para parecer uma janela real

## Arquivos modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/pages/LandingPage.tsx` | Adicionar mockup visual, animacoes via classes, reestruturar layout |
| 2 | `src/index.css` | Adicionar keyframes e classes de animacao |

## O que NAO muda
- Logica do formulario e tracking UTM
- Traducoes (chaves i18n permanecem as mesmas)
- Banco de dados e RLS
- Tom "Early Access / Em breve"
- Estrutura de 3 secoes (navbar, hero, footer)
