(this["webpackJsonpb64-url-editor"]=this["webpackJsonpb64-url-editor"]||[]).push([[0],{128:function(e,t,n){e.exports=n(219)},133:function(e,t,n){},158:function(e,t,n){},219:function(e,t,n){"use strict";n.r(t);var a=n(0),r=n.n(a),c=n(6),o=n.n(c),l=(n(133),n(49)),s=n(27),i=n(34),u=n(220),m=n(50),f=n(22),d=n(222),g=n(223),p=n(225),h=n(221),E=n(224),y=n(236),v=n(237),b=n(238),j=n(239),w=n(234),O=n(235),k=n(108),C=n.n(k),x=n(109),S=n.n(x),A=n(110),B=n.n(A),T=(n(158),"https://res.cloudinary.com/phlincloud/image/upload/v1583267224/b64-url-editor"),I={v2ray:T+"/v2ray_logo_ygiuj5.png",trojan:T+"/trojan-gfw_logo_z3oa6y.png",ss:T+"/ss_logo_nzt66p.png"};var U=function(){var e=d.a.TextArea,t=g.a.Option,n=p.a.Content,c=p.a.Footer,o=h.a.confirm,k=Object(a.useState)(""),x=Object(s.a)(k,2),A=x[0],T=x[1],U=Object(a.useState)(""),R=Object(s.a)(U,2),z=R[0],L=R[1],J=Object(a.useState)(""),_=Object(s.a)(J,2),N=_[0],W=_[1],X=Object(a.useState)([]),Z=Object(s.a)(X,2),P=Z[0],$=Z[1],F=Object(a.useState)({}),K=Object(s.a)(F,2),q=K[0],D=K[1],G=S()(),H=Object(s.a)(G,2),M=H[0],Q=H[1],V=Object(a.useState)(!0),Y=Object(s.a)(V,2),ee=Y[0],te=Y[1],ne=Object(a.useState)("BASE64"),ae=Object(s.a)(ne,2),re=ae[0],ce=ae[1],oe=["vmess","trojan","ss"],le=function(e){return btoa(unescape(encodeURIComponent(e)))},se=function(e){return decodeURIComponent(escape(atob(e)))},ie=function(e){return e.startsWith("vmess://")?"vmess":e.startsWith("trojan://")?"trojan":e.startsWith("ss://")?"ss":"unsupported"},ue=function(e){if("vmess"===ie(e))return JSON.parse(se(e.replace("vmess://","")));if("ss"===ie(e)){var t=e.search("#");return se(e.slice(5,t))}return e},me=function(e){if("vmess"===ie(e))return ue(e).ps;if("trojan"===ie(e)){var t=e.search("#");return decodeURIComponent(e.slice(t+1))}if("ss"===ie(e)){var n=e.search("#");return decodeURIComponent(e.slice(n+1))}},fe=function(e){return/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/.test(e)},de=function(e){if(e.length&&fe(e)){var t=se(e).split("\n"),n=[],a=!0,r=!1,c=void 0;try{for(var o,l=t[Symbol.iterator]();!(a=(o=l.next()).done);a=!0){var s=o.value,i={type:ie(s),name:me(s),json:ue(s),raw:s,id:C.a.generate()};n.push(i)}}catch(u){r=!0,c=u}finally{try{a||null==l.return||l.return()}finally{if(r)throw c}}return console.log("decodeB64",n),n}return e},ge=function(e){for(var t="",n=0;n<e.length;++n){var a=e[n];if("vmess"===a.type){var r=JSON.parse(JSON.stringify(a.json));r.ps=a.name,t+="vmess://"+le(JSON.stringify(r))}else if("trojan"===a.type){var c=a.json.search("#");t+=a.json.slice(0,c)+"#"+encodeURIComponent(a.name)}else{if("ss"!==a.type)continue;var o=a.json.search("#");t+="ss://"+le(a.json.slice(0,o))+"#"+encodeURIComponent(a.name)}n+1<e.length&&(t+="\n")}return console.log(t.split("\n")),Q(le(t)),le(t)},pe=function(e){try{if(fe(e)){var t=de(e).filter((function(e){return""!==e.raw}));t.length<de(e).length&&(T(ge(t)),L(se(ge(t)))),t&&t.filter((function(e){return oe.includes(e.type)})).length>0&&($(t),D(t[0]),console.log("getUrlList",t),te(!1))}}catch(n){console.log(n)}},he={base64:function(e){if(T(e.target.value),fe(e.target.value))try{L(se(e.target.value)),pe(e.target.value)}catch(t){console.error(t)}},text:function(e){L(e.target.value);var t=le(e.target.value);T(t),pe(t)},subscribe:function(e){W(e.target.value);var t="fetching";E.a.loading({content:"\u5c0e\u5165\u8a02\u95b1\u93c8\u63a5\u4e2d",key:t}),B.a.get(e.target.value).then((function(e){return e.data})).then((function(e){return T(e),se(e)})).then((function(e){return L(e),le(e)})).then((function(e){pe(e),E.a.success({content:"\u5c0e\u5165\u6210\u529f\uff01",key:t,duration:2})})).catch((function(e){console.error(e),E.a.warning({content:"\u5c0e\u5165\u5931\u6557",key:t,duration:2})}))}},Ee={base64:function(){if(T(M),fe(M))try{L(se(M)),pe(M)}catch(e){console.error(e)}},text:function(){L(M);var e=le(M);T(e),pe(e)}},ye=function(){$(P.map((function(e){return e.id===q.id?Object(l.a)({},e,{name:q.name}):e})))},ve=function(e){var t=P.findIndex((function(t){return t.id===e.id}));P.filter((function(t){return t.id!==e.id})).length?D(P[(t+1)%P.length]):D({}),$(P.filter((function(t){return t.id!==e.id}))),E.a.success("\u522a\u9664 "+e.name+" \u6210\u529f")},be=function(e){var t={vmess:r.a.createElement("img",{src:I.v2ray,alt:"",class:"logo-wrap"}),trojan:r.a.createElement("img",{src:I.trojan,alt:"",class:"logo-wrap"}),ss:r.a.createElement("img",{src:I.ss,alt:"",class:"logo-wrap"})};return t.hasOwnProperty(e)?t[e]:r.a.createElement(O.a,null)},je={BASE64:r.a.createElement(m.a,{gutter:[0,16]},r.a.createElement(f.a,{span:24},r.a.createElement(e,{rows:4,autosize:!1,onChange:he.base64,value:A})),r.a.createElement(f.a,{span:24,style:{marginBottom:-21}},r.a.createElement(i.a,{type:"primary",block:!0,onClick:Ee.base64},"\u5f9e\u526a\u8cbc\u7248\u5c0e\u5165"))),TEXT:r.a.createElement(m.a,{gutter:[0,16]},r.a.createElement(f.a,{span:24},r.a.createElement(e,{rows:4,autosize:!1,onChange:he.text,value:z})),r.a.createElement(f.a,{span:24,style:{marginBottom:-21}},r.a.createElement(i.a,{type:"primary",block:!0,onClick:Ee.text},"\u5f9e\u526a\u8cbc\u7248\u5c0e\u5165"))),URL:r.a.createElement(m.a,{gutter:[0,16]},r.a.createElement(f.a,{span:24},r.a.createElement(e,{rows:4,autosize:!1,onChange:he.subscribe,value:N})),r.a.createElement(f.a,{span:24,style:{marginBottom:-21}},r.a.createElement(i.a,{type:"primary",block:!0,onClick:Ee.subscribe},"\u5f9e\u526a\u8cbc\u7248\u5c0e\u5165")))};return r.a.createElement("div",{className:"App"},r.a.createElement(p.a,null,r.a.createElement(m.a,{justify:"center"},r.a.createElement("h2",null,"Shawdowrockets \u8a02\u95b1\u93c8\u63a5\u7de8\u8f2f\u5668")),r.a.createElement(n,null,r.a.createElement(m.a,{gutter:[16,16],justify:"space-between"},r.a.createElement(f.a,{xs:24,sm:24,md:12},r.a.createElement(u.a,{title:"\u5feb\u901f\u64cd\u4f5c",bordered:!1},r.a.createElement(m.a,{gutter:[16,24],justify:"center",style:{height:60}},r.a.createElement(f.a,{xs:16,sm:16,md:14},r.a.createElement(g.a,{showSearch:!0,value:P.length?q.name:"",disabled:ee||!A.length,style:{width:"100%"},onChange:function(e){D(P[P.findIndex((function(t){return t.id===e[1]}))])},filterOption:function(e,t){return t.children[2].toLowerCase().indexOf(e.toLowerCase())>=0}},P.map((function(e){return r.a.createElement(t,{key:e.id,value:[e.name,e.id]},be(e.type)," ",e.name)})))),r.a.createElement(f.a,{xs:4,sm:4,md:2},r.a.createElement(i.a,{type:"primary",disabled:ee||!A.length,icon:r.a.createElement(y.a,null),onClick:function(){o({title:"\u78ba\u5b9a\u8981\u522a\u9664"+q.name+"?",icon:r.a.createElement(w.a,null),content:"\u9019\u9805\u64cd\u4f5c\u7121\u6cd5\u5fa9\u539f",okText:"\u78ba\u5b9a",cancelText:"\u53d6\u6d88",onOk:function(){ve(q)},onCancel:function(){}})},danger:!0}))),r.a.createElement(m.a,{gutter:[16,24],justify:"center"},r.a.createElement(f.a,{xs:20,sm:20,md:16},r.a.createElement(d.a,{addonAfter:q?be(q.type):r.a.createElement(O.a,null),value:q?q.name:"",disabled:ee||!A.length,onChange:function(e){D(Object(l.a)({},q,{name:e.target.value})),$(P.map((function(t){return t.id===q.id?Object(l.a)({},t,{name:e.target.value}):t})))},onPressEnter:ye}))),r.a.createElement(m.a,{gutter:16,justify:"center",style:{marginBottom:-8}},r.a.createElement(f.a,{xs:12,sm:12,md:6},r.a.createElement(i.a,{type:"primary",icon:r.a.createElement(v.a,null),onClick:function(){var e=me(P[P.findIndex((function(e){return e.id===q.id}))].raw);D(Object(l.a)({},q,{name:e})),$(P.map((function(t){return t.id===q.id?Object(l.a)({},t,{name:e}):t})))}},"\u5fa9\u539f")),r.a.createElement(f.a,{xs:12,sm:12,md:6},r.a.createElement(i.a,{type:"primary",icon:r.a.createElement(b.a,null),onClick:function(){ye();var e=ge(P);T(e),E.a.success("\u65b0\u93c8\u63a5\u5df1\u8907\u88fd")}},"\u4fdd\u5b58")),r.a.createElement(f.a,{xs:0,sm:0,md:6},r.a.createElement(i.a,{type:"primary",icon:r.a.createElement(j.a,null)},"\u532f\u51fa"))))),r.a.createElement(f.a,{xs:24,sm:24,md:12},r.a.createElement(u.a,{tabList:[{key:"BASE64",tab:"BASE64"},{key:"TEXT",tab:"TEXT"},{key:"URL",tab:"URL"}],activeTabKey:re,onTabChange:function(e){return ce(e)}},je[re])))),r.a.createElement(c,null,r.a.createElement(m.a,{justify:"center"},"Created by\xa0 ",r.a.createElement("a",{href:"https:www.phlinhng.com"},"phlinhng"),". \xa0All rights reserved."))))};Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));o.a.render(r.a.createElement(U,null),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then((function(e){e.unregister()})).catch((function(e){console.error(e.message)}))}},[[128,1,2]]]);
//# sourceMappingURL=main.bd4be1a4.chunk.js.map