/* HERO18810 0.69 · sigilo de processos e documentos
   Processo sigiloso (pelo acervo: segredo de justiça ou sigiloso): a extensão não lê nem grava o inteiro teor dos autos e não
   baixa o JSON, salvo para o Desembargador, o gestor ou quem informar a senha (válida por 8 horas, só para aquele processo).
   Documento marcado como sigiloso no PJe (tipo ou descrição com "sigilo"), em qualquer processo: mesma regra, documento a documento.
   A decisão é do servidor (/api/pauta?sigilo=…); a gravação do inteiro teor é recusada lá também. A ficha não muda. */
(function () {
  'use strict';
  var ses = window.MutaSessao;
  var S = function (v) { return v == null ? '' : String(v).trim(); };
  var dg = function (v) { return S(v).replace(/\D/g, ''); };
  var esc = function (s) { return S(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var T = { cnj: '', sig: '', lib: true, porque: '', lendo: false, erro: '', form: false };
  var K = 'hero-sigilo:';
  function token(cnj) { try { var t = sessionStorage.getItem(K + dg(cnj)) || ''; var a = Number(t.split('.')[0]); return a > Date.now() ? t : ''; } catch (e) { return ''; } }
  function avisar() { try { document.dispatchEvent(new CustomEvent('muta:sigilo', { detail: { cnj: T.cnj } })); } catch (e) {} if (window.MutaGabinete && window.MutaGabinete.render) window.MutaGabinete.render(); }
  function consultar(cnj) {
    if (!ses || dg(cnj).length !== 20) { T = { cnj: '', sig: '', lib: true, porque: '' }; return Promise.resolve(T); }
    if (T.cnj === dg(cnj)) return T.pendente || Promise.resolve(T);
    T = { cnj: dg(cnj), sig: '', lib: false, porque: '', lendo: true };
    var t = token(cnj);
    var atual = T;
    atual.pendente = Promise.resolve().then(function () { return ses.api('/api/pauta?sigilo=' + encodeURIComponent(cnj) + (t ? '&t=' + encodeURIComponent(t) : '')); }).then(function (r) {
      if (T !== atual) return T;
      if (!r || typeof r.liberado !== 'boolean') throw new Error('Resposta de sigilo inválida.');
      T.sig = r.sigilo || ''; T.lib = r.liberado; T.porque = r.porque || ''; T.lendo = false; T.pendente = null; avisar(); return T;
    }).catch(function () {
      /* Sem confirmação do servidor, não ler nem gravar inteiro teor. */
      if (T !== atual) return T; T.lendo = false; T.lib = false; T.indisponivel = true; T.pendente = null; avisar(); return T;
    });
    return atual.pendente;
  }
  function desbloquear(senha) {
    var cnj = T.cnj, atual = T; if (!cnj || T.lendo || T.indisponivel) return Promise.resolve();
    T.erro = ''; T.envio = true; avisar();
    return ses.api('/api/pauta?sigilo=1', { method: 'POST', body: JSON.stringify({ cnj: cnj, senha: senha }) }).then(function (r) {
      if (T !== atual) return;
      if (!r || typeof r.token !== 'string' || !r.token) { T.envio = false; T.erro = 'Liberação não confirmada.'; avisar(); return; }
      try { sessionStorage.setItem(K + cnj, r.token); } catch (e) {}
      T.lib = true; T.porque = 'senha'; T.form = false; T.envio = false; avisar();
    }, function (e) { if (T !== atual) return; T.envio = false; T.erro = e.message || 'Senha incorreta.'; avisar(); });
  }
  /* documento sigiloso no PJe: o tipo ou a descrição dizem */
  function docSigiloso(d) { return !!d && /sigil|segredo de just/i.test(S(d.tipo) + ' ' + S(d.desc) + ' ' + S(d.descricao)); }
  var API = {
    consultar: consultar,
    sigiloso: function () { return !!T.sig; },
    bloqueado: function () { return !!(T.lendo || (T.cnj && !T.lib)); },
    /* documento: bloqueado se o processo está bloqueado ou se o documento é sigiloso e ninguém liberou */
    docBloqueado: function (d) { return API.bloqueado() || (docSigiloso(d) && !(T.lib && T.porque)); },
    docSigiloso: docSigiloso,
    token: function () { return token(T.cnj); },
    /* quantos documentos sigilosos a leitura achou (para o aviso) */
    docs: function (n) { if (T.docs !== n) { T.docs = n; } },
    html: function () {
      if (T.indisponivel) return '<div class="sg-b"><b>Sigilo não confirmado</b> · leitura e gravação do inteiro teor bloqueadas até confirmação do servidor <button type="button" class="lnk" data-sg="repetir">tentar novamente</button></div>';
      if (!T.sig && !T.lendo && !(T.docs && !T.porque)) return '';
      if (!T.sig && !T.lendo) return '<div class="sg-b">' + T.docs + (T.docs > 1 ? ' documentos sigilosos' : ' documento sigiloso') + ' nos autos · não são lidos nem gravados' +
        (T.form ? '<span class="sg-f"><input type="password" id="sg-senha" placeholder="senha" autocomplete="off" aria-label="Senha do sigilo"><button type="button" class="btn solid sm" data-sg="ok">Liberar</button></span>' : ' <button type="button" class="lnk" data-sg="abrir">liberar com senha</button>') + (T.erro ? '<small class="sg-e">' + esc(T.erro) + '</small>' : '') + '</div>';
      if (T.lendo) return '<div class="sg-b sg-l">Conferindo o sigilo do processo…</div>';
      if (T.lib) return '<div class="sg-b sg-ok" title="Liberado por ' + esc(T.porque === 'senha' ? 'senha (8 horas)' : T.porque) + '">' + esc(T.sig) + ' · liberado' + (T.porque === 'senha' ? ' com senha' : T.porque ? ' (' + esc(T.porque) + ')' : '') + '</div>';
      return '<div class="sg-b"><b>' + esc(T.sig) + '</b> · leitura e gravação do inteiro teor bloqueadas' +
        (T.form ? '<span class="sg-f"><input type="password" id="sg-senha" placeholder="senha" autocomplete="off" aria-label="Senha do sigilo"><button type="button" class="btn solid sm" data-sg="ok"' + (T.envio ? ' disabled' : '') + '>Liberar</button></span>'
          : ' <button type="button" class="lnk" data-sg="abrir">liberar com senha</button>') +
        (T.erro ? '<small class="sg-e">' + esc(T.erro) + '</small>' : '') + '</div>';
    }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-sg]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (b.getAttribute('data-sg') === 'repetir') { var cnj = T.cnj; if (cnj) { T.cnj = ''; consultar(cnj); avisar(); } return; }
    if (b.getAttribute('data-sg') === 'abrir') { T.form = true; avisar(); setTimeout(function () { var i = document.getElementById('sg-senha'); if (i) i.focus(); }, 0); return; }
    var i = document.getElementById('sg-senha'); if (i && S(i.value)) desbloquear(i.value);
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'sg-senha' && S(e.target.value)) { e.preventDefault(); desbloquear(e.target.value); } }, true);
  window.MutaSigilo = API;
})();
