import { onUrl } from "@fabianlars/tauri-plugin-oauth";

type listnerCallback<T = any> = {
    onSucess: (data: T) => any,
    onError?: (err: Error) => any
}

export interface AuthCodeData {
    code: string | null;
    port?: number;
}

export async function listen_for_auth_code(callback: listnerCallback<AuthCodeData>) {
    const unlisten = await onUrl(async (payload) => {
      try {
        console.log("gotten data", payload);
        if (!payload) return;
        const url = new URL(payload);
        const code = new URLSearchParams(url.search).get("code");
        const port = url.port ? parseInt(url.port, 10) : undefined;
        return callback.onSucess({ code, port });
      } catch (err) {
        unlisten();
        return callback.onError ? callback.onError(err as Error) : null;
      }
    });
  return unlisten;
}
