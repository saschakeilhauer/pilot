import { go } from "./router.js";
import { fmtClock, fmtHMS, clampInt, minutesToMs, pct } from "./utils.js";

export function wireNav(root){
  root.querySelectorAll("[data-nav]").forEach(el => {
    el.addEventListener("click", () => go(el.getAttribute("data-nav")));
  });
}

export function setStatus(text){
  const el = document.getElementById("statusline");
  if(el) el.textContent = text || "";
}

export function renderWhoAmI(user){
  const el = document.getElementById("whoami");
  if(el) el.textContent = `${user.name}`;
}

export function ensureJobState(state, jobId){
  if(!state.jobs[jobId]){
    state.jobs[jobId] = { doneQty:0, spentMs:0, active:null, status:"open", history:[] };
  }
  return state.jobs[jobId];
}

export function jobRestQty(job, js){
  return Math.max(0, (job.gesamtMenge||0) - (js.doneQty||0));
}

export function jobRestMs(job, js){
  return Math.max(0, minutesToMs(job.sollZeitMin) - (js.spentMs||0) - (js.active ? (Date.now()-js.active.startTs) : 0));
}

export function renderInbox(listEl, data, state){
  listEl.innerHTML = "";
  const ids = state.inbox || [];
  const pill = document.getElementById("pillNew");
  if(pill) pill.textContent = `${ids.length} neu`;

  if(ids.length === 0){
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<div class="item__title">Keine neuen Aufträge</div><div class="item__sub">Wenn du etwas zeigen willst, nutze Dispo.</div>`;
    listEl.appendChild(div);
    return;
  }

  ids.forEach(id => {
    const job = data.jobs.find(j => String(j.jobId) === String(id));
    if(!job) return;
    const a = document.createElement("a");
    a.className = "item";
    a.href = "#";
    a.innerHTML = `
      <div class="item__title">${job.titel}</div>
      <div class="item__sub">${job.beschreibung}</div>
      <div class="item__sub">Soll ${job.gesamtMenge} Stk • Sollzeit ${job.sollZeitMin} min</div>
    `;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      acceptJob(state, job.jobId);
      setStatus("Auftrag übernommen");
      go("#/auftraege");
    });
    listEl.appendChild(a);
  });
}

export function acceptJob(state, jobId){
  state.inbox = (state.inbox || []).filter(x => String(x) !== String(jobId));
  if(!(state.accepted||[]).some(x => String(x)===String(jobId))){
    state.accepted = [...(state.accepted||[]), String(jobId)];
  }
}

export function renderJobGrid(gridEl, data, state){
  gridEl.innerHTML = "";
  const ids = state.accepted || [];

  let activeCount = 0, openCount = 0, doneCount = 0;

  ids.forEach(id => {
    const job = data.jobs.find(j => String(j.jobId) === String(id));
    if(!job) return;
    const js = ensureJobState(state, job.jobId);

    const restQty = jobRestQty(job, js);
    const totalQty = job.gesamtMenge || 0;
    const doneQty = js.doneQty || 0;

    const isActive = !!js.active;
    const isDone = restQty === 0 || js.status === "done";
    if(isActive) activeCount += 1;
    if(isDone) doneCount += 1;
    if(!isDone) openCount += 1;

    const statusBadge = isDone
      ? `<span class="badge badge--done">Fertig</span>`
      : (isActive ? `<span class="badge badge--active">Aktiv</span>` : `<span class="badge">Offen</span>`);

    const timeRest = jobRestMs(job, js);
    const timeSpent = (js.spentMs||0) + (js.active ? (Date.now()-js.active.startTs) : 0);

    const progress = pct(doneQty, totalQty);

    const card = document.createElement("div");
    card.className = "jobcard";
    card.innerHTML = `
      <div class="jobcard__top">
        <div>
          <div class="jobcard__title">${job.titel}</div>
          <div class="jobcard__sub">${job.beschreibung}</div>
        </div>
        ${statusBadge}
      </div>

      <div class="jobcard__meta">
        <span>Menge ${doneQty}/${totalQty} • Rest ${restQty}</span>
        <span>Zeit ${fmtHMS(timeSpent)} • Rest ${fmtHMS(timeRest)}</span>
      </div>

      <div class="progress">
        <div class="progress__bar" style="width:${progress}%"></div>
      </div>

      <div class="jobcard__actions">
        <button class="btn btn--ghost" data-open="${job.jobId}">Details</button>
        <button class="btn btn--primary" data-start="${job.jobId}" ${isDone ? "disabled" : ""}>Start</button>
      </div>
    `;

    card.querySelector("[data-open]")?.addEventListener("click", () => go(`#/auftrag/${job.jobId}`));
    card.querySelector("[data-start]")?.addEventListener("click", () => go(`#/auftrag/${job.jobId}`));

    gridEl.appendChild(card);
  });

  const chipActive = document.getElementById("chipActive");
  const chipOpen = document.getElementById("chipOpen");
  const chipDone = document.getElementById("chipDone");
  if(chipActive) chipActive.textContent = `${activeCount} aktiv`;
  if(chipOpen) chipOpen.textContent = `${openCount} offen`;
  if(chipDone) chipDone.textContent = `${doneCount} fertig`;
}

