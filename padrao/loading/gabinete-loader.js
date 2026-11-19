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
function fullMarkup(el,o){var b=copy(el,o),title=b.heading||b.focus?'<h1 class="cmtl-heading">'+esc(b.heading||"")+(b.focus?'<em>'+esc(b.focus)+'</em>':'')+'</h1>':'';return '<div class="cmtl-watermark">'+svg()+'</div><section class="cmtl-content" role="status" aria-live="polite"><span class="cmtl-mark">'+svg()+'</span><p class="cmtl-identity">'+esc(b.office)+'</p>'+title+(b.welcome?'<p class="cmtl-welcome">'+esc(b.welcome)+'</p>':'')+'<div class="cmtl-track"><i></i></div><p class="cmtl-stage">'+esc(b.stage||"Carregando…")+'</p></section>'}
function inlineMarkup(el,o){var b=copy(el,o);return '<div class="cmtl-inline" role="status" aria-live="polite"><span class="cmtl-mini">'+svg()+'</span><div class="cmtl-inline-copy"><b>'+esc(b.stage||"Carregando…")+'</b><div class="cmtl-inline-track"><i></i></div>'+(b.detail?'<span>'+esc(b.detail)+'</span>':'')+'</div></div>'}
function adoptLegacy(el){el.classList.add("cmtl-legacy");var star=el.querySelector(".cmt-ld-mk .star,.cmt-ld-mk");if(star&&!star.querySelector("svg"))star.innerHTML=svg();var bar=el.querySelector(".cmt-ld-b");if(bar&&!bar.querySelector("i"))bar.appendChild(D.createElement("i"))}
function mount(el,o){if(typeof el==="string")el=D.querySelector(el);if(!el)return null;var mode=(o&&o.mode)||el.dataset.cmtLoader||"inline";if(o&&o.family)el.dataset.cmtLoaderFamily=o.family;if(mode==="legacy"){adoptLegacy(el);return el}if(mode==="full"){el.classList.add("cmtl-full");el.innerHTML=fullMarkup(el,o)}else if(mode==="overlay"){el.classList.add("cmtl-overlay");el.innerHTML=fullMarkup(el,Object.assign({screen:"overlay"},o||{}))}else{el.innerHTML=inlineMarkup(el,o)}return el}
function update(el,o){if(typeof el==="string")el=D.querySelector(el);if(!el)return;var mode=el.dataset.cmtLoader||"inline";if(mode==="legacy"){if(o&&o.stage){var m=el.querySelector(".cmt-ld-m");if(m)m.textContent=o.stage}if(o&&o.welcome){var s=el.querySelector(".cmt-ld-s");if(s)s.textContent=o.welcome}return}mount(el,Object.assign({mode:mode},o||{}))}
function hide(el,remove){if(typeof el==="string")el=D.querySelector(el);if(!el)return;el.classList.add("saindo");setTimeout(function(){if(remove)el.remove();else el.style.display="none"},280)}
function showOverlay(o){var el=D.createElement("div");el.dataset.cmtLoader="overlay";el.dataset.cmtLoaderFamily=(o&&o.family)||"office";D.body.appendChild(el);mount(el,Object.assign({mode:"overlay"},o||{}));return {element:el,close:function(){hide(el,true)},update:function(x){update(el,x)}}}
function boot(){D.querySelectorAll("[data-cmt-loader]").forEach(function(el){if(el.dataset.cmtLoaderReady)return;el.dataset.cmtLoaderReady="1";mount(el)})}
W.GabineteLoader={mount:mount,update:update,hide:hide,overlay:showOverlay,screens:SCREENS,boot:boot};
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",boot);else boot();
})(window,document);
