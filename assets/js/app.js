import { loadData } from "./data.js";
import { loadState, saveState, resetState, defaultState } from "./storage.js";
import { getRoute, go } from "./router.js";
import {
  wireNav, setStatus, renderWhoAmI,
  renderInbox, acceptJob, renderJobGrid,
  ensureJobState, jobRestQty, jobRestMs,
  renderHistory, parseQty, addQty,
  renderBibliothek, renderGk, renderGkHistory
} from "./ui.js";
import { now, fmtHMS, minutesToMs, pct } from "./utils.js";

const PARTIALS = { header:"./partials/header.html", footer:"./partials/footer.html" };
const SCREENS = {
  inbox:"./screens/inbox.html",
  auftraege:"./screens/auftraege.html",
  detail:"./screens/auftrag_detail.html",
  gemeinkosten:"./screens/gemeinkosten.html",
  bibliothek:"./screens/bibliothek.html",
  modell:"./screens/modell.html",
  dispo:"./screens/dispo.html"
};

let data = null;
let state = null;
let timerHandle = null;

async function boot(){
  await loadPartials();
  registerSW();

  data = await loadData();
  state = loadState();

  if((state.inbox||[]).length === 0 && (state.accepted||[]).length === 0){
    state.inbox = data.jobs.slice(0,3).map(j => String(j.jobId));
  }

  state.userId = data.user.id;
  saveState(state);

  bindBrandEasterEgg();
  updateHeader();

  route();
  window.addEventListener("hashchange", route);
}

async function loadPartials(){
  const [h,f] = await Promise.all([
    fetch(PARTIALS.header).then(r=>r.text()),
    fetch(PARTIALS.footer).then(r=>r.text())
  ]);
  document.getElementById("header").innerHTML = h;
  document.getElementById("footer").innerHTML = f;

  wireNav(document);

  document.getElementById("btnReset").addEventListener("click", () => {
    resetState();
    state = defaultState();
    go("#/inbox");
    setStatus("Zurückgesetzt");
    location.reload();
  });

  document.querySelectorAll(".nav__btn").forEach(b => b.addEventListener("click", () => go(b.dataset.nav)));
}

function registerSW(){
  if(!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try{ await navigator.serviceWorker.register("./service-worker.js", { scope:"./" }); }catch(e){}
  });
}

function bindBrandEasterEgg(){
  const el = document.getElementById("brand");
  if(!el) return;
  let t = null;
  el.addEventListener("pointerdown", () => {
    t = setTimeout(() => { go("#/dispo"); }, 800);
  });
  el.addEventListener("pointerup", () => { if(t) clearTimeout(t); t=null; });
  el.addEventListener("pointerleave", () => { if(t) clearTimeout(t); t=null; });
}

function updateHeader(){
  renderWhoAmI(data.user);
  setStatus("");
}

async function renderScreen(path){
  const html = await fetch(path).then(r=>r.text());
  const main = document.getElementById("main");
  main.innerHTML = html;
  wireNav(main);
}

function persist(){ saveState(state); }

function stopLiveTimer(){
  if(timerHandle){ clearInterval(timerHandle); timerHandle=null; }
}
function startLiveTimer(fn){
  stopLiveTimer();
  timerHandle = setInterval(fn, 250);
  fn();
}

async function route(){
  stopLiveTimer();
  const parts = getRoute();
  const page = parts[0] || "inbox";

  if(page === "inbox"){
    await renderScreen(SCREENS.inbox);
    bindInbox();
    return;
  }
  if(page === "auftraege"){
    await renderScreen(SCREENS.auftraege);
    bindAuftraege();
    return;
  }
  if(page === "auftrag"){
    await renderScreen(SCREENS.detail);
    bindDetail(parts[1]);
    return;
  }
  if(page === "gemeinkosten"){
    await renderScreen(SCREENS.gemeinkosten);
    bindGemeinkosten();
    return;
  }
  if(page === "bibliothek"){
    await renderScreen(SCREENS.bibliothek);
    bindBibliothek();
    return;
  }
  if(page === "modell"){
    await renderScreen(SCREENS.modell);
    bindModell(parts[1]);
    return;
  }
  if(page === "dispo"){
    await renderScreen(SCREENS.dispo);
    bindDispo();
    return;
  }

  go("#/inbox");
}

function bindInbox(){
  const list = document.getElementById("inboxList");
  renderInbox(list, data, state);
  persist();
  setStatus("Bereit");
}

