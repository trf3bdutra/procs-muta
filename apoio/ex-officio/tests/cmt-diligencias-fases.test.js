'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
test('CMT · diligências: cada fase minimizável e "Concluída" abre minimizada',()=>{
 for(const x of ['data-cdmin=','function cmtDilMin()',"{'Concluída':true}","#v-cmt .cmt-col.mini .cmt-col-b{display:none}"]) assert.ok(app.includes(x),x);
});
