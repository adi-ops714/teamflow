const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
export function getToken() { return localStorage.getItem("teamflow_token"); }
export async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
