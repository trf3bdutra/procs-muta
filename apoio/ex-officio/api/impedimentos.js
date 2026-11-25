/* Referencial interno de impedimentos e suspeições: somente leitura, sessão Office obrigatória. */
const L=require('./_lib');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({erro:'Método não aceito'});
 if(!L.exigir(req,res))return;
 try{
  const [{dados},{dados:agenda}]=await Promise.all([L.lerJson('apoio/regras/impedimentos.json'),L.lerJson('acervo/sessoes/agenda.json')]);
  const {atualizadoEm,nota,regra,nota_advogados,origens,varas,julgadores,advogados,processosMarcados}=dados;
  const convocacoes=(agenda.itens||[]).filter(i=>i&&i.tipo==='evento'&&!i.privado&&i.freq==='unica'&&/^Convocação\s*·\s*/i.test(i.titulo||'')&&/^\d{4}-\d{2}-\d{2}$/.test(i.data||'')).map(i=>({data:i.data,secao:i.titulo.replace(/^Convocação\s*·\s*/i,''),hora:i.hora||'',obs:'Impedimentos e suspeições',id:i.id})).sort((a,b)=>a.data.localeCompare(b.data));
  return res.status(200).json({atualizadoEm,nota,regra,nota_advogados,origens,varas,julgadores,advogados,convocacoes,processosMarcados});
 }catch(e){return res.status(502).json({erro:'Não foi possível consultar a base de impedimentos e suspeições.'});}
};
