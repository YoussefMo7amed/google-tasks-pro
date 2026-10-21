import { listen } from "@tauri-apps/api/event";

type listnerCallback<T = any> = {
    onSucess: (data: T) => any,
    onError ?: (err: Error) => any
}

export interface AuthCodeData {
    code: string | null;
    port?: number;
}

export async function listen_for_auth_code(callback: listnerCallback<AuthCodeData>) {
    const unlisten = await listen("oauth://url", async (data) => {
      try {
        console.log("gotten data", data.payload);
        if (!data.payload) return;
        const url = new URL(data.payload as string);
        const code = new URLSearchParams(url.search).get("code");
        const port = url.port ? parseInt(url.port, 10) : undefined;
        return callback.onSucess({ code, port });
      } catch (err) {
        unlisten();
        return callback.onError ? callback.onError(err as Error) : null;
      }
    });
  return;
}

