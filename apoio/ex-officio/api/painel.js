/* GET /api/painel?cmt=1  painel do desembargador (api/_cmt.js)
   GET /api/painel?lote=1  Amicus Curiae · Index (api/_lote.js; /index/, /index/cm/ e /index/cg/)
   GET /api/painel  página inicial do servidor: calendário das pautas publicadas e todos os processos dele (minuta e correção) */
const L = require('./_lib');
const E = require('./_entregas');
const FICHA = require('./_ficha');
const PERFIS = 'apoio/equipe-perfis.json';
const opc = rel => L.lerJson(rel).then(x => x.dados).catch(() => null);
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.query && req.query.whatsapp === '1') return require('./_whatsapp')(req, res);
  if (req.query && req.query.fechamento === '1') return require('./_fechamento-auto')(req, res);
  /* Amicus Curiae · Index: login do Ex Officio ou chave do relator, conferidos em _lote.js */
  if (req.query && req.query.lote) return require('./_lote')(req, res);
  /* painel do desembargador: o endereço próprio (/cmt) abre sem login */
  if (req.query && req.query.cmt) {
    const CMT = require('./_cmt');
    return CMT(req, res, L.quem(req) || process.env.CMT_RELATOR || 'CM');
  }
  const u = L.exigir(req, res); if (!u) return;
  if (req.query && req.query.fechamentoPng === '1') return require('./_fechamento-png')(req, res, u);
  /* Início: o próprio servidor grava datas do crachá (aniversários, avaliação) e marcas do mês (EGP lançado) em apoio/equipe-perfis.json */
  if (req.method === 'POST' && req.query && req.query.perfil === '1') {
    const b = req.body || {}, eu = L.norm(u), CAMPOS = ['nascimento', 'gabinete', 'jf', 'progressao'], dt = v => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
    try {
      for (let t = 0; t < 4; t++) {
        let doc, sha;
        try { const x = await L.lerJson(PERFIS); doc = x.dados; sha = x.sha; } catch (e) { if (e.status !== 404) throw e; doc = { schema: 'gabcmt.equipe.perfis', versao: 1, registros: {} }; }
        doc.registros = doc.registros || {}; const r = doc.registros[eu] = doc.registros[eu] || { nome: u };
        CAMPOS.forEach(k => { if (k in b) { if (!dt(b[k])) throw Object.assign(new Error('Data inválida em ' + k), { status: 400 }); r[k] = b[k]; } });
        if ('avInformada' in b) r.avInformada = b.avInformada ? new Date().toISOString().slice(0, 10) : '';
        if (b.egp && /^\d{4}-\d{2}$/.test(String(b.egp.mes || ''))) { r.egp = r.egp || {}; if (b.egp.feito) r.egp[b.egp.mes] = new Date().toISOString().slice(0, 10); else delete r.egp[b.egp.mes]; }
        r.atualizadoEm = new Date().toISOString(); doc.atualizadoEm = r.atualizadoEm;
        try { await L.gravarJson(PERFIS, doc, sha, 'Ex Officio · Início: crachá de ' + u); return res.status(200).json({ perfil: r }); }
        catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
      }
      return res.status(409).json({ erro: 'Outra gravação ao mesmo tempo. Tente de novo.' });
    } catch (e) { return res.status(e.status || 500).json({ erro: e.message }); }
  }
  try {
    const cal = (await L.lerJson('acervo/sessoes/calendario.json')).dados;
    /* calendário: sessões com marcos publicados; processos, progresso e "meus" só das pautas com listagem publicada */
    const vis = (cal.sessoes || []).filter(s => s.publicada || s.marcosPublicados), pubs = vis.filter(s => s.publicada);
    const eu = L.norm(u), meus = [], prog = {};
    const detalhar = !!req.query.entregas;
    const avisosFontes = [];
    const requests = pubs.map(s => L.lerJson('acervo/sessoes/' + s.date + '.json').then(x => x.dados).catch(() => { avisosFontes.push('Pauta ' + s.date + ' indisponível'); return null; }));
    // Monocráticas e diligências são lidas em paralelo apenas para o Início.
    const adicionais = detalhar ? Promise.all([
      FICHA.lerOpLeitura().then(x => x.doc).catch(() => { avisosFontes.push('Monocráticas e urgências indisponíveis'); return null; }),
      L.lerJson('apoio/equipe-pendencias.json').then(x => x.dados).catch(e => { if (e.status !== 404) avisosFontes.push('Diligências indisponíveis'); return { registros: [] }; })
    ]) : Promise.resolve([null, null]);
    const [docs, extra] = await Promise.all([Promise.all(requests), adicionais]);
    pubs.forEach((s, i) => {
      const d = docs[i]; if (!d) return;
      const lista = (d.itens || []).length ? d.itens : (d.previa || []);
      prog[s.date] = { minutadas: lista.filter(x => x.dataMinuta).length, corrigidas: lista.filter(x => x.dataCorrecao).length, liberadas: lista.filter(x => x.dataLiberacao).length };
      lista.forEach(it => {
        const pm = L.norm(it.servidor) === eu, pc = L.norm(it.corretor) === eu; if (!pm && !pc) return;
        meus.push({ papel: pm && pc ? 'minuta e correção' : pm ? 'minuta' : 'correção', sessao: s.date, item: it.item || '', cnj: it.cnj, classe: it.classe || '', assunto: it.assunto || '', partes: it.partes || '',
          servidor: it.servidor || '', corretor: it.corretor || '',
          dataMinuta: it.dataMinuta || '', dataCorrecao: it.dataCorrecao || '', dataLiberacao: it.dataLiberacao || '', resultado: it.resultado || '',
          resJulg: (it.ctl || {}).resJulg || '', previa: !(d.itens || []).length });
      });
    });
    const resposta = { usuario: u, sessoes: vis.map(s => ({ date: s.date, hora: s.hora || '', cor: s.cor || '', pauta: !!s.publicada, processos: s.publicada ? (s.processos || 0) : 0, previa: s.publicada && !s.processos ? (s.previa || 0) : 0, marcos: s.marcos || {} })), expediente: cal.expediente || null, progresso: prog, meus };
    if (detalhar) {
      resposta.entregas = E.pautas(pubs, docs).concat(extra[0] ? E.monocraticas(extra[0]) : [], E.pendencias(extra[1] || { registros: [] }));
      resposta.equipe = L.equipe();
      resposta.fontes = { pautas: docs.filter(Boolean).length, pautasPublicadas: pubs.length, monocraticas: !!extra[0], pendencias: !!extra[1] };
      resposta.avisosFontes = avisosFontes;
      /* Início: meta diária (regras de produtividade), cadastro do servidor (equipe), datas do crachá e ausências aprovadas da equipe */
      const [prod, eqDoc, perfis, sol] = await Promise.all([opc('apoio/regras/produtividade.json'), opc('apoio/equipe.json'), opc(PERFIS), opc('apoio/equipe-solicitacoes.json')]);
      const mp = (prod || {}).metaPadrao || {}, mm = Object.entries((prod || {}).metas || {}).find(([k]) => L.norm(k) === eu);
      resposta.meta = { voto: Number(mm && mm[1].voto != null ? mm[1].voto : mp.voto != null ? mp.voto : 3), mono: Number(mm && mm[1].mono != null ? mm[1].mono : mp.mono || 0) };
      const regs = (eqDoc || {}).registros || [], meu = regs.find(r => L.norm(r.nome) === eu || (r.aliases || []).some(a => L.norm(a) === eu)) || null;
      resposta.cadastro = meu ? { nome: meu.nome, cargo: meu.cargo || '', papel: meu.papel || '', atribuicoes: meu.atribuicoes || [], escopos: meu.escopos || [], exp: meu.exp || [], pref: meu.pref || [], nao: meu.nao || [], situacao: meu.situacao || '' } : null;
      resposta.papeis = {}; regs.forEach(r => { resposta.papeis[r.nome] = r.papel || ''; });
      resposta.perfil = ((perfis || {}).registros || {})[eu] || null;
      resposta.ausencias = ((sol || {}).registros || []).filter(s => /aprov|deferid/i.test(String(s.estado || ''))).map(s => ({ nome: s.nome, de: s.de, ate: s.ate }));
    }
    res.status(200).json(resposta);
  } catch (e) { res.status(500).json({ erro: e.message }); }
};
