/* Peças comuns às ferramentas que usam um caso (planejamento, anamnese, caso progressivo).
   Expõe AP.sim. Textos da interface vêm de dados/simuladores.json. */
(function () {
  "use strict";
  var el = AP.el;

  function numero(n) { return String(n).replace(".", ","); }

  function textoSessoes(n, c) {
    if (n === 0.5) return c.sessao_meia;
    if (n === 1) return c.sessao_uma;
    return numero(n) + " " + c.sessoes;
  }

  function embaralhar(lista) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Cartão com a demanda do caso.
  function blocoDemanda(caso, c) {
    var d = caso.demanda;
    return el("section", { class: "cartao" }, [
      el("h2", { text: c.demanda_titulo }),
      el("p", { text: d.texto }),
      el("dl", { class: "pares" }, [
        el("dt", { text: c.solicitante }), el("dd", { text: d.solicitante }),
        el("dt", { text: c.pergunta_de_avaliacao }), el("dd", { text: d.pergunta_de_avaliacao })
      ])
    ]);
  }

  // Tabelas de resultados, uma por instrumento.
  function tabelasResultados(resultados, c) {
    var col = c.colunas;
    return el("div", { class: "instrumentos" }, resultados.instrumentos.map(function (inst) {
      function td(rotulo, valor) { return el("td", { class: "num", "data-rotulo": rotulo, text: valor }); }
      return el("div", { class: "instrumento" }, [
        el("p", {}, [el("strong", { text: inst.nome }), " ", inst.ficticio ? el("span", { class: "etiqueta", text: c.ficticio }) : null]),
        el("p", { class: "meta", text: inst.construto + ". " + inst.metrica + "." }),
        el("table", { class: "medidas" }, [
          el("thead", {}, el("tr", {}, [col.medida, col.bruto, col.escore, col.percentil, col.ic95, col.faixa].map(function (r) {
            return el("th", { scope: "col", text: r });
          }))),
          el("tbody", {}, inst.medidas.map(function (m) {
            return el("tr", {}, [
              el("th", { scope: "row", text: m.rotulo }),
              td(col.bruto, numero(m.bruto)), td(col.escore, numero(m.escore_padrao)),
              td(col.percentil, numero(m.percentil)),
              td(col.ic95, numero(m.ic95[0]) + " " + c.ic_a + " " + numero(m.ic95[1])),
              td(col.faixa, m.faixa)
            ]);
          }))
        ])
      ]);
    }));
  }

  function botaoImprimir(c) {
    var b = el("button", { type: "button", class: "botao secundario", text: c.imprimir });
    b.addEventListener("click", function () { window.print(); });
    return b;
  }

  // Leva o foco e a rolagem para o início de um trecho novo.
  function irPara(no) {
    no.setAttribute("tabindex", "-1");
    no.scrollIntoView({ block: "start" });
    no.focus({ preventScroll: true });
  }

  function listarCasos(principal, site, textos, blocos) {
    var c = textos.comum;
    return AP.carregarIndiceCasos().then(function (casos) {
      return Promise.all(casos.map(function (item) {
        return AP.carregarCaso(item.id).then(function (caso) {
          return blocos.every(function (b) { return caso[b]; }) ? caso : null;
        }).catch(function () { return null; });
      }));
    }).then(function (casos) {
      casos = casos.filter(Boolean);
      principal.textContent = "";
      if (!casos.length) {
        principal.appendChild(el("p", { class: "aviso", text: c.sem_casos }));
        return;
      }
      principal.appendChild(el("p", { class: "instrucao", text: c.escolher_caso }));
      principal.appendChild(el("ul", { class: "lista-casos" }, casos.map(function (caso) {
        return el("li", {}, el("a", { class: "cartao caso-link", href: "?caso=" + encodeURIComponent(caso.id) }, [
          el("h2", { text: caso.titulo }),
          el("p", { class: "meta", text: (c.contextos[caso.contexto] || caso.contexto) + " · " + (c.faixas[caso.faixa_etaria] || caso.faixa_etaria) }),
          el("p", { text: caso.demanda.texto }),
          el("span", { class: "abrir", text: c.abrir_caso + " →" })
        ]));
      })));
    });
  }

  // Ponto de entrada das páginas. Sem ?caso, lista os casos que têm os blocos pedidos.
  // Com ?caso, monta o topo e chama montar(area, caso, textos, site).
  function iniciar(idFerramenta, blocos, montar) {
    var principal = document.getElementById("conteudo");
    AP.iniciarPagina(idFerramenta).then(function (site) {
      return AP.carregarJSON("dados/simuladores.json").then(function (textos) {
        var c = textos.comum, id = AP.parametroCaso();
        if (!id) return listarCasos(principal, site, textos, blocos);
        return AP.carregarCaso(id).then(function (caso) {
          principal.textContent = "";
          var revisao = AP.avisoRevisao(caso, site);
          if (revisao) principal.appendChild(revisao);
          principal.appendChild(el("p", { class: "meta" }, [
            el("strong", { text: c.caso + ": " + caso.titulo + ". " }),
            c.aviso_ficticio + " ",
            el("a", { class: "nao-imprimir", href: location.pathname, text: c.trocar_caso })
          ]));
          if (!blocos.every(function (b) { return caso[b]; })) {
            principal.appendChild(el("p", { class: "aviso", text: c.caso_sem_bloco }));
            return;
          }
          var area = el("div", { class: "area" });
          principal.appendChild(area);
          montar(area, caso, textos, site);
        });
      });
    }).catch(function (erro) { AP.mostrarErro(principal, erro); });
  }

  function ligar(no) { if (AP.ligarGlossario) AP.ligarGlossario(no); return no; }

  AP.sim = {
    numero: numero,
    textoSessoes: textoSessoes,
    embaralhar: embaralhar,
    blocoDemanda: blocoDemanda,
    tabelasResultados: tabelasResultados,
    botaoImprimir: botaoImprimir,
    irPara: irPara,
    iniciar: iniciar,
    ligar: ligar
  };
})();
