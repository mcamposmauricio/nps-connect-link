
# Corrigir Container Pai do Workspace

## Problema

O `SidebarLayout` envolve o conteudo em uma div com `p-6 bg-background` (linha 51 de `SidebarLayout.tsx`). Isso causa:
- Padding duplo (o workspace ja aplica `p-3` internamente)
- Fundo `bg-background` (branco/cinza claro) visivel por tras do chat, criando um "contorno" indesejado

## Solucao

Tornar o container do workspace transparente e sem padding extra, sem afetar as demais paginas que usam o `SidebarLayout`.

### Opcao escolhida: Override no AdminWorkspace

Em vez de alterar o `SidebarLayout` (que afetaria todas as paginas), o `AdminWorkspace` usara classes negativas ou um wrapper que neutraliza o padding e o fundo do container pai.

### Mudanca no `src/pages/AdminWorkspace.tsx`

Alterar a div principal do layout desktop e mobile para usar margem negativa (`-m-6`) que anula o `p-6` do `SidebarLayout`, e garantir que o fundo seja transparente:

**Desktop (linha ~265):**
```
- <div className="h-[calc(100vh-3.5rem)] flex gap-3 p-3">
+ <div className="-m-6 h-[calc(100vh-3.5rem)] flex gap-3 p-3 bg-transparent">
```

**Mobile (linha ~185):**
```
- <div className="h-[calc(100vh-3.5rem)] flex flex-col">
+ <div className="-m-6 h-[calc(100vh-3.5rem)] flex flex-col bg-transparent">
```

Isso remove visualmente o padding e o fundo branco do container pai, fazendo o workspace ocupar toda a area disponivel de forma limpa.

## Arquivos Modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/pages/AdminWorkspace.tsx` | Adicionar `-m-6` e `bg-transparent` nas divs raiz do layout desktop e mobile |