function bindAuftraege(){
  const grid = document.getElementById("jobList");
  renderJobGrid(grid, data, state);
  persist();
  setStatus("Bereit");
}

function bindDetail(jobId){
  const job = data.jobs.find(j => String(j.jobId) === String(jobId));
  if(!job){ go("#/auftraege"); return; }

  const js = ensureJobState(state, job.jobId);

  const elMeta = document.getElementById("jobMeta");
  const elTitle = document.getElementById("jobTitle");
  const elState = document.getElementById("jobState");

  const kQty = document.getElementById("kpiQty");
  const kQtySub = document.getElementById("kpiQtySub");
  const kTime = document.getElementById("kpiTime");
  const kTimeSub = document.getElementById("kpiTimeSub");
  const progBar = document.getElementById("progBar");
  const progSub = document.getElementById("progSub");

  const live = document.getElementById("liveTimer");
  const liveSub = document.getElementById("liveSub");

  const inpQty = document.getElementById("inpQty");
  const qtyHint = document.getElementById("qtyHint");
  const history = document.getElementById("history");

  const lnkZ = document.getElementById("lnkZeichnung");
  const lnkA = document.getElementById("lnkAnweisung");
  const lnkM = document.getElementById("lnkModell");

  elMeta.textContent = job.beschreibung;
  elTitle.textContent = job.titel;

  lnkZ.href = job.docs.zeichnung;
  lnkA.href = job.docs.anweisung;
  lnkM.addEventListener("click", (e) => { e.preventDefault(); go(`#/modell/${job.jobId}`); });

  function compute(){
    const done = js.doneQty || 0;
    const rest = jobRestQty(job, js);

    const spent = (js.spentMs||0) + (js.active ? (Date.now()-js.active.startTs) : 0);
    const restMs = jobRestMs(job, js);
    const targetMs = minutesToMs(job.sollZeitMin);

    const progress = pct(done, job.gesamtMenge||0);

    kQty.textContent = `${done}/${job.gesamtMenge}`;
    kQtySub.textContent = `Rest ${rest}`;

    kTime.textContent = `${fmtHMS(spent)}`;
    kTimeSub.textContent = `Rest ${fmtHMS(restMs)} • Soll ${fmtHMS(targetMs)}`;

    progBar.style.width = `${progress}%`;
    progSub.textContent = `${progress}% erledigt`;

    const isDone = rest === 0 || js.status === "done";
    const isActive = !!js.active;

    if(isDone){
      elState.textContent = "Fertig";
      elState.className = "badge badge--done";
    } else if(isActive){
      elState.textContent = "Aktiv";
      elState.className = "badge badge--active";
    } else {
      elState.textContent = "Offen";
      elState.className = "badge";
    }

    if(isActive){
      live.textContent = fmtHMS(Date.now()-js.active.startTs);
      liveSub.textContent = "Aktuelle Session";
    } else {
      live.textContent = "00:00:00";
      liveSub.textContent = "Keine aktive Session";
    }

    qtyHint.textContent = isDone ? "Auftrag ist abgeschlossen" : "Überbuchung ist gesperrt";
    renderHistory(history, js.history);
  }

  function restQty(){ return jobRestQty(job, js); }

  document.getElementById("btnStart").addEventListener("click", () => {
    if(js.status === "done" || restQty() === 0){ setStatus("Auftrag ist fertig"); return; }
    if(js.active){ setStatus("Läuft bereits"); return; }
    js.active = { startTs: now() };
    js.history.push({ type:"start", ts: now() });
    persist();
    setStatus("Start");
    compute();
    startLiveTimer(compute);
  });

  document.getElementById("btnStop").addEventListener("click", () => {
    if(!js.active){ setStatus("Nichts läuft"); return; }
    const max = restQty();
    const qty = parseQty(inpQty.value, 0, max);
    if(qty === null){ setStatus("Menge eingeben"); return; }

    const addMs = Date.now() - js.active.startTs;
    js.spentMs = (js.spentMs||0) + addMs;
    js.doneQty = (js.doneQty||0) + qty;
    js.history.push({ type:"stop", ts: now(), qty, addMs });
    js.active = null;

    inpQty.value = "";
    persist();
    setStatus("Ende");
    compute();
    stopLiveTimer();
  });

  document.getElementById("btnFinish").addEventListener("click", () => {
    if(js.status === "done"){ setStatus("Bereits fertig"); return; }

    let addMs = 0;
    if(js.active){
      addMs = Date.now() - js.active.startTs;
      js.spentMs = (js.spentMs||0) + addMs;
      js.active = null;
    }

    const max = restQty();
    if(max === 0){
      js.status = "done";
      persist();
      compute();
      setStatus("Fertig");
      return;
    }

    const qty = parseQty(inpQty.value, 0, max);
    const finalQty = qty === null ? max : Math.min(max, qty);

    js.doneQty = (js.doneQty||0) + finalQty;
    js.status = "done";
    js.history.push({ type:"finish", ts: now(), qty: finalQty, addMs });
    inpQty.value = "";
    persist();
    compute();
    setStatus("Fertig");
    stopLiveTimer();
  });

  document.getElementById("btnRest").addEventListener("click", () => {
    inpQty.value = String(restQty());
    setStatus("Rest");
  });
  document.getElementById("btnPlus10").addEventListener("click", () => {
    const max = restQty();
    const cur = parseQty(inpQty.value, 0, max) ?? 0;
    inpQty.value = String(addQty(cur, 10, max));
  });
  document.getElementById("btnPlus25").addEventListener("click", () => {
    const max = restQty();
    const cur = parseQty(inpQty.value, 0, max) ?? 0;
    inpQty.value = String(addQty(cur, 25, max));
  });

  compute();
  if(js.active) startLiveTimer(compute);
}

