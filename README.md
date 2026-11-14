# Ferramentas de Avaliação Psicológica: Guia de Estágio

Site estático de apoio ao estágio supervisionado em Avaliação Psicológica. Material de uso interno, para supervisão.

- Plano de desenvolvimento: `PLANO.md`
- Regras para o Claude Code: `CLAUDE.md`
- Esquema dos casos: `docs/esquema-caso.md`

## Rodar localmente

    python3 -m http.server 8000

Abrir http://localhost:8000

## Validar os dados

    python3 scripts/validar_dados.py

## Estrutura

    index.html              página inicial (Fase 0)
    ferramentas/            uma página por ferramenta
    assets/css, assets/js   estilos e scripts
    dados/                  todo o conteúdo, em JSON
    dados/site.json         textos da página inicial e lista de ferramentas (com o status de cada uma)
    dados/glossario.json    termos do glossário e textos da página
    dados/escores.json      questões do modo livre de interpretação de escores
    dados/casos/            um arquivo por caso fictício
    scripts/                validação de dados e atualização do SATEPSI
    .github/workflows/      validação a cada push e rotina mensal
    docs/                   documentação interna

Todos os casos são fictícios. Nenhum material de teste psicológico é reproduzido.
