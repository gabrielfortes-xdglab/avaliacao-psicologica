/* Interpretação de escores.
   Modo livre: questões de dados/escores.json, em ordem sorteada.
   Modo caso (?caso=<id>): questões de resultados.questoes do caso.
   Respostas ficam só na memória da página. */
(function () {
  "use strict";
  var el = AP.el;
  var principal = document.getElementById("conteudo");
  var NS = "http://www.w3.org/2000/svg";

  function embaralhar(lista) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function numero(n) { return String(n).replace(".", ","); }

  // Lê média e desvio padrão do texto da métrica ("..., média 100, desvio padrão 15").
  function lerMetrica(texto) {
    var m = /média\s+(-?\d+(?:[.,]\d+)?)[\s\S]*?desvio padrão\s+(\d+(?:[.,]\d+)?)/i.exec(texto || "");
    if (!m) return null;
    var media = parseFloat(m[1].replace(",", ".")), dp = parseFloat(m[2].replace(",", "."));
    return dp > 0 ? { media: media, dp: dp } : null;
  }

  // Junta cada questão ao bloco de resultados de onde ela veio.
  function listarQuestoes(blocos) {
    var lista = [];
    blocos.forEach(function (b) {
      var medidas = {};
      b.instrumentos.forEach(function (inst) {
        inst.medidas.forEach(function (m) { medidas[m.id] = { medida: m, instrumento: inst }; });
      });
      (b.questoes || []).forEach(function (q) {
        lista.push({ bloco: b, questao: q, medidas: medidas });
      });
    });
    return lista;
  }

  function svg(tag, attrs, texto) {
    var no = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { no.setAttribute(k, attrs[k]); });
    if (texto != null) no.textContent = texto;
    return no;
  }

  // Curva normal com o escore e o IC marcados. Devolve null se a métrica não puder ser lida.
  function curva(item, t) {
    var mt = lerMetrica(item.instrumento.metrica);
    if (!mt) return null;
    var m = item.medida;
    var L = 600, A = 190, esq = 20, dir = 580, base = 140, topo = 34, zmax = 3.5;
    function x(z) { return esq + (Math.max(-zmax, Math.min(zmax, z)) + zmax) / (2 * zmax) * (dir - esq); }
    function y(z) { return base - Math.exp(-z * z / 2) * (base - topo); }
    function z(v) { return (v - mt.media) / mt.dp; }

    var pontos = [];
    for (var i = -zmax; i <= zmax + 0.001; i += 0.1) pontos.push(x(i).toFixed(1) + "," + y(i).toFixed(1));
    var descricao = m.rotulo + ": " + t.curva_escore + " " + numero(m.escore_padrao) + ", " + t.curva_ic + " " +
      numero(m.ic95[0]) + " a " + numero(m.ic95[1]) + ", " + t.curva_media + " " + numero(mt.media) + ". " + t.curva_descricao;

    var g = svg("svg", { viewBox: "0 0 " + L + " " + A, class: "curva", role: "img", "aria-label": descricao });
    g.appendChild(svg("text", { x: esq, y: 16, class: "titulo" }, m.rotulo));
    g.appendChild(svg("polygon", { class: "area", points: esq + "," + base + " " + pontos.join(" ") + " " + dir + "," + base }));
    var x0 = x(z(m.ic95[0])), x1 = x(z(m.ic95[1]));
    g.appendChild(svg("rect", { class: "ic", x: x0, y: topo - 6, width: Math.max(2, x1 - x0), height: base - topo + 6 }));
    g.appendChild(svg("polyline", { class: "linha", points: pontos.join(" ") }));
    g.appendChild(svg("line", { class: "eixo", x1: esq, y1: base, x2: dir, y2: base }));
    for (var k = -3; k <= 3; k++) {
      g.appendChild(svg("line", { class: "eixo", x1: x(k), y1: base, x2: x(k), y2: base + 5 }));
      g.appendChild(svg("text", { x: x(k), y: base + 20, "text-anchor": "middle" }, numero(mt.media + k * mt.dp)));
    }
    g.appendChild(svg("text", { x: x(0), y: base + 36, "text-anchor": "middle" }, t.curva_media));
    var xe = x(z(m.escore_padrao));
    g.appendChild(svg("line", { class: "marca", x1: xe, y1: topo - 10, x2: xe, y2: base }));
    var ancora = xe > dir - 150 ? "end" : "start";
    g.appendChild(svg("text", { class: "valor", x: xe + (ancora === "end" ? -8 : 8), y: topo - 14, "text-anchor": ancora },
      t.curva_escore + " " + numero(m.escore_padrao) + " · " + t.curva_ic + " " + numero(m.ic95[0]) + " a " + numero(m.ic95[1])));
    return g;
  }

  // Uma tabela por instrumento, com o nome e a métrica acima dela (fora da área de rolagem).
  function tabela(bloco, emFoco, t) {
    var c = t.colunas;
    return el("div", { class: "instrumentos" }, bloco.instrumentos.map(function (inst) {
      return el("div", { class: "instrumento" }, [
        el("p", {}, [el("strong", { text: inst.nome + " " }), el("span", { class: "etiqueta", text: t.ficticio })]),
        el("p", { class: "meta", text: inst.construto + ". " + inst.metrica + "." }),
        el("div", { class: "tabela-rolagem" }, el("table", { class: "medidas" }, [
          el("thead", {}, el("tr", {}, [c.medida, c.bruto, c.escore, c.percentil, c.ic95, c.faixa].map(function (r) {
            return el("th", { scope: "col", text: r });
          }))),
          el("tbody", {}, inst.medidas.map(function (m) {
            return el("tr", emFoco.indexOf(m.id) !== -1 ? { class: "em-foco" } : {}, [
              el("th", { scope: "row", text: m.rotulo }),
              el("td", { class: "num", text: numero(m.bruto) }),
              el("td", { class: "num", text: numero(m.escore_padrao) }),
              el("td", { class: "num", text: numero(m.percentil) }),
              el("td", { class: "num", text: numero(m.ic95[0]) + " a " + numero(m.ic95[1]) }),
              el("td", { text: m.faixa })
            ]);
          }))
        ]))
      ]);
    }));
  }

  function iniciar(site, dados, itens, cabecalho) {
    var t = dados.textos;
    var erros = dados.erros_tipicos;
    var ordem, posicao, acertos, escolhidos;

    function recomecar() {
      ordem = embaralhar(itens);
      posicao = 0; acertos = 0; escolhidos = {};
      mostrarQuestao();
    }

    function topo() {
      principal.textContent = "";
      cabecalho.forEach(function (no) { if (no) principal.appendChild(no); });
    }

    function mostrarQuestao() {
      var item = ordem[posicao];
      var q = item.questao;
      var foco = [q.medida].concat(q.comparar ? [q.comparar] : []);
      topo();

      var titulo = el("p", { class: "progresso", tabindex: "-1",
        text: t.questao + " " + (posicao + 1) + " " + t.de + " " + ordem.length });
      principal.appendChild(titulo);

      var perfil = el("section", { class: "cartao" }, [
        item.bloco.descricao ? el("p", { text: item.bloco.descricao }) : null,
        tabela(item.bloco, foco, t)
      ]);
      foco.forEach(function (id) {
        var g = item.medidas[id] && curva(item.medidas[id], t);
        if (g) perfil.appendChild(g);
      });
      principal.appendChild(perfil);

      var enunciado = el("p", { class: "enunciado", text: q.enunciado });
      var retorno = el("p", { class: "aviso", "aria-live": "polite", hidden: "" });
      var lista = el("ol", { class: "alternativas" });
      var seguir = el("div", { class: "acoes" });
      principal.appendChild(el("section", { class: "cartao" }, [enunciado, retorno, lista, seguir]));
      AP.ligarGlossario(enunciado);

      var linhas = embaralhar(q.alternativas).map(function (alt) {
        var botao = el("button", { type: "button", class: "alt", text: alt.texto });
        var li = el("li", {}, botao);
        botao.addEventListener("click", function () { responder(alt, li); });
        lista.appendChild(li);
        return { alt: alt, li: li, botao: botao };
      });

      function responder(escolhida, liEscolhida) {
        if (escolhida.correta) acertos++;
        else escolhidos[escolhida.erro_tipico] = (escolhidos[escolhida.erro_tipico] || 0) + 1;

        linhas.forEach(function (l) {
          var a = l.alt;
          l.botao.disabled = true;
          l.li.classList.add("respondida");
          var rotulo;
          if (a.correta) { l.li.classList.add("certa"); rotulo = el("span", { class: "veredito", text: t.correta }); }
          else if (l.li === liEscolhida) { l.li.classList.add("errada-escolhida"); rotulo = el("span", { class: "veredito", text: t.sua_resposta_errada }); }
          else rotulo = el("span", { class: "veredito neutro", text: t.outra_errada });
          l.li.insertBefore(rotulo, l.botao);

          var comentario = el("p", { class: "comentario", text: a.comentario });
          l.li.appendChild(comentario);
          AP.ligarGlossario(comentario);
          var e = a.erro_tipico && erros[a.erro_tipico];
          if (e) {
            var explicacao = el("span", { text: e.explicacao });
            l.li.appendChild(el("p", { class: "erro-tipo" }, [
              el("strong", { text: t.erro_presente + ": " + e.nome + ". " }), explicacao
            ]));
            AP.ligarGlossario(explicacao);
          }
        });

        retorno.textContent = escolhida.correta ? t.feedback_acerto : t.feedback_erro;
        retorno.className = "aviso" + (escolhida.correta ? "" : " erro");
        retorno.hidden = false;

        var ultima = posicao === ordem.length - 1;
        var proximo = el("button", { type: "button", class: "botao", text: ultima ? t.ver_resumo : t.proxima });
        proximo.addEventListener("click", function () {
          if (ultima) mostrarResumo(); else { posicao++; mostrarQuestao(); }
        });
        seguir.appendChild(proximo);
      }

      if (posicao > 0) { titulo.scrollIntoView(); titulo.focus({ preventScroll: true }); }
    }

    function mostrarResumo() {
      topo();
      var titulo = el("h2", { tabindex: "-1", text: t.resumo_titulo });
      var codigos = Object.keys(escolhidos).sort(function (a, b) { return escolhidos[b] - escolhidos[a]; });
      var caixa = el("section", { class: "cartao" }, [
        titulo,
        el("p", {}, [el("span", { class: "placar", text: acertos + " " + t.de + " " + ordem.length }), " " + t.resumo_acertos])
      ]);
      if (codigos.length) {
        caixa.appendChild(el("p", { class: "meta", text: t.resumo_erros_titulo }));
        caixa.appendChild(el("ul", { class: "resumo-lista" }, codigos.map(function (c) {
          var e = erros[c] || { nome: c, explicacao: "" };
          var explicacao = el("span", { text: e.explicacao });
          var li = el("li", {}, [el("strong", { text: e.nome + " (" + escolhidos[c] + " " + t.vezes + "). " }), explicacao]);
          AP.ligarGlossario(explicacao);
          return li;
        })));
      } else {
        caixa.appendChild(el("p", { text: t.resumo_sem_erros }));
      }
      var de_novo = el("button", { type: "button", class: "botao", text: t.recomecar });
      de_novo.addEventListener("click", recomecar);
      var imprimir = el("button", { type: "button", class: "botao secundario", text: t.imprimir });
      imprimir.addEventListener("click", function () { window.print(); });
      caixa.appendChild(el("div", { class: "acoes nao-imprimir" }, [de_novo, imprimir]));
      principal.appendChild(caixa);
      titulo.scrollIntoView(); titulo.focus({ preventScroll: true });
    }

    recomecar();
  }

  // Lista os casos publicados que têm questões de escores (para entrar no modo caso).
  function linksDeCasos(t) {
    return AP.carregarIndiceCasos().then(function (casos) {
      return Promise.all(casos.map(function (c) {
        return AP.carregarCaso(c.id).then(function (caso) {
          return caso.resultados && (caso.resultados.questoes || []).length ? c : null;
        }).catch(function () { return null; });
      }));
    }).then(function (casos) {
      casos = casos.filter(Boolean);
      if (!casos.length) return null;
      return el("p", { class: "meta nao-imprimir" }, [t.casos_titulo + ": "].concat(casos.map(function (c, i) {
        return el("span", {}, [i ? ", " : "", el("a", { href: "?caso=" + encodeURIComponent(c.id), text: c.titulo })]);
      })));
    }).catch(function () { return null; });
  }

  AP.iniciarPagina("escores").then(function (site) {
    return AP.carregarJSON("dados/escores.json").then(function (dados) {
      var t = dados.textos;
      var idCaso = AP.parametroCaso();
      var instrucao = el("p", { class: "instrucao", text: t.instrucao });
      var ficticio = el("p", { class: "meta", text: t.aviso_ficticio });

      if (idCaso) {
        return AP.carregarCaso(idCaso).then(function (caso) {
          var cabecalho = [
            AP.avisoRevisao(caso, site), instrucao,
            el("p", { class: "meta" }, [t.modo_caso + ": " + caso.titulo + ". ", el("a", { href: location.pathname, text: t.modo_livre })]),
            ficticio
          ];
          var bloco = caso.resultados;
          var itens = bloco ? listarQuestoes([bloco]) : [];
          if (!itens.length) {
            principal.textContent = "";
            cabecalho.forEach(function (no) { if (no) principal.appendChild(no); });
            principal.appendChild(el("p", { class: "aviso", text: t.sem_questoes }));
            return;
          }
          iniciar(site, dados, itens, cabecalho);
        });
      }
      return linksDeCasos(t).then(function (links) {
        iniciar(site, dados, listarQuestoes(dados.perfis), [AP.avisoRevisao(dados, site), instrucao, ficticio, links]);
      });
    });
  }).catch(function (erro) { AP.mostrarErro(principal, erro); });
})();
