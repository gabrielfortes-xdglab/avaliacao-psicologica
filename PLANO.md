# Plano: Ferramentas para o Estágio em Avaliação Psicológica

Site estático de apoio ao estágio supervisionado em Avaliação Psicológica, no mesmo formato do guia de TCC (https://gabrielfortes-xdglab.github.io/tcc-cognitivo-comportamental/).

## Escopo

Oito ferramentas em três grupos.

| Grupo | # | Ferramenta | Página |
|---|---|---|---|
| Simuladores | 1 | Planejamento de avaliação | `ferramentas/planejamento.html` |
| Simuladores | 2 | Anamnese ramificada | `ferramentas/anamnese.html` |
| Simuladores | 3 | Interpretação de escores | `ferramentas/escores.html` |
| Banco de conhecimento | 4 | Fichário de construtos (atualização automática) | `ferramentas/construtos.html` |
| Banco de conhecimento | 5 | Glossário psicométrico | `ferramentas/glossario.html` |
| Banco de conhecimento | 6 | Guia de documentos psicológicos | `ferramentas/documentos.html` |
| Estudo de caso | 7 | Casos progressivos | `ferramentas/caso.html` |
| Estudo de caso | 8 | Laudos com erros | `ferramentas/laudo.html` |

## Decisão de arquitetura

As ferramentas 1, 2, 3, 7 e 8 leem o mesmo arquivo de caso (`dados/casos/<id>.json`). Um caso bem escrito alimenta as cinco. O código de cada ferramenta é escrito uma vez; o que cresce com o tempo é o número de casos.

- Cada ferramenta abre sozinha (`planejamento.html?caso=caso-01`) ou como etapa do caso progressivo (`caso.html?caso=caso-01`).
- Dados separados do código. Todo conteúdo fica em `dados/`, em JSON.
- HTML, CSS e JS puros. Sem framework, sem etapa de build, sem dependência externa em tempo de execução.
- Hospedagem no GitHub Pages.
- Esquema do caso documentado em `docs/esquema-caso.md`, com exemplo em `dados/casos/caso-modelo.json`.

## Fases

### Fase 0: Fundação

Entregas:
- `index.html` com os três grupos e cartões por ferramenta (rótulo de status, descrição, botão "Abrir ferramenta"), seguindo o site de TCC.
- `assets/css/base.css` com o visual herdado do site de TCC e estilos de impressão.
- `assets/js/comum.js` com carregamento de JSON, leitura do parâmetro `?caso=`, cabeçalho e rodapé comuns.
- `scripts/validar_dados.py` que confere todos os JSON contra o esquema.
- Workflow de validação em `.github/workflows/validar.yml` rodando a cada push.

Critério de pronto: a página inicial abre no GitHub Pages, o caso-modelo passa na validação.

### Fase 1: Glossário (5) e Interpretação de escores (3)

Glossário:
- Entradas em `dados/glossario.json`. Cada termo traz definição curta, um exemplo de decisão clínica que depende do conceito, o erro comum de interpretação e termos relacionados.
- Busca por texto e link direto por termo (`glossario.html#erro-padrao`).
- `assets/js/glossario-links.js`: nas demais páginas, termos do glossário viram links com definição ao passar o cursor ou tocar.
- Termos iniciais: escore bruto, percentil, escore padrão, escore T, escore z, QI de desvio, norma, amostra normativa, fidedignidade, erro padrão de medida, intervalo de confiança, validade (conteúdo, critério, construto), ponto de corte, sensibilidade, especificidade, faixa de classificação, efeito teto e chão.

Interpretação de escores:
- Modo livre: a ferramenta sorteia um perfil fictício (bruto, percentil, escore padrão, IC) e apresenta frases interpretativas, das quais uma é adequada e as outras trazem erros típicos.
- Modo caso: usa `resultados.questoes` do caso carregado.
- Erros típicos a cobrir: percentil lido como porcentagem de acertos; ignorar o erro de medida; tratar faixa limítrofe como diagnóstico; comparar escores de escalas com métricas diferentes; concluir sobre construto que o instrumento não mede; afirmação causal a partir de escore.
- Cada alternativa errada mostra qual erro é e remete ao termo do glossário.
- Visual: posição do escore na curva normal com o IC marcado.

Critério de pronto: 17 termos no ar, 12 questões de interpretação no modo livre.

### Fase 2: Primeiro caso completo (7, 1, 2)

Conteúdo:
- Escrever `dados/casos/caso-01.json` completo. Contexto e faixa etária definidos pelo supervisor (ver "Pendências").

Planejamento de avaliação (1):
- Mostra a demanda e a pergunta de avaliação.
- O estudante marca hipóteses a investigar e escolhe procedimentos dentro de um limite de sessões.
- Painel de cobertura: para cada hipótese, quais procedimentos escolhidos a informam e o que ficou sem fonte.
- Comparação com o plano de referência, com comentário por escolha.

Anamnese ramificada (2):
- Árvore de decisão em `anamnese.nos`. A cada nó, o informante fala e o estudante escolhe a próxima pergunta.
- Cada pergunta tem tipo (aberta, fechada, indutiva) e revela ou não informações.
- Ao final: informações coletadas, informações essenciais que ficaram de fora, proporção de perguntas por tipo, comentários sobre as perguntas indutivas.
- Sem IA. Tudo determinístico, a partir do JSON.

Caso progressivo (7):
- Percorre `etapas`: demanda, planejamento, anamnese, resultados, integração, laudo.
- Antes de liberar cada etapa, o estudante escreve a hipótese atual em um campo de texto.
- Ao final: linha do tempo das hipóteses do estudante ao lado da trajetória de referência.
- Exportar em PDF (impressão do navegador) para levar à supervisão.
- As hipóteses ficam só na memória da página. Nada é enviado nem salvo.

Critério de pronto: um estagiário percorre o caso 01 do início ao fim e sai com o PDF.

### Fase 3: Guia de documentos (6) e Laudo com erros (8)

Guia de documentos:
- `dados/documentos.json` com os tipos de documento previstos na resolução vigente do CFP: finalidade, estrutura, quando usar, diferenças entre eles.
- Trechos bem e mal redigidos lado a lado.
- Banco de frases de laudo: formulação descritiva ao lado da versão problemática.
- Checklist antes de assinar, imprimível.
- Toda afirmação normativa cita resolução, número, data e artigo. Ver regra em `CLAUDE.md`.

Laudo com erros:
- Usa `laudo` do caso. Parágrafos com `erro` preenchido são os problemas plantados.
- O estudante marca os parágrafos que considera problemáticos e escolhe o tipo de erro.
- Gabarito comentado: acertos, erros não percebidos, falsos alarmes, com a correção sugerida.
- Tipos de erro: conclusão sem base no procedimento; instrumento inadequado para idade ou finalidade; linguagem determinista; rótulo no lugar de descrição; quebra de sigilo; informação desnecessária à demanda; ausência de limites da avaliação; estrutura fora da norma.

Critério de pronto: laudo do caso 01 com 8 a 10 erros plantados e gabarito revisado.

### Fase 4: Fichário de construtos (4) com atualização automática

Passo 1, investigação (antes de escrever código):
- Verificar como o SATEPSI (https://satepsi.cfp.org.br) expõe a lista de testes: API, arquivo para download ou só página de consulta.
- Verificar termos de uso e `robots.txt`.
- Registrar o resultado em `docs/satepsi.md`.

Passo 2, conforme o resultado:
- Se houver fonte estruturada ou página estável: `scripts/atualizar_satepsi.py` baixa a lista, gera `dados/satepsi.json` (nome, construto, situação, data de validade dos estudos) e `.github/workflows/atualizar-satepsi.yml` roda todo mês. Quando houver diferença em relação à versão anterior, o workflow abre um pull request com o resumo das mudanças, para revisão humana antes de publicar.
- Se não houver: o fichário mostra a data da última conferência manual e o link para a consulta oficial. O workflow mensal abre uma issue lembrando a conferência.

Fichário:
- `dados/construtos.json`, curado à mão: para cada construto, o que se avalia, tipos de fonte, cuidados, erros comuns de inferência.
- A lista de instrumentos por construto vem de `dados/satepsi.json`, com situação e data. Só nome e situação, sem conteúdo dos testes.
- Filtros por construto, faixa etária e contexto.
- Aviso fixo: a situação do teste deve ser confirmada no SATEPSI na data do uso.

Critério de pronto: 10 construtos no ar, rotina mensal funcionando.

### Fase 5: Mais casos e teste com estagiários

- Casos 02 e 03 em contextos diferentes do primeiro.
- Um par de casos comparados (mesma queixa, planos de avaliação diferentes).
- Sessão de uso com estagiários e registro do que travou.
- Ajustes de interface a partir disso.

## Pendências que dependem do supervisor

1. ~~Contexto do estágio e faixa etária.~~ Resolvido em 14/11/2026: clínica-escola; crianças, adolescentes e adultos. Demandas: TDAH (principal), inteligência, habilidades sociais. Origem da demanda: médica, escolar, orientação profissional e procura espontânea de quem suspeita de TDAH ou TEA.
2. ~~Instrumentos que os estagiários usam.~~ Resolvido em 14/11/2026, pelo acervo do laboratório (LAPPATs): BPA-2, ETDAH-AD, escala de TDAH (manual), WISC-IV, WAIS-III, G-36, BAI, EBADEP-A, EBADEP-IJ, EAG-I, ISSL-R, BFP, EMEP, HTP, SAT, CLIMOR. Os instrumentos fictícios dos casos seguem os construtos desse acervo; os nomes reais só entram no fichário de construtos.
3. Revisor de conteúdo: quem supervisiona Avaliação Psicológica revisa casos e gabaritos antes da publicação. O campo `revisado_por` do caso fica vazio até lá, e a página mostra "em revisão".
4. ~~Nome do repositório e do site.~~ Resolvido: repositório `gabrielfortes-xdglab/avaliacao-psicologica`.

## Ordem sugerida de sessões no Claude Code

1. "Leia PLANO.md, CLAUDE.md e docs/esquema-caso.md. Execute a Fase 0."
2. "Execute a Fase 1, começando pelo glossário."
3. "Vamos escrever o caso 01 juntos. Contexto: [...]. Proponha a estrutura antes de preencher o JSON."
4. "Com o caso 01 validado, execute as três ferramentas da Fase 2."
5. Fases 3 e 4, uma por sessão.

Ao final de cada fase, atualizar a tabela de status abaixo.

## Status

| Fase | Status | Data |
|---|---|---|
| 0 | feita e publicada (https://gabrielfortes-xdglab.github.io/avaliacao-psicologica/) | 2026-11-14 |
| 1 | feita e publicada; conteúdo aguarda revisão do supervisor | 2026-11-14 |
| 2 | feita e publicada; caso 01 aguarda revisão do supervisor | 2026-11-14 |
| 3 | a fazer | |
| 4 | a fazer | |
| 5 | a fazer | |
