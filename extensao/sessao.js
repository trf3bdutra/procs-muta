/* Muta · sessão do Ex Officio no painel
   Usa o mesmo login da equipe (cookie cmt_eq de www.gabinete-cmt.com, emitido por /api/login).
   Quem já entrou no Ex Officio neste Chrome entra no painel sem digitar de novo. */
(function () {
  'use strict';
  var SITE = Muta.SITE;
  var S = { usuario: '', gestor: false, perfil: '', estado: 'verificando', erro: '' };   /* estado: verificando | on | off | erro */
  var ouvintes = [], voo = null;

  function avisar() { ouvintes.forEach(function (f) { try { f(S); } catch (e) {} }); }
  function api(caminho, op) {
    op = op || {};
    var h = { 'Accept': 'application/json' };
    if (op.body) h['Content-Type'] = 'application/json';
    return fetch(SITE + caminho, { method: op.method || 'GET', credentials: 'include', cache: 'no-store', headers: h, body: op.body })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 401) { if (S.estado === 'on') { S.estado = 'off'; S.usuario = ''; avisar(); } }
          if (!r.ok) { var e = new Error(j.erro || ('HTTP ' + r.status)); e.status = r.status; e.dados = j; throw e; }
          return j;
        });
      });
  }
  function aplicar(j) { S.usuario = j.usuario || ''; S.gestor = !!j.gestor; S.perfil = j.perfil || ''; S.estado = S.usuario ? 'on' : 'off'; S.erro = ''; avisar(); }
  function verificar() {
    if (voo) return voo;
    voo = api('/api/login').then(aplicar).catch(function (e) {
      if (e.status === 401) { S.estado = 'off'; S.usuario = ''; S.erro = ''; }
      else { S.estado = 'erro'; S.erro = e.message; }
      avisar();
    }).then(function () { voo = null; return S; });
    return voo;
  }
  function entrar(usuario, senha) {
    return api('/api/login', { method: 'POST', body: JSON.stringify({ usuario: usuario, senha: senha }) }).then(function (j) { aplicar(j); return S; });
  }
  function sair() {
    return api('/api/login', { method: 'DELETE' }).catch(function () {}).then(function () { S.estado = 'off'; S.usuario = ''; avisar(); });
  }

  /* formulário de entrada, desenhado dentro de "caixa" */
  function formulario(caixa, titulo) {
    caixa.replaceChildren();
    var f = document.createElement('form'); f.className = 'login card';
    f.innerHTML = '<h3 class="display"></h3><p class="muted">Mesmo nome e senha do Ex Officio. Se você já entrou no Ex Officio neste Chrome, basta recarregar.</p>' +
      '<label class="f">Nome<input type="text" name="u" autocomplete="username" required></label>' +
      '<label class="f">Senha<input type="password" name="s" autocomplete="current-password" required></label>' +
      '<div class="bar"><button class="btn solid" type="submit">Entrar</button><button class="btn line" type="button" data-r>Já entrei · verificar</button></div><p class="status" role="status"></p>';
    f.querySelector('h3').textContent = titulo || 'Entrar no Ex Officio';
    var st = f.querySelector('.status');
    if (S.estado === 'erro') { st.textContent = 'Não foi possível falar com o site do gabinete: ' + S.erro; st.className = 'status err'; }
    f.addEventListener('submit', function (e) {
      e.preventDefault(); st.textContent = 'Entrando…'; st.className = 'status';
      entrar(f.u.value.trim(), f.s.value).then(function () { f.s.value = ''; })
        .catch(function (er) { st.textContent = er.message || 'Não foi possível entrar.'; st.className = 'status err'; });
    });
    f.querySelector('[data-r]').addEventListener('click', function () { st.textContent = 'Verificando…'; verificar().then(function () { if (S.estado !== 'on') { st.textContent = S.estado === 'erro' ? 'Sem conexão com o site: ' + S.erro : 'Sessão não encontrada. Entre com nome e senha.'; st.className = 'status err'; } }); });
    caixa.append(f);
  }

  window.MutaSessao = {
    estado: function () { return S; },
    verificar: verificar, entrar: entrar, sair: sair, api: api, formulario: formulario,
    ouvir: function (f) { ouvintes.push(f); }
  };
  verificar();
})();
