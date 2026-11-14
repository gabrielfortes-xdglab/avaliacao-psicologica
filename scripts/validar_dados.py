#!/usr/bin/env python3
"""Confere todos os JSON de dados/ contra o esquema do projeto.

Uso:  python scripts/validar_dados.py
Sai com código 1 se houver erro. Só usa a biblioteca padrão.
Regras dos casos: docs/esquema-caso.md.
"""
import json
import math
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DADOS = RAIZ / "dados"

CONTEXTOS = {"clinico", "escolar", "organizacional", "transito", "forense", "saude"}
FAIXAS = {"crianca", "adolescente", "adulto", "idoso"}
ETAPAS = {"demanda", "planejamento", "anamnese", "resultados", "integracao", "laudo"}
TIPOS_PROCEDIMENTO = {"entrevista", "observacao", "instrumento", "fonte_complementar"}
TIPOS_PERGUNTA = {"aberta", "fechada", "indutiva"}
ERROS_ESCORE = {
    "percentil_como_acerto", "ignora_erro_medida", "limitrofe_como_diagnostico",
    "metricas_diferentes", "construto_nao_medido", "inferencia_causal",
}
ERROS_LAUDO = {
    "conclusao_sem_base", "instrumento_inadequado", "linguagem_determinista",
    "rotulo_sem_descricao", "quebra_de_sigilo", "informacao_desnecessaria",
    "sem_limites", "estrutura_fora_da_norma",
}
STATUS_FERRAMENTA = {"no_ar", "em_desenvolvimento"}
MAX_PERGUNTAS = 15
ID_VALIDO = re.compile(r"^[a-z0-9-]+$")
METRICA = re.compile(r"média\s+(-?\d+(?:[.,]\d+)?).*?desvio padrão\s+(\d+(?:[.,]\d+)?)", re.I | re.S)

erros = []
avisos = []


class Conferidor:
    """Acumula erros com o nome do arquivo na frente."""

    def __init__(self, arquivo):
        self.arquivo = arquivo

    def erro(self, onde, msg):
        erros.append("%s: %s: %s" % (self.arquivo, onde, msg))

    def aviso(self, onde, msg):
        avisos.append("%s: %s: %s" % (self.arquivo, onde, msg))

    def campos(self, obj, onde, obrigatorios):
        """Confere presença e tipo. obrigatorios = {nome: tipo ou tupla de tipos}."""
        if not isinstance(obj, dict):
            self.erro(onde, "deveria ser um objeto")
            return False
        ok = True
        for nome, tipo in obrigatorios.items():
            if nome not in obj:
                self.erro(onde, "falta o campo '%s'" % nome)
                ok = False
            elif not isinstance(obj[nome], tipo) or (isinstance(obj[nome], bool) and tipo in (int, float, (int, float))):
                self.erro(onde, "campo '%s' com tipo errado" % nome)
                ok = False
        return ok

    def texto_preenchido(self, obj, onde, nomes):
        for nome in nomes:
            if isinstance(obj.get(nome), str) and not obj[nome].strip():
                self.erro(onde, "campo '%s' está vazio" % nome)

    def ids_unicos(self, lista, onde):
        """Devolve o conjunto de ids e acusa repetidos."""
        vistos = set()
        for i, item in enumerate(lista):
            ident = item.get("id") if isinstance(item, dict) else None
            if not isinstance(ident, str) or not ident:
                self.erro("%s[%d]" % (onde, i), "falta 'id'")
            elif ident in vistos:
                self.erro(onde, "id repetido: '%s'" % ident)
            else:
                vistos.add(ident)
        return vistos

    def referencias(self, refs, validos, onde, o_que):
        for r in refs:
            if r not in validos:
                self.erro(onde, "%s inexistente: '%s'" % (o_que, r))


def ler(caminho):
    rel = str(caminho.relative_to(RAIZ))
    try:
        with open(caminho, encoding="utf-8") as f:
            return json.load(f), Conferidor(rel)
    except FileNotFoundError:
        erros.append("%s: arquivo não encontrado" % rel)
    except json.JSONDecodeError as e:
        erros.append("%s: JSON inválido (%s)" % (rel, e))
    return None, Conferidor(rel)


NUM = (int, float)


