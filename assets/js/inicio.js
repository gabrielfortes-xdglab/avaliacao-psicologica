/* Página inicial: monta os grupos e os cartões a partir de dados/site.json. */
(function () {
  "use strict";
  var el = AP.el;
  var principal = document.getElementById("conteudo");

  function seta() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("aria-hidden", "true");
    var p = document.createElementNS(ns, "path");
    p.setAttribute("d", "M5 12h14M13 6l6 6-6 6");
    svg.appendChild(p);
    return svg;
  }

  function cartao(f, site) {
    var noAr = f.status === "no_ar";
    var rotulo = site.rotulos_status[f.status];
    if (noAr) {
      return el("a", { class: "tool", href: AP.url(f.pagina) }, [
        el("span", { class: "tag" }, [el("span", { class: "dot" }), rotulo]),
        el("h3", { text: f.nome }),
        el("p", { text: f.descricao }),
        el("span", { class: "foot" }, [site.textos.abrir, seta()])
      ]);
    }
    return el("div", { class: "tool disabled" }, [
      el("span", { class: "badge-soon", text: rotulo }),
      el("h3", { text: f.nome }),
      el("p", { text: f.descricao })
    ]);
  }

  AP.iniciarPagina(null).then(function (site) {
    principal.textContent = "";
    site.grupos.forEach(function (g) {
      var idTitulo = "grupo-" + g.id;
      principal.appendChild(el("section", { class: "grupo", "aria-labelledby": idTitulo }, [
        el("div", { class: "grupo-cabecalho" }, [
          el("h2", { id: idTitulo, text: g.nome }),
          el("p", { text: g.descricao })
        ]),
        el("ul", { class: "grid" }, g.ferramentas.map(function (f) {
          return el("li", {}, cartao(f, site));
        }))
      ]));
    });
  }).catch(function (erro) { AP.mostrarErro(principal, erro); });
})();
