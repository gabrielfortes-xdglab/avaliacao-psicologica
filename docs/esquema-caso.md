# Esquema do arquivo de caso

Cada caso é um arquivo `dados/casos/<id>.json`. O exemplo completo está em `dados/casos/caso-modelo.json`. A lista de casos publicados fica em `dados/casos/indice.json`.

## Quem lê o quê

| Bloco | Ferramenta |
|---|---|
| `demanda` | todas |
| `hipoteses`, `planejamento` | Planejamento de avaliação, Caso progressivo |
| `anamnese` | Anamnese ramificada, Caso progressivo |
| `resultados` | Interpretação de escores, Caso progressivo |
| `integracao` | Caso progressivo |
| `laudo` | Laudo com erros, Caso progressivo |
| `trajetoria_referencia` | Caso progressivo |

Um caso pode ter só parte dos blocos. A ferramenta cujo bloco está ausente não lista o caso.

## Campos

### Cabeçalho

- `id` (texto): igual ao nome do arquivo, sem extensão.
- `titulo` (texto): curto, sem diagnóstico no título.
- `ficticio` (booleano): sempre `true`.
- `contexto` (texto): `clinico`, `escolar`, `organizacional`, `transito`, `forense`, `saude`.
- `faixa_etaria` (texto): `crianca`, `adolescente`, `adulto`, `idoso`.
- `versao` (texto) e `atualizado_em` (data ISO).
- `revisado_por` (texto ou nulo): nulo faz a página mostrar "em revisão".
- `etapas` (lista): ordem das etapas no caso progressivo.

### `demanda`

- `solicitante`, `texto` (a queixa como chegou), `pergunta_de_avaliacao` (a pergunta que a avaliação deve responder).

### `hipoteses`

Lista de `{id, texto}`. São as hipóteses que o plano precisa cobrir. Os ids são usados em `planejamento` e `integracao`.

### `planejamento`

- `limite_sessoes` (número).
- `opcoes`: lista de procedimentos disponíveis. Cada um com:
  - `id`, `rotulo`
  - `tipo`: `entrevista`, `observacao`, `instrumento`, `fonte_complementar`
  - `sessoes` (número)
  - `informa` (lista de ids de hipóteses)
  - `adequada` (booleano) e `comentario` (por que sim ou por que não)
- `plano_referencia` (lista de ids de opções) e `justificativa_referencia`.

### `anamnese`

- `informante` (quem responde).
- `informacoes`: lista de `{id, texto, essencial}`. É o que pode ser descoberto.
- `no_inicial` (id do primeiro nó).
- `nos`: objeto em que cada chave é um id de nó, com:
  - `fala`: o que o informante diz ao chegar nesse nó
  - `opcoes`: lista de perguntas possíveis, cada uma com `pergunta`, `tipo` (`aberta`, `fechada`, `indutiva`), `revela` (lista de ids de informações), `vai_para` (id do próximo nó ou `"fim"`) e `comentario` (opcional, mostrado no relatório final)

Regras: todo `vai_para` aponta para nó existente ou `"fim"`; toda informação essencial é alcançável por pelo menos um caminho; nenhum caminho passa de 15 perguntas.

### `resultados`

- `instrumentos`: lista com `nome` (fictício), `ficticio: true`, `construto`, `metrica` (por exemplo, "escore padrão, média 100, DP 15") e `medidas`, cada uma com `id`, `rotulo`, `bruto`, `percentil`, `escore_padrao`, `ic95` (dois números) e `faixa`.
- `questoes`: lista com `medida` (id), `enunciado` e `alternativas`, cada uma com `texto`, `correta`, `erro_tipico` (código, nulo na correta) e `comentario`.

Códigos de `erro_tipico`: `percentil_como_acerto`, `ignora_erro_medida`, `limitrofe_como_diagnostico`, `metricas_diferentes`, `construto_nao_medido`, `inferencia_causal`.

### `integracao`

- `fontes`: lista de `{id, origem, achado}`.
- `convergencias` e `divergencias`: listas de `{fontes, hipotese, comentario}`.
- `conclusao_referencia` (texto) e `limites` (texto).

### `laudo`

- `secoes`: lista de `{titulo, paragrafos}`. Cada parágrafo tem `id`, `texto` e `erro`.
- `erro` é nulo no parágrafo adequado. No parágrafo com problema plantado: `{tipo, explicacao, correcao}`.

Códigos de `tipo`: `conclusao_sem_base`, `instrumento_inadequado`, `linguagem_determinista`, `rotulo_sem_descricao`, `quebra_de_sigilo`, `informacao_desnecessaria`, `sem_limites`, `estrutura_fora_da_norma`.

Os títulos das seções devem seguir a estrutura de laudo da resolução vigente do CFP (confirmar no texto oficial antes de escrever).

### `trajetoria_referencia`

Lista de `{etapa, hipotese}`: como a hipótese de um avaliador experiente evoluiria a cada etapa. É mostrada ao final, ao lado das hipóteses que o estudante escreveu.

## Índice de casos

`dados/casos/indice.json` lista só os casos publicados: `{"casos": [{id, titulo, contexto, faixa_etaria}]}`. Os três últimos campos repetem o cabeçalho do caso, para a lista aparecer sem abrir cada arquivo. O `caso-modelo` não entra no índice.

## Validação

`scripts/validar_dados.py` deve conferir: campos obrigatórios, ids únicos, referências cruzadas (hipóteses, medidas, nós), exatamente uma alternativa correta por questão, alcançabilidade das informações essenciais na árvore de anamnese e `ficticio: true` em caso e instrumentos.
