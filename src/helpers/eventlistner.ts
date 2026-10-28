import { onUrl } from "@fabianlars/tauri-plugin-oauth";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";
import { isMobile } from "./platform";

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

        // Check if the app was cold-started via deep link
        getCurrent().then((urls) => {
            if (urls && urls.length > 0) {
                handleDeepLinkUrls(urls);
            }
        }).catch(() => {});
    } catch (err) {
        console.warn("Deep link listener registration warning:", err);
    }

    // 2. Desktop OAuth loopback listener via tauri-plugin-oauth (desktop only)
    if (!isMobile()) {
        try {
            const unlistenOAuth = await onUrl(async (payload) => {
                try {
                    console.log("Desktop OAuth payload received:", payload);
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
            console.warn("Desktop OAuth server listener registration warning:", err);
        }
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
