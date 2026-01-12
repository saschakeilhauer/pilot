import { loadData } from "./data.js";
import { loadState, saveState, resetState } from "./storage.js";
import { getRoute, go } from "./router.js";
import {
  wireNav, setStatus, renderWhoAmI,
  renderAuftragsList, ensureJobState, renderHistory,
  renderGkList, renderGkHistory, parseQty, addQty
} from "./ui.js";
import { now, fmtTime } from "./utils.js";

const PARTIALS = {
  header: "./partials/header.html",
  footer: "./partials/footer.html"
};

const SCREENS = {
  login: "./screens/login.html",
  auftraege: "./screens/auftraege.html",
  auftrag_detail: "./screens/auftrag_detail.html",
  gemeinkosten: "./screens/gemeinkosten.html",
  dokumente: "./screens/dokumente.html"
};

let data = null;
let state = null;

async function boot(){
  await loadPartials();
  registerSW();

  data = await loadData();
  state = loadState();

  bindGlobal();
  updateHeader();

  // initial route
  route();
  window.addEventListener("hashchange", route);
}

async function loadPartials(){
  const [header, footer] = await Promise.all([
    fetch(PARTIALS.header).then(r => r.text()),
    fetch(PARTIALS.footer).then(r => r.text())
  ]);
  document.getElementById("header").innerHTML = header;
  document.getElementById("footer").innerHTML = footer;

  wireNav(document);
  document.getElementById("btnReset").addEventListener("click", () => {
    resetState();
    state = loadState();
    updateHeader();
    setStatus("Demo zurückgesetzt");
    go("#/login");
  });

  // Nav Buttons in header
  document.querySelectorAll(".nav__btn").forEach(btn => {
    btn.addEventListener("click", () => go(btn.dataset.nav));
  });
}

function registerSW(){
  if(!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try{
      await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
    }catch(e){
      // still ok
    }
  });
}

function bindGlobal(){
  // nothing yet
}

function updateHeader(){
  const user = data?.mitarbeiter?.find(m => m.id === state.currentUserId) || null;
  renderWhoAmI(user);
}

async function renderScreen(path){
  const html = await fetch(path).then(r => r.text());
  const main = document.getElementById("main");
  main.innerHTML = html;
  wireNav(main);
}

async function route(){
  const parts = getRoute();
  const page = parts[0] || "login";

  if(!data || !state){
    await renderScreen(SCREENS.login);
    return;
  }

  if(page === "login"){
    await renderScreen(SCREENS.login);
    bindLogin();
    setStatus("Login bereit");
    return;
  }

  if(page === "auftraege"){
    await renderScreen(SCREENS.auftraege);
    bindAuftraege();
    setStatus("Aufträge geladen");
    return;
  }

  if(page === "auftrag"){
    const jobId = parts[1];
    await renderScreen(SCREENS.auftrag_detail);
    bindAuftragDetail(jobId);
    setStatus(`Auftrag ${jobId} geladen`);
    return;
  }

  if(page === "gemeinkosten"){
    await renderScreen(SCREENS.gemeinkosten);
    bindGemeinkosten();
    setStatus("Gemeinkosten bereit");
    return;
  }

  if(page === "dokumente"){
    await renderScreen(SCREENS.dokumente);
    setStatus("Dokumente bereit");
    return;
  }

  go("#/login");
}

function persist(){
  saveState(state);
  updateHeader();
}

function bindLogin(){
  const sel = document.getElementById("selMitarbeiter");
  sel.innerHTML = `<option value="">Bitte wählen</option>` + data.mitarbeiter
    .map(m => `<option value="${m.id}">${m.name} (${m.persnr})</option>`)
    .join("");

  if(state.currentUserId){
    sel.value = state.currentUserId;
  }

  document.getElementById("btnLogin").addEventListener("click", () => {
    const id = sel.value || null;
    state.currentUserId = id;
    persist();
    setStatus(id ? "Angemeldet" : "Nicht angemeldet");
  });

  document.getElementById("btnLogout").addEventListener("click", () => {
    state.currentUserId = null;
    persist();
    setStatus("Abgemeldet");
  });

  document.getElementById("btnQrLogin").addEventListener("click", () => {
    const pers = (document.getElementById("inpPersNr").value || "").trim();
    const m = data.mitarbeiter.find(x => x.persnr === pers);
    if(!m){
      setStatus("Personalnummer nicht gefunden");
      return;
    }
    state.currentUserId = m.id;
    persist();
    setStatus("Angemeldet per QR Simulation");
  });
}

function bindAuftraege(){
  const list = document.getElementById("auftragsList");
  renderAuftragsList(list, data, state, state.currentUserId);
  persist();
}

