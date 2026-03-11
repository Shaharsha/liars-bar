const BASE_URL = ''

export async function createSession(nickname: string) {
  const res = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ nickname }),
  })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function getSession() {
  const res = await fetch(`${BASE_URL}/api/session`, { credentials: 'include' })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function fetchTables() {
  const res = await fetch(`${BASE_URL}/api/tables`, { credentials: 'include' })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function createTable(name: string, game_mode: 'deck' | 'dice') {
  const res = await fetch(`${BASE_URL}/api/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, game_mode }),
  })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function joinTable(tableId: string) {
  const res = await fetch(`${BASE_URL}/api/tables/${tableId}/join`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}
