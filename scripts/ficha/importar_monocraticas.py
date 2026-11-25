#!/usr/bin/env python3
"""Importa para a ficha (acervo/operacional.json) a planilha de controle das monocráticas do gabinete (Monocraticas_AAAA-MM-DD.xlsx).

Cada linha vira, no registro do processo: destino Monocrática; responsável e revisor; minutado em; tipo de ato; assinatura;
observações; prazo e entrada (Controles especiais · Monocrática). Decisão de tutela ou de efeito suspensivo também registra a
urgência. Só preenche campo vazio: o que já está na ficha não é sobrescrito. Processos fora do operacional ganham registro novo.
Uso: python3 scripts/ficha/importar_monocraticas.py PLANILHA.xlsx [--enviada-minutado] [--gravar]
  --enviada-minutado  as “prontas para assinatura” recebem a data da minuta como data de envio (marcada [VALIDAR])
  sem --gravar, só mostra o que mudaria."""
import json, re, sys, pathlib, datetime, openpyxl
R = pathlib.Path(__file__).resolve().parents[2]
arq = [a for a in sys.argv[1:] if not a.startswith('--')][0]
GRAVAR, ENVIADA = '--gravar' in sys.argv, '--enviada-minutado' in sys.argv
dg = lambda s: re.sub(r'\D', '', str(s or ''))
def iso(v):
    if isinstance(v, (datetime.date, datetime.datetime)): return v.strftime('%Y-%m-%d')
    m = re.match(r'^\s*(\d{1,2})/(\d{1,2})/(\d{4})', str(v or '')); return f'{m[3]}-{int(m[2]):02d}-{int(m[1]):02d}' if m else ''
br = lambda d: f'{d[8:10]}/{d[5:7]}/{d[0:4]}' if d else ''
fmt = lambda d: f'{d[:7]}-{d[7:9]}.{d[9:13]}.{d[13]}.{d[14:16]}.{d[16:]}' if len(d) == 20 else d
nome = re.search(r'(\d{4}-\d{2}-\d{2})', pathlib.Path(arq).name); ORIGEM = 'Planilha de monocráticas' + (f' de {br(nome[1])}' if nome else '')
EQUIPE = {m['nome'].upper(): m['nome'] for m in json.loads((R / 'apoio/equipe.json').read_text())['registros'] if m.get('nome')}
pessoa = lambda v: EQUIPE.get(str(v or '').strip().upper(), str(v or '').strip().title())
ATO = {'Decisão monocrática terminativa': 'Decisão monocrática (art. 932)', 'Tutela de Urgência': 'Decisão de urgência', 'Negar provimento': 'Decisão monocrática (art. 932)'}
ws = openpyxl.load_workbook(arq, data_only=True).worksheets[0]; L = list(ws.iter_rows(values_only=True)); H = [str(h).strip() for h in L[0]]
linhas = [dict(zip(H, r)) for r in L[1:] if any(r)]
P = R / 'acervo/operacional.json'; doc = json.loads(P.read_text(encoding='utf-8')); I = {dg(r['processo']): r for r in doc['registros']}
hoje = datetime.date.today().isoformat(); novos, mud, avisos = 0, {}, []
# medida da urgência pelo conjunto das linhas do processo (a planilha pode trazer a tutela e a decisão em linhas separadas)
SUSP = {dg(x.get('CNJ')) for x in linhas if 'suspens' in (str(x.get('Observações do responsável') or '') + ' ' + str(x.get('Observações') or '')).lower()}
def poe(r, sec, k, v, cnj):
    v = str(v or '').strip()
    if not v: return
    r.setdefault(sec, {})
    if str(r[sec].get(k) or '').strip(): return  # não sobrescreve o que já está na ficha
    r[sec][k] = v; mud.setdefault(cnj, []).append(f'{sec}.{k}')
def junta(r, sec, k, v, cnj):
    v = str(v or '').strip()
    if not v: return
    a = str(r.setdefault(sec, {}).get(k) or '').strip()
    if v in a: return
    r[sec][k] = (a + '\n' if a else '') + v; mud.setdefault(cnj, []).append(f'{sec}.{k}')
