const u=(n,t=300)=>{let e=null;return(...l)=>{e!==null&&clearTimeout(e),e=setTimeout(()=>{n.apply(void 0,l),e=null},t)}},c=u;export{c};
