/* Gabinete CMT · loader compartilhado */
(function(W,D){
'use strict';
var PATHS=[
"M349.96 304.90L349.96 287.14C349.96 280.71 344.75 275.50 338.33 275.50L319.34 275.50L327.63 283.46L336.49 283.46C342.58 283.46 347.51 288.40 347.51 294.49L347.51 302.55L349.96 304.90",
"M352.41 233.85L352.41 251.61C352.41 258.04 357.62 263.25 364.05 263.25L383.04 263.25L374.74 255.29L365.89 255.29C359.80 255.29 354.86 250.35 354.86 244.26L354.86 236.20L352.41 233.85",
"M349.96 261.41L349.96 243.65L341.39 251.88L341.39 259.58C341.39 266.00 336.18 271.21 329.75 271.21L321.25 271.21L319.34 273.05L338.33 273.05C344.75 273.05 349.96 267.84 349.96 261.41",
"M352.41 277.34L352.41 295.10L360.99 286.87L360.99 279.18C360.99 272.75 366.20 267.54 372.63 267.54L381.12 267.54L383.04 265.70L364.05 265.70C357.62 265.70 352.41 270.91 352.41 277.34"
];
var SCREENS={
 access:{heading:"",stage:"Confirmando seu acesso…"},
 welcome:{heading:"Bom dia, ",focus:"Servidor.",stage:"Preparando os processos e os dados da equipe…",welcome:"Que bom ter você aqui. A Turma estava esperando por você."},
 server:{heading:"Campo do ",focus:"Servidor",stage:"Preparando a página do servidor…"},
 pauta:{heading:"Pauta de ",focus:"Julgamento",stage:"Preparando a pauta da sessão e os processos…"},
 triagem:{heading:"Controle de ",focus:"Triagem",stage:"Preparando a triagem e os escaninhos…"},
 decisions:{heading:"Controle de ",focus:"Monocráticas",stage:"Preparando as decisões e os prazos…"},
 mesa:{heading:"Mesa do ",focus:"Desembargador.",stage:"Sincronizando os processos e os avisos…"},
 overlay:{heading:"Salvando ajustes",stage:"Aguarde enquanto os dados são atualizados…"},
 inline:{heading:"",stage:"Carregando os dados do gabinete…"},
 error:{heading:"",stage:"Não foi possível concluir o carregamento."}
};
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]})}
function svg(cls){return '<svg'+(cls?' class="'+cls+'"':'')+' viewBox="319.34 233.85 63.7 71.05" aria-hidden="true">'+PATHS.map(function(d){return '<path d="'+d+'" fill="currentColor"/>'}).join('')+'</svg>'}
function copy(el,o){var id=(o&&o.screen)||el.dataset.cmtLoaderScreen||"inline",b=Object.assign({},SCREENS[id]||SCREENS.inline,o||{});b.office=b.office||el.dataset.cmtLoaderOffice||"Gabinete do Des. Fed. Carlos Muta";return b}
/* Marca do TRF-3: só o símbolo da Justiça Federal, nas cores do Manual de Identidade da JF (cinza #9ea2a5, azul #174e7f, verde #00884a; padrao/identidade/jf/jf-simbolo-cor.svg), dentro de um círculo branco.
   Estática: jamais animar. */