for x in linhas:
    d = dg(x.get('CNJ'))
    if len(d) != 20: avisos.append(f'linha sem CNJ válido: {x.get("CNJ")}'); continue
    cnj = fmt(d); r = I.get(d)
    if not r:
        r = {'processo': cnj, 'origem': {}, 'triagem': {}, 'producao': {}, 'pauta': {'sessoes': []}, 'controles': {}}
        doc['registros'].append(r); I[d] = r; novos += 1
    tipo, andam = str(x.get('Tipo de decisão') or '').strip(), str(x.get('Andamento') or '').strip()
    obsr, obs = str(x.get('Observações do responsável') or '').strip(), str(x.get('Observações') or '').strip()
    min_, ass, ent, prz = iso(x.get('Minutado em')), iso(x.get('Data da assinatura')), iso(x.get('Entrada')), iso(x.get('Prazo'))
    poe(r, 'producao', 'Destino', 'Monocrática', cnj)
    poe(r, 'controles', 'Monocrática - Registrada em', ent, cnj); poe(r, 'controles', 'Monocrática - Prazo', prz, cnj)
    poe(r, 'producao', 'SERVIDOR', pessoa(x.get('Responsável')) if x.get('Responsável') else '', cnj)
    poe(r, 'producao', 'CORRETOR', pessoa(x.get('Revisor')) if x.get('Revisor') else '', cnj)
    poe(r, 'producao', 'MINUTADO', min_, cnj); poe(r, 'producao', 'Data da Revisão', iso(x.get('Revisada em')), cnj)
    poe(r, 'producao', 'Mono - Tipo de ato', ATO.get(tipo, tipo), cnj)
    if tipo == 'Negar provimento': poe(r, 'producao', 'Voto - Resultado', 'Desprovido', cnj)
    if andam == 'Assinada':
        poe(r, 'producao', 'Assinado', 'Sim', cnj); poe(r, 'producao', 'Data da Assinatura', ass, cnj)
        if ass and ass > hoje: junta(r, 'controles', 'Monocrática - Observação', f'[VALIDAR] data da assinatura {br(ass)} (posterior a hoje, na planilha)', cnj)
    elif andam == 'Pronta para assinatura' and ENVIADA and min_:
        poe(r, 'producao', 'Data da Liberação', min_, cnj)
        junta(r, 'controles', 'Monocrática - Observação', f'[VALIDAR] enviada para assinatura em {br(min_)}: a planilha não traz a data de envio; usada a data da minuta', cnj)
    junta(r, 'controles', 'Monocrática - Observação', obsr, cnj); junta(r, 'producao', 'Mono - Fundamento', obs, cnj)
    if str(x.get('Assessoria') or '').strip().lower() == 'sim': junta(r, 'controles', 'Monocrática - Observação', 'Assessoria', cnj)
    # decisão de tutela ou de efeito suspensivo: também a urgência (Controles especiais · Urgência)
    txt = (obsr + ' ' + obs).lower()
    if tipo == 'Tutela de Urgência' or 'efeito suspens' in txt:
        poe(r, 'triagem', 'Urgência', 'Efeito suspensivo' if d in SUSP else 'Tutela de urgência', cnj)
        poe(r, 'triagem', 'Urgência - Nível', x.get('Nível de urgência'), cnj); poe(r, 'triagem', 'Urgência - Data', ent, cnj)
        if andam == 'Assinada':
            ap = 'Apreciada · deferida' if re.search(r'concess|defer', txt) else 'Apreciada · indeferida' if re.search(r'indefer', txt) else ''
            poe(r, 'triagem', 'Urgência - Apreciação', ap, cnj); poe(r, 'triagem', 'Urgência - Apreciada em', ass, cnj)
    if cnj in mud:
        r['controles']['Monocrática - Atualizado por'] = ORIGEM; r['controles']['Monocrática - Atualizado em'] = hoje
        r.setdefault('origem', {})['atualizado_em'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
doc['registros'].sort(key=lambda r: str(r['processo'])); doc['atualizado_em'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
print(f'{len(linhas)} linhas · {len(mud)} processos com campos novos · {novos} registros novos · {sum(len(v) for v in mud.values())} campos')
for a in avisos: print('aviso:', a)
if GRAVAR: P.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + '\n', encoding='utf-8'); print('gravado em', P)
