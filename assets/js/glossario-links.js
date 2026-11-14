/* Liga termos do glossário nas outras páginas.
   Uso: AP.ligarGlossario(elemento) depois de escrever o texto na página.
   Cada termo vira um botão: ao passar o cursor, focar ou tocar, aparece a definição
   com link para a entrada completa. Não age dentro de links, botões ou títulos. */
(function () {
  "use strict";
  var el = AP.el;
  var preparo = null;
  var contador = 0;

  function escaparRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function preparar() {
    if (!preparo) {
      preparo = AP.carregarJSON("dados/glossario.json").then(function (d) {
        var porForma = {};
        var formas = [];
        d.termos.forEach(function (t) {
          (t.formas || [t.termo]).forEach(function (f) {
            porForma[f.toLowerCase()] = t;
            formas.push(f);
          });
        });
        // Formas mais longas primeiro, para "erro padrão de medida" ganhar de "erro de medida".
        formas.sort(function (a, b) { return b.length - a.length; });
        var re = new RegExp("(?<![\\p{L}\\p{N}])(" + formas.map(escaparRegex).join("|") + ")(?![\\p{L}\\p{N}])", "giu");
        return { re: re, porForma: porForma, textos: d.textos };
      });
    }
    return preparo;
  }

  function fecharTodos(exceto) {
    document.querySelectorAll(".gl.aberto").forEach(function (g) {
      if (g === exceto) return;
      g.classList.remove("aberto");
      g.querySelector("button").setAttribute("aria-expanded", "false");
    });
  }

  function criar(textoOriginal, termo, textos) {
    var id = "gl-def-" + (++contador);
    var botao = el("button", { type: "button", class: "gl-termo", "aria-expanded": "false", "aria-describedby": id, text: textoOriginal });
    var caixa = el("span", { class: "gl-def", role: "tooltip", id: id }, [
      el("strong", { text: termo.termo }),
      el("span", { text: termo.definicao }),
      el("a", { href: AP.url("ferramentas/glossario.html#" + termo.id), text: textos.ver_no_glossario })
    ]);
    var envolve = el("span", { class: "gl" }, [botao, caixa]);
    // Em tela larga, puxa a caixa para a esquerda se ela passar da borda direita.
    // Em tela estreita o CSS fixa a caixa no rodapé da tela e ignora este ajuste.
    function ajustar() {
      caixa.style.left = "";
      var r = caixa.getBoundingClientRect();
      var sobra = r.right - (document.documentElement.clientWidth - 8);
      if (r.width && sobra > 0) caixa.style.left = -sobra + "px";
    }
    envolve.addEventListener("mouseenter", ajustar);
    botao.addEventListener("focus", ajustar);
    botao.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var abrir = !envolve.classList.contains("aberto");
      fecharTodos(envolve);
      envolve.classList.toggle("aberto", abrir);
      if (abrir) ajustar();
      botao.setAttribute("aria-expanded", String(abrir));
    });
    caixa.addEventListener("click", function (ev) { ev.stopPropagation(); });
    return envolve;
  }

  function ligar(raiz, p) {
    var andador = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: function (no) {
        return no.parentElement.closest("a,button,h1,h2,h3,label,.gl,script,style")
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var nos = [];
    while (andador.nextNode()) nos.push(andador.currentNode);
    nos.forEach(function (no) {
      var texto = no.nodeValue;
      p.re.lastIndex = 0;
      var m, ultimo = 0, frag = null;
      while ((m = p.re.exec(texto))) {
        frag = frag || document.createDocumentFragment();
        frag.appendChild(document.createTextNode(texto.slice(ultimo, m.index)));
        frag.appendChild(criar(m[0], p.porForma[m[0].toLowerCase()], p.textos));
        ultimo = m.index + m[0].length;
      }
      if (frag) {
        frag.appendChild(document.createTextNode(texto.slice(ultimo)));
        no.parentNode.replaceChild(frag, no);
      }
    });
  }

  document.addEventListener("click", function () { fecharTodos(null); });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") fecharTodos(null); });

  AP.ligarGlossario = function (raiz) {
    return preparar().then(function (p) { ligar(raiz, p); }).catch(function () {
      /* Sem glossário, a página segue funcionando com o texto simples. */
    });
  };
})();
