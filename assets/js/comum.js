/* Funções comuns a todas as páginas.
   Expõe o objeto global AP. Nenhuma requisição sai do próprio site. */
(function () {
  "use strict";

  // Raiz do site, calculada a partir do endereço deste arquivo (assets/js/comum.js).
  // Assim os caminhos funcionam tanto em index.html quanto em ferramentas/*.html.
  var raiz = new URL("../../", document.currentScript.src);

  function url(caminho) {
    return new URL(caminho, raiz).href;
  }

  // Cria um elemento. Texto sempre entra como texto, nunca como HTML.
  function el(tag, attrs, filhos) {
    var no = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "class") no.className = attrs[k];
      else if (k === "text") no.textContent = attrs[k];
      else no.setAttribute(k, attrs[k]);
    });
    [].concat(filhos || []).forEach(function (f) {
      if (f == null) return;
      no.appendChild(typeof f === "string" ? document.createTextNode(f) : f);
    });
    return no;
  }

  function carregarJSON(caminho) {
    return fetch(url(caminho)).then(function (r) {
      if (!r.ok) throw new Error("Não foi possível carregar " + caminho + " (" + r.status + ")");
      return r.json();
    });
  }

  var siteCache = null;
  function carregarSite() {
    if (!siteCache) siteCache = carregarJSON("dados/site.json");
    return siteCache;
  }

  // Lê ?caso=<id>. Aceita só letras, números e hífen, para o id virar nome de arquivo com segurança.
  function parametroCaso() {
    var id = new URLSearchParams(location.search).get("caso");
    return id && /^[a-z0-9-]+$/.test(id) ? id : null;
  }

  function carregarCaso(id) {
    return carregarJSON("dados/casos/" + id + ".json");
  }

  function carregarIndiceCasos() {
    return carregarJSON("dados/casos/indice.json").then(function (d) { return d.casos || []; });
  }

  function procurarFerramenta(site, id) {
    var achada = null;
    site.grupos.forEach(function (g) {
      g.ferramentas.forEach(function (f) { if (f.id === id) achada = f; });
    });
    return achada;
  }

  // Preenche <header id="cabecalho"> e <footer id="rodape">.
  // Sem idFerramenta: cabeçalho da página inicial. Com idFerramenta: título da ferramenta e link de volta.
  function iniciarPagina(idFerramenta) {
    return carregarSite().then(function (site) {
      var cab = document.getElementById("cabecalho");
      var rod = document.getElementById("rodape");
      var ferramenta = idFerramenta ? procurarFerramenta(site, idFerramenta) : null;

      if (cab) {
        cab.className = "top";
        cab.textContent = "";
        if (ferramenta) {
          cab.appendChild(el("a", { class: "voltar", href: url("index.html"), text: site.textos.voltar }));
          cab.appendChild(el("div", { class: "eyebrow", text: site.eyebrow }));
          cab.appendChild(el("h1", { text: ferramenta.nome }));
          cab.appendChild(el("p", { class: "subtitle", text: ferramenta.descricao }));
          document.title = ferramenta.nome + " | " + site.titulo_aba;
        } else {
          // Link para a página de entrada (Formação de Estágio), que fica em outro repositório.
          if (site.textos.formacao && site.textos.formacao_endereco) {
            cab.appendChild(el("a", { class: "voltar", href: url(site.textos.formacao_endereco), text: site.textos.formacao }));
          }
          cab.appendChild(el("div", { class: "eyebrow", text: site.eyebrow }));
          cab.appendChild(el("h1", { text: site.titulo }));
          cab.appendChild(el("p", { class: "subtitle", text: site.subtitulo }));
          document.title = site.titulo_aba;
        }
      }
      if (rod) {
        rod.className = "note";
        rod.textContent = "";
        site.rodape.forEach(function (linha) { rod.appendChild(el("p", { text: linha })); });
      }
      return site;
    });
  }

  // Aviso de caso ainda não revisado (regra 6 do CLAUDE.md). Devolve null se já houver revisor.
  function avisoRevisao(caso, site) {
    if (caso.revisado_por) return null;
    return el("p", { class: "aviso revisao", role: "note", text: site.textos.em_revisao });
  }

  function mostrarErro(destino, erro) {
    destino.textContent = "";
    destino.appendChild(el("p", {
      class: "aviso erro", role: "alert",
      text: "Erro ao carregar o conteúdo. Abra o site por um servidor (http://), não direto do arquivo. Detalhe: " + erro.message
    }));
  }

  window.AP = {
    raiz: raiz.href,
    url: url,
    el: el,
    carregarJSON: carregarJSON,
    carregarSite: carregarSite,
    parametroCaso: parametroCaso,
    carregarCaso: carregarCaso,
    carregarIndiceCasos: carregarIndiceCasos,
    iniciarPagina: iniciarPagina,
    avisoRevisao: avisoRevisao,
    mostrarErro: mostrarErro
  };
})();
