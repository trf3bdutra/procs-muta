import unittest
from sincronizar_banco import atualizar

class TestBanco(unittest.TestCase):
 def test_atualiza_por_cnj_sem_apagar_campos_operacionais(self):
  doc={"schema":"gabA.acervo","colunas":["Processo"],"registros":[{"id":"acv-00000000000000000001","processo":"00000000000000000001","Classe":"Classe da fonte oficial","Servidor":"Ana","Fase":"Triagem"}]}
  state={}
  raw={"numeroProcesso":"00000000000000000001","grau":"G1","classe":{"codigo":1,"nome":"Classe API"},"orgaoJulgador":{"codigo":91624,"nome":"Órgão"},"assuntos":[{"codigo":2,"nome":"Assunto"}],"movimentos":[{"nome":"Distribuído","dataHora":"2026-01-01"}]}
  new,state,report=atualizar(doc,state,{"registros":[raw],"total":1,"tribunal":"trf3","orgao":"91624"},"2026-01-02T00:00:00+00:00")
  row=new["registros"][0]
  self.assertEqual(row["Classe"],"Classe da fonte oficial")
  self.assertEqual(row["Servidor"],"Ana")
  self.assertEqual(row["DataJud · Classe"],"Classe API")
  self.assertEqual(report["totais"]["iguais"],1)
  self.assertEqual(len(new["registros"]),1)
 def test_novo_process_add_and_absent_is_retained(self):
  doc={"schema":"gabA.acervo","colunas":[],"registros":[]}
  new,state,report=atualizar(doc,{}, {"registros":[{"numeroProcesso":"00000000000000000002","classe":{"nome":"C"},"movimentos":[]}],"total":1},"2026-01-02")
  self.assertEqual(len(new["registros"]),1)
  self.assertEqual(report["totais"]["novos"],1)
  new2,_,rep2=atualizar(new,state,{"registros":[],"total":0},"2026-01-03")
  self.assertEqual(len(new2["registros"]),1)
  self.assertEqual(rep2["totais"]["ausentes"],1)

if __name__=='__main__':unittest.main()
