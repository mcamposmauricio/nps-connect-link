

# Imagens decorativas de fundo na Landing Page

## O que sera feito

Adicionar 3 mockups CSS decorativos posicionados como elementos de fundo absolutos, esmaecidos (opacity baixa), representando:

1. **Chat in-app** - Mockup de uma janela de chat com bolhas de mensagens
2. **NPS** - Mockup com gauge/score e escala de 0-10
3. **Dashboard CS** - Mockup com indicadores e graficos (similar ao DashboardMockup existente, mas simplificado)

Esses elementos serao posicionados em pontos diferentes do fundo da pagina com `position: absolute`, `opacity: 0.06~0.08`, rotacao leve e escala grande para criar um efeito visual sutil e elegante.

## Abordagem

Criar componentes CSS puro (sem imagens externas) seguindo o mesmo padrao do `DashboardMockup.tsx` ja existente. Isso garante carregamento instantaneo e consistencia visual com o design system.

---

## Mudancas Tecnicas

### Arquivo 1: `src/components/LandingBackgroundMockups.tsx` (novo)

Componente com 3 mockups decorativos posicionados com absolute:

- **ChatMockup**: Janela com header, bolhas de mensagem (remetente/destinatario), input de texto
- **NPSMockup**: Card com titulo "NPS Score", numero grande "72", barra de escala colorida (detractor/passive/promoter)
- **CSIndicatorsMockup**: Grid com 4 mini cards de KPI + mini grafico de linha/area

Cada um tera:
- `position: absolute` com coordenadas especificas
- `opacity: 0.06` a `0.08` para efeito esmaecido
- `transform: rotate()` leve para dinamismo
- `pointer-events: none` para nao interferir na interacao
- Bordas e cores em `white/10` e `accent` seguindo o design system

### Arquivo 2: `src/pages/LandingPage.tsx` (editar)

- Importar e renderizar `<LandingBackgroundMockups />` dentro do container principal (`min-h-screen bg-dark-hero`), antes do conteudo, com `z-0` para ficar atras de tudo

---

## Posicionamento dos mockups

| Mockup | Posicao | Rotacao | Escala |
|--------|---------|---------|--------|
| Chat in-app | top-right (top: 10%, right: -5%) | -12deg | ~80% |
| NPS | bottom-left (bottom: 15%, left: -3%) | 8deg | ~75% |
| CS Dashboard | bottom-right (bottom: 5%, right: 10%) | -6deg | ~90% |

Os 3 mockups ficam distribuidos pelo fundo sem sobrepor diretamente o conteudo central, criando profundidade visual.
