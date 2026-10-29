import { onUrl } from "@fabianlars/tauri-plugin-oauth";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";

type listnerCallback<T = any> = {
    onSucess: (data: T) => any,
    onError?: (err: Error) => any
}

export interface AuthCodeData {
    code: string | null;
    port?: number;
}

function parseCodeFromUrl(urlStr: string): string | null {
    try {
        const url = new URL(urlStr);
        const code = url.searchParams.get("code");
        if (code) return code;
    } catch {
        // Fall back to regex parsing for non-standard scheme URLs (e.g. com.googleusercontent.apps...:/oauth2redirect)
    }
    const match = urlStr.match(/[?&]code=([^&#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

export async function listen_for_auth_code(callback: listnerCallback<AuthCodeData>) {
    const unlisteners: (() => void)[] = [];

    // 1. Deep-link listener (Mobile & Desktop)
    try {
        const handleDeepLinkUrls = (urls: string[]) => {
            try {
                console.log("Deep link payload received:", urls);
                for (const urlStr of urls) {
                    if (urlStr && urlStr.includes("code=")) {
                        const code = parseCodeFromUrl(urlStr);
                        if (code) {
                            callback.onSucess({ code });
                            return;
                        }
                    }
                }
            } catch (err) {
                if (callback.onError) callback.onError(err as Error);
            }
        };

        const unlistenDeepLink = await onOpenUrl(handleDeepLinkUrls);
        unlisteners.push(unlistenDeepLink);

        // Also wire fallback bridge for native Android WebView delivery
        if (typeof window !== "undefined") {
            (window as any).__TAURI_HANDLE_DEEP_LINK__ = (url: string) => {
                console.log("Native Android bridge delivered deep link:", url);
                handleDeepLinkUrls([url]);
            };
            const customHandler = (e: any) => {
                if (e.detail) {
                    console.log("CustomEvent oauth-deep-link received:", e.detail);
                    handleDeepLinkUrls([e.detail]);
                }
            };
            window.addEventListener("oauth-deep-link", customHandler);
            if ((window as any).__PENDING_DEEP_LINK__) {
                console.log("Found pending deep link on startup:", (window as any).__PENDING_DEEP_LINK__);
                handleDeepLinkUrls([(window as any).__PENDING_DEEP_LINK__]);
                delete (window as any).__PENDING_DEEP_LINK__;
            }
            unlisteners.push(() => {
                delete (window as any).__TAURI_HANDLE_DEEP_LINK__;
                window.removeEventListener("oauth-deep-link", customHandler);
            });
        }

        // Check if the app was cold-started via deep link
        getCurrent().then((urls) => {
            if (urls && urls.length > 0) {
                handleDeepLinkUrls(urls);
            }
        }).catch(() => {});
    } catch (err) {
        console.warn("Deep link listener registration warning:", err);
    }

    // 2. OAuth loopback listener via tauri-plugin-oauth (All platforms)
    try {
        const unlistenOAuth = await onUrl(async (payload) => {
            try {
                console.log("OAuth loopback payload received:", payload);
                if (!payload) return;
                const url = new URL(payload);
                const code = new URLSearchParams(url.search).get("code");
                const port = url.port ? parseInt(url.port, 10) : undefined;
                return callback.onSucess({ code, port });
            } catch (err) {
                if (unlistenOAuth) unlistenOAuth();
                return callback.onError ? callback.onError(err as Error) : null;
            }
        });
        unlisteners.push(unlistenOAuth);
    } catch (err) {
        console.warn("OAuth server listener registration warning:", err);
    }

    return () => {
        unlisteners.forEach((fn) => {
            try {
                fn();
            } catch {
                // Ignore cleanup errors
            }
        });
    };
}
