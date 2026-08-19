/** Thin fetch helpers: every API route in this app answers with JSON. */

async function unwrap<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error ?? fallback);
  return data as T;
}

export async function getJson<T>(url: string, fallback = "Request failed") {
  return unwrap<T>(await fetch(url), fallback);
}

export async function postJson<T>(url: string, body: unknown, fallback = "Request failed") {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return unwrap<T>(response, fallback);
}
