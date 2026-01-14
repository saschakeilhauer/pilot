export function getRoute(){
  const h = (location.hash || "#/inbox").slice(1);
  const parts = h.split("/").filter(Boolean);
  return parts;
}

export function go(hash){
  location.hash = hash.startsWith("#") ? hash : `#${hash}`;
}
