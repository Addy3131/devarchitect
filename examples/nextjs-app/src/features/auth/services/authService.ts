export async function loginUser(username: string, pass: string) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pass }),
  });
  return res.json();
}

