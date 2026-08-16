(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[3860],{11011:function(e,t,r){Promise.resolve().then(r.bind(r,9877))},78030:function(e,t,r){"use strict";r.d(t,{Z:function(){return c}});var n=r(2265);/**
 * @license lucide-react v0.424.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),a=function(){for(var e=arguments.length,t=Array(e),r=0;r<e;r++)t[r]=arguments[r];return t.filter((e,t,r)=>!!e&&r.indexOf(e)===t).join(" ")};/**
 * @license lucide-react v0.424.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var o={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.424.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,n.forwardRef)((e,t)=>{let{color:r="currentColor",size:s=24,strokeWidth:l=2,absoluteStrokeWidth:c,className:i="",children:d,iconNode:u,...h}=e;return(0,n.createElement)("svg",{ref:t,...o,width:s,height:s,stroke:r,strokeWidth:c?24*Number(l)/Number(s):l,className:a("lucide",i),...h},[...u.map(e=>{let[t,r]=e;return(0,n.createElement)(t,r)}),...Array.isArray(d)?d:[d]])}),c=(e,t)=>{let r=(0,n.forwardRef)((r,o)=>{let{className:c,...i}=r;return(0,n.createElement)(l,{ref:o,iconNode:t,className:a("lucide-".concat(s(e)),c),...i})});return r.displayName="".concat(e),r}},95137:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.424.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]])},66706:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.424.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]])},64341:function(e,t,r){"use strict";r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.424.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(78030).Z)("ShieldAlert",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]])},9877:function(e,t,r){"use strict";r.r(t),r.d(t,{default:function(){return c}});var n=r(57437),s=r(2265),a=r(64341),o=r(66706),l=r(95137);function c(e){let{error:t,reset:r}=e;return(0,s.useEffect)(()=>{console.error("Admin Panel Error:",t)},[t]),(0,n.jsx)("div",{className:"flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]",children:(0,n.jsxs)("div",{className:"glass-card p-8 rounded-3xl border border-rose-500/30 max-w-md w-full space-y-5",children:[(0,n.jsx)("div",{className:"w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto",children:(0,n.jsx)(a.Z,{className:"w-7 h-7"})}),(0,n.jsxs)("div",{className:"space-y-1",children:[(0,n.jsx)("h2",{className:"text-xl font-bold text-white",children:"Something went wrong. Please try again."}),(0,n.jsx)("p",{className:"text-xs text-slate-400",children:"An admin module error occurred. You can retry or go back."})]}),(0,n.jsxs)("div",{className:"flex items-center justify-center gap-3 pt-2",children:[(0,n.jsxs)("button",{onClick:()=>r(),className:"px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-2",children:[(0,n.jsx)(o.Z,{className:"w-4 h-4"}),(0,n.jsx)("span",{children:"Retry"})]}),(0,n.jsxs)("button",{onClick:()=>window.history.back(),className:"px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-2",children:[(0,n.jsx)(l.Z,{className:"w-4 h-4"}),(0,n.jsx)("span",{children:"Go Back"})]})]})]})})}}},function(e){e.O(0,[2971,7023,1744],function(){return e(e.s=11011)}),_N_E=e.O()}]);