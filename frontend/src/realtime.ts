import { Platform } from "react-native";
import { getToken } from "./api";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

// Opens a realtime WebSocket to the backend, authenticated via the stored JWT.
// Returns the socket (or null if not logged in / on failure). Caller closes it.
export async function connectRealtime(onEvent: (msg: any) => void): Promise<WebSocket | null> {
  try {
    const token = await getToken();
    if (!token) return null;
    const wsUrl = BASE.replace(/^http/, "ws") + `/api/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (e: any) => {
      try { onEvent(JSON.parse(e.data)); } catch {}
    };
    // keepalive ping every 25s (some proxies close idle sockets)
    const ping = setInterval(() => {
      try { if (ws.readyState === 1) ws.send("ping"); } catch {}
    }, 25000);
    ws.onclose = () => clearInterval(ping);
    return ws;
  } catch {
    return null;
  }
}

export const isWeb = Platform.OS === "web";
