// Path routes, relative to the site's base directory:
//
//   ''                        welcome
//   collection                the shelves
//   radio/<catalog id>        a radio's page, About mode
//   radio/<catalog id>/listen the same page in listening corner mode
//
// A static host serves 404.html (a copy of index.html) for any path it has
// no file for, so a deep link loads the app and this reads the path. Links
// from the hash-routed version (#radio/<id>, #collection) still resolve.
export function parseRoute(path,hash='') {
  const legacy=decodeURIComponent(hash.replace(/^#/,''));
  const route=(legacy||decodeURIComponent(path)).replace(/^\/+|\/+$/g,'');
  const radio=/^radio\/([^/]+)(\/listen)?$/.exec(route);
  if(radio)return {view:'radio',radioId:radio[1],mode:radio[2]?'listen':'about'};
  if(['collection','workbench','listening'].includes(route))return {view:route};
  return {view:route?'unknown':'welcome'};
}
export function routePath({view,radioId,mode}) {
  if(view==='radio')return `radio/${encodeURIComponent(radioId)}${mode==='listen'?'/listen':''}`;
  return view==='welcome'?'':view;
}
