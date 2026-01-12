const BASE = "./assets/data";

export async function loadData(){
  const [mitarbeiter, auftraege, gemeinkosten] = await Promise.all([
    fetch(`${BASE}/mitarbeiter.json`).then(r => r.json()),
    fetch(`${BASE}/auftraege.json`).then(r => r.json()),
    fetch(`${BASE}/gemeinkosten.json`).then(r => r.json()),
  ]);
  return { mitarbeiter, auftraege, gemeinkosten };
}
