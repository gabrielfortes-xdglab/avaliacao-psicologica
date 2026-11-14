/* Glossário psicométrico: lista com busca e link direto por termo (glossario.html#erro-padrao). */
(function () {
  "use strict";
  var el = AP.el;
  var principal = document.getElementById("conteudo");

  // Tira acentos e caixa, para a busca achar "padrao" em "padrão".
  function normalizar(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  function montar(site, dados) {
    var t = dados.textos;
    var porId = {};
    dados.termos.forEach(function (x) { porId[x.id] = x; });
    var termos = dados.termos.slice().sort(function (a, b) {
      return a.termo.localeCompare(b.termo, "pt-BR");
    });

    principal.textContent = "";
    var aviso = AP.avisoRevisao(dados, site);
    if (aviso) principal.appendChild(aviso);
    principal.appendChild(el("p", { class: "instrucao", text: t.instrucao }));

    var campo = el("input", { type: "search", id: "busca", autocomplete: "off" });
    var contagem = el("p", { class: "contagem", "aria-live": "polite" });
    var botao = el("button", { type: "button", class: "botao secundario", text: t.imprimir });
    botao.addEventListener("click", function () { window.print(); });
    principal.appendChild(el("div", { class: "barra nao-imprimir" }, [
      el("div", { class: "campo" }, [el("label", { for: "busca", text: t.buscar }), campo]),
      botao
    ]));
    principal.appendChild(contagem);

    var vazio = el("p", { class: "aviso", text: t.nenhum, hidden: "" });
    principal.appendChild(vazio);

    var itens = termos.map(function (x) {
      var relacionados = x.relacionados.filter(function (r) { return porId[r]; });
      var artigo = el("article", { class: "termo-ficha", id: x.id, tabindex: "-1" }, [
        el("h2", {}, el("a", { href: "#" + x.id, text: x.termo })),
        el("p", { class: "definicao", text: x.definicao }),
        el("dl", {}, [
          el("dt", { text: t.decisao }), el("dd", { text: x.decisao_que_depende }),
          el("dt", { class: "dt-erro", text: t.erro }), el("dd", { text: x.erro_comum })
        ]),
        relacionados.length ? el("p", { class: "relacionados" }, [
          el("span", { text: t.relacionados + ":" })
        ].concat(relacionados.map(function (r) {
          return el("a", { href: "#" + r, text: porId[r].termo });
        }))) : null
      ]);
      principal.appendChild(artigo);
      return { no: artigo, texto: normalizar([x.termo, x.definicao, x.decisao_que_depende, x.erro_comum].join(" ")) };
    });

    function filtrar() {
      var q = normalizar(campo.value.trim());
      var visiveis = 0;
      itens.forEach(function (i) {
        var mostra = !q || i.texto.indexOf(q) !== -1;
        i.no.hidden = !mostra;
        if (mostra) visiveis++;
      });
      vazio.hidden = visiveis > 0;
      contagem.textContent = visiveis + " " + t.contagem;
    }
    campo.addEventListener("input", filtrar);
    filtrar();

    // Link direto: limpa a busca (o termo pode estar escondido), rola até ele e dá foco.
    function irParaTermo() {
      var alvo = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (!alvo) return;
      if (alvo.hidden) { campo.value = ""; filtrar(); }
      alvo.scrollIntoView();
      alvo.focus({ preventScroll: true });
    }
    window.addEventListener("hashchange", irParaTermo);
    irParaTermo();
  }

  AP.iniciarPagina("glossario").then(function (site) {
    return AP.carregarJSON("dados/glossario.json").then(function (dados) { montar(site, dados); });
  }).catch(function (erro) { AP.mostrarErro(principal, erro); });
})();
