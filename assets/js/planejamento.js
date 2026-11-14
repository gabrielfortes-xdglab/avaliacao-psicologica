/* Planejamento de avaliação.
   O estudante marca hipóteses, escolhe procedimentos dentro do limite de sessões,
   vê a cobertura do plano e compara com o plano de referência.
   AP.sim.planejamento(area, caso, textos, aoConcluir) também é usada pelo caso progressivo. */
(function () {
  "use strict";
  var el = AP.el, S = AP.sim;

  function planejamento(area, caso, textos, aoConcluir) {
    var t = textos.planejamento, c = textos.comum, p = caso.planejamento;
    var hipoteses = caso.hipoteses || [];
    var porId = {};
    p.opcoes.forEach(function (o) { porId[o.id] = o; });

    function caixa(nome, valor, conteudo) {
      var entrada = el("input", { type: "checkbox", name: nome, value: valor });
      return { entrada: entrada, no: el("label", { class: "opcao" }, [entrada, el("span", { class: "opcao-texto" }, conteudo)]) };
    }

    function telaEscolha() {
      area.textContent = "";
      if (!aoConcluir) area.appendChild(el("p", { class: "instrucao", text: t.instrucao }));
      if (!aoConcluir) area.appendChild(S.blocoDemanda(caso, c));

      var caixasH = hipoteses.map(function (h) { return caixa("hipotese", h.id, h.texto); });
      area.appendChild(el("fieldset", { class: "cartao" }, [
        el("legend", {}, el("h2", { text: t.hipoteses_titulo })),
        el("p", { class: "meta", text: t.hipoteses_instrucao }),
        el("div", { class: "opcoes" }, caixasH.map(function (x) { return x.no; }))
      ]));

      var caixasP = S.embaralhar(p.opcoes).map(function (o) {
        return caixa("procedimento", o.id, [
          el("span", { text: o.rotulo }),
          el("span", { class: "meta", text: (t.tipos[o.tipo] || o.tipo) + " · " + S.textoSessoes(o.sessoes, c) })
        ]);
      });
      var contador = el("p", { class: "contador", "aria-live": "polite" });
      var aviso = el("p", { class: "aviso erro", role: "alert", hidden: "" });
      var seguir = el("button", { type: "button", class: "botao", text: t.ver_cobertura });
      area.appendChild(el("fieldset", { class: "cartao" }, [
        el("legend", {}, el("h2", { text: t.procedimentos_titulo })),
        el("p", { class: "meta", text: t.procedimentos_instrucao + " " + S.textoSessoes(p.limite_sessoes, c) + "." }),
        el("div", { class: "opcoes" }, caixasP.map(function (x) { return x.no; })),
        contador, aviso,
        el("div", { class: "acoes" }, seguir)
      ]));

      function marcados(lista) {
        return lista.filter(function (x) { return x.entrada.checked; }).map(function (x) { return x.entrada.value; });
      }
      function usadas() {
        return marcados(caixasP).reduce(function (soma, id) { return soma + porId[id].sessoes; }, 0);
      }
      function atualizar() {
        var u = usadas();
        contador.textContent = t.contador + " " + S.numero(u) + " " + t.de + " " + S.numero(p.limite_sessoes);
        contador.classList.toggle("excedeu", u > p.limite_sessoes);
        if (u <= p.limite_sessoes && aviso.textContent === t.excedeu) aviso.hidden = true;
      }
      caixasP.forEach(function (x) { x.entrada.addEventListener("change", atualizar); });
      atualizar();

      seguir.addEventListener("click", function () {
        var hs = marcados(caixasH), ps = marcados(caixasP);
        var msg = !hs.length ? t.falta_hipotese : !ps.length ? t.falta_procedimento : usadas() > p.limite_sessoes ? t.excedeu : null;
        if (msg) { aviso.textContent = msg; aviso.hidden = false; return; }
        telaResultado(hs, ps);
      });
    }

    function telaResultado(hs, ps) {
      area.textContent = "";
      var escolhidas = p.opcoes.filter(function (o) { return ps.indexOf(o.id) >= 0; });
      var ref = p.plano_referencia;
      function soma(lista) { return lista.reduce(function (s, o) { return s + o.sessoes; }, 0); }

      // Cobertura: para cada hipótese, as fontes escolhidas que a informam.
      var titulo = el("h2", { text: t.cobertura_titulo });
      var cobertura = el("section", { class: "cartao" }, [titulo, el("p", { class: "meta", text: t.cobertura_instrucao })]);
      cobertura.appendChild(el("ul", { class: "cobertura" }, hipoteses.map(function (h) {
        var fontes = escolhidas.filter(function (o) { return o.informa.indexOf(h.id) >= 0; });
        var li = el("li", { class: fontes.length ? "" : "sem-fonte" }, [
          el("p", {}, [el("strong", { text: h.texto }), " ", hs.indexOf(h.id) < 0 ? el("span", { class: "etiqueta", text: t.nao_marcada }) : null])
        ]);
        if (fontes.length) {
          li.appendChild(el("ul", { class: "fontes" }, fontes.map(function (o) { return el("li", { text: o.rotulo }); })));
          if (fontes.length === 1) li.appendChild(el("p", { class: "meta", text: t.uma_fonte }));
        } else {
          li.appendChild(el("p", { class: "alerta-texto", text: t.sem_fonte }));
        }
        return li;
      })));
      var semUso = escolhidas.filter(function (o) { return !o.informa.length; });
      if (semUso.length) {
        cobertura.appendChild(el("p", { class: "meta", text: t.sem_uso_titulo + ":" }));
        cobertura.appendChild(el("ul", { class: "fontes" }, semUso.map(function (o) { return el("li", { text: o.rotulo }); })));
      }
      area.appendChild(cobertura);

      // Comparação com o plano de referência, opção por opção.
      var comparacao = el("section", { class: "cartao" }, [
        el("h2", { text: t.comparacao_titulo }),
        el("p", { class: "meta", text:
          t.seu_plano + ": " + S.textoSessoes(soma(escolhidas), c) + ". " +
          t.plano_referencia + ": " + S.textoSessoes(soma(ref.map(function (id) { return porId[id]; })), c) + "." })
      ]);
      [["so_ref", false, true], ["so_seu", true, false], ["ambos", true, true], ["nenhum", false, false]].forEach(function (g) {
        var itens = p.opcoes.filter(function (o) {
          return (ps.indexOf(o.id) >= 0) === g[1] && (ref.indexOf(o.id) >= 0) === g[2];
        });
        if (!itens.length) return;
        comparacao.appendChild(el("h3", { class: "grupo-comparacao " + g[0], text: t.grupos[g[0]] }));
        comparacao.appendChild(el("ul", { class: "resumo-lista" }, itens.map(function (o) {
          return el("li", {}, [el("strong", { text: o.rotulo.replace(/\.$/, "") + ". " }), S.ligar(el("span", { text: o.comentario }))]);
        })));
      });
      comparacao.appendChild(el("h3", { class: "grupo-comparacao", text: t.justificativa_titulo }));
      comparacao.appendChild(el("p", { text: p.justificativa_referencia }));
      comparacao.appendChild(el("p", { class: "meta", text: t.nota_referencia }));
      area.appendChild(comparacao);

      var refazer = el("button", { type: "button", class: "botao secundario", text: t.refazer });
      refazer.addEventListener("click", function () { telaEscolha(); S.irPara(area); });
      area.appendChild(el("div", { class: "acoes nao-imprimir" }, aoConcluir ? refazer : [refazer, S.botaoImprimir(c)]));
      S.irPara(titulo);
      if (aoConcluir) aoConcluir();
    }

    telaEscolha();
  }

  S.planejamento = planejamento;
  if (document.body.getAttribute("data-ferramenta") === "planejamento") {
    S.iniciar("planejamento", ["planejamento", "hipoteses"], function (area, caso, textos) { planejamento(area, caso, textos, null); });
  }
})();
