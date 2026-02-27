

# Revisao de Design UI/UX do Popup de Banners

## Problemas Identificados

### 1. Fundo branco no dark mode
O dialog esta com fundo branco puro, quebrando completamente com o tema escuro da plataforma. Labels, inputs e separadores estao todos em estilo "light", criando um contraste visual desagradavel.

### 2. Preview desconectado do scroll
Quando o usuario rola o formulario para baixo, o preview desaparece do viewport. O preview deveria ficar fixo (sticky) para que o usuario veja as mudancas em tempo real enquanto edita qualquer campo.

### 3. Seletores de tipo sem feedback de cor
Os 5 botoes de tipo (Informacao, Alerta, Sucesso, Promocao, Atualizacao) sao todos cinza/neutros. Ao selecionar um tipo, a cor de fundo do banner deveria mudar automaticamente para uma cor sugerida (azul para info, amarelo para alerta, etc.), dando feedback visual imediato.

### 4. Color pickers primitivos
Os inputs `type="color"` nativos do browser sao minusculos e pouco intuitivos. Substituir por uma paleta de cores pre-definidas (presets) com opcao de cor customizada, similar ao que ja existe no BannerRichEditor.

### 5. Secoes sem hierarquia visual clara
As SectionLabels sao muito discretas (10px uppercase). Cada secao deveria ter um container visual mais claro, talvez com um icone representativo e um background sutil para separar os blocos.

### 6. Footer do dialog sem contexto
Os botoes "Cancel" e "Save" ficam isolados no fundo. O botao Save deveria mostrar um estado diferente quando ha mudancas pendentes e indicar claramente "Criar Banner" vs "Salvar Alteracoes".

### 7. Layout mobile
Em telas menores o grid `md:grid-cols-2` colapsa, jogando o preview para baixo do formulario inteiro, tornando-o inutil.

---

## Melhorias Propostas

### A. Corrigir cores para dark mode
- Remover quaisquer classes de fundo branco explicitas do `DialogContent`
- Garantir que todos os inputs, labels e separadores usem tokens semanticos (`bg-background`, `border-border`, etc.)
- O preview mockup interno tambem precisa respeitar o tema

### B. Preview sticky
- Aplicar `sticky top-0` na coluna do preview para que ele acompanhe o scroll do formulario
- Isso garante que qualquer alteracao (tipo, cor, texto, link) seja visivel instantaneamente

### C. Cores automaticas por tipo
- Ao clicar em um tipo, aplicar automaticamente a cor de fundo e texto sugerida:
  - Info: #3B82F6 (azul) / branco
  - Alerta: #F59E0B (amber) / branco  
  - Sucesso: #10B981 (verde) / branco
  - Promocao: #8B5CF6 (roxo) / branco
  - Atualizacao: #06B6D4 (cyan) / branco
- O usuario ainda pode customizar depois

### D. Paleta de cores com presets
- Substituir `<input type="color">` por uma grade de cores pre-definidas (8-10 cores populares)
- Manter um pequeno input de cor customizada para casos especificos
- Mostrar o circulo de cor selecionada de forma mais proeminente

### E. Secoes com cards visuais
- Agrupar cada secao em um bloco com `rounded-lg bg-muted/30 p-4` e um icone ao lado do titulo
- Usar icones: Palette (aparencia), Link (interacao), Calendar (agendamento), Target (segmentacao)

### F. Footer melhorado
- Texto do botao contextual: "Criar Banner" para novo, "Salvar Alteracoes" para edicao
- Botao desabilitado ate que titulo e conteudo estejam preenchidos (ja existe, manter)
- Adicionar indicador sutil de campos obrigatorios

### G. Layout responsivo melhorado
- Em mobile: mostrar preview como um accordion/collapsible no topo, colapsado por padrao
- Em desktop: manter grid 2 colunas com preview sticky

---

## Detalhes Tecnicos

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/AdminBanners.tsx` | Redesign do dialog interno: sticky preview, secoes com cards, paleta de cores, cores auto por tipo, footer contextual, layout mobile |
| `src/components/chat/BannerPreview.tsx` | Ajustar mock content para respeitar tema (usar tokens semanticos) |

### Abordagem
- O `DialogContent` ja usa `max-w-3xl max-h-[90vh] overflow-y-auto`. Mover o overflow para apenas a coluna do formulario, mantendo preview fora do scroll
- Criar constante `TYPE_DEFAULT_COLORS` mapeando cada tipo para bg/text colors sugeridas
- Usar `Collapsible` do radix para preview mobile
- Paleta de cores: grid de circulos clicaveis + input hex, reutilizando pattern do `BannerRichEditor`

Nenhuma mudanca de banco de dados. Nenhuma nova dependencia.

