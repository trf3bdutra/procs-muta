/* Matriz e proposta: os registros importados continuam de leitura; os campos editáveis
   são os campos canônicos já utilizados pelo Minutário. Não confundir proposta com voto. */
(function(){
 var base=corpoRoteiro;
 function texto(k,alt){var v=V('triagem',k);return S(v)||S(alt);}
 function linha(rot,v){return '<div class="gf w"><span class="gl">'+esc(rot)+'</span><span class="ro">'+esc(S(v)||'—')+'</span></div>';}
 function bloco(){
   var m=window.MUTA_WEB&&window.MUTA_WEB.matriz||{};
   var h='<details class="gg pv-matriz" open><summary><h4>Matriz e proposta</h4><span class="gn">Triagem · Compendium</span></summary><div class="gr">';
   h+=linha('Coleção',texto('Registro - Lote',m.lote))+linha('Grupo / matriz',texto('Registro - Grupo',m.grupo))+linha('Variações',texto('Registro - Variações',m.variacoes));
   h+=linha('Proposta registrada na triagem',texto('Registro - Proposta',m.proposta))+linha('Modelo indicado na triagem',texto('Registro - Modelo',m.modelo));
   h+=linha('Resultado proposto pelo grupo',m.resultado);
   h+='<p class="muted">O registro de triagem não é resultado do julgamento. Os campos abaixo integram a ficha única.</p>';
   [['triagem','Tema','Tipo de caso / matéria'],['triagem','Alegações','Questões controvertidas'],['triagem','Especificidades','Particularidades'],['producao','Modelo aplicável','Modelo ou minuta-matriz'],['producao','Variação do modelo','Variação do modelo'],['producao','Tópico-síntese','Tópico-síntese'],['producao','Precedentes aplicáveis','Precedentes aplicáveis'],['producao','Distinção de precedente','Distinções']].forEach(function(x){h+=campoRot(x[0],x[1],x[2]);});
   return h+'</div></details>';
 }
 corpoRoteiro=function(){return base()+bloco();};
})();
