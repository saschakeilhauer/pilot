const BASE = "./assets/data";

export async function loadData(){
  const [user, jobs, gemeinkosten] = await Promise.all([
    fetch(`${BASE}/user.json`).then(r => r.json()),
    fetch(`${BASE}/jobs.json`).then(r => r.json()),
    fetch(`${BASE}/gemeinkosten.json`).then(r => r.json()),
  ]);
  return { user, jobs, gemeinkosten };
}
