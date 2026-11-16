/* ================= SÉRIE COMPLETA: os demais julgados do Relator entram no Ementário =================
   Camada de dados, sem tela própria. O Ementário carrega a curadoria do gabinete e, logo depois,
   acrescenta o resto da série (precedentes/jurisprudencia): índice compacto de início e o arquivo
   do ano sob demanda, quando se abre um julgado que ainda não tem curadoria. */
(function(){
  var SH={};
  function bases(){return location.protocol==='file:'?['../../precedentes/jurisprudencia/']:['/precedentes/jurisprudencia/','../../precedentes/jurisprudencia/'];}
  function lerGz(caminho){
    var L=bases(),i=0;
    var tenta=function(){
      return fetch(L[i]+caminho,{cache:'force-cache'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();})
        .then(function(buf){
          if(typeof DecompressionStream==='undefined')throw new Error('o navegador não descomprime gzip');
          return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();})
        .then(function(t){return JSON.parse(t);})
        .catch(function(er){if(++i<L.length)return tenta();throw new Error('não foi possível ler '+caminho+': '+er.message);});
    };
    return tenta();
  }
  /* índice da série: 33.207 registros resumidos */
  window.JR_indice=function(){return lerGz('indice.json.gz').then(function(d){return (d&&d.registros)||d||[];});};
  /* o julgado inteiro: baixa o arquivo do ano e devolve o registro da base do TRF-3 */
  window.JR_teor=function(x){
    var nome=(x._st==='A'?'acordaos/':'monocraticas/')+x._sy;
    var p=SH[nome]?Promise.resolve(SH[nome]):lerGz(nome+'.json.gz').then(function(d){
      var L=(d&&d.registros)||d||[],m={};L.forEach(function(r){m[r.id]=r;});SH[nome]=m;return m;});
    return p.then(function(m){return m[x._sid]||null;});
  };
})();
