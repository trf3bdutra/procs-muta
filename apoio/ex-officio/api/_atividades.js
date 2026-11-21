/* GET /api/painel?atividades=1&dias=3  registro de atividades do gabinete, para a Chefia do Caput (só gestor ou perfil avançado).
   Fonte: o histórico de gravações do repositório. Cada gravação feita pelos apps leva quem e o quê na mensagem
   ("Ex Officio (Ana): <processo> · dataMinuta", "Ficha (Bruno): …", "Painel do relator: entrada registrada…").
   Commits de desenvolvimento ficam de fora. Rajadas iguais seguidas (lotes) viram uma linha com a contagem. */
const L = require('./_lib');
const CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
const RELATOR = () => L.norm(process.env.CMT_RELATOR || 'CM');

/* traduz a primeira linha (e o corpo, para o editor) numa atividade; null = não é atividade de usuário */
function ler(msg) {
  const lin = String(msg || '').split('\n')[0].trim(), corpo = String(msg || '');
  let m;
  if ((m = /^Painel do relator: entrada (?:(do Desembargador|de .+?) )?registrada/.exec(lin))) return { quem: !m[1] || m[1] === 'do Desembargador' ? 'Desembargador' : m[1].slice(3), area: 'Painel do Desembargador', texto: 'abriu o painel', origem: 'cmt' };
  if ((m = /^Painel do desembargador: aviso à equipe · (.*)$/i.exec(lin))) return { quem: 'Desembargador', area: 'Painel do Desembargador', texto: 'aviso à equipe: ' + m[1], origem: 'cmt' };
  if ((m = /Alterações feitas no editor do Modus Operandi por ([^.(]+?)( \(painel do desembargador\))?\./.exec(corpo))) {
    const cmt = !!m[2]; return { quem: cmt ? quemCmt(m[1]) : m[1].trim(), area: cmt ? 'Painel do Desembargador · Compendium' : 'Compendium · editor', texto: lin.replace(/^Editor do Modus Operandi:?\s*/, '') || 'alterações no Compendium', origem: cmt ? 'cmt' : 'equipe' };
  }
  if ((m = /^Entrada recusada \(([^)]{1,48})\): (.+?)(?: · .*)?$/.exec(lin))) return { quem: m[1], area: 'Login recusado', texto: 'senha não conferiu no ' + m[2], origem: 'login', falha: true };
  if ((m = /^Entrada \(([^)]{1,48})\): (.+)$/.exec(lin))) return { quem: quemCmt(m[1]) === 'Desembargador' ? 'Desembargador' : m[1], area: 'Login', texto: 'entrou no ' + m[2], origem: 'login' };
  if ((m = /^Diligências automáticas: (.*)$/.exec(lin))) return { quem: 'Sistema', area: 'Diligências', texto: m[1], origem: 'sistema' };
  if ((m = /^([A-ZÁÉÍÓÚ][^():]{1,40}?) \(([A-Za-zÀ-ú][A-Za-zÀ-ú /.·-]{0,47})\): (.+)$/.exec(lin))) {
    const area = m[1].trim(), us = m[2].trim(), cmt = /painel CMT$/i.test(us) || /^CMT$/i.test(us) || L.norm(us) === RELATOR() || /desembargador/i.test(area);
    return { quem: cmt ? quemCmt(us.replace(/\s*·\s*painel CMT$/i, '')) : us, area: cmt && !/desembargador/i.test(area) ? 'Painel do Desembargador · ' + area : area, texto: m[3].trim(), origem: cmt ? 'cmt' : 'equipe' };
  }
  if ((m = /^(.{3,60}?) por ([A-ZÁÉÍÓÚ][\wÀ-ú/ .-]{1,30}): (.*)$/.exec(lin))) return { quem: m[2].trim(), area: m[1].trim(), texto: m[3].trim(), origem: 'equipe' };
  return null;
}
/* nomes internos dos campos gravados, em português corrente */
const CAMPO = { dataMinuta: 'minuta', dataCorrecao: 'correção', dataLiberacao: 'liberação', dataAssinatura: 'assinatura', intercor: 'intercorrência', intercorOk: 'intercorrência resolvida',
  intercorTipo: 'tipo da intercorrência', intercorChamado: 'nº do chamado', retidoOk: 'retido resolvido', 'cartao.pendencias': 'pendências', 'cartao.avisos': 'avisos', 'cartao.notas': 'notas',
  servidor: 'minutante', corretor: 'corretor', resultado: 'situação na sessão', obs: 'observação', sopref: 'sustentação ou preferência', meta: 'meta', destaque: 'destaque', topico: 'tópico' };
function legivel(t) {
  return String(t || '').replace(/ · ([\w.,\s À-ú-]+)$/, (m0, L0) => ' · ' + L0.split(/,\s*/).map(k => CAMPO[k.trim()] || k.trim().replace(/^(triagem|producao|controles|pauta)\./, '')).join(', '));
}
function quemCmt(u) { u = String(u || '').trim(); return !u || /^CMT$/i.test(u) || L.norm(u) === RELATOR() ? 'Desembargador' : u; }

module.exports = async (req, res, u) => {
  let ok = L.gestor(u); if (!ok) { try { ok = (await L.acessos(u)).avancado; } catch (e) {} }
  if (!ok) return res.status(403).json({ erro: 'O registro de atividades é da Chefia.' });
  const dias = Math.max(1, Math.min(30, parseInt(req.query.dias, 10) || 3));
  const desde = new Date(Date.now() - dias * 864e5).toISOString();
  const brutos = [];
  try {
    for (let p = 1; p <= 10; p++) {
      const L0 = await L.gh('/commits?per_page=100&since=' + encodeURIComponent(desde) + '&page=' + p);
      brutos.push(...L0);
      if (L0.length < 100) break;
    }
  } catch (e) { if (!brutos.length) return res.status(e.status || 500).json({ erro: e.message }); }
  const itens = [];
  brutos.forEach(c => {
    const a = ler((c.commit || {}).message); if (!a) return;
    const em = ((c.commit || {}).committer || {}).date || ((c.commit || {}).author || {}).date || '';
    const cnj = (CNJ.exec(a.texto) || [])[0] || '';
    /* rajada: a mesma pessoa, na mesma área, com o mesmo texto (sem os números) logo em seguida vira uma linha só */
    const chave = a.quem + '|' + a.area + '|' + a.texto.replace(/\d+/g, '#'), ant = itens[itens.length - 1];
    if (ant && ant._k === chave && !cnj && Date.parse(ant.ini) - Date.parse(em) < 30 * 60e3) { ant.n++; ant.ini = em; return; }
    itens.push({ _k: chave, em, ini: em, n: 1, quem: a.quem, area: a.area, texto: legivel(a.texto), cnj, origem: a.origem, falha: !!a.falha, sha: String(c.sha || '').slice(0, 7) });
  });
  itens.forEach(x => delete x._k);
  const pessoas = {};
  itens.forEach(x => { pessoas[x.quem] = (pessoas[x.quem] || 0) + x.n; });
  return res.status(200).json({ dias, desde, gravacoes: brutos.length, truncado: brutos.length >= 1000, itens, pessoas });
};
module.exports.ler = ler; module.exports.legivel = legivel;
