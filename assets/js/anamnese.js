/* Anamnese ramificada.
   Árvore de decisão em caso.anamnese.nos. Sem IA: tudo vem do arquivo do caso.
   AP.sim.anamnese(area, caso, textos, aoConcluir) também é usada pelo caso progressivo. */
(function () {
  "use strict";
  var el = AP.el, S = AP.sim;

  function anamnese(area, caso, textos, aoConcluir) {
    var t = textos.anamnese, c = textos.comum, a = caso.anamnese;

    function fala(quem, classe, texto) {
      return el("div", { class: "fala " + classe }, [el("span", { class: "quem", text: quem }), el("p", { text: texto })]);
    }

    function entrevistar() {
      area.textContent = "";
      var feitas = [];      // perguntas escolhidas, na ordem
      var reveladas = {};   // ids de informações já reveladas

      if (!aoConcluir) area.appendChild(el("p", { class: "instrucao", text: t.instrucao }));
      var conversa = el("div", { class: "conversa", role: "log", "aria-live": "polite" });
      var contagem = el("p", { class: "progresso" });
      var lista = el("ol", { class: "alternativas" });
      var escolha = el("div", { class: "escolha" }, [contagem, el("p", { class: "enunciado", text: t.escolha }), lista]);
      area.appendChild(el("section", { class: "cartao" }, [
        el("h2", { text: t.entrevista_com + " " + a.informante }), conversa, escolha
      ]));

      function mostrarNo(id) {
        var no = a.nos[id];
        conversa.appendChild(fala(t.informante, "informante", no.fala));
        contagem.textContent = t.pergunta_numero + " " + (feitas.length + 1);
        lista.textContent = "";
        S.embaralhar(no.opcoes).forEach(function (op) {
          var botao = el("button", { type: "button", class: "alt", text: op.pergunta });
          botao.addEventListener("click", function () { perguntar(op); });
          lista.appendChild(el("li", {}, botao));
        });
      }

      function perguntar(op) {
        feitas.push(op);
        op.revela.forEach(function (id) { reveladas[id] = true; });
        var minha = fala(t.voce, "estudante", op.pergunta);
        conversa.appendChild(minha);
        if (op.resposta) conversa.appendChild(fala(t.informante, "informante", op.resposta));
        if (op.vai_para === "fim") { relatorio(feitas, reveladas); return; }
        mostrarNo(op.vai_para);
        minha.scrollIntoView({ block: "start" });
        var primeiro = lista.querySelector("button");
        if (primeiro) primeiro.focus({ preventScroll: true });
      }

      mostrarNo(a.no_inicial);
    }

    function relatorio(feitas, reveladas) {
      area.textContent = "";
      var titulo = el("h2", { text: t.relatorio_titulo });
      var coletadas = a.informacoes.filter(function (i) { return reveladas[i.id]; });
      var faltaram = a.informacoes.filter(function (i) { return i.essencial && !reveladas[i.id]; });
      var outras = a.informacoes.filter(function (i) { return !i.essencial && !reveladas[i.id]; });

      function itens(lista, marcar) {
        return el("ul", { class: "resumo-lista" }, lista.map(function (i) {
          return el("li", {}, [i.texto + ". ", marcar && i.essencial ? el("span", { class: "etiqueta", text: t.essencial }) : null]);
        }));
      }

      var r = el("section", { class: "cartao" }, [
        titulo,
        el("h3", { class: "grupo-comparacao", text: t.coletadas_titulo + " (" + coletadas.length + " " + t.de + " " + a.informacoes.length + ")" }),
        coletadas.length ? itens(coletadas, true) : el("p", { text: t.nenhuma_coletada }),
        el("h3", { class: "grupo-comparacao so_ref", text: t.faltaram_titulo }),
        faltaram.length ? itens(faltaram, false) : el("p", { text: t.faltaram_nenhuma })
      ]);
      if (outras.length) {
        r.appendChild(el("h3", { class: "grupo-comparacao", text: t.outras_titulo }));
        r.appendChild(itens(outras, false));
      }
      area.appendChild(r);

      // Proporção por tipo de pergunta.
      var tipos = el("section", { class: "cartao" }, el("h2", { text: t.tipos_titulo }));
      ["aberta", "fechada", "indutiva"].forEach(function (tipo) {
        var n = feitas.filter(function (op) { return op.tipo === tipo; }).length;
        var pct = Math.round(100 * n / feitas.length);
        tipos.appendChild(el("div", { class: "tipo-linha " + tipo }, [
          el("p", {}, [el("strong", { text: t.tipos[tipo].nome + ": " + n + " " + t.de + " " + feitas.length + " (" + pct + "%)" })]),
          el("div", { class: "barra-tipo", "aria-hidden": "true" }, el("span", { style: "width:" + pct + "%" })),
          el("p", { class: "meta", text: t.tipos[tipo].explicacao })
        ]));
      });
      var indutivas = feitas.filter(function (op) { return op.tipo === "indutiva"; });
      tipos.appendChild(el("h3", { class: "grupo-comparacao", text: t.indutivas_titulo }));
      tipos.appendChild(indutivas.length ? el("ul", { class: "resumo-lista" }, indutivas.map(function (op) {
        return el("li", {}, [el("strong", { text: "“" + op.pergunta + "” " }), op.comentario || ""]);
      })) : el("p", { text: t.indutivas_nenhuma }));
      area.appendChild(tipos);

      // Transcrição com o tipo de cada pergunta.
      area.appendChild(el("section", { class: "cartao" }, [
        el("h2", { text: t.transcricao_titulo }),
        el("ol", { class: "transcricao" }, feitas.map(function (op) {
          return el("li", {}, [
            el("p", {}, [el("span", { class: "etiqueta tipo-" + op.tipo, text: t.tipos[op.tipo].nome }), " ", el("strong", { text: op.pergunta })]),
            op.resposta ? el("p", { class: "meta", text: op.resposta }) : null
          ]);
        }))
      ]));

      var refazer = el("button", { type: "button", class: "botao secundario", text: t.refazer });
      refazer.addEventListener("click", function () { entrevistar(); S.irPara(area); });
      area.appendChild(el("div", { class: "acoes nao-imprimir" }, aoConcluir ? refazer : [refazer, S.botaoImprimir(c)]));
      S.irPara(titulo);
      if (aoConcluir) aoConcluir();
    }

    entrevistar();
  }

  S.anamnese = anamnese;
  if (document.body.getAttribute("data-ferramenta") === "anamnese") {
    S.iniciar("anamnese", ["anamnese"], function (area, caso, textos) { anamnese(area, caso, textos, null); });
  }
})();