function bindGemeinkosten(){
  const elState = document.getElementById("gkState");
  const elList = document.getElementById("gkList");
  const elTimer = document.getElementById("gkTimer");
  const elSub = document.getElementById("gkSub");
  const elHist = document.getElementById("gkHistory");

  renderGk(elList, data, state);

  function compute(){
    if(state.gk.active){
      elState.textContent = "Aktiv";
      elState.className = "badge badge--active";
      elTimer.textContent = fmtHMS(Date.now()-state.gk.active.startTs);
      const gk = data.gemeinkosten.find(x => x.id === state.gk.active.gkId);
      elSub.textContent = gk ? gk.titel : "";
    } else {
      elState.textContent = "Offen";
      elState.className = "badge";
      elTimer.textContent = "00:00:00";
      elSub.textContent = "";
    }
    renderGkHistory(elHist, state.gk.history, data);
  }

  document.getElementById("btnGkStart").addEventListener("click", () => {
    if(state.gk.active){ setStatus("Läuft bereits"); return; }
    const selected = state.gk.selected || data.gemeinkosten[0]?.id;
    state.gk.active = { gkId: selected, startTs: now() };
    persist();
    setStatus("Start");
    startLiveTimer(compute);
  });

  document.getElementById("btnGkStop").addEventListener("click", () => {
    if(!state.gk.active){ setStatus("Nichts läuft"); return; }
    const entry = { ...state.gk.active, endTs: now() };
    state.gk.history.push(entry);
    state.gk.active = null;
    persist();
    setStatus("Ende");
    stopLiveTimer();
    compute();
  });

  compute();
  if(state.gk.active) startLiveTimer(compute);
}

function bindBibliothek(){
  const el = document.getElementById("docList");
  renderBibliothek(el, data);
  persist();
  setStatus("Bereit");
}

function bindModell(jobId){
  const el = document.getElementById("modelJob");
  el.textContent = `Auftrag ${jobId}`;
  setStatus("Bereit");
}

function bindDispo(){
  const list = document.getElementById("dispoList");
  list.innerHTML = "";

  data.jobs.forEach(job => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="item__title">${job.titel}</div>
      <div class="item__sub">${job.beschreibung}</div>
      <div class="row">
        <button class="btn btn--primary" data-send="${job.jobId}">In Inbox</button>
        <button class="btn btn--ghost" data-accept="${job.jobId}">Direkt annehmen</button>
      </div>
    `;
    item.querySelector("[data-send]")?.addEventListener("click", () => {
      const id = String(job.jobId);
      if(!(state.inbox||[]).some(x => String(x)===id)) state.inbox = [...(state.inbox||[]), id];
      persist();
      setStatus("Zugestellt");
      bindDispo();
    });
    item.querySelector("[data-accept]")?.addEventListener("click", () => {
      acceptJob(state, job.jobId);
      persist();
      setStatus("Angenommen");
      go("#/auftraege");
    });
    list.appendChild(item);
  });

  setStatus("Bereit");
}

boot();