function bindAuftragDetail(jobId){
  const job = data.auftraege.find(j => String(j.jobId) === String(jobId));
  if(!job){
    setStatus("Auftrag nicht gefunden");
    go("#/auftraege");
    return;
  }

  const js = ensureJobState(state, job);

  // UI refs
  const title = document.getElementById("jobTitle");
  const badge = document.getElementById("jobState");
  const kTotal = document.getElementById("kpiTotal");
  const kDone = document.getElementById("kpiDone");
  const kRest = document.getElementById("kpiRest");
  const inpQty = document.getElementById("inpQty");
  const hint = document.getElementById("qtyHint");
  const history = document.getElementById("history");

  title.textContent = `${job.titel}`;
  kTotal.textContent = String(job.gesamtMenge || 0);

  const updateKPIs = () => {
    const done = js.doneQty || 0;
    const rest = Math.max(0, (job.gesamtMenge || 0) - done);
    kDone.textContent = String(done);
    kRest.textContent = String(rest);
    badge.textContent = js.active ? "AKTIV" : (rest === 0 ? "FERTIG" : "OFFEN");
    hint.textContent = rest === 0
      ? "Hinweis: Auftrag ist bereits fertig gemeldet."
      : "Hinweis: Überbuchung ist technisch gesperrt.";
    renderHistory(history, js.history, data);
  };

  updateKPIs();

  const restQty = () => Math.max(0, (job.gesamtMenge || 0) - (js.doneQty || 0));

  document.getElementById("btnStart").addEventListener("click", () => {
    if(!state.currentUserId){
      setStatus("Bitte zuerst anmelden");
      go("#/login");
      return;
    }
    if(restQty() === 0){
      setStatus("Auftrag ist schon fertig");
      return;
    }
    js.active = { userId: state.currentUserId, startTs: now() };
    js.history.push({ type:"start", ts: now(), userId: state.currentUserId });
    persist();
    updateKPIs();
    setStatus(`Start ${fmtTime(js.active.startTs)}`);
  });

  document.getElementById("btnStop").addEventListener("click", () => {
    if(!state.currentUserId){
      setStatus("Bitte zuerst anmelden");
      go("#/login");
      return;
    }
    if(!js.active){
      setStatus("Kein aktiver Auftrag");
      return;
    }
    const max = restQty();
    const qty = parseQty(inpQty.value, 0, max);
    if(qty === null){
      setStatus("Menge eingeben");
      return;
    }
    js.doneQty = (js.doneQty || 0) + qty;
    js.history.push({ type:"stop", ts: now(), userId: state.currentUserId, qty });
    js.active = null;
    inpQty.value = "";
    persist();
    updateKPIs();
    setStatus(`Ende, Menge ${qty}`);
  });

  document.getElementById("btnFinish").addEventListener("click", () => {
    if(!state.currentUserId){
      setStatus("Bitte zuerst anmelden");
      go("#/login");
      return;
    }
    const max = restQty();
    if(max === 0){
      setStatus("Nichts mehr offen");
      return;
    }
    const qty = parseQty(inpQty.value, 0, max) ?? max;
    // Finish bedeutet Rest schließen
    const finalQty = Math.min(max, qty);
    js.doneQty = (js.doneQty || 0) + finalQty;
    js.history.push({ type:"finish", ts: now(), userId: state.currentUserId, qty: finalQty });
    js.active = null;
    inpQty.value = "";
    persist();
    updateKPIs();
    setStatus(`Fertig, Menge ${finalQty}`);
  });

  document.getElementById("btnSuggestRest").addEventListener("click", () => {
    inpQty.value = String(restQty());
    setStatus("Rest vorgeschlagen");
  });

  document.getElementById("btnQuick10").addEventListener("click", () => {
    const max = restQty();
    const cur = parseQty(inpQty.value, 0, max) ?? 0;
    inpQty.value = String(addQty(cur, 10, max));
  });

  document.getElementById("btnQuick25").addEventListener("click", () => {
    const max = restQty();
    const cur = parseQty(inpQty.value, 0, max) ?? 0;
    inpQty.value = String(addQty(cur, 25, max));
  });
}

function bindGemeinkosten(){
  const list = document.getElementById("gkList");
  const activeEl = document.getElementById("gkActive");
  const histEl = document.getElementById("gkHistory");

  let selected = data.gemeinkosten[0]?.id || null;

  const refresh = () => {
    renderGkList(list, data.gemeinkosten, selected);

    if(state.gk.active){
      const gk = data.gemeinkosten.find(x => x.id === state.gk.active.gkId);
      const title = gk ? gk.titel : state.gk.active.gkId;
      activeEl.textContent = `Aktiv: ${title} • Start ${fmtTime(state.gk.active.startTs)}`;
    } else {
      activeEl.textContent = "Keine aktive Gemeinkostenzeit";
    }

    renderGkHistory(histEl, state.gk.history, data, data.gemeinkosten);

    // selection
    list.querySelectorAll("button[data-gk-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        selected = btn.dataset.gkId;
        refresh();
      });
    });
  };

  refresh();

  document.getElementById("btnGkStart").addEventListener("click", () => {
    if(!state.currentUserId){
      setStatus("Bitte zuerst anmelden");
      go("#/login");
      return;
    }
    if(state.gk.active){
      setStatus("Bereits aktiv, erst Ende drücken");
      return;
    }
    state.gk.active = { gkId: selected, userId: state.currentUserId, startTs: now() };
    persist();
    refresh();
    setStatus("Gemeinkosten gestartet");
  });

  document.getElementById("btnGkStop").addEventListener("click", () => {
    if(!state.currentUserId){
      setStatus("Bitte zuerst anmelden");
      go("#/login");
      return;
    }
    if(!state.gk.active){
      setStatus("Keine aktive Gemeinkostenzeit");
      return;
    }
    const entry = { ...state.gk.active, endTs: now() };
    state.gk.history.push(entry);
    state.gk.active = null;
    persist();
    refresh();
    setStatus("Gemeinkosten beendet");
  });
}

boot();
