/* Ex Officio · funções do servidor (Vercel). O token do GitHub e as senhas ficam só nas variáveis de ambiente da Vercel:
   GH_TOKEN            token com permissão Contents (leitura e gravação) no trf3bdutra/procs-muta
   CMT_USERS_JSON      {"BRUNO":"senha","VICTOR":"outra",...}  (nome de login = nome do servidor na pauta)
   TEAM_LOGIN_PASSWORD senha comum, opcional, para quem não estiver em CMT_USERS_JSON (só nomes de CMT_EQUIPE)
   CMT_EQUIPE          lista de nomes separados por vírgula, opcional (aparece na tela de entrada)
   CMT_SESSION_SECRET  segredo longo e aleatório para assinar o cookie de sessão
   CMT_GESTOR          nomes com acesso restrito de gestão (avisos e notificações), separados por vírgula; padrão: Bruno */
const crypto = require('crypto');
const REPO = 'trf3bdutra/procs-muta', RAMO = 'main', HORAS = 12;
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
function usuarios() { let u = {}; try { u = JSON.parse(process.env.CMT_USERS_JSON || '{}'); } catch (e) {} const o = {}; Object.keys(u).forEach(k => { o[norm(k)] = { nome: k, senha: String(u[k]) }; }); return o; }
function equipe() {
  const U = usuarios(), extra = String(process.env.CMT_EQUIPE || '').split(',').map(s => s.trim()).filter(Boolean), out = {};
  Object.values(U).forEach(x => { out[norm(x.nome)] = x.nome; }); extra.forEach(n => { if (!out[norm(n)]) out[norm(n)] = n; });
  return Object.values(out).sort((a, b) => a.localeCompare(b, 'pt'));
}
function igual(a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); }
function conferir(usuario, senha) {
  const k = norm(usuario), U = usuarios();
  if (U[k]) return igual(U[k].senha, senha) ? U[k].nome : null;
  const time = process.env.TEAM_LOGIN_PASSWORD, nomes = equipe();
  const n = nomes.find(x => norm(x) === k);
  return time && n && igual(time, senha) ? n : null;
}
function segredo() { const s = process.env.CMT_SESSION_SECRET; if (!s || s.length < 24) throw new Error('CMT_SESSION_SECRET ausente ou curto'); return s; }
function assinar(v) { return crypto.createHmac('sha256', segredo()).update(v).digest('base64url'); }
function emitir(res, nome) {
  const exp = Date.now() + HORAS * 3600e3, v = Buffer.from(JSON.stringify({ u: nome, e: exp })).toString('base64url');
  res.setHeader('Set-Cookie', `cmt_eq=${v}.${assinar(v)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${HORAS * 3600}`);
}
function sair(res) { res.setHeader('Set-Cookie', 'cmt_eq=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'); }
function quem(req) {
  const m = /(?:^|;\s*)cmt_eq=([^;]+)/.exec(req.headers.cookie || ''); if (!m) return null;
  const [v, s] = m[1].split('.'); if (!v || !s) return null;
  try { if (!igual(assinar(v), s)) return null; const o = JSON.parse(Buffer.from(v, 'base64url').toString()); return o.e > Date.now() ? o.u : null; } catch (e) { return null; }
}
function exigir(req, res) { const u = quem(req); if (!u) { res.status(401).json({ erro: 'Entre com o seu nome e a sua senha.' }); return null; } return u; }
async function gh(caminho, op = {}) {
  const t = process.env.GH_TOKEN; if (!t) throw new Error('GH_TOKEN ausente na Vercel');
  const r = await fetch('https://api.github.com/repos/' + REPO + caminho, { ...op, headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + t, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', ...(op.headers || {}) } });
  if (!r.ok) { let m = ''; try { m = (await r.json()).message || ''; } catch (e) {} const er = new Error('GitHub HTTP ' + r.status + (m ? ' · ' + m : '')); er.status = r.status; throw er; }
  return r.json();
}
/* planilhas do Google: avisa o Apps Script (implantação App da Web) que o repositório mudou, para atualizar na hora.
   Não espera a sincronização terminar (corta em 1,5 s); gravação vinda da própria planilha não avisa. */
async function avisarPlanilha(msg) {
  const url = process.env.CMT_PLANILHA_WEBHOOK, tok = process.env.CMT_PLANILHA_TOKEN;
  if (!url || !tok || /\(Planilha Google\)/.test(String(msg || ''))) return;
  const c = new AbortController(), t = setTimeout(() => c.abort(), 1500);
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok }), redirect: 'manual', signal: c.signal }); } catch (e) {} finally { clearTimeout(t); }
}
async function lerJson(rel) {
  const o = await gh('/contents/' + rel + '?ref=' + RAMO);
  const txt = Buffer.from(o.content, 'base64').toString('utf8');
  return { dados: JSON.parse(txt), sha: o.sha };
}
async function gravarJson(rel, dados, sha, msg) {
  const r = await gh('/contents/' + rel, { method: 'PUT', body: JSON.stringify({ message: msg, content: Buffer.from(JSON.stringify(dados, null, 1) + '\n').toString('base64'), sha, branch: RAMO }) });
  await avisarPlanilha(msg); return r;
}
const gestor = u => String(process.env.CMT_GESTOR || 'Bruno').split(',').map(norm).filter(Boolean).includes(norm(u));
const dataOk = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
/* perfil no Modus Operandi (apoio/acessos.json): equipe (padrão) < avancado < editor < desembargador; cada perfil inclui o anterior; vale o nome do login ou um apelido do cadastro da equipe */
let ACC = null, ACC_T = 0;
async function acessos(usuario) {
  if (!ACC || Date.now() - ACC_T > 60e3) {
    const [a, e] = await Promise.all([lerJson('apoio/acessos.json'), lerJson('apoio/equipe.json').catch(() => ({ dados: { registros: [] } }))]);
    ACC = { a: a.dados, eq: e.dados.registros || [] }; ACC_T = Date.now();
  }
  const u = norm(usuario), reg = ACC.eq.find(r => [r.nome].concat(r.aliases || []).some(n => norm(n) === u));
  const nomes = new Set([u].concat(reg ? [reg.nome].concat(reg.aliases || []).map(norm) : []));
  const tem = lista => (lista || []).some(n => nomes.has(norm(n)));
  const P = ACC.a.perfis || { avancado: ACC.a.compendioAvancado, editor: ACC.a.editor };
  const desembargador = tem(P.desembargador), editor = desembargador || tem(P.editor), avancado = editor || tem(P.avancado);
  return { perfil: desembargador ? 'desembargador' : editor ? 'editor' : avancado ? 'avancado' : 'equipe', avancado, editor, desembargador };
}
/* arquivos grandes (mais de 1 MB) vêm pelo blob. O texto fica guardado nesta instância do servidor e só é baixado
   de novo quando o arquivo muda no GitHub (a conferência do sha é uma consulta leve). */