function lockup(){var cores=['#9ea2a5','#9ea2a5','#174e7f','#00884a'];return '<span class="cmtl-trf3 circ" role="img" aria-label="Justiça Federal · Tribunal Regional Federal da 3ª Região"><svg viewBox="303.19 221.375 96 96" aria-hidden="true"><circle cx="351.19" cy="269.375" r="47.5" fill="#fff"/><g transform="translate(351.19 269.375) scale(.82) translate(-351.19 -269.375)">'+PATHS.map(function(d,i){return '<path d="'+d+'" fill="'+cores[i]+'"/>'}).join('')+'</g></svg></span>'}
function brand(){return lockup().replace('class="cmtl-trf3 ','class="cmtl-brand cmtl-trf3 ')}
function fullMarkup(el,o){var b=copy(el,o),title=b.heading||b.focus?'<h1 class="cmtl-heading">'+esc(b.heading||"")+(b.focus?'<em>'+esc(b.focus)+'</em>':'')+'</h1>':'';return '<div class="cmtl-watermark">'+svg()+'</div><section class="cmtl-content" role="status" aria-live="polite"><span class="cmtl-mark">'+brand()+'</span><p class="cmtl-identity">'+esc(b.office)+'</p>'+title+(b.welcome?'<p class="cmtl-welcome">'+esc(b.welcome)+'</p>':'')+'<div class="cmtl-track"><i></i></div><p class="cmtl-stage">'+esc(b.stage||"Carregando…")+'</p></section>'}
function inlineMarkup(el,o){var b=copy(el,o);return '<div class="cmtl-inline" role="status" aria-live="polite"><span class="cmtl-mini">'+brand()+'</span><div class="cmtl-inline-copy"><b>'+esc(b.stage||"Carregando…")+'</b><div class="cmtl-inline-track"><i></i></div>'+(b.detail?'<span>'+esc(b.detail)+'</span>':'')+'</div></div>'}
function adoptLegacy(el){el.classList.add("cmtl-legacy");var star=el.querySelector(".cmt-ld-mk");if(star&&!star.querySelector(".cmtl-brand"))star.innerHTML=brand();var bar=el.querySelector(".cmt-ld-b");if(bar&&!bar.querySelector("i"))bar.appendChild(D.createElement("i"))}
function adoptInline(el){el.classList.add("cmtl-adopt-inline");if(!el.querySelector(":scope > .cmtl-mini")){var mini=D.createElement("span");mini.className="cmtl-mini";mini.innerHTML=brand();el.insertBefore(mini,el.firstChild);var tr=D.createElement("div");tr.className="cmtl-inline-track";tr.innerHTML="<i></i>";mini.insertAdjacentElement("afterend",tr)}}
function mount(el,o){if(typeof el==="string")el=D.querySelector(el);if(!el)return null;var mode=(o&&o.mode)||el.dataset.cmtLoader||"inline";if(o&&o.family)el.dataset.cmtLoaderFamily=o.family;if(mode==="legacy"){adoptLegacy(el);return el}if(mode==="adopt-inline"){adoptInline(el);return el}if(mode==="full"){el.classList.add("cmtl-full");el.innerHTML=fullMarkup(el,o)}else if(mode==="overlay"){el.classList.add("cmtl-overlay");el.innerHTML=fullMarkup(el,Object.assign({screen:"overlay"},o||{}))}else{el.innerHTML=inlineMarkup(el,o)}return el}
function update(el,o){if(typeof el==="string")el=D.querySelector(el);if(!el)return;var mode=el.dataset.cmtLoader||"inline";if(mode==="legacy"){if(o&&o.stage){var m=el.querySelector(".cmt-ld-m");if(m)m.textContent=o.stage}if(o&&o.welcome){var s=el.querySelector(".cmt-ld-s");if(s)s.textContent=o.welcome}return}mount(el,Object.assign({mode:mode},o||{}))}
function hide(el,remove){if(typeof el==="string")el=D.querySelector(el);if(!el)return;el.classList.add("saindo");setTimeout(function(){if(remove)el.remove();else el.style.display="none"},280)}
function showOverlay(o){var el=D.createElement("div");el.dataset.cmtLoader="overlay";el.dataset.cmtLoaderFamily=(o&&o.family)||"office";D.body.appendChild(el);mount(el,Object.assign({mode:"overlay"},o||{}));return {element:el,close:function(){hide(el,true)},update:function(x){update(el,x)}}}
function boot(){D.querySelectorAll("[data-cmt-loader]").forEach(function(el){if(el.dataset.cmtLoaderReady)return;el.dataset.cmtLoaderReady="1";mount(el)})}
W.GabineteLoader={mount:mount,update:update,hide:hide,overlay:showOverlay,screens:SCREENS,boot:boot};
function bindLogin(){
 var form=D.getElementById("en-form"),btn=D.getElementById("en-go");
 if(!form||!btn||form.dataset.cmtBrandReady)return;
 form.dataset.cmtBrandReady="1";
 var top=D.querySelector("#entrada .en-top");
 if(top){var old=top.querySelector("i");if(old)old.remove();var img=D.createElement("img");img.className="cmtl-login-brand";img.src="/padrao/loading/gab18810-negativa.svg?v=20261125e";img.alt="GAB. 18810";top.prepend(img);if(!top.querySelector(".cmtl-trf3-top")){var jf=D.createElement("span");jf.className="cmtl-trf3-top";jf.innerHTML=lockup();top.appendChild(jf);}}
 var host=D.createElement("div");host.className="cmtl-auth-status";host.hidden=true;host.setAttribute("role","status");host.innerHTML=brand()+"<span>Confirmando seu acesso…</span>";btn.insertAdjacentElement("afterend",host);
 function sync(){host.hidden=!btn.disabled;}
 new MutationObserver(sync).observe(btn,{attributes:true,attributeFilter:["disabled"]});sync();
}

