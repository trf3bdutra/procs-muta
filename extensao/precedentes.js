/* Muta · precedentes relacionados (0.16.4)
   O mesmo critério da gaveta do prontuário no Ex Officio (apoio/ex-officio/index.html, precRelacionados): julgados do
   Ementário do Compendium — curados do gabinete e série histórica — parecidos com o caso: mesmos temas (STF/STJ), mesmo
   assunto e palavras do assunto detalhado, das questões e do assunto, pesadas pela raridade no acervo; o próprio processo
   fica de fora; um julgado por processo; no máximo seis. Cada um abre no Ementário do Compendium. */
(function () {
  'use strict';
  var SITE = (window.Muta && Muta.SITE) || 'https://www.gabinete-cmt.com';
  var S = function (v) { return v == null ? '' : String(v); };
  var nq = function (v) { return S(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var dg = function (v) { return S(v).replace(/\D/g, ''); };
  var esc = function (s) { return S(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var br = function (d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(d)); return m ? m[3] + '/' + m[2] + '/' + m[1] : S(d); };
  var cnjF = function (d) { d = dg(d); return d.length === 20 ? d.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6') : d; };

  var J = { p: null };
  function gz(u) {
    return fetch(u, { cache: 'default' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }).then(function (b) {
      var a = new Uint8Array(b);
      if (a[0] === 0x1f && a[1] === 0x8b) return new Response(new Blob([a]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      return new TextDecoder().decode(a);
    }).then(JSON.parse);
  }
  var STOP = {};
  ('para pela pelo pelos pelas como sobre entre contra quando sendo apenas caso parte partes artigo artigos processo recurso pedido acordo sentenca apelacao agravo honorarios decisao autos tema temas uniao inss federal acao direito direitos fazenda nacional instituto seguro social conforme forma razao termos prazo ainda tambem assim desde mesmo outro outra outros outras cujo cuja qualquer dessa desse deste desta nesse nessa neste nesta aqueles quanto quais juizo exequente executado impetrante autora autor apelante apelado recorrente recorrido instancia primeiro grau provimento desprovimento negado mantida reforma reformada julgado julgada embargos declaracao civel').split(' ').forEach(function (w) { STOP[w] = 1; });
  function txt(a) { return ' ' + nq(a.join(' ')).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ') + ' '; }
  function temas(t) { var o = {}; S(t).replace(/Tema\s+(\d[\d.]*)\s*\/?\s*(STF|STJ)?/gi, function (_, n, c) { o[n.replace(/\./g, '') + '/' + (c || '').toUpperCase()] = 1; }); return o; }
  function pal(t) { var o = {}; nq(t).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).forEach(function (w) { if (w.length >= 5 && !STOP[w] && !/^\d+$/.test(w)) o[w] = 1; }); return o; }
  function corpus() {
    if (J.p) return J.p;
    J.p = Promise.all([gz(SITE + '/jurisprudencia/curados.json.gz').then(function (o) { return (o && o.registros) || []; }).catch(function () { return []; }),
      gz(SITE + '/jurisprudencia/indice.json.gz').catch(function () { return []; })]).then(function (v) {
      var C = [], por = {};
      v[0].forEach(function (r) { por[dg(r.n) + '|' + (r.d || '')] = 1;
        C.push({ n: r.n, c: r.c || '', d: r.d || '', r: r.r || '', tx: r.e || r.ts || '', as: r.as || '', cur: 1, q: txt([r.as, r.tc, r.ts, S(r.e).slice(0, 1500)]), t: temas([r.tm, r.ts, r.e].join(' ')) }); });
      (Array.isArray(v[1]) ? v[1] : []).forEach(function (r) { if (por[dg(r.n) + '|' + (r.d || '')]) return;
        C.push({ n: r.n, c: r.c || '', d: r.d || '', r: r.r || '', tx: r.e || '', as: '', cur: 0, q: txt([r.e, r.r]), t: temas(r.e) }); });
      if (!C.length) throw new Error('Ementário indisponível');
      var IX = Object.create(null);
      C.forEach(function (x, i) { var vi = {}; x.q.split(' ').forEach(function (t) { if (t.length < 5 || vi[t]) return; vi[t] = 1; (IX[t] || (IX[t] = [])).push(i); }); });
      C.ix = IX; return C;
    }).catch(function (e) { J.p = null; throw e; });
    return J.p;
  }
  /* caso: { cnj, assunto, subassuntos (assunto detalhado), questoes, sintese, especificidades } */
  function relacionados(k, C) {
    var TM = Object.keys(temas([k.subassuntos, k.questoes, k.sintese, k.especificidades].join(' '))), PW = pal([k.subassuntos, k.questoes].join(' ')), AW = pal(k.assunto || '');
    var fraco = !TM.length && Object.keys(PW).length < 2; Object.keys(AW).forEach(function (w) { PW[w] = 1; });
    var W = Object.keys(PW), nW = W.length, as = nq(k.assunto || ''), eu = dg(k.cnj), N = C.length, IX = C.ix || {};
    if (!nW && !TM.length && !as) return [];
    var hit = {}, sc = new Float64Array(N), mw = new Uint16Array(N);
    W.forEach(function (w) { var v = [w, w + 's', w + 'es']; if (/ao$/.test(w)) v.push(w.slice(0, -2) + 'oes', w.slice(0, -2) + 'aes'); if (/l$/.test(w)) v.push(w.slice(0, -1) + 'is');
      var m = {}, n = 0; v.forEach(function (z) { (IX[z] || []).forEach(function (i) { if (!m[i]) { m[i] = 1; n++; } }); }); hit[w] = m;
      var p = n ? Math.log(N / n) : 0; Object.keys(m).forEach(function (i) { sc[i] += p; mw[i]++; }); });
    var corte = fraco ? (nW < 2 ? 99 : nW <= 2 ? nW : nW - 1) : (nW >= 6 ? 3 : 2), cab = fraco ? Object.keys(AW)[0] : null, L = [];
    for (var i = 0; i < N; i++) { var x = C[i], mot = [], s = sc[i], tm = 0;
      for (var j = 0; j < TM.length; j++) if (x.t[TM[j]]) { s += 6; tm++; mot.push('Tema ' + TM[j].replace('/', ' /')); }
      var mesmo = as && x.as && nq(x.as) === as; if (mesmo) { s += 3; mot.push('mesmo assunto'); }
      if (!(tm || mesmo || (mw[i] >= corte && (!cab || hit[cab][i])))) continue;
      if (dg(x.n) === eu) continue; L.push({ r: x, sc: s, mot: mot }); }
    var vist = {};
    return L.sort(function (a, b) { return b.sc - a.sc || S(b.r.d).localeCompare(S(a.r.d)); }).filter(function (o) { var k2 = dg(o.r.n); if (vist[k2]) return false; vist[k2] = 1; return true; }).slice(0, 6);
  }
  var CACHE = {};
  function chave(k) { return [k.cnj, k.assunto, k.subassuntos, k.questoes, k.sintese, k.especificidades].join('¦'); }
  var lnk = function (ns, lab) { return SITE + '/amicus/compendium/#v=ement&proc=' + encodeURIComponent(ns.join(',')) + '&lab=' + encodeURIComponent(lab); };
  function lista(k, L) {
    var bq = k.assunto ? '<a class="prec-todos" href="' + SITE + '/amicus/compendium/#v=ement&q=' + encodeURIComponent(k.assunto) + '" target="_blank" rel="noopener">Buscar “' + esc(k.assunto) + '” em todo o Ementário ↗</a>' : '';
    if (!L.length) return '<p class="muted">Nenhum julgado do Ementário com temas, questões ou assunto em comum. Preencha o assunto detalhado e as questões para afinar.</p>' + bq;
    return '<ol class="prec-l">' + L.map(function (x) { var r = x.r, res = r.r ? S(r.r).replace(/\.$/, '') : '';
      return '<li><div class="prec-h"><a class="mono" href="' + lnk([r.n], r.n) + '" target="_blank" rel="noopener" title="Abrir no Ementário do Compendium">' + esc(r.n) + '</a><span>' + esc([r.c, r.d ? br(r.d) : '', res].filter(Boolean).join(' · ')) + '</span></div>' +
        '<p>' + esc(S(r.tx).slice(0, 230)) + (S(r.tx).length > 230 ? '…' : '') + '</p>' +
        '<small>' + esc(x.mot.concat(r.cur ? 'curado do gabinete' : 'série histórica').join(' · ')) + '</small></li>'; }).join('') + '</ol>' +
      '<div class="prec-f"><a class="prec-todos" href="' + lnk(L.map(function (x) { return x.r.n; }), 'processo ' + cnjF(k.cnj)) + '" target="_blank" rel="noopener">Ver os ' + L.length + ' no Ementário ↗</a>' + bq + '</div>';
  }
  /* devolve o HTML da seção; se o corpus ainda não chegou, devolve "procurando" e pinta quando chegar */
  function html(k) {
    var c = chave(k), pronto = CACHE[c];
    var corpo = pronto != null ? pronto : '<p class="muted">Procurando no Ementário…</p>';
    if (pronto == null) corpus().then(function (C) { CACHE[c] = lista(k, relacionados(k, C)); }, function (e) { CACHE[c] = '<p class="muted">Não foi possível abrir o Ementário (' + esc(e.message) + ').</p>'; })
      .then(function () { var el = document.getElementById('prec-x'); if (el && el.dataset.k === c) el.innerHTML = CACHE[c]; });
    return '<section class="card pc-sec prec" id="g-prec"><div class="pc-sh"><h3>Precedentes relacionados</h3><small class="muted">Ementário do Compendium</small></div><div id="prec-x" data-k="' + esc(c) + '">' + corpo + '</div></section>';
  }
  window.MutaPrecedentes = { buscar: function (k) { return corpus().then(function (C) { return relacionados(k, C); }); }, html: html, relacionados: relacionados, temas: temas };
})();