export function renderHistory(el, history){
  el.innerHTML = "";
  if(!history || history.length === 0){
    el.textContent = "Noch keine Einträge";
    return;
  }
  history.slice().reverse().forEach(h => {
    const line = document.createElement("div");
    if(h.type === "start"){
      line.textContent = `${fmtClock(h.ts)} • Start`;
    } else if(h.type === "stop"){
      const fromTo = (h.startTs && h.endTs) ? ` • Von ${fmtClock(h.startTs)} bis ${fmtClock(h.endTs)}` : "";
      line.textContent = `${fmtClock(h.ts)} • Ende${fromTo} • Zeit ${fmtHMS(h.addMs||0)} • Menge ${h.qty}`;
    } else if(h.type === "finish"){
      const fromTo = (h.startTs && h.endTs) ? ` • Von ${fmtClock(h.startTs)} bis ${fmtClock(h.endTs)}` : "";
      line.textContent = `${fmtClock(h.ts)} • Fertig${fromTo} • Zeit ${fmtHMS(h.addMs||0)} • Menge ${h.qty}`;
    } else {
      line.textContent = `${fmtClock(h.ts)} • ${h.type}`;
    }
    el.appendChild(line);
  });
}

export function parseQty(input, min, max){
  return clampInt(input, min, max);
}

export function addQty(cur, add, max){
  const c = Number.isFinite(cur) ? cur : 0;
  return Math.min(max, c + add);
}

export function renderBibliothek(listEl, data){
  listEl.innerHTML = "";
  data.jobs.forEach(job => {
    const wrap = document.createElement("div");
    wrap.className = "item";
    wrap.innerHTML = `
      <div class="item__title">${job.titel}</div>
      <div class="item__sub">${job.beschreibung}</div>
      <div class="row">
        <a class="btn btn--ghost" href="${job.docs.zeichnung}" target="_blank" rel="noopener">Zeichnung</a>
        <a class="btn btn--ghost" href="${job.docs.anweisung}" target="_blank" rel="noopener">Anweisung</a>
        <button class="btn btn--ghost" data-model="${job.jobId}">3D</button>
      </div>
    `;
    wrap.querySelector("[data-model]")?.addEventListener("click", () => go(`#/modell/${job.jobId}`));
    listEl.appendChild(wrap);
  });
}

export function renderGk(el, data, state){
  el.innerHTML = "";
  const selected = state.gk.selected || data.gemeinkosten[0]?.id || null;

  data.gemeinkosten.forEach(gk => {
    const b = document.createElement("button");
    b.className = `chipbtn ${String(gk.id)===String(selected) ? "chipbtn--on" : ""}`;
    b.textContent = gk.titel;
    b.addEventListener("click", () => {
      state.gk.selected = gk.id;
      renderGk(el, data, state);
    });
    el.appendChild(b);
  });
}

export function renderGkHistory(el, history, data){
  el.innerHTML = "";
  if(!history || history.length === 0){
    el.textContent = "Noch keine Einträge";
    return;
  }
  history.slice().reverse().forEach(h => {
    const gk = data.gemeinkosten.find(x => x.id === h.gkId);
    const what = gk ? gk.titel : h.gkId;
    const ms = (h.endTs||h.startTs) - h.startTs;
    const line = document.createElement("div");
    line.textContent = `${fmtClock(h.startTs)} • ${what} • ${fmtHMS(ms)}`;
    el.appendChild(line);
  });
}
