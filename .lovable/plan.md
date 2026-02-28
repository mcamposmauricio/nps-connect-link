
# Adicionar botao temporario para importar artigos do repositorio

## O que sera feito

Adicionar um botao "Importar do repositorio" na pagina `/help/import` que carrega automaticamente todos os 152 arquivos HTML das pastas `artigos 1` e `artigos 2` usando `import.meta.glob` do Vite e popula a tabela de preview. O usuario pode entao clicar "Importar" para salvar no banco.

## Mudanca tecnica

**Arquivo:** `src/pages/HelpImport.tsx`

1. Adicionar no topo do arquivo os glob imports eager para carregar todos os HTMLs como strings raw:
```typescript
const repoFiles: Record<string, string> = import.meta.glob(
  ['/artigos 1/*.html', '/artigos 2/*.html'],
  { query: '?raw', import: 'default', eager: true }
) as any;
```

2. Adicionar estado `loadingRepo` para controle de loading

3. Adicionar funcao `handleRepoImport` que:
   - Itera sobre as chaves de `repoFiles`
   - Extrai nome do arquivo e nome da colecao (pasta) do path
   - Usa `extractArticleMetadata()` para parsear cada HTML
   - Gera `htmlSnapshot` via `blocksToHtml()`
   - Popula o estado `items`

4. Adicionar botao com icone `FolderOpen` e texto "Importar do repositorio" ao lado do botao "Selecionar arquivos" existente, dentro do Card de upload

## Fluxo

1. Usuario abre `/help/import`
2. Clica em "Importar do repositorio"
3. Os 152 HTMLs sao parseados e a tabela de preview aparece
4. Clica em "Importar (152)" para salvar no banco
5. Artigos criados como draft com colecoes "artigos 1" e "artigos 2"
