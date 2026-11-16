
/* O código da Central referencia elementos das abas removidas; aqui ele recebe um elemento
   avulso e inofensivo no lugar, para que a inicialização siga até as abas mantidas. */
(function(){var IDS=new Set(["backBtn", "cmd-diretrizes-frame", "diretrizes", "lex", "lexClose", "lexOpen", "lexico", "lq", "regimento", "rit-assentos", "rit-gab", "rit-mapa", "rit-texto", "ritCited", "ritClose", "ritNotes", "ritOpen", "ritass", "ritcount", "ritdoc", "ritkey", "ritmap", "ritq"]);var cache={};
function dummy(id){return cache[id]||(cache[id]=document.createElement("div"));}
function nos(sel){for(var k in cache){try{var r=cache[k].querySelector(sel);if(r)return r;}catch(_){}}return null;}
var g=Document.prototype.getElementById;Document.prototype.getElementById=function(id){var r=g.call(this,id);if(r)return r;if(IDS.has(id))return dummy(id);try{return nos("#"+CSS.escape(id));}catch(_){return null;}};
var q=Document.prototype.querySelector;Document.prototype.querySelector=function(sel){var r=q.call(this,sel);if(r)return r;var m=/^#([A-Za-z0-9_-]+)\s*$/.exec(String(sel));if(m&&IDS.has(m[1]))return dummy(m[1]);return nos(sel);};
})();