# ---------------------------------------------------------------- site.json
def validar_site():
    d, c = ler(DADOS / "site.json")
    if d is None:
        return
    if not c.campos(d, "raiz", {
        "titulo_aba": str, "eyebrow": str, "titulo": str, "subtitulo": str,
        "rodape": list, "textos": dict, "rotulos_status": dict, "grupos": list,
    }):
        return
    c.campos(d["textos"], "textos", {"abrir": str, "voltar": str, "em_revisao": str})
    for s in STATUS_FERRAMENTA:
        if s not in d["rotulos_status"]:
            c.erro("rotulos_status", "falta o rótulo de '%s'" % s)
    c.ids_unicos(d["grupos"], "grupos")
    todas = []
    for g in d["grupos"]:
        onde = "grupos.%s" % g.get("id")
        if not c.campos(g, onde, {"id": str, "nome": str, "descricao": str, "ferramentas": list}):
            continue
        todas.extend(g["ferramentas"])
        for f in g["ferramentas"]:
            ondef = "ferramenta %s" % (f.get("id") if isinstance(f, dict) else "?")
            if not c.campos(f, ondef, {"id": str, "nome": str, "descricao": str, "pagina": str, "status": str}):
                continue
            if f["status"] not in STATUS_FERRAMENTA:
                c.erro(ondef, "status desconhecido: '%s'" % f["status"])
            if f["status"] == "no_ar" and not (RAIZ / f["pagina"]).is_file():
                c.erro(ondef, "está 'no_ar' mas a página %s não existe" % f["pagina"])
    c.ids_unicos(todas, "ferramentas")


# ------------------------------------------------------------ glossario.json
def validar_glossario():
    d, c = ler(DADOS / "glossario.json")
    if d is None or not c.campos(d, "raiz", {"termos": list, "textos": dict}):
        return set()
    c.campos(d["textos"], "textos", {k: str for k in (
        "instrucao", "buscar", "contagem", "nenhum", "decisao", "erro",
        "relacionados", "imprimir", "ver_no_glossario")})
    if d.get("revisado_por") is None:
        c.aviso("raiz", "sem revisor: a página mostra 'em revisão'")
    ids = c.ids_unicos(d["termos"], "termos")
    formas = {}
    for t in d["termos"]:
        onde = "termo %s" % t.get("id")
        if c.campos(t, onde, {
            "id": str, "termo": str, "definicao": str,
            "decisao_que_depende": str, "erro_comum": str, "relacionados": list,
        }):
            c.texto_preenchido(t, onde, ["termo", "definicao", "decisao_que_depende", "erro_comum"])
            if not ID_VALIDO.match(t["id"]):
                c.erro(onde, "id só pode ter letras minúsculas, números e hífen")
            c.referencias(t["relacionados"], ids, onde, "termo relacionado")
            for f in t.get("formas", [t["termo"]]):
                if not isinstance(f, str) or not f.strip():
                    c.erro(onde, "forma vazia em 'formas'")
                elif f.lower() in formas:
                    c.erro(onde, "forma '%s' repetida (já usada em '%s')" % (f, formas[f.lower()]))
                else:
                    formas[f.lower()] = t["id"]
    return ids


# -------------------------------------------------------------- escores.json
def validar_escores(ids_glossario):
    d, c = ler(DADOS / "escores.json")
    if d is None or not c.campos(d, "raiz", {"textos": dict, "erros_tipicos": dict, "perfis": list}):
        return
    if d.get("revisado_por") is None:
        c.aviso("raiz", "sem revisor: a página mostra 'em revisão'")
    for cod in sorted(ERROS_ESCORE):
        e = d["erros_tipicos"].get(cod)
        if e is None:
            c.erro("erros_tipicos", "falta o código '%s'" % cod)
        elif c.campos(e, "erros_tipicos.%s" % cod, {"nome": str, "explicacao": str}):
            if e.get("termo") is not None and e["termo"] not in ids_glossario:
                c.erro("erros_tipicos.%s" % cod, "termo do glossário inexistente: '%s'" % e["termo"])
    c.ids_unicos(d["perfis"], "perfis")
    total, usados = 0, set()
    for pf in d["perfis"]:
        pref = "perfil %s" % (pf.get("id") if isinstance(pf, dict) else "?")
        if c.campos(pf, pref, {"id": str, "descricao": str, "instrumentos": list, "questoes": list}):
            validar_resultados(c, pf, pref)
            total += len(pf["questoes"])
            for q in pf["questoes"]:
                for a in q.get("alternativas", []) if isinstance(q, dict) else []:
                    if isinstance(a, dict) and a.get("erro_tipico"):
                        usados.add(a["erro_tipico"])
    for cod in sorted(ERROS_ESCORE - usados):
        c.aviso("perfis", "nenhuma alternativa cobre o erro '%s'" % cod)
    print("escores.json: %d questões no modo livre." % total)


