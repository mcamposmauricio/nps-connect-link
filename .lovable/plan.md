
# Reordenar Menus da Sidebar

## Ordem Atual
1. Customer Success
2. Relatorios
3. Cadastros
4. NPS
5. Chat

## Nova Ordem Solicitada
1. Customer Success (ja esta correto)
2. NPS
3. Chat
4. Relatorios
5. Cadastros

## Mudanca

### Arquivo: `src/components/AppSidebar.tsx`

Reorganizar os blocos JSX dentro de `<SidebarContent>` na seguinte sequencia:

1. **Customer Success** (linhas 139-154) - permanece na posicao atual
2. **NPS** (linhas 224-248) - mover para a segunda posicao
3. **Chat** (linhas 251-342) - mover para a terceira posicao
4. **Relatorios** (linhas 157-200) - mover para a quarta posicao
5. **Cadastros** (linhas 202-221) - mover para a quinta (ultima) posicao

Nenhuma alteracao de logica, permissoes ou estilos. Apenas reordenacao dos blocos existentes.
