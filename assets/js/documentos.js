/* Guia de documentos psicológicos.
   Todo o conteúdo vem de dados/documentos.json. Cada regra traz o artigo da resolução. */
(function () {
  "use strict";
  var el = AP.el;
  var principal = document.getElementById("conteudo");

  function dataBR(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? m[3] + "/" + m[2] + "/" + m[1] : iso;
  }

  function ladoALado(t, problematico, adequado, rotuloAdequado) {
    return el("div", { class: "lado-a-lado" }, [
      el("div", { class: "problema" }, [el("span", { class: "quem", text: t.problematico }), el("p", { text: problematico })]),
      el("div", { class: "sua" }, [el("span", { class: "quem", text: rotuloAdequado }), el("p", { text: adequado })])
    ]);
  }

  function montar(site, d) {
    var t = d.textos, n = d.norma_base;
    principal.textContent = "";
    var revisao = AP.avisoRevisao(d, site);
    if (revisao) principal.appendChild(revisao);
    principal.appendChild(el("p", { class: "instrucao", text: t.instrucao }));

    // Norma de referência, com o aviso de vigência a confirmar.
    principal.appendChild(el("section", { class: "cartao" }, [
      el("h2", { text: t.norma_titulo }),
      el("p", {}, [el("strong", { text: n.referencia + ". " }), n.ementa || ""]),
      el("p", { class: "meta" }, [
        t.consultado_em + " " + dataBR(n.consultado_em) + ": ",
        el("a", { href: n.fonte, target: "_blank", rel: "noopener", text: n.fonte_rotulo })
      ]),
      n.a_confirmar ? el("p", { class: "aviso revisao", role: "note", text: n.nota_confirmar }) : null,
      !n.a_confirmar && n.vigencia_conferida_em ? el("p", { class: "meta", text: t.vigencia + " " + dataBR(n.vigencia_conferida_em) + "." }) : null
    ]));

    // Quadro: qual documento usar.
    var col = t.colunas;
    principal.appendChild(el("section", { class: "cartao" }, [
      el("h2", { text: t.quadro_titulo }),
      el("p", { class: "meta", text: t.quadro_instrucao }),
      el("table", { class: "medidas" }, [
        el("thead", {}, el("tr", {}, [col.documento, col.avaliacao, col.finalidade, col.artigo].map(function (r) {
          return el("th", { scope: "col", text: r });
        }))),
        el("tbody", {}, d.documentos.map(function (doc) {
          return el("tr", {}, [
            el("th", { scope: "row" }, el("a", { href: "#" + doc.id, text: doc.nome })),
            el("td", { "data-rotulo": col.avaliacao, text: doc.resulta_de_avaliacao ? t.sim : t.nao }),
            el("td", { "data-rotulo": col.finalidade, class: "longo", text: doc.resumo }),
            el("td", { "data-rotulo": col.artigo, class: "num", text: doc.artigo })
          ]);
        }))
      ])
    ]));

    // Fichas.
    principal.appendChild(el("h2", { class: "titulo-secao", text: t.fichas_titulo }));
    d.documentos.forEach(function (doc) {
      var ficha = el("article", { class: "termo-ficha", id: doc.id }, [
        el("h2", {}, [doc.nome + " ", el("span", { class: "etiqueta neutra", text: doc.artigo })]),
        el("dl", {}, [
          el("dt", { text: t.finalidade }), el("dd", { text: doc.finalidade }),
          el("dt", { text: t.estrutura }), el("dd", {}, el("ol", { class: "fontes" }, doc.estrutura.map(function (i) { return el("li", { text: i }); }))),
          el("dt", { text: t.quando_usar }), el("dd", { text: doc.quando_usar }),
          doc.atencao ? el("dt", { class: "dt-erro", text: t.atencao }) : null,
          doc.atencao ? el("dd", { text: doc.atencao }) : null
        ])
      ]);
      (doc.exemplos || []).forEach(function (ex) {
        if (!ex.adequado || !ex.problematico) return;
        ficha.appendChild(el("p", { class: "quem", text: t.exemplo_titulo }));
        ficha.appendChild(ladoALado(t, ex.problematico, ex.adequado, t.adequado));
        if (ex.comentario) ficha.appendChild(el("p", { class: "meta", text: ex.comentario }));
      });
      principal.appendChild(ficha);
    });

    // Banco de frases.
    if (d.frases.length) {
      principal.appendChild(el("section", { class: "cartao" }, [
        el("h2", { text: t.frases_titulo }),
        el("p", { class: "meta", text: t.frases_instrucao }),
        el("ol", { class: "linha-tempo" }, d.frases.map(function (f) {
          return el("li", {}, [ladoALado(t, f.problematica, f.descritiva, t.descritiva), el("p", { class: "meta", text: f.comentario })]);
        }))
      ]));
    }

    // Checklist.
    if (d.checklist.length) {
      var imprimir = el("button", { type: "button", class: "botao secundario", text: t.imprimir });
      imprimir.addEventListener("click", function () { window.print(); });
      principal.appendChild(el("section", { class: "cartao" }, [
        el("h2", { text: t.checklist_titulo }),
        el("p", { class: "meta", text: t.checklist_instrucao }),
        el("div", { class: "opcoes" }, d.checklist.map(function (item) {
          return el("label", { class: "opcao" }, [
            el("input", { type: "checkbox" }),
            el("span", { class: "opcao-texto" }, [el("span", { text: item.texto }), el("span", { class: "meta", text: item.artigo })])
          ]);
        })),
        el("div", { class: "acoes nao-imprimir" }, imprimir)
      ]));
    }
    principal.appendChild(el("p", { class: "meta", text: t.ficticio }));
    if (location.hash) {
      var alvo = document.getElementById(location.hash.slice(1));
      if (alvo) alvo.scrollIntoView();
    }
  }

  AP.iniciarPagina("documentos").then(function (site) {
    return AP.carregarJSON("dados/documentos.json").then(function (d) { montar(site, d); });
  }).catch(function (erro) { AP.mostrarErro(principal, erro); });
})();