# ----------------------------------------------------------- construtos.json
def validar_construtos():
    d, c = ler(DADOS / "construtos.json")
    if d is None or not c.campos(d, "raiz", {"construtos": list}):
        return
    c.ids_unicos(d["construtos"], "construtos")
    for k in d["construtos"]:
        onde = "construto %s" % k.get("id")
        if c.campos(k, onde, {
            "id": str, "nome": str, "o_que_se_avalia": str, "tipos_de_fonte": list,
            "cuidados": list, "erros_de_inferencia": list, "faixas_etarias": list,
            "chave_satepsi": str,
        }):
            c.referencias(k["faixas_etarias"], FAIXAS, onde, "faixa etária")
            if k["o_que_se_avalia"].strip().lower() == "a preencher":
                c.aviso(onde, "conteúdo ainda 'A preencher'")


# ----------------------------------------------------------- documentos.json
def validar_documentos():
    d, c = ler(DADOS / "documentos.json")
    if d is None or not c.campos(d, "raiz", {
        "norma_base": dict, "documentos": list, "frases": list, "checklist": list,
    }):
        return
    if d["norma_base"].get("a_confirmar"):
        c.aviso("norma_base", "norma ainda a confirmar no texto oficial do CFP")
    c.ids_unicos(d["documentos"], "documentos")
    for doc in d["documentos"]:
        onde = "documento %s" % doc.get("id")
        if c.campos(doc, onde, {
            "id": str, "nome": str, "finalidade": str, "estrutura": list,
            "quando_usar": str, "exemplos": list,
        }) and doc.get("a_confirmar"):
            c.aviso(onde, "conteúdo normativo a confirmar")


# -------------------------------------------------------------- satepsi.json
def validar_satepsi():
    d, c = ler(DADOS / "satepsi.json")
    if d is None:
        return
    if c.campos(d, "raiz", {"fonte": str, "testes": list}) and "atualizado_em" not in d:
        c.erro("raiz", "falta o campo 'atualizado_em' (pode ser null)")


# -------------------------------------------------------------------- casos
def validar_anamnese(c, a):
    if not c.campos(a, "anamnese", {"informante": str, "informacoes": list, "no_inicial": str, "nos": dict}):
        return
    infos = c.ids_unicos(a["informacoes"], "anamnese.informacoes")
    essenciais = set()
    for i in a["informacoes"]:
        if c.campos(i, "anamnese.informacoes.%s" % i.get("id"), {"id": str, "texto": str, "essencial": bool}):
            if i["essencial"]:
                essenciais.add(i["id"])
    nos = a["nos"]
    if a["no_inicial"] not in nos:
        c.erro("anamnese", "no_inicial '%s' não existe em nos" % a["no_inicial"])
        return
    estrutura_ok = True
    for nid, no in nos.items():
        onde = "anamnese.nos.%s" % nid
        if not c.campos(no, onde, {"fala": str, "opcoes": list}):
            estrutura_ok = False
            continue
        if not no["opcoes"]:
            c.erro(onde, "nó sem opções de pergunta")
        for j, op in enumerate(no["opcoes"]):
            ondeo = "%s.opcoes[%d]" % (onde, j)
            if not c.campos(op, ondeo, {"pergunta": str, "tipo": str, "revela": list, "vai_para": str}):
                estrutura_ok = False
                continue
            if op["tipo"] not in TIPOS_PERGUNTA:
                c.erro(ondeo, "tipo de pergunta desconhecido: '%s'" % op["tipo"])
            c.referencias(op["revela"], infos, ondeo, "informação")
            if op["vai_para"] != "fim" and op["vai_para"] not in nos:
                c.erro(ondeo, "vai_para aponta para nó inexistente: '%s'" % op["vai_para"])
                estrutura_ok = False
    if not estrutura_ok:
        return

    # Percorre a árvore: acusa ciclo, caminho longo demais, nó inalcançável
    # e informação essencial que nenhum caminho revela.
    alcancadas, visitados = set(), set()
    problema = {"ciclo": False, "longo": False}

    def andar(nid, caminho):
        if nid in caminho:
            problema["ciclo"] = True
            return
        if len(caminho) + 1 > MAX_PERGUNTAS:
            problema["longo"] = True
            return
        visitados.add(nid)
        for op in nos[nid]["opcoes"]:
            alcancadas.update(op["revela"])
            if op["vai_para"] != "fim":
                andar(op["vai_para"], caminho + [nid])

    andar(a["no_inicial"], [])
    if problema["ciclo"]:
        c.erro("anamnese", "há um ciclo entre nós (um caminho volta a um nó já visitado)")
    if problema["longo"]:
        c.erro("anamnese", "há caminho com mais de %d perguntas" % MAX_PERGUNTAS)
    for nid in sorted(set(nos) - visitados):
        c.erro("anamnese", "nó inalcançável: '%s'" % nid)
    for i in sorted(essenciais - alcancadas):
        c.erro("anamnese", "informação essencial '%s' não é revelada por nenhum caminho" % i)


