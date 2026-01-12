/* Sehr einfacher Hash Router
   Routen: #/login, #/auftraege, #/auftrag/<id>, #/gemeinkosten, #/dokumente
*/
export function getRoute(){
  const h = (location.hash || "#/login").slice(1);
  const parts = h.split("/").filter(Boolean);
  return parts;
}

export function go(hash){
  location.hash = hash.startsWith("#") ? hash : `#${hash}`;
}
