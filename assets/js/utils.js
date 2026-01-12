export function fmtTime(ts){
  if(!ts) return "–";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  const ss = String(d.getSeconds()).padStart(2,"0");
  return `${hh}:${mm}:${ss}`;
}

export function now(){
  return Date.now();
}

export function clampInt(value, min, max){
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  if(Number.isNaN(n)) return null;
  return Math.min(max, Math.max(min, n));
}