def validar_resultados(c, r, pref):
    """Bloco de resultados (instrumentos e questões). Usado nos casos e em escores.json."""
    if c.campos(r, pref, {"instrumentos": list, "questoes": list}):
        medidas = []
        for k, inst in enumerate(r["instrumentos"]):
            onde = pref + ".instrumentos[%d]" % k
            if not c.campos(inst, onde, {"nome": str, "ficticio": bool, "construto": str, "metrica": str, "medidas": list}):
                continue
            if inst["ficticio"] is not True:
                c.erro(onde, "'ficticio' deve ser true (regra 1 do CLAUDE.md)")
            for m in inst["medidas"]:
                ondem = "%s.medidas.%s" % (onde, m.get("id") if isinstance(m, dict) else "?")
                if c.campos(m, ondem, {
                    "id": str, "rotulo": str, "bruto": NUM, "percentil": NUM,
                    "escore_padrao": NUM, "ic95": list, "faixa": str,
                }):
                    ic = m["ic95"]
                    if len(ic) != 2 or not all(isinstance(x, NUM) and not isinstance(x, bool) for x in ic) or ic[0] > ic[1]:
                        c.erro(ondem, "ic95 deve ter dois números em ordem crescente")
                    elif not ic[0] <= m["escore_padrao"] <= ic[1]:
                        c.erro(ondem, "escore_padrao fora do ic95")
                    if not 0 < m["percentil"] < 100:
                        c.erro(ondem, "percentil deve estar entre 0 e 100")
                    mt = METRICA.search(inst["metrica"])
                    if not mt:
                        c.aviso(onde, "métrica fora do formato '..., média M, desvio padrão D': a curva não aparece")
                    else:
                        media, dp = (float(x.replace(",", ".")) for x in mt.groups())
                        esperado = 50 * (1 + math.erf((m["escore_padrao"] - media) / dp / math.sqrt(2)))
                        if abs(esperado - m["percentil"]) > 3:
                            c.aviso(ondem, "percentil %s não combina com o escore (esperado perto de %d)" % (m["percentil"], round(esperado)))
                medidas.append(m)
        ids_medidas = c.ids_unicos([m for m in medidas if isinstance(m, dict)], pref + ".medidas")
        for k, q in enumerate(r["questoes"]):
            onde = pref + ".questoes[%d]" % k
            if not c.campos(q, onde, {"medida": str, "enunciado": str, "alternativas": list}):
                continue
            c.referencias([q["medida"]], ids_medidas, onde, "medida")
            if "comparar" in q:
                c.referencias([q["comparar"]], ids_medidas, onde, "medida em 'comparar'")
            corretas = 0
            for j, alt in enumerate(q["alternativas"]):
                ondea = "%s.alternativas[%d]" % (onde, j)
                if not c.campos(alt, ondea, {"texto": str, "correta": bool, "comentario": str}):
                    continue
                c.texto_preenchido(alt, ondea, ["texto", "comentario"])
                tipo = alt.get("erro_tipico")
                if alt["correta"]:
                    corretas += 1
                    if tipo is not None:
                        c.erro(ondea, "alternativa correta deve ter erro_tipico nulo")
                elif tipo not in ERROS_ESCORE:
                    c.erro(ondea, "erro_tipico desconhecido ou ausente: %r" % tipo)
            if corretas != 1:
                c.erro(onde, "deve ter exatamente uma alternativa correta (tem %d)" % corretas)


