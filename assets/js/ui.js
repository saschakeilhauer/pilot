import { fmtTime } from "./utils.js";
import { go } from "./router.js";
import { clampInt, now } from "./utils.js";

export function wireNav(root){
  root.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => go(btn.getAttribute("data-nav")));
  });
}

export function setStatus(text){
  const el = document.getElementById("statusline");
  if(el) el.textContent = text;
}

export function renderWhoAmI(user){
  const el = document.getElementById("whoami");
  if(!el) return;
  el.textContent = user ? `Angemeldet: ${user.name} (${user.persnr})` : "Nicht angemeldet";
}

export function ensureJobState(state, job){
  if(!state.jobs[job.jobId]){
    state.jobs[job.jobId] = { active: null, doneQty: 0, history: [] };
  }
  return state.jobs[job.jobId];
}

export function renderAuftragsList(container, data, state, currentUserId){
  container.innerHTML = "";
  const user = data.mitarbeiter.find(m => m.id === currentUserId);

  const visible = user
    ? data.auftraege.filter(j => (j.zugewiesenAn || []).includes(user.id))
    : data.auftraege;

  visible.forEach(job => {
    const js = ensureJobState(state, job);
    const done = js.doneQty || 0;
    const rest = Math.max(0, (job.gesamtMenge || 0) - done);
    const active = js.active ? `Aktiv: ${js.active.userId}` : "Nicht aktiv";

    const a = document.createElement("a");
    a.className = "item";
    a.href = `#/auftrag/${encodeURIComponent(job.jobId)}`;
    a.innerHTML = `
      <div class="item__title">${job.titel}</div>
      <div class="item__sub">${job.beschreibung || ""}</div>
      <div class="item__sub">Gemeldet: ${done} • Rest: ${rest} • ${active}</div>
    `;
    a.addEventListener("click", (e) => { e.preventDefault(); go(a.getAttribute("href")); });
    container.appendChild(a);
  });
}

export function renderGkList(container, gkItems, selectedId){
  container.innerHTML = "";
  gkItems.forEach(gk => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.style.minWidth = "unset";
    btn.dataset.gkId = gk.id;
    btn.textContent = (gk.id === selectedId) ? `✓ ${gk.titel}` : gk.titel;
    container.appendChild(btn);
  });
}

export function renderHistory(container, history, data){
  container.innerHTML = "";
  if(!history || history.length === 0){
    container.textContent = "Noch keine Einträge";
    return;
  }
  history.slice().reverse().forEach(h => {
    const user = data.mitarbeiter.find(m => m.id === h.userId);
    const who = user ? user.name : h.userId;
    const div = document.createElement("div");
    if(h.type === "start"){
      div.textContent = `${fmtTime(h.ts)} • ${who} • Start`;
    } else if(h.type === "stop"){
      div.textContent = `${fmtTime(h.ts)} • ${who} • Ende • Menge ${h.qty ?? 0}`;
    } else if(h.type === "finish"){
      div.textContent = `${fmtTime(h.ts)} • ${who} • Fertig • Menge ${h.qty ?? 0}`;
    } else {
      div.textContent = `${fmtTime(h.ts)} • ${who} • ${h.type}`;
    }
    container.appendChild(div);
  });
}

export function renderGkHistory(container, history, data, gkItems){
  container.innerHTML = "";
  if(!history || history.length === 0){
    container.textContent = "Noch keine Einträge";
    return;
  }
  history.slice().reverse().forEach(h => {
    const user = data.mitarbeiter.find(m => m.id === h.userId);
    const who = user ? user.name : h.userId;
    const gk = gkItems.find(x => x.id === h.gkId);
    const what = gk ? gk.titel : h.gkId;

    const div = document.createElement("div");
    div.textContent = `${fmtTime(h.startTs)} • ${who} • ${what} • Dauer ${durText(h.startTs, h.endTs)}`;
    container.appendChild(div);
  });
}

function durText(startTs, endTs){
  if(!startTs || !endTs) return "–";
  const sec = Math.max(0, Math.floor((endTs - startTs) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const hh = String(h).padStart(2,"0");
  const mm = String(m).padStart(2,"0");
  const ss = String(s).padStart(2,"0");
  return `${hh}:${mm}:${ss}`;
}

export function parseQty(input, min, max){
  const v = clampInt(input, min, max);
  return v;
}

export function addQty(current, add, max){
  const c = Number.isFinite(current) ? current : 0;
  return Math.min(max, c + add);
}

export function stamp(ts = now()){
  return ts;
}
