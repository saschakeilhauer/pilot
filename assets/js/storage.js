const KEY = "ze_state_v2";

export function defaultState(){
  return {
    userId: "u_sascha",
    inbox: [],
    accepted: [],
    jobs: {},
    gk: { active:null, history:[], selected:null },
    calls: []
  };
}

export function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return merge(defaultState(), parsed);
  }catch(e){
    return defaultState();
  }
}

function merge(base, extra){
  const out = { ...base, ...extra };
  out.gk = { ...base.gk, ...(extra?.gk || {}) };
  out.jobs = { ...(base.jobs || {}), ...(extra?.jobs || {}) };
  return out;
}

export function saveState(state){
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState(){
  localStorage.removeItem(KEY);
}