def validar_caso(caminho):
    d, c = ler(caminho)
    if d is None:
        return None
    if not c.campos(d, "cabeçalho", {
        "id": str, "titulo": str, "ficticio": bool, "contexto": str,
        "faixa_etaria": str, "versao": str, "atualizado_em": str, "etapas": list,
    }):
        return d
    if d["id"] != caminho.stem:
        c.erro("cabeçalho", "id '%s' diferente do nome do arquivo" % d["id"])
    if d["ficticio"] is not True:
        c.erro("cabeçalho", "'ficticio' deve ser true")
    if d["contexto"] not in CONTEXTOS:
        c.erro("cabeçalho", "contexto desconhecido: '%s'" % d["contexto"])
    if d["faixa_etaria"] not in FAIXAS:
        c.erro("cabeçalho", "faixa etária desconhecida: '%s'" % d["faixa_etaria"])
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", d["atualizado_em"]):
        c.erro("cabeçalho", "atualizado_em deve estar no formato AAAA-MM-DD")
    if "revisado_por" not in d:
        c.erro("cabeçalho", "falta o campo 'revisado_por' (pode ser null)")
    elif d["revisado_por"] is None:
        c.aviso("cabeçalho", "sem revisor: a página mostra 'em revisão'")
    c.referencias(d["etapas"], ETAPAS, "etapas", "etapa")
    for e in d["etapas"]:
        if e in ETAPAS and e not in d:
            c.erro("etapas", "etapa '%s' listada, mas o bloco não existe no caso" % e)

    if "demanda" not in d:
        c.erro("demanda", "bloco obrigatório ausente")
    elif c.campos(d["demanda"], "demanda", {"solicitante": str, "texto": str, "pergunta_de_avaliacao": str}):
        c.texto_preenchido(d["demanda"], "demanda", ["solicitante", "texto", "pergunta_de_avaliacao"])

    hip = set()
    if "hipoteses" in d:
        if isinstance(d["hipoteses"], list):
            hip = c.ids_unicos(d["hipoteses"], "hipoteses")
            for h in d["hipoteses"]:
                c.campos(h, "hipoteses.%s" % h.get("id"), {"id": str, "texto": str})
        else:
            c.erro("hipoteses", "deveria ser uma lista")

    if "planejamento" in d:
        p = d["planejamento"]
        if c.campos(p, "planejamento", {
            "limite_sessoes": NUM, "opcoes": list,
            "plano_referencia": list, "justificativa_referencia": str,
        }):
            ops = c.ids_unicos(p["opcoes"], "planejamento.opcoes")
            sessoes = {}
            for o in p["opcoes"]:
                onde = "planejamento.opcoes.%s" % o.get("id")
                if c.campos(o, onde, {
                    "id": str, "rotulo": str, "tipo": str, "sessoes": NUM,
                    "informa": list, "adequada": bool, "comentario": str,
                }):
                    if o["tipo"] not in TIPOS_PROCEDIMENTO:
                        c.erro(onde, "tipo de procedimento desconhecido: '%s'" % o["tipo"])
                    c.referencias(o["informa"], hip, onde, "hipótese")
                    c.texto_preenchido(o, onde, ["comentario"])
                    sessoes[o["id"]] = (o["sessoes"], o["adequada"])
            c.referencias(p["plano_referencia"], ops, "planejamento.plano_referencia", "opção")
            ref = [sessoes[i] for i in p["plano_referencia"] if i in sessoes]
            if sum(s for s, _ in ref) > p["limite_sessoes"]:
                c.erro("planejamento", "o plano de referência passa do limite de sessões")
            if any(not adequada for _, adequada in ref):
                c.erro("planejamento", "o plano de referência inclui opção marcada como inadequada")

    if "anamnese" in d:
        validar_anamnese(c, d["anamnese"])

    if "resultados" in d:
        validar_resultados(c, d["resultados"], "resultados")

    if "integracao" in d:
        g = d["integracao"]
        if c.campos(g, "integracao", {
            "fontes": list, "convergencias": list, "divergencias": list,
            "conclusao_referencia": str, "limites": str,
        }):
            fontes = c.ids_unicos(g["fontes"], "integracao.fontes")
            for f in g["fontes"]:
                c.campos(f, "integracao.fontes.%s" % f.get("id"), {"id": str, "origem": str, "achado": str})
            for bloco in ("convergencias", "divergencias"):
                for k, item in enumerate(g[bloco]):
                    onde = "integracao.%s[%d]" % (bloco, k)
                    if c.campos(item, onde, {"fontes": list, "hipotese": str, "comentario": str}):
                        c.referencias(item["fontes"], fontes, onde, "fonte")
                        c.referencias([item["hipotese"]], hip, onde, "hipótese")

    if "laudo" in d:
        l = d["laudo"]
        if c.campos(l, "laudo", {"secoes": list}):
            paragrafos = []
            for k, s in enumerate(l["secoes"]):
                onde = "laudo.secoes[%d]" % k
                if c.campos(s, onde, {"titulo": str, "paragrafos": list}):
                    paragrafos.extend(s["paragrafos"])
            c.ids_unicos(paragrafos, "laudo.paragrafos")
            for p in paragrafos:
                onde = "laudo.paragrafo %s" % (p.get("id") if isinstance(p, dict) else "?")
                if not c.campos(p, onde, {"id": str, "texto": str}):
                    continue
                if "erro" not in p:
                    c.erro(onde, "falta o campo 'erro' (null no parágrafo adequado)")
                elif p["erro"] is not None:
                    if c.campos(p["erro"], onde + ".erro", {"tipo": str, "explicacao": str, "correcao": str}):
                        if p["erro"]["tipo"] not in ERROS_LAUDO:
                            c.erro(onde, "tipo de erro desconhecido: '%s'" % p["erro"]["tipo"])
                        c.texto_preenchido(p["erro"], onde + ".erro", ["explicacao", "correcao"])

    if "trajetoria_referencia" in d:
        if isinstance(d["trajetoria_referencia"], list):
            for k, t in enumerate(d["trajetoria_referencia"]):
                onde = "trajetoria_referencia[%d]" % k
                if c.campos(t, onde, {"etapa": str, "hipotese": str}):
                    c.referencias([t["etapa"]], set(d["etapas"]), onde, "etapa")
        else:
            c.erro("trajetoria_referencia", "deveria ser uma lista")
    return d


