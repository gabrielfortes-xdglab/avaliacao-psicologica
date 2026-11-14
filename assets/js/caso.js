/* Caso progressivo.
   Percorre caso.etapas. Ao fim de cada etapa o estudante escreve a hipótese atual.
   No final, as hipóteses aparecem ao lado da trajetória de referência.
   O texto digitado fica só na memória da página: nada é enviado nem salvo. */
(function () {
  "use strict";
  var el = AP.el, S = AP.sim;

  function montar(area, caso, textos) {
    var t = textos.caso, c = textos.comum;
    var etapas = caso.etapas;
    var registros = [];
    var pos = 0;

    area.appendChild(el("p", { class: "instrucao nao-imprimir", text: t.instrucao }));
    area.appendChild(el("p", { class: "meta nao-imprimir", text: t.privacidade }));
    var palco = el("div", { class: "area" });
    area.appendChild(palco);

    function nomeEtapa(e) { return t.etapas[e] || e; }

    function hipotesePorId(id) {
      var achada = (caso.hipoteses || []).filter(function (h) { return h.id === id; })[0];
      return achada ? achada.texto : id;
    }

    function conteudoEtapa(etapa, destino, pronto) {
      if (etapa === "demanda") {
        destino.appendChild(S.blocoDemanda(caso, c));
      } else if (etapa === "planejamento") {
        return S.planejamento(destino, caso, textos, pronto);
      } else if (etapa === "anamnese") {
        return S.anamnese(destino, caso, textos, pronto);
      } else if (etapa === "resultados") {
        var temQuestoes = (caso.resultados.questoes || []).length;
        destino.appendChild(el("section", { class: "cartao" }, [
          el("h2", { text: nomeEtapa(etapa) }),
          S.tabelasResultados(caso.resultados, c),
          temQuestoes ? el("p", { class: "nao-imprimir" }, el("a", {
            href: AP.url("ferramentas/escores.html?caso=" + encodeURIComponent(caso.id)),
            target: "_blank", rel: "noopener", text: t.treinar_escores
          })) : null
        ]));
      } else if (etapa === "integracao") {
        destino.appendChild(el("section", { class: "cartao" }, [
          el("h2", { text: t.fontes_titulo }),
          el("ul", { class: "resumo-lista" }, caso.integracao.fontes.map(function (f) {
            return el("li", {}, [el("strong", { text: f.origem + ". " }), f.achado]);
          }))
        ]));
      } else if (etapa === "laudo") {
        destino.appendChild(el("section", { class: "cartao" }, caso.laudo.secoes.map(function (s) {
          return el("div", {}, [el("h2", { text: s.titulo })].concat(s.paragrafos.map(function (p) { return el("p", { text: p.texto }); })));
        })));
      }
      pronto();
    }

    function mostrarEtapa() {
      palco.textContent = "";
      var etapa = etapas[pos];
      var cabecalho = el("p", { class: "progresso", text: t.etapa + " " + (pos + 1) + " " + t.de + " " + etapas.length + ": " + nomeEtapa(etapa) });
      palco.appendChild(cabecalho);
      palco.appendChild(el("p", { class: "instrucao", text: t.instrucoes_etapa[etapa] || "" }));
      var destino = el("div", { class: "area" });
      palco.appendChild(destino);

      var campo = el("textarea", { id: "hipotese", rows: "4" });
      var aviso = el("p", { class: "aviso erro", role: "alert", hidden: "" });
      var ultima = pos === etapas.length - 1;
      var seguir = el("button", { type: "button", class: "botao", text: ultima ? t.concluir : t.avancar });
      var cartao = el("section", { class: "cartao hipotese-cartao", hidden: "" }, [
        el("h2", { text: t.hipotese_titulo }),
        el("label", { for: "hipotese", text: t.hipotese_rotulo }),
        campo, aviso, el("div", { class: "acoes" }, seguir)
      ]);
      palco.appendChild(cartao);

      seguir.addEventListener("click", function () {
        var texto = campo.value.trim();
        if (!texto) { aviso.textContent = t.hipotese_vazia; aviso.hidden = false; campo.focus(); return; }
        registros[pos] = texto;
        pos++;
        if (pos < etapas.length) mostrarEtapa(); else mostrarFinal();
      });

      conteudoEtapa(etapa, destino, function () { cartao.hidden = false; });
      if (pos > 0 && etapa !== "planejamento" && etapa !== "anamnese") S.irPara(cabecalho);
      else if (pos > 0) S.irPara(cabecalho);
    }

    function mostrarFinal() {
      palco.textContent = "";
      var titulo = el("h2", { text: t.final_titulo });
      var referencia = {};
      (caso.trajetoria_referencia || []).forEach(function (r) { referencia[r.etapa] = r.hipotese; });

      palco.appendChild(S.blocoDemanda(caso, c));
      palco.appendChild(el("section", { class: "cartao" }, [
        titulo,
        el("p", { class: "meta", text: t.final_instrucao }),
        el("ol", { class: "linha-tempo" }, etapas.map(function (e, i) {
          return el("li", {}, [
            el("h3", { text: (i + 1) + ". " + nomeEtapa(e) }),
            el("div", { class: "lado-a-lado" }, [
              el("div", { class: "sua" }, [el("span", { class: "quem", text: t.sua_hipotese }), el("p", { class: "texto-livre", text: registros[i] })]),
              el("div", { class: "ref" }, [el("span", { class: "quem", text: t.referencia }), el("p", { text: referencia[e] || t.sem_referencia })])
            ])
          ]);
        }))
      ]));

      var g = caso.integracao;
      if (g) {
        var origem = {};
        g.fontes.forEach(function (f) { origem[f.id] = f.origem; });
        var bloco = function (rotulo, lista) {
          if (!lista.length) return null;
          return el("div", {}, [
            el("h3", { class: "grupo-comparacao", text: rotulo }),
            el("ul", { class: "resumo-lista" }, lista.map(function (item) {
              return el("li", {}, [
                el("strong", { text: hipotesePorId(item.hipotese) + ". " }),
                el("span", { class: "meta", text: item.fontes.map(function (id) { return origem[id] || id; }).join(" + ") + ". " }),
                item.comentario
              ]);
            }))
          ]);
        };
        palco.appendChild(el("section", { class: "cartao" }, [
          el("h2", { text: t.integracao_titulo }),
          bloco(t.convergencias, g.convergencias),
          bloco(t.divergencias, g.divergencias),
          el("h3", { class: "grupo-comparacao", text: t.conclusao }),
          S.ligar(el("p", { text: g.conclusao_referencia })),
          el("h3", { class: "grupo-comparacao", text: t.limites }),
          el("p", { text: g.limites })
        ]));
      }

      palco.appendChild(el("p", { class: "aviso", text: t.nota_supervisao }));
      var denovo = el("button", { type: "button", class: "botao secundario", text: c.recomecar });
      denovo.addEventListener("click", function () { registros = []; pos = 0; mostrarEtapa(); S.irPara(palco); });
      var imprimir = S.botaoImprimir(c);
      imprimir.className = "botao";
      palco.appendChild(el("div", { class: "acoes nao-imprimir" }, [imprimir, denovo]));
      S.irPara(titulo);
    }

    mostrarEtapa();
  }

  S.iniciar("caso", ["etapas", "demanda", "trajetoria_referencia"], montar);
})();
