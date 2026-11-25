const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const R = path.join(__dirname, '../../..');
const read = p => fs.readFileSync(path.join(R, p), 'utf8');

/* acervo mínimo num diretório temporário; scripts/lotes/colecoes.py roda com CMT_RAIZ apontando para ele */
function acervo() {
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'colecoes-'));
  ['acervo/lotes', 'acervo/sessoes', 'acervo/triagem'].forEach(d => fs.mkdirSync(path.join(T, d), { recursive: true }));
  return T;
}
const poe = (T, rel, d) => fs.writeFileSync(path.join(T, rel), JSON.stringify(d, null, 1) + '\n');
const le = (T, rel) => JSON.parse(fs.readFileSync(path.join(T, rel), 'utf8'));
const roda = T => execFileSync('python3', ['-I', path.join(R, 'scripts/lotes/colecoes.py')], { env: { ...process.env, CMT_RAIZ: T }, encoding: 'utf8' });
const reg = (cnj, data) => ({ processo: cnj, origem: {}, triagem: data ? { 'Seleção Prévia': 'SELECIONADO PREVIAMENTE' } : {}, producao: {}, pauta: data ? { sessoes: [], 'Nova sessão de destino': data } : { sessoes: [] } });
const A = '5000001-11.2025.4.03.0000', B = '5000002-22.2025.4.03.0000', C = '5000003-33.2025.4.03.0000';

test('coleções: escaninhos da triagem viram lotes avulsos e o arquivo antigo fica marcado como migrado', () => {
  const T = acervo();
  poe(T, 'acervo/triagem/escaninhos.json', { schema: 'gabcmt.escaninhos', versao: 1, escaninhos: [
    { id: 'emwjs6hgo', titulo: 'CANDIDATOS À PAUTA // mais prováveis', subtitulo: 's', bilhete: 'b', cor: '#123456', criadoEm: '2026-11-01T00:00:00Z', processos: [A, B] }] });
  poe(T, 'acervo/operacional.json', { registros: [reg(A), reg(B)] });
  poe(T, 'acervo/sessoes/calendario.json', { sessoes: [] });
  roda(T);
  const L = le(T, 'acervo/lotes/esc-emwjs6hgo.json');
  assert.equal(L.tipo, 'avulso'); assert.equal(L.colecao, 'avulsos'); assert.equal(L.origem, 'escaninho');
  assert.equal(L.cor, '#123456'); assert.equal(L.bilhete, 'b');
  assert.deepEqual(L.itens.map(i => i.processo), [A, B]);
  const E = le(T, 'acervo/triagem/escaninhos.json');
  assert.ok(E.migrado); assert.deepEqual(E.escaninhos, []); assert.deepEqual(E.lotes, ['esc-emwjs6hgo']);
  const I = le(T, 'acervo/lotes/colecoes.json');
  assert.equal(I.colecoes.avulsos[0].id, 'esc-emwjs6hgo'); assert.equal(I.colecoes.avulsos[0].escaninho, true);
  assert.match(roda(T), /nada a mudar/, 'segunda rodada não muda nada');
});

test('coleções: seleção prévia por sessão futura, retirados e arquivamento quando entra a pauta oficial', () => {
  const T = acervo();
  poe(T, 'acervo/operacional.json', { registros: [reg(A, '10/01/2099'), reg(B, '10/01/2099'), reg(C, '10/02/2099')] });
  poe(T, 'acervo/sessoes/calendario.json', { sessoes: [{ date: '2099-01-10' }, { date: '2099-02-10' }] });
  poe(T, 'acervo/sessoes/2099-02-10.json', { itens: [{ cnj: C, item: 1 }] });
  roda(T);
  const S = le(T, 'acervo/lotes/selecao-2099-01-10.json');
  assert.equal(S.tipo, 'selecao'); assert.equal(S.colecao, 'selecao-previa'); assert.deepEqual(S.sessoes, ['2099-01-10']);
  assert.deepEqual(S.itens.map(i => i.processo), [A, B]);
  assert.ok(!fs.existsSync(path.join(T, 'acervo/lotes/selecao-2099-02-10.json')), 'sessão com pauta oficial não ganha seleção prévia');
  let I = le(T, 'acervo/lotes/colecoes.json');
  assert.deepEqual(I.colecoes['selecao-previa'].map(x => x.id), ['selecao-2099-01-10']);
  assert.ok(I.colecoes.pautas.some(x => x.id === 'pauta-2099-02-10'));
  /* B sai da seleção: vai para retirados com o que já foi registrado */
  const S1 = le(T, 'acervo/lotes/selecao-2099-01-10.json'); S1.itens[1].observacao = 'registrado'; poe(T, 'acervo/lotes/selecao-2099-01-10.json', S1);
  poe(T, 'acervo/operacional.json', { registros: [reg(A, '10/01/2099'), reg(B), reg(C, '10/02/2099')] });
  roda(T);
  const S2 = le(T, 'acervo/lotes/selecao-2099-01-10.json');
  assert.deepEqual(S2.itens.map(i => i.processo), [A]);
  assert.equal(S2.retirados[0].processo, B); assert.equal(S2.retirados[0].observacao, 'registrado');
  /* entra a pauta oficial de 10/01/2099: o lote de seleção é arquivado e a sessão passa à coleção Pautas */
  poe(T, 'acervo/sessoes/2099-01-10.json', { itens: [{ cnj: A, item: 1 }] });
  roda(T);
  assert.equal(le(T, 'acervo/lotes/selecao-2099-01-10.json').arquivado, true);
  I = le(T, 'acervo/lotes/colecoes.json');
  assert.deepEqual(I.colecoes['selecao-previa'], []);
  assert.ok(I.colecoes.pautas.some(x => x.id === 'pauta-2099-01-10'));
});

