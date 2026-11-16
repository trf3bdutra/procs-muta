/* CMT · Calendário forense do gabinete: feriados, recesso e datas sem expediente, e a contagem de prazos processuais.
   Regras do calendário do Controle de Pauta (app Gabinete CMT): feriados nacionais e da Justiça Federal (Lei 5.010/66, art. 62),
   de MS, Carnaval, Semana Santa e Corpus Christi; recesso de 20/12 a 20/01 na contagem de prazos (CPC, art. 220);
   datas do calendário do gabinete marcadas “não conta para prazo”; suspensões informadas no processo.
   O expediente do gabinete fica em acervo/sessoes/calendario.json (expediente: diasSemana, semExpediente, nomes, tipos, semPrazo, recesso).
   Um só módulo para o CMT-monitor e a Ex Officio (scripts/ficha/embutir.py). */
(function () {
'use strict';
if (window.CMTForense && window.CMTForense.versao >= 1) return;
var p2 = function (n) { return ('0' + n).slice(-2); };
var iso = function (y, m, d) { return y + '-' + p2(m) + '-' + p2(d); };
var addD = function (s, n) { var d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
var dow = function (s) { return new Date(s + 'T12:00:00Z').getUTCDay(); };
var isoDe = function (v) { var s = String(v == null ? '' : v).trim(), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return s.slice(0, 10); m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + p2(m[2]) + '-' + p2(m[1]) : ''; };
function pascoa(y) {
  var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(y, mo, da);
}
var TIPOS = ['Feriado nacional', 'Feriado da Justiça Federal', 'Recesso forense', 'Feriado estadual', 'Feriado municipal', 'Ponto facultativo', 'Suspensão de expediente', 'Outro'];
/* tipos que, por padrão, não contam para prazo processual */
var SEM_PRAZO = { 'Feriado nacional': 1, 'Feriado da Justiça Federal': 1, 'Recesso forense': 1, 'Feriado estadual': 1, 'Feriado municipal': 1, 'Suspensão de expediente': 1 };
/* sugestão de datas sem expediente do ano (Justiça Federal em MS): a mesma do Controle de Pauta; “on” = marcada por padrão */
function sugestoes(y) {
  var e = pascoa(y), L = [], add = function (d, label, type, on) { L.push({ date: d, label: label, type: type, on: on !== false, semPrazo: !!SEM_PRAZO[type] }); };
  add(iso(y, 1, 1), 'Confraternização Universal', 'Feriado nacional');
  for (var d = iso(y, 1, 2); d <= iso(y, 1, 6); d = addD(d, 1)) add(d, 'Recesso forense (20/12 a 06/01)', 'Recesso forense');
  add(addD(e, -48), 'Carnaval (segunda-feira)', 'Feriado da Justiça Federal'); add(addD(e, -47), 'Carnaval (terça-feira)', 'Feriado da Justiça Federal'); add(addD(e, -46), 'Quarta-feira de Cinzas (até 14h)', 'Ponto facultativo', false);
  add(addD(e, -4), 'Semana Santa (quarta-feira)', 'Feriado da Justiça Federal'); add(addD(e, -3), 'Semana Santa (quinta-feira)', 'Feriado da Justiça Federal'); add(addD(e, -2), 'Sexta-feira da Paixão', 'Feriado nacional');
  add(iso(y, 4, 21), 'Tiradentes', 'Feriado nacional'); add(iso(y, 5, 1), 'Dia do Trabalho', 'Feriado nacional'); add(addD(e, 60), 'Corpus Christi', 'Ponto facultativo', false);
  add(iso(y, 8, 11), 'Dia da Justiça / criação dos cursos jurídicos', 'Feriado da Justiça Federal'); add(iso(y, 9, 7), 'Independência do Brasil', 'Feriado nacional');
  add(iso(y, 10, 11), 'Criação do Estado de Mato Grosso do Sul', 'Feriado estadual'); add(iso(y, 10, 12), 'Nossa Senhora Aparecida', 'Feriado nacional'); add(iso(y, 10, 28), 'Dia do Servidor Público', 'Ponto facultativo', false);
  add(iso(y, 11, 1), 'Dia de Todos os Santos', 'Feriado da Justiça Federal'); add(iso(y, 11, 2), 'Finados', 'Feriado nacional'); add(iso(y, 11, 15), 'Proclamação da República', 'Feriado nacional');
  add(iso(y, 11, 20), 'Dia Nacional de Zumbi e da Consciência Negra', 'Feriado nacional'); add(iso(y, 12, 8), 'Dia da Justiça', 'Feriado da Justiça Federal');
  for (var d2 = iso(y, 12, 20); d2 <= iso(y, 12, 31); d2 = addD(d2, 1)) add(d2, d2 === iso(y, 12, 25) ? 'Natal (recesso forense)' : 'Recesso forense (20/12 a 06/01)', d2 === iso(y, 12, 25) ? 'Feriado nacional' : 'Recesso forense');
  return L.sort(function (a, b) { return a.date.localeCompare(b.date); });
}
/* feriados que não contam para prazo, mesmo fora do calendário do gabinete (tempHolidays do Controle de Pauta) */
var CACHE = {};
function feriadosPrazo(y) {
  if (CACHE[y]) return CACHE[y];
  var H = {};
  [[1, 1, 'Confraternização Universal'], [4, 21, 'Tiradentes'], [5, 1, 'Dia do Trabalho'], [8, 11, 'Fundação dos cursos jurídicos (Lei 5.010/66)'], [9, 7, 'Independência'],
   [10, 11, 'Criação do Estado de Mato Grosso do Sul (sem expediente na JFMS)'], [10, 12, 'Nossa Senhora Aparecida'], [11, 1, 'Todos os Santos (Lei 5.010/66)'], [11, 2, 'Finados'],
   [11, 15, 'Proclamação da República'], [11, 20, 'Consciência Negra'], [12, 8, 'Dia da Justiça (Lei 5.010/66)'], [12, 25, 'Natal']].forEach(function (x) { H[iso(y, x[0], x[1])] = x[2]; });
  var e = pascoa(y); [[-48, 'Carnaval'], [-47, 'Carnaval'], [-4, 'Semana Santa (Lei 5.010/66)'], [-3, 'Semana Santa (Lei 5.010/66)'], [-2, 'Sexta-feira Santa'], [60, 'Corpus Christi']].forEach(function (x) { H[addD(e, x[0])] = x[1]; });
  return (CACHE[y] = H);
}
/* expediente do gabinete normalizado */
function exp(E) {
  E = E || {}; var sp = {}; (E.semPrazo || []).forEach(function (d) { sp[d] = 1; });
  return { semExpediente: E.semExpediente || [], nomes: E.nomes || {}, tipos: E.tipos || {}, semPrazo: sp, recesso: E.recesso || [] };
}
/* por que o dia não conta para prazo: null = fim de semana; '' = dia útil; texto = motivo */
function motivo(t, E, extra) {
  var x = exp(E), md = t.slice(5), w = dow(t);
  if (w === 0 || w === 6) return null;
  if (md >= '12-20' || md <= '01-20') return 'Recesso forense (20/12 a 20/01)';
  var f = feriadosPrazo(+t.slice(0, 4))[t]; if (f) return f;
  if (x.semPrazo[t]) return (x.nomes[t] || x.tipos[t] || 'Data sem expediente') + ' (calendário do gabinete)';
  if (extra && extra[t]) return extra[t];
  return '';
}
/* prazo processual em dias úteis, contado do dia seguinte à publicação: { publicacao, protocolo, prazo, dobro, suspensoes } */
function prazo(o, E) {
  var pub = isoDe(o.publicacao), prot = isoDe(o.protocolo), legal = parseInt(o.prazo, 10) || 15, dobro = /^(2|sim|true)$/i.test(String(o.dobro || '')) ? 2 : 1, total = legal * dobro;
  if (!pub) return { legal: legal, dobro: dobro, total: total, falta: true };
  var extra = {}; String(o.suspensoes || '').split(/[\n,;]+/).map(isoDe).filter(Boolean).forEach(function (d) { extra[d] = 'Suspensão informada no processo'; });
  var d = addD(pub, 1), n = 0, guarda = 0, pulados = [];
  while (guarda++ < 900) { var r = motivo(d, E, extra); if (r === '') { n++; if (n >= total) break; } else if (r) pulados.push([d, r]); d = addD(d, 1); }
  return { publicacao: pub, protocolo: prot, legal: legal, dobro: dobro, total: total, limite: d, pulados: pulados, ok: prot ? prot <= d : null };
}
var NOTA = 'Conta dias úteis a partir do dia seguinte à publicação, sem fins de semana, recesso de 20/12 a 20/01 (CPC, art. 220), feriados nacionais e da Justiça Federal (Lei 5.010/66), feriados de MS, Carnaval, Semana Santa e Corpus Christi, as datas do calendário do gabinete marcadas como “não conta para prazo” e as suspensões informadas no processo.';
window.CMTForense = { versao: 1, TIPOS: TIPOS, SEM_PRAZO: SEM_PRAZO, sugestoes: sugestoes, feriadosPrazo: feriadosPrazo, motivo: motivo, prazo: prazo, pascoa: pascoa, NOTA: NOTA, iso: isoDe, atual: null };
})();
