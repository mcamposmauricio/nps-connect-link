

# Reestilizar Landing Page com mais informacoes e mockups visiveis

## Objetivo

Transformar a landing page de um layout minimalista "coming soon" para um layout "early stage" mais informativo, mantendo o tom de antecipacao mas adicionando secoes que mostram visualmente o que o produto oferece: **Chat in-app**, **NPS** e **Dashboard CS**.

## Mudancas

### 1. Secao de Features com Mockups Visiveis (nova secao)

Adicionar uma secao abaixo do hero com 3 cards de feature lado a lado, cada um contendo:

- **Chat in-app**: Icone + titulo + descricao curta ("Converse com seus clientes em tempo real, direto no seu produto") + mockup CSS estilizado do chat (similar ao que ja existe no background mas com opacity mais alta ~0.3-0.5, visivel de verdade)
- **NPS**: Icone + titulo + descricao ("Mensure a satisfacao com pesquisas NPS automatizadas e acompanhe a evolucao") + mockup do NPS score
- **Dashboard CS**: Icone + titulo + descricao ("Indicadores de saude, churn, MRR e CSAT em um unico painel") + mockup do dashboard

Cada card tera fundo glassmorphism (`bg-white/5 border-white/10 backdrop-blur`) e os mockups internos terao opacity mais alta para serem identificaveis.

### 2. Reestilizar Hero

- Manter badge "Early Access" e formulario
- Atualizar subtitulo para ser um pouco mais descritivo
- Remover os badges "Coming Soon" de NPS e Chat (serao substituidos pela secao de features)
- Manter o DashboardMockup no lado direito

### 3. Secao "Por que Journey CS?" (nova secao simples)

3 colunas com icones e textos curtos destacando diferenciais:
- "Tudo em um so lugar" - CS + NPS + Chat integrados
- "Dados em tempo real" - Dashboards e alertas automaticos  
- "Facil de usar" - Setup rapido, sem complexidade

### 4. Atualizar Background Mockups

Manter os mockups de fundo mas ajustar levemente as posicoes para nao conflitar com a nova secao de features.

### 5. Atualizar traducoes

Adicionar novas chaves no `pt-BR.ts` e `en.ts` para os textos das novas secoes.

---

## Arquivos a modificar

| Arquivo | Acao |
|---------|------|
| `src/pages/LandingPage.tsx` | Reestilizar hero, adicionar secao de features e secao de diferenciais |
| `src/components/LandingBackgroundMockups.tsx` | Ajustar posicoes dos mockups de fundo |
| `src/locales/pt-BR.ts` | Adicionar traducoes das novas secoes |
| `src/locales/en.ts` | Adicionar traducoes das novas secoes |

## Estrutura da pagina resultante

```text
+-------------------------------------------+
|  Navbar (logo + botao login)              |
+-------------------------------------------+
|  Hero: titulo + subtitulo + formulario    |
|  [esquerda]          [DashboardMockup]    |
+-------------------------------------------+
|  Features: 3 cards com mockups visiveis   |
|  [Chat in-app]  [NPS]  [Dashboard CS]    |
+-------------------------------------------+
|  Diferenciais: 3 colunas com icones       |
|  [Integrado]  [Tempo real]  [Facil]       |
+-------------------------------------------+
|  Footer                                   |
+-------------------------------------------+
```

Os mockups de fundo (esmaecidos) continuam no background global para manter a profundidade visual.

