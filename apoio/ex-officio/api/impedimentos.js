/* Referencial interno de impedimentos e suspeições: somente leitura, sessão Office obrigatória. */
const L=require('./_lib');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({erro:'Método não aceito'});
 if(!L.exigir(req,res))return;
 try{
  const {dados}=await L.lerJson('apoio/regras/impedimentos.json');
  const {atualizadoEm,nota,regra,nota_advogados,origens,varas,julgadores,advogados,convocacoes,processosMarcados}=dados;
  return res.status(200).json({atualizadoEm,nota,regra,nota_advogados,origens,varas,julgadores,advogados,convocacoes,processosMarcados});
 }catch(e){return res.status(502).json({erro:'Não foi possível consultar a base de impedimentos e suspeições.'});}
};