function request(path,options){return fetch(path,Object.assign({credentials:"same-origin",cache:"no-store"},options||{})).then(async function(r){var j=await r.json().catch(function(){return {};});if(!r.ok)throw Error(j.erro||"Não foi possível confirmar o acesso.");return j;});}
function bindAmicus(){
 if(!/^\/amicus\/?$/.test(location.pathname)||D.getElementById("am-welcome"))return;
 var key="cmt-amicus-visitor";
 try{if(sessionStorage.getItem(key)==="1")return;}catch(e){}
 var screen=D.createElement("section");screen.id="am-welcome";screen.className="cmt-entry cmt-entry-overlay";screen.setAttribute("aria-label","Boas-vindas ao Amicus Curiae");screen.hidden=true;
 screen.innerHTML='<div class="cmt-entry-main"><div class="cmt-entry-story"><div class="cmt-entry-jf">'+lockup()+'</div><img src="/padrao/loading/gab18810-negativa.svg?v=20261125e" alt="GAB. 18810"><small>GABINETE DO DES. FED. CARLOS MUTA</small><h1>Amicus <em>Curiae.</em></h1><p>Pesquisa jurisprudencial, referências jurídicas e ferramentas do gabinete.</p></div><form class="cmt-entry-card" autocomplete="on"><small>ACESSO AO PORTAL</small><h2>Boas-vindas.</h2><p>Entre com sua conta da equipe ou continue como visitante.</p><label for="am-user">Usuário</label><input id="am-user" name="usuario" autocomplete="username" required><label for="am-pass">Senha</label><input id="am-pass" name="senha" type="password" autocomplete="current-password" required><p class="cmt-entry-error" role="alert" hidden></p><button type="submit">Entrar</button><button type="button" class="cmt-visitor">Acessar como visitante</button><p class="cmt-entry-note">Acesso de visitante: somente recursos públicos.</p></form><section class="cmt-entry-apps" aria-label="Aplicações do gabinete"><small>ECOSSISTEMA DIGITAL · GABINETE CMT</small><ul><li><img src="/padrao/favicon/amicus.svg?v=20261125e" alt="" width="48" height="48"><span>Amicus Curiae</span></li><li><img src="/padrao/favicon/collegium.svg?v=20261125e" alt="" width="48" height="48"><span>Collegium</span></li><li><img src="/padrao/favicon/compendium.svg?v=20261125e" alt="" width="48" height="48"><span>Compendium</span></li><li><img src="/padrao/favicon/collectio.svg?v=20261125e" alt="" width="48" height="48"><span>Collectio</span></li><li><img src="/padrao/favicon/cognitio.svg?v=20261125e" alt="" width="48" height="48"><span>Cognitio</span></li><li><img src="/padrao/favicon/office.svg?v=20261125e" alt="" width="48" height="48"><span>Ex Officio</span></li><li><img src="/padrao/favicon/caput.svg?v=20261125e" alt="" width="48" height="48"><span>Caput</span></li></ul></section></div>';
 D.body.appendChild(screen);
 var form=screen.querySelector("form"),submit=form.querySelector('[type=submit]'),guest=form.querySelector(".cmt-visitor"),err=form.querySelector('[role=alert]');
 function close(){screen.remove();D.documentElement.classList.remove("cmt-entry-open");}
 guest.onclick=function(){try{sessionStorage.setItem(key,"1");}catch(e){}close();};
 form.onsubmit=async function(e){e.preventDefault();err.hidden=true;submit.disabled=true;guest.disabled=true;submit.textContent="Confirmando…";try{await request("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuario:form.usuario.value.trim(),senha:form.senha.value})});form.senha.value="";location.reload();}catch(x){err.textContent=x.message;err.hidden=false;submit.disabled=false;guest.disabled=false;submit.textContent="Entrar";}};
 request("/api/login").then(close,function(){screen.hidden=false;D.documentElement.classList.add("cmt-entry-open");screen.querySelector("#am-user").focus();});
}
function afterLogin(name){
 if(!name||D.getElementById("cmt-post-login"))return;
 var el=D.createElement("div");el.id="cmt-post-login";el.dataset.cmtLoader="full";el.dataset.cmtLoaderFamily="office";el.dataset.cmtLoaderReady="1";D.body.appendChild(el);
 var h=new Date().getHours(),sal=h<12?"Bom dia, ":h<18?"Boa tarde, ":"Boa noite, ";
 mount(el,{mode:"full",heading:sal,focus:String(name).toUpperCase()+".",stage:"Abrindo a interface do Gabinete…"});
 return {close:function(){el.remove();}};
}
W.GabineteLoader.afterLogin=afterLogin;


/* A marca do cabeçalho tem sua própria referência, independente da aba do navegador. */
function bindHeaderIcon(){
 var meta=D.querySelector('head meta[name="cmt-app-header-icon"]');
 var src=meta&&meta.content;
 if(!src){var link=D.querySelector('head link[rel="icon"][href*="/padrao/favicon/"]');if(link)src=link.href.replace(/\.svg(?=\?|$)/,'-header.svg');}
 if(!src)return;
 var selectors=['header.amicus-shell .amicus-brand > svg','header.nx .nx1 > a.br > i.star','header#top #marca > i.star','header.top.nx .brand.tw > i.star','header.lx-nx .lx-nx1 > .star'];
 selectors.forEach(function(selector){
  D.querySelectorAll(selector).forEach(function(old){
   if(old.closest('.amicus-legacy-brand'))return;
   var img=D.createElement('img');img.className='cmt-app-header-icon';img.src=src;img.alt='';img.width=46;img.height=46;img.setAttribute('aria-hidden','true');if(old.parentElement)old.parentElement.classList.add('cmt-app-icon-host');old.replaceWith(img);
  });
 });
}

function bootAll(){bindHeaderIcon();boot();bindLogin();bindAmicus();D.querySelectorAll(".load").forEach(function(el){if(el.dataset.cmtBrandReady||el.children.length||!/^\s*(?:Carregando|Lendo|Preparando|Consultando|Buscando|Sincronizando|Aguarde)/i.test(el.textContent))return;el.dataset.cmtBrandReady="1";var img=D.createElement("img");img.className="cmtl-local-brand";img.src="/padrao/loading/estrela.svg?v=20261125e";img.alt="";el.prepend(img);});}
function start(){bootAll();var pending=false;new MutationObserver(function(records){if(pending||!records.some(function(r){return Array.prototype.some.call(r.addedNodes,function(n){return n.nodeType===1&&(n.matches("[data-cmt-loader],.load,#en-form,.amicus-brand,header.nx,header#top,header.lx-nx,header.top.nx")||n.querySelector("[data-cmt-loader],.load,#en-form,.amicus-brand,header.nx,header#top,header.lx-nx,header.top.nx"));});}))return;pending=true;requestAnimationFrame(function(){pending=false;bootAll();});}).observe(D.body,{childList:true,subtree:true});}
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",start);else start();
})(window,document);
