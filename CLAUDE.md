# Instruções para o Claude Code

Projeto: site estático com ferramentas de apoio ao estágio supervisionado em Avaliação Psicológica (curso de Psicologia). Leia `PLANO.md` antes de qualquer tarefa e `docs/esquema-caso.md` antes de mexer em casos.

## Regras de conteúdo (obrigatórias)

1. **Nenhum material de teste psicológico real.** Não reproduzir itens, estímulos, crivos, tabelas normativas nem trechos de manual de instrumento privativo de psicólogo. Os casos usam instrumentos fictícios (nome inventado, marcado como fictício) e resultados já apurados.
2. **Nomes de testes reais** só aparecem no fichário de construtos, e só como nome, construto e situação no SATEPSI.
3. **Normas do CFP nunca de memória.** Qualquer afirmação sobre o que uma resolução exige deve vir do texto vigente, consultado na fonte oficial, com número, data e artigo. Pontos de partida a confirmar (vigência e conteúdo): Resolução CFP 06/2019 (documentos escritos), Resolução CFP 31/2022 (avaliação psicológica e SATEPSI), Código de Ética Profissional do Psicólogo. Se não for possível consultar a fonte, deixar `"a_confirmar": true` no dado e avisar.
4. **Todo caso é fictício** e traz essa marca visível na página. Sem nomes completos, sem dados que lembrem pessoa real.
5. **Sem coleta de dados.** Nada de login, analytics, formulário que envie dados ou armazenamento em servidor. Texto digitado pelo estudante fica só na memória da página.
6. **Conteúdo não revisado aparece como "em revisão".** Caso com `revisado_por` nulo exibe o aviso.

## Regras técnicas

- HTML, CSS e JavaScript puros. Sem framework, sem bundler, sem CDN. Nenhuma requisição de rede além dos arquivos do próprio site.
- Todo conteúdo em `dados/*.json`. Página não tem texto de conteúdo embutido no HTML ou no JS.
- Cada ferramenta é uma página em `ferramentas/` com um JS próprio em `assets/js/`.
- Ferramentas que usam caso aceitam `?caso=<id>` e, sem parâmetro, mostram a lista de casos disponíveis (`dados/casos/indice.json`).
- Funciona em celular. Layout em coluna única abaixo de 720 px.
- Estilos de impressão em todas as páginas que geram material de estudo.
- Acessibilidade: navegação por teclado, contraste AA, `aria-live` nos feedbacks.
- Antes de concluir qualquer tarefa que altere `dados/`, rodar `python scripts/validar_dados.py`.
- Testar abrindo com servidor local (`python -m http.server`), porque `fetch` de JSON não funciona em `file://`.

## Visual e interface

- Seguir o site de TCC do mesmo autor: página inicial com cartões por ferramenta, rótulo de status, descrição curta e botão "Abrir ferramenta".
- Interface enxuta. Uma tarefa por tela, instrução curta no topo, sem painéis concorrentes.
- Feedback sempre explica o porquê e, quando couber, remete ao termo do glossário.
- Sem semáforo de "nível de supervisão": tudo no estágio passa por supervisão.

## Regras de redação (texto do site)

- Português do Brasil. Não usar a palavra "sítio".
- Frases diretas. Sem frases de efeito e sem fechos retóricos.
- Evitar a construção "não é X, é Y".
- Preferir vírgulas ou parênteses a travessões.
- Sem metáforas exageradas.
- Sem afirmar efeito sem evidência (por exemplo, "esta ferramenta melhora o raciocínio clínico").
- Voz imperativa nos passos ("Escolha", "Marque", "Compare").

## Fluxo de trabalho

- Uma fase do `PLANO.md` por sessão. Ao terminar, atualizar a tabela "Status".
- Conteúdo clínico novo (caso, gabarito, frase de laudo): propor a estrutura em texto e esperar aprovação antes de preencher o JSON.
- Commits pequenos, em português, um por entrega.
- Não publicar caso sem que o autor confirme a revisão.
