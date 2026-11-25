import json
import tempfile
import unittest
from pathlib import Path
from atualizar_normas import citations, diploma, gerar

class RepertorioTest(unittest.TestCase):
    def test_citacoes(self):
        self.assertEqual({(diploma(d),a) for d,a in citations('artigos 98 e 99, CPC; artigo 85, § 11, do CPC')}, {('lei 13105/2015','98'),('lei 13105/2015','99'),('lei 13105/2015','85')})
        self.assertNotIn(('CPC','11'), citations('CPC, artigo 85, § 11'))
        self.assertFalse(citations('artigo 85'))
    def test_geracao(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t)
            (root/'precedentes').mkdir()
            r={'id':'P1','processo':'TESTE','dataJulgamento':'2026-11-25','dispositivosCitados':'CPC, artigos 85 e 99'}
            (root/'precedentes/precedentes.jsonl').write_text(json.dumps(r)+'\n'+json.dumps(r)+'\n', encoding='utf-8')
            (root/'precedentes/collegium').mkdir()
            (root/'precedentes/collegium/precedentes.jsonl').write_text(json.dumps(dict(r,processo='OUTRO',dispositivosCitados='CPC, artigo 100'))+'\n',encoding='utf-8')
            snapshot={'Normas':[{'Código':'CPC-85','Diploma':'CPC','Dispositivo':'85'}]}
            auto,uses=gerar(root,snapshot,[],[])
            self.assertEqual(len(auto),1)
            self.assertEqual(auto[0]['Dispositivo'],'99')
            self.assertEqual(auto[0]['Texto literal'],'')
            self.assertEqual(len(uses),2)
            self.assertEqual({u['Processo'] for u in uses},{'TESTE'})
            self.assertIn('CPC-85',{u['Código do item'] for u in uses})

if __name__=='__main__':
    unittest.main()