def validar_casos():
    pasta = DADOS / "casos"
    arquivos = sorted(p for p in pasta.glob("*.json") if p.name != "indice.json")
    casos = {}
    for caminho in arquivos:
        if not ID_VALIDO.match(caminho.stem):
            erros.append("%s: nome de arquivo só pode ter letras minúsculas, números e hífen" % caminho.name)
        d = validar_caso(caminho)
        if d is not None:
            casos[caminho.stem] = d

    d, c = ler(pasta / "indice.json")
    if d is None or not c.campos(d, "raiz", {"casos": list}):
        return len(arquivos)
    c.ids_unicos(d["casos"], "casos")
    for item in d["casos"]:
        if not isinstance(item, dict) or "id" not in item:
            continue
        onde = "caso %s" % item["id"]
        if item["id"] not in casos:
            c.erro(onde, "listado no índice, mas dados/casos/%s.json não existe ou é inválido" % item["id"])
            continue
        if item["id"] == "caso-modelo":
            c.erro(onde, "o caso-modelo não deve ser publicado")
        if c.campos(item, onde, {"id": str, "titulo": str, "contexto": str, "faixa_etaria": str}):
            for campo in ("titulo", "contexto", "faixa_etaria"):
                if item[campo] != casos[item["id"]].get(campo):
                    c.erro(onde, "'%s' no índice difere do arquivo do caso" % campo)
    return len(arquivos)


def main():
    validar_site()
    ids_glossario = validar_glossario()
    validar_escores(ids_glossario or set())
    validar_construtos()
    validar_documentos()
    validar_satepsi()
    n_casos = validar_casos()

    for a in avisos:
        print("aviso  " + a)
    for e in erros:
        print("ERRO   " + e)
    print()
    print("%d caso(s) conferido(s), %d erro(s), %d aviso(s)." % (n_casos, len(erros), len(avisos)))
    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main())