test('coleções: banco reserva (seleção prévia sem sessão) agrupado pela triagem; ao ganhar sessão, sai da reserva', () => {
  const T = acervo();
  const sel = (cnj, d) => ({ processo: cnj, origem: {}, triagem: { 'Seleção Prévia': 'SELECIONADO PREVIAMENTE' }, producao: {}, pauta: { sessoes: [], 'Nova sessão de destino': d } });
  poe(T, 'acervo/operacional.json', { registros: [sel(A, ''), sel(B, ''), sel(C, '10/01/2099')] });
  poe(T, 'acervo/sessoes/calendario.json', { sessoes: [{ date: '2099-01-10' }] });
  poe(T, 'acervo/lotes/adp-serie-x.json', { id: 'adp-serie-x', tipo: 'triagem', titulo: 'Série · Militar', grupos: [{ id: 'M1', rotulo: 'Reforma' }],
    itens: [{ processo: A, grupo: 'M1', tipo_caso: 'Apelação militar', resultado: 'Voto' }] });
  poe(T, 'acervo/lotes/adp-ap-1s.json', { id: 'adp-ap-1s', tipo: 'triagem', titulo: 'Apelações', grupos: [],
    itens: [{ processo: A, tipo_caso: 'outro' }, { processo: B, assunto: 'FIES', tipo_caso: 'Apelação FIES' }] });
  roda(T);
  const L = le(T, 'acervo/lotes/selecao-reserva.json');
  assert.equal(L.tipo, 'selecao'); assert.equal(L.colecao, 'selecao-previa'); assert.deepEqual(L.sessoes, []); assert.equal(L.reserva, true);
  assert.deepEqual(L.itens.map(i => i.processo), [A, B]);
  assert.equal(L.itens[0].tipo_caso, 'Apelação militar', 'a série entre lotes vem antes do lote de origem');
  assert.deepEqual(L.grupos.map(g => g.rotulo), ['Militar', 'FIES']);
  let I = le(T, 'acervo/lotes/colecoes.json');
  assert.deepEqual(I.colecoes['selecao-previa'].map(x => [x.id, !!x.reserva]), [['selecao-2099-01-10', false], ['selecao-reserva', true]], 'a reserva vem depois das sessões');
  /* A recebe sessão: sai da reserva (vai para retirados) e entra na seleção da sessão */
  poe(T, 'acervo/operacional.json', { registros: [sel(A, '10/01/2099'), sel(B, ''), sel(C, '10/01/2099')] });
  roda(T);
  assert.deepEqual(le(T, 'acervo/lotes/selecao-reserva.json').itens.map(i => i.processo), [B]);
  assert.deepEqual(le(T, 'acervo/lotes/selecao-2099-01-10.json').itens.map(i => i.processo).sort(), [A, C].sort());
  assert.match(roda(T), /nada a mudar/, 'segunda rodada não muda nada');
});

test('coleções: Caput, Collectio, alimentar e fluxo usam a mesma fonte', () => {
  const tri = read('caput/triagem/index.html');
  assert.ok(tri.includes("const ESC_IDX = 'acervo/lotes/colecoes.json'"), 'Caput lê o índice das coleções');
  /* o escaninho vira lote avulso em scripts/lotes/colecoes.py (fonte única), não mais no próprio Caput */
  assert.match(read('scripts/lotes/colecoes.py'), /lote_novo\(id_, 'avulso', [^\n]*origem='escaninho'/, 'escaninho novo nasce como lote avulso');
  const col = read('scripts/lotes/colecoes.py');
  assert.ok(col.includes("'migrado': 'acervo/lotes (coleção Avulsos do Collectio)'"), 'arquivo antigo marcado como migrado');
  assert.ok(col.includes("id_ = 'esc-' + re.sub("), 'id do escaninho vira id de lote');
  const api = read('apoio/ex-officio/api/_lote.js');
  assert.ok(api.includes("if (l.tipo === 'selecao') return 'selecao'"));
  assert.ok(api.includes("selecao:lotes.filter(l=>l.tipo==='selecao'&&!l.arquivado)"));
  assert.ok(api.includes("dados.schema !== 'gabcmt.lote'"), 'colecoes.json não aparece como lote');
  const pg = read('apoio/ex-officio/lotes/index.html');
  /* Triagem (tarefas, séries e escaninhos) e Seleção prévia foram integradas à aba de triagem do Caput: o Collectio só avisa */
  assert.ok(pg.includes('Seleção prévia') && /lotes das tarefas, séries e escaninhos/.test(pg));
  const al = read('scripts/lotes/alimentar.py');
  assert.ok(al.includes("L.get('arquivado')") && al.includes('sorted(todos, key=prioridade)'));
  const wf = read('.github/workflows/lotes-alimentar.yml');
  assert.ok(wf.indexOf('python3 scripts/lotes/colecoes.py') >= 0 && wf.indexOf('python3 scripts/lotes/colecoes.py') < wf.indexOf('python3 scripts/lotes/alimentar.py'), 'coleções antes do alimentar, no mesmo job horário');
  assert.ok(!fs.existsSync(path.join(R, '.github/workflows/lotes-colecoes.yml')), 'sem job por gravação');
});
