/* Laudo com erros.
   Usa caso.laudo. Parágrafos com "erro" preenchido são os problemas plantados.
   O estudante marca os parágrafos problemáticos, classifica o tipo e vê o gabarito comentado. */
(function () {
  "use strict";
  var el = AP.el, S = AP.sim;

  function montar(area, caso, textos) {
    var t = textos.laudo, c = textos.comum, laudo = caso.laudo;
    var codigos = Object.keys(t.tipos);
    function nomeTipo(cod) { return t.tipos[cod] ? t.tipos[cod].nome : cod; }

    function telaMarcar() {
      area.textContent = "";
      area.appendChild(el("p", { class: "instrucao", text: t.instrucao }));
      if (laudo.nota) area.appendChild(el("p", { class: "meta", text: laudo.nota }));

      area.appendChild(el("details", { class: "cartao tipos-erro" }, [
        el("summary", { text: t.tipos_titulo }),
        el("dl", { class: "pares" }, [].concat.apply([], codigos.map(function (cod) {
          return [el("dt", { text: t.tipos[cod].nome }), el("dd", { text: t.tipos[cod].explicacao })];
        })))
      ]));

      var itens = [];
      var contador = el("p", { class: "contador", "aria-live": "polite" });
      var folha = el("section", { class: "cartao laudo-folha" });
      laudo.secoes.forEach(function (s) {
        folha.appendChild(el("h2", { text: s.titulo }));
        s.paragrafos.forEach(function (p) {
          var marca = el("input", { type: "checkbox", id: "marca-" + p.id });
          var tipo = el("select", { id: "tipo-" + p.id, "aria-label": t.escolha_tipo },
            [el("option", { value: "", text: t.sem_tipo })].concat(codigos.map(function (cod) {
              return el("option", { value: cod, text: t.tipos[cod].nome });
            })));
          var linhaTipo = el("div", { class: "linha-tipo", hidden: "" }, tipo);
          var bloco = el("div", { class: "paragrafo-laudo" }, [
            el("p", { class: "texto-laudo", text: p.texto }),
            el("label", { class: "marca", for: "marca-" + p.id }, [marca, el("span", { text: t.marcar })]),
            linhaTipo
          ]);
          marca.addEventListener("change", function () {
            linhaTipo.hidden = !marca.checked;
            bloco.classList.toggle("marcado", marca.checked);
            atualizar();
          });
          folha.appendChild(bloco);
          itens.push({ p: p, marca: marca, tipo: tipo });
        });
      });
      area.appendChild(folha);

      function atualizar() {
        contador.textContent = t.marcados + " " + itens.filter(function (i) { return i.marca.checked; }).length;
      }
      atualizar();

      var aviso = el("p", { class: "aviso erro", role: "alert", hidden: "" });
      var ver = el("button", { type: "button", class: "botao", text: t.ver_gabarito });
      ver.addEventListener("click", function () {
        var incompleto = itens.filter(function (i) { return i.marca.checked && !i.tipo.value; })[0];
        if (incompleto) {
          aviso.textContent = t.falta_tipo; aviso.hidden = false;
          incompleto.tipo.scrollIntoView({ block: "center" }); incompleto.tipo.focus({ preventScroll: true });
          return;
        }
        telaGabarito(itens.map(function (i) { return { p: i.p, marcado: i.marca.checked, tipo: i.tipo.value }; }));
      });
      area.appendChild(el("section", { class: "cartao" }, [contador, aviso, el("div", { class: "acoes" }, ver)]));
    }

    function telaGabarito(respostas) {
      area.textContent = "";
      var total = respostas.filter(function (r) { return r.p.erro; }).length;
      var acertos = respostas.filter(function (r) { return r.p.erro && r.marcado; }).length;
      var falsos = respostas.filter(function (r) { return !r.p.erro && r.marcado; }).length;
      var titulo = el("h2", { text: t.gabarito_titulo });
      var pl = t.placar;
      area.appendChild(el("section", { class: "cartao" }, [
        titulo,
        el("p", {}, [el("span", { class: "placar", text: acertos + " " + pl.de + " " + total }), " " + pl.acertos]),
        el("p", { class: "meta", text: pl.nao_percebidos + ": " + (total - acertos) + " · " + pl.falsos_alarmes + ": " + falsos }),
        el("p", { class: "meta", text: t.norma })
      ]));

      var porId = {};
      respostas.forEach(function (r) { porId[r.p.id] = r; });
      var folha = el("section", { class: "cartao laudo-folha" });
      laudo.secoes.forEach(function (s) {
        folha.appendChild(el("h2", { text: s.titulo }));
        s.paragrafos.forEach(function (p) {
          var r = porId[p.id], e = p.erro, estado;
          if (e && r.marcado) estado = r.tipo === e.tipo ? "acerto" : "acerto_tipo_diferente";
          else if (e) estado = "nao_percebido";
          else if (r.marcado) estado = "falso_alarme";
          else estado = "adequado";
          var bloco = el("div", { class: "paragrafo-laudo gab " + estado }, [
            el("span", { class: "veredito", text: t.rotulos[estado] }),
            el("p", { class: "texto-laudo", text: p.texto })
          ]);
          if (e) {
            var linhas = [];
            if (estado === "acerto_tipo_diferente") linhas.push(el("dt", { text: t.seu_tipo }), el("dd", { text: nomeTipo(r.tipo) }));
            linhas.push(el("dt", { text: t.tipo_gabarito }), el("dd", { text: nomeTipo(e.tipo) }));
            linhas.push(el("dt", { text: t.explicacao }), S.ligar(el("dd", { text: e.explicacao })));
            linhas.push(el("dt", { text: t.correcao }), el("dd", { text: e.correcao }));
            bloco.appendChild(el("dl", { class: "pares" }, linhas));
          } else if (estado === "falso_alarme") {
            bloco.appendChild(el("p", { class: "meta", text: t.seu_tipo + ": " + nomeTipo(r.tipo) + ". " + t.falso_alarme_texto }));
          }
          folha.appendChild(bloco);
        });
      });
      area.appendChild(folha);

      var refazer = el("button", { type: "button", class: "botao secundario", text: t.refazer });
      refazer.addEventListener("click", function () { telaMarcar(); S.irPara(area); });
      area.appendChild(el("div", { class: "acoes nao-imprimir" }, [refazer, S.botaoImprimir(c)]));
      S.irPara(titulo);
    }

    telaMarcar();
  }

  S.iniciar("laudo", ["laudo"], montar);
})();
