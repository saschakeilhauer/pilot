/* localStorage State
   Zweck: Demo wirkt "echt" ohne Backend.
*/
const KEY = "pilot_ze_state_v1";

export function defaultState(){
  return {
    currentUserId: null,
    jobs: {
      // jobId: { active: { userId, startTs } | null, doneQty: number, history: [] }
    },
    gk: {
      active: null, // { gkId, userId, startTs }
      history: []
    }
  };
}

export function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  }catch(e){
    return defaultState();
  }
}

export function saveState(state){
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState(){
  localStorage.removeItem(KEY);
}