const GRANDE = new Map(), VOO = new Map();
async function lerGrande(rel) {
  /* leituras simultâneas do mesmo arquivo (pauta, monocráticas, metas na mesma instância) compartilham uma só ida ao GitHub */
  if (VOO.has(rel)) return VOO.get(rel);
  const p = (async () => {
    const o = await gh('/contents/' + rel + '?ref=' + RAMO), c = GRANDE.get(rel);
    if (c && c.sha === o.sha) return { txt: c.txt, sha: o.sha };
    let txt;
    if (o.content && o.encoding === 'base64') txt = Buffer.from(o.content, 'base64').toString('utf8');
    else {
      /* arquivo grande: texto cru (sem base64), mais leve que o blob */
      const t = process.env.GH_TOKEN, r = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + rel + '?ref=' + RAMO, { headers: { Accept: 'application/vnd.github.raw+json', Authorization: 'Bearer ' + t, 'X-GitHub-Api-Version': '2022-11-28' } });
      if (r.ok) txt = await r.text(); else txt = Buffer.from((await gh('/git/blobs/' + o.sha)).content, 'base64').toString('utf8');
    }
    GRANDE.set(rel, { sha: o.sha, txt });
    return { txt, sha: o.sha };
  })();
  VOO.set(rel, p); p.finally(() => VOO.delete(rel)).catch(() => {});
  return p;
}
/* um commit com vários arquivos (Git Data API) */
/* commit de vários arquivos; se um arquivo traz "sha" (o lido antes), confere que ainda é o mesmo no commit de base: se mudou, erro 409 para nova tentativa.
   A atualização do ramo não é forçada: se outro commit entrar no meio, o GitHub recusa (422). */
async function commitArquivos(arqs, msg) {
  const ref = await gh('/git/ref/heads/' + RAMO), base = await gh('/git/commits/' + ref.object.sha);
  for (const f of arqs) {
    if (!f.sha) continue;
    let atual = null; try { atual = (await gh('/contents/' + f.path + '?ref=' + ref.object.sha)).sha; } catch (e) { if (e.status !== 404) throw e; }
    if (atual !== f.sha) { const e = new Error('arquivo mudou no GitHub: ' + f.path); e.status = 409; throw e; }
  }
  const tree = await Promise.all(arqs.map(async f => ({ path: f.path, mode: '100644', type: 'blob', sha: (await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: f.txt, encoding: 'utf-8' }) })).sha })));
  const t = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree }) });
  const c = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: msg, tree: t.sha, parents: [ref.object.sha] }) });
  await gh('/git/refs/heads/' + RAMO, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
  await avisarPlanilha(msg);
  return c;
}
module.exports = { gh, gestor, norm, equipe, conferir, emitir, sair, quem, exigir, lerJson, gravarJson, dataOk, acessos, lerGrande, commitArquivos };
