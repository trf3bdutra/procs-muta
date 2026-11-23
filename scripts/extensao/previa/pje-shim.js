/* Prévia do painel (/extensao/previa/): o "PJe" à esquerda roda o conteudo-pje.js de verdade (cartões com sinalizações,
   etiquetas personalizadas, botões HERO e Etiquetas, quadro de sinalizações). Este arquivo faz o papel do Chrome e do
   serviço de fundo (fundo.js) para esse script, na página de fora:
   - muta-resumos: lê /api/pauta?fichas=… e o catálogo /api/pauta?etiquetas=1, como o fundo.js;
   - muta-sinal: incluir, resolver e reabrir aviso, intercorrência, pendência e nota na ficha — grava só com
     "Gravar de verdade" ligado (window.__previaGrava), como o resto da prévia;
   - chrome.storage.local em localStorage ('hero-previa-pje:'), para lembrar HERO ligado e Etiquetas;
   - o resto (muta-processo, muta-cmt…) não tem resposta. */
(function () {
  'use strict';
  window.HERO_PREVIA_PJE = true;
  var PFX = 'hero-previa-pje:', ouvintes = [];
  function lerLS(k) { try { var v = localStorage.getItem(PFX + k); return v == null ? undefined : JSON.parse(v); } catch (e) { return undefined; } }
  function gravarLS(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) {} }
  var local = {
    get: function (ks) {
      var o = {}; (Array.isArray(ks) ? ks : typeof ks === 'string' ? [ks] : Object.keys(ks || {})).forEach(function (k) { var v = lerLS(k); if (v !== undefined) o[k] = v; });
      return Promise.resolve(o);
    },
    set: function (o) {
      var ch = {}; Object.keys(o || {}).forEach(function (k) { ch[k] = { oldValue: lerLS(k), newValue: o[k] }; gravarLS(k, o[k]); });
      setTimeout(function () { ouvintes.forEach(function (f) { try { f(ch, 'local'); } catch (e) {} }); }, 0);
      return Promise.resolve();
    }
  };
  var CFG0 = { urgDias: 2, tarefaDias: 30, selos: true, avisos: true };
  function api(u, op) {
    return fetch(u, Object.assign({ credentials: 'same-origin', cache: 'no-store' }, op || {})).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.erro || ('HTTP ' + r.status)); e.status = r.status; throw e; } return j; });
    });
  }
  var CAT = null, RES = {};
  function catalogo() { if (CAT) return Promise.resolve(CAT); return api('/api/pauta?etiquetas=1').then(function (j) { CAT = j.catalogo || null; return CAT; }, function () { return null; }); }
  function resumos(ks) {
    var falta = ks.filter(function (k) { return !RES[k] || Date.now() - RES[k].t > 120e3; });
    var lotes = []; for (var i = 0; i < falta.length; i += 100) lotes.push(falta.slice(i, i + 100));
    return Promise.all(lotes.map(function (L) { return api('/api/pauta?fichas=' + L.join(',')).then(function (j) { Object.keys(j.resumos || {}).forEach(function (k) { RES[k] = { t: Date.now(), r: j.resumos[k] }; }); }); }))
      .then(function () { var o = {}; ks.forEach(function (k) { if (RES[k]) o[k] = RES[k].r; }); return o; });
  }
  var CAMPO = { av: ['triagem', 'Avisos'], pd: ['triagem', 'O que falta sanar'], ic: ['triagem', 'Intercorrências'], nt: ['origem', 'Observações'] };
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(k) { return k.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6'); }
  /* a mesma regra do fundo.js › muta-sinal */
  function sinal(m) {
    var k = String(m.cnj || '').replace(/\D/g, ''), cp = CAMPO[m.campo];
    if (k.length !== 20 || !cp) return Promise.resolve({ erro: 'pedido inválido' });
    if (!(window.__previaGrava && window.__previaGrava())) return Promise.resolve({ erro: 'Prévia: nada é gravado (ligue "Gravar de verdade", à esquerda).' });
    var cnj = fmt(k);
    return Promise.all([api('/api/pauta?ficha=' + encodeURIComponent(cnj)), api('/api/login').then(function (j) { return j.usuario || ''; }, function () { return ''; })]).then(function (v) {
      var op = v[0].operacional || {}, L = String(((op[cp[0]] || {})[cp[1]]) || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
      var sem = function (x) { return x.replace(/^✓\s*/, ''); }, alvo = sem(String(m.linha || '').trim()), i = L.map(sem).indexOf(alvo), d = new Date(), u = v[1] || 'equipe';
      if (m.acao === 'resolver' || m.acao === 'reabrir') { if (i < 0) throw new Error('A linha mudou na ficha; reabra o quadro.'); L[i] = m.acao === 'resolver' ? '✓ ' + sem(L[i]) : sem(L[i]); }
      else if (m.acao === 'incluir') {
        var t = String(m.texto || '').replace(/\s*\n+\s*/g, ' ').trim().slice(0, 600); if (!t) throw new Error('texto vazio');
        L.push(m.campo === 'nt' ? p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ' · ' + u + ' · ' + t : t + ' · ' + u + ' · ' + p2(d.getDate()) + '/' + p2(d.getMonth() + 1));
      } else throw new Error('ação inválida');
      var campos = {}; campos[cp[0] + '.' + cp[1]] = L.join('\n');
      return api('/api/pauta?ficha=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cnj: cnj, campos: campos }) });
    }).then(function () { delete RES[k]; return resumos([k]); }).then(function (R) { return { ok: true, resumo: R[k] || null }; }, function (e) { return { erro: e && e.message || String(e) }; });
  }
  function enviar(m) {
    m = m || {};
    if (m.tipo === 'muta-resumos') {
      var ks = (m.cnjs || []).map(function (x) { return String(x).replace(/\D/g, ''); }).filter(function (x) { return x.length === 20; }).slice(0, 300);
      return Promise.all([resumos(ks), catalogo(), local.get('muta-prazos')]).then(function (v) {
        return { resumos: v[0], catalogo: v[1], cfg: Object.assign({}, CFG0, v[2]['muta-prazos'] || {}) };
      }, function (e) { return { erro: e.status === 401 ? 'Entre no Ex Officio para ver os selos.' : (e.message || 'falhou') }; });
    }
    if (m.tipo === 'muta-sinal') return sinal(m);
    return Promise.resolve(undefined);
  }
  window.chrome = {
    runtime: { id: 'previa', sendMessage: function (m, cb) { var p = enviar(m); if (typeof cb === 'function') p.then(cb); return p; }, onMessage: { addListener: function () {} }, getURL: function (p) { return 'painel/' + p; } },
    storage: { local: local, session: local, onChanged: { addListener: function (f) { ouvintes.push(f); } } }
  };
})();
