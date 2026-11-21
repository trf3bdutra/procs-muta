document.querySelectorAll('iframe').forEach(f=>f.remove());
window.MX3 = (() => {
  const S = { log: [], parar: false, rodando: false, ok: 0, erros: 0, atual: '', etapa: '' };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = (doc, cond, ms) => new Promise(res => { let feito = false, ob = null; const fim = v => { if (feito) return; feito = true; try { ob && ob.disconnect(); } catch (e) { } res(v); };
    try { if (cond()) return fim(true); } catch (e) { }
    try { ob = new MutationObserver(() => { try { if (cond()) fim(true); } catch (e) { } }); ob.observe(doc.documentElement || doc, { childList: true, subtree: true, characterData: true }); } catch (e) { }
    setTimeout(() => { try { fim(!!cond()); } catch (e) { fim(false); } }, ms); });
  const carrega = f => new Promise(r => { let ok = false; f.addEventListener('load', () => { if (!ok) { ok = true; r(true); } }, { once: true }); setTimeout(() => { if (!ok) { ok = true; r(false); } }, 45000); });
  const log = m => { S.log.push(new Date().toTimeString().slice(0, 8) + ' ' + m); if (S.log.length > 400) S.log.shift(); document.title = 'NÃO FECHAR · ponte PJe · ' + S.ok + ' ok · ' + S.erros + ' erros'; };
  const CSS = 'position:fixed;left:0;top:0;width:1200px;height:800px;opacity:0.01;z-index:-1;pointer-events:none';
  const SKIP = /^(Documento de Identifica|Intima[çc][ãa]o de Pauta|Ci[êe]ncia$)/i;
  const PRINC = /inicial|senten|apela|agravo|decis|voto|ac[óo]rd|parecer|contrarraz|contramin|embargos|recurso|despacho|manifesta|peti/i;
  let Q = null, A = null;
  async function busca() {
    try { if (Q && Q.contentDocument && Q.contentDocument.getElementById('fPP:searchProcessos')) return Q; } catch (e) { }
    if (Q) Q.remove(); Q = document.createElement('iframe'); Q.style.cssText = CSS; document.body.appendChild(Q);
    const l = carrega(Q); Q.src = '/pje/Processo/ConsultaProcesso/listView.seam'; await l;
    if (await espera(Q.contentDocument, () => !!Q.contentDocument.getElementById('fPP:searchProcessos'), 20000)) return Q;
    throw new Error('consulta não carregou (sessão do PJe?)');
  }
  async function url(cnj) {
    S.etapa = 'busca'; const q = await busca(), w = q.contentWindow; let abre; const aberto = new Promise(r => abre = r);
    w.open = function (u) { if (/listAutosDigitais/.test(String(u))) abre(String(u)); return null; };
    const d = q.contentDocument, m = cnj.match(/^(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})$/);
    ['numeroSequencial', 'numeroDigitoVerificador', 'Ano', 'ramoJustica', 'respectivoTribunal', 'NumeroOrgaoJustica'].forEach((k, i) => {
      const e = d.getElementById('fPP:numeroProcesso:' + k); e.value = m[i + 1]; e.dispatchEvent(new Event('change', { bubbles: true })); });
    d.getElementById('fPP:searchProcessos').click();
    const linha = () => [...q.contentDocument.querySelectorAll('table tbody tr')].find(tr => tr.textContent.includes(cnj));
    if (!(await espera(q.contentDocument, () => !!linha(), 30000))) throw new Error('não encontrado na consulta');
    S.etapa = 'abrir'; linha().querySelector('a').click();
    const u = await Promise.race([aberto, sleep(20000).then(() => null)]); if (!u) throw new Error('sem URL dos autos'); return u;
  }
  async function autos(u) {
    S.etapa = 'autos'; if (A) A.remove(); A = document.createElement('iframe'); A.style.cssText = CSS; document.body.appendChild(A);
    const l = carrega(A); A.src = u; await l;
    const sel = '#divTimeLine\\:eventosTimeLineElement';
    if (!(await espera(A.contentDocument, () => !!A.contentDocument.querySelector(sel), 30000))) throw new Error('linha do tempo não carregou');
    const d = A.contentDocument, cnt = () => { const t = d.querySelector(sel); return t ? t.querySelectorAll('span').length : -1; };
    S.etapa = 'rolagem'; let semCrescer = 0;
    for (let i = 0; i < 400 && semCrescer < 2; i++) {
      const antes = cnt(), sc = d.getElementById('divTimeLine:divEventosTimeLine'); if (sc) { sc.scrollTop = sc.scrollHeight; sc.dispatchEvent(new Event('scroll')); }
      if (await espera(d, () => cnt() > antes, 6000)) semCrescer = 0; else semCrescer++;
    }
    return d;
  }
  const MES = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
  function lista(d) {
    const tl = d.querySelector('#divTimeLine\\:eventosTimeLineElement'); if (!tl) throw new Error('linha do tempo ausente');
    const mp = tl.innerHTML.match(/download\/TRF3\/2g\/(\d+)\//); const out = [], movs = [], vis = new Set(); let data = '';
    for (const e of tl.querySelectorAll('div.media.data .text-muted, span')) {
      const t = e.textContent.replace(/\s+/g, ' ').trim();
      if (e.matches('div.media.data .text-muted')) { const m = t.match(/^(\d{1,2}) (\w{3})\.? (\d{4})$/); if (m) data = m[1].padStart(2, '0') + '/' + (MES[m[2].toLowerCase()] || '00') + '/' + m[3]; continue; }
      if (e.classList.contains('texto-movimento')) { const box = e.closest('.media'); const h = box ? [...box.querySelectorAll('small,.text-muted')].map(x => x.textContent.trim()).find(x => /^\d{1,2}:\d{2}$/.test(x)) : ''; movs.push(data + (h ? ' ' + h : '') + ' · ' + t); continue; }
      const m = t.match(/^(\d{6,}) - (.+)$/); if (!m || vis.has(m[1])) continue; vis.add(m[1]);
      let tipo = m[2].replace(/ - ID de origem \d+$/, '').trim(), desc = tipo; const p = tipo.match(/^(.+?) \((.+)\)$/); if (p) { tipo = p[1]; desc = p[2]; }
      out.push({ id: m[1], tipo, desc, data, anexo: !!e.closest('ul.tree') });
    }
    return { idp: mp ? mp[1] : null, out, movs };
  }
  async function texto(idp, doc) {
    const r = await Promise.race([fetch('/pje/seam/resource/rest/pje-legacy/documento/download/TRF3/2g/' + idp + '/' + doc.id, { credentials: 'include' }), sleep(90000).then(() => { throw new Error('timeout'); })]);
    if (r.status !== 200) throw new Error('http ' + r.status);
    const ct = String(r.headers.get('content-type') || ''), b = await r.arrayBuffer();
    if (/pdf/i.test(ct) || new TextDecoder('latin1').decode(b.slice(0, 5)) === '%PDF-') {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(b) }).promise, n = pdf.numPages, maxp = PRINC.test(doc.tipo) ? 60 : 25; let t = '';
      for (let p = 1; p <= Math.min(n, maxp); p++) { const pg = await pdf.getPage(p), c = await pg.getTextContent(); t += c.items.map(i => i.str).join(' ') + '\n'; }
      pdf.destroy(); return { fmt: 'pdf', pags: n, texto: t };
    }
    const h = new TextDecoder('utf-8').decode(b), x = new DOMParser().parseFromString(h, 'text/html'); x.querySelectorAll('script,style').forEach(e => e.remove());
    return { fmt: 'html', pags: 0, texto: (x.body ? x.body.textContent : h).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n') };
  }
  async function um(cnj) {
    const t0 = Date.now(), u = await url(cnj), d = await autos(u), { idp, out, movs } = lista(d);
    if (!idp) throw new Error('sem número interno do processo'); if (!out.length) throw new Error('lista vazia');
    S.etapa = 'documentos 0/' + out.length; const fila = out.slice(), res = {}; let feitos = 0;
    const worker = async () => { while (fila.length) { const doc = fila.shift(); if (SKIP.test(doc.tipo)) { res[doc.id] = { fmt: 'pulado', texto: '' }; continue; }
      try { res[doc.id] = await texto(idp, doc); } catch (e) { res[doc.id] = { fmt: 'erro', erro: String(e.message || e), texto: '' }; } S.etapa = 'documentos ' + (++feitos) + '/' + out.length; } };
    await Promise.all([worker(), worker(), worker(), worker()]);
    const ord = out.slice().sort((a, b) => Number(a.id) - Number(b.id)); let cap = 60000;
    const cab = '===== MOVIMENTAÇÕES (linha do tempo do PJe, mais recente primeiro) =====\n' + movs.join('\n') + '\n\n';
    const build = () => cab + ord.map(o => { const r = res[o.id] || {}; return '===== ID ' + o.id + ' | ' + o.tipo + (o.desc !== o.tipo ? ' | ' + o.desc : '') + ' | juntado em ' + o.data + ' | ' + (r.fmt || '?') + (r.pags ? ' ' + r.pags + ' pág.' : '') + (o.anexo ? ' | anexo' : '') + ' =====\n' + (r.texto || '').slice(0, cap); }).join('\n\n');
    let tx = build(); while (tx.length > 3000000 && cap > 3000) { cap = Math.floor(cap / 2); tx = build(); }
    const rec = { cnj, extraido_em: new Date().toISOString(), extrator: 'MX3',
      lista: out.map(o => [o.id, o.tipo, o.desc, '', o.data, '', '']),
      docs: out.map(o => { const r = res[o.id] || {}; return { id: o.id, tipo: o.tipo, descricao: o.desc, juntado_por: '', juntado_em: o.data, formato: r.fmt || '', paginas: r.pags || 0, caracteres: (r.texto || '').length, anexo: o.anexo }; }),
      faltam: out.filter(o => { const r = res[o.id]; return !r || r.fmt === 'erro' || (r.fmt !== 'pulado' && !(r.texto || '').trim()); }).map(o => o.id), texto: tx };
    log('ok ' + cnj + ' ' + out.length + ' docs (' + rec.docs.filter(x => x.anexo).length + ' anexos, ' + movs.length + ' movimentos) ' + Math.round((Date.now() - t0) / 1000) + 's' + (cap < 60000 ? ' (texto reduzido)' : '')); return rec;
  }
  let esp = null;
  window.addEventListener('message', ev => { const m = ev.data; if (!m || m.k !== 'mx3' || ev.source !== window.opener) return; if (esp) { const r = esp; esp = null; r(m); } });
  const pede = (msg, ms) => new Promise(r => { esp = r; window.opener.postMessage(Object.assign({ k: 'mx3' }, msg), 'https://www.gabinete-cmt.com'); sleep(ms).then(() => { if (esp === r) { esp = null; r({ tipo: 'timeout' }); } }); });
  async function rodar() {
    if (S.rodando) return 'já rodando'; S.rodando = true; S.parar = false; let falhasSeguidas = 0;
    while (!S.parar) {
      if (!window.opener) { log('sem a aba do app'); break; }
      const p = await pede({ tipo: 'prox' }, 30000); if (p.tipo === 'fim') { log('fila concluída'); break; } if (p.tipo !== 'cnj') { log('sem resposta do app'); await sleep(10000); continue; }
      S.atual = p.cnj; let rec = null;
      try { rec = await Promise.race([um(p.cnj), sleep(1500000).then(() => { throw new Error('timeout do processo'); })]); falhasSeguidas = 0; }
      catch (e) { S.erros++; falhasSeguidas++; log('ERRO ' + p.cnj + ' [' + S.etapa + '] ' + (e.message || e)); await pede({ tipo: 'erro', cnj: p.cnj, erro: String(e.message || e) }, 30000);
        try { Q && Q.remove(); } catch (x) { } Q = null;
        if (falhasSeguidas >= 5) { log('5 falhas seguidas: pausa (sessão do PJe?)'); S.parar = true; } continue; }
      S.etapa = 'envio'; const r = await pede({ tipo: 'autos', lote: p.lote, rec }, 240000); if (r.st === 200) S.ok++; log('envio ' + p.cnj + ' ' + (r.st || r.tipo) + (r.msg ? ' ' + r.msg : ''));
    }
    S.rodando = false; S.atual = ''; return 'parado';
  }
  return { S, um, lista, rodar, parar: () => { S.parar = true; } };
})();
document.title='NÃO FECHAR · ponte PJe';MX3.rodar();'iniciado v3'
