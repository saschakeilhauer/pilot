export function now(){ return Date.now(); }

export function fmtClock(ts){
  if(!ts) return "–";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
}

export function fmtHMS(ms){
  const s = Math.max(0, Math.floor(ms/1000));
  const hh = String(Math.floor(s/3600)).padStart(2,"0");
  const mm = String(Math.floor((s%3600)/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return `${hh}:${mm}:${ss}`;
}

export function clampInt(value, min, max){
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  if(Number.isNaN(n)) return null;
  return Math.min(max, Math.max(min, n));
}

export function minutesToMs(min){ return Math.max(0, Number(min||0))*60*1000; }

export function pct(n, d){
  if(d <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((n/d)*100)));
}
