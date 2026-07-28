import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
export const TOKEN_KEY = "therapishots_token";

async function authHeaders() {
  const token = await storage.secureGet<string>(TOKEN_KEY, "");
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function handle(res: Response) {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = (data && data.detail) || "Request failed";
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

export const api = {
  async get(path: string) {
    const res = await fetch(`${BASE}/api${path}`, { headers: await authHeaders() });
    return handle(res);
  },
  async post(path: string, body?: any) {
    const res = await fetch(`${BASE}/api${path}`, {
      method: "POST",
      headers: await authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handle(res);
  },
  async put(path: string, body?: any) {
    const res = await fetch(`${BASE}/api${path}`, {
      method: "PUT",
      headers: await authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handle(res);
  },
  async del(path: string) {
    const res = await fetch(`${BASE}/api${path}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    return handle(res);
  },
};

export async function adminAuth(passcode: string) {
  const res = await fetch(`${BASE}/api/admin/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode }),
  });
  return handle(res);
}

export function adminApi(token: string) {
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  return {
    get: async (path: string) => handle(await fetch(`${BASE}/api${path}`, { headers: h })),
    post: async (path: string, body?: any) =>
      handle(await fetch(`${BASE}/api${path}`, { method: "POST", headers: h, body: body ? JSON.stringify(body) : undefined })),
    put: async (path: string, body?: any) =>
      handle(await fetch(`${BASE}/api${path}`, { method: "PUT", headers: h, body: body ? JSON.stringify(body) : undefined })),
    del: async (path: string) => handle(await fetch(`${BASE}/api${path}`, { method: "DELETE", headers: h })),
  };
}

export async function saveToken(token: string) {
  await storage.secureSet(TOKEN_KEY, token);
}
export async function getToken() {
  return storage.secureGet<string>(TOKEN_KEY, "");
}
export async function clearToken() {
  await storage.secureRemove(TOKEN_KEY);
}
