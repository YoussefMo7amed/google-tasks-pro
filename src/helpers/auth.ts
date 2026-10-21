import { shell } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/tauri";
import axios from "axios";
import { UserProfile } from "../types/googleapis";
import { readTextFile, removeFile, writeTextFile } from "@tauri-apps/api/fs";
import { getClientId, getClientSecret } from "../config/credentials";
import settings from "../config/settings";
import { generate_oauth_port, get_access_token, get_auth_code, save_access_token, save_auth_code } from "./invoker";
import { AccessToken } from "./commands";
import { setRecoil } from "recoil-nexus";
import { accessTokenState, activeCategoryTasksState, activeTaskCategoryState, authLoadingState, messageState, userProfileState } from "../config/states";
import { pushNotification } from "./windowhelper";
import { cancelAllNotifications } from "../services/notification.service";

const DEFAULT_DIRECTORY = settings.fs.DEFAULT_DIRECTORY;
const GOOGLE_OAUTH_ENDPOINT = settings.auth.GOOGLE_OAUTH_ENDPOINT;
const SCOPE = settings.auth.SCOPE;
const STORAGE_PATHS = settings.storage.paths;

class PortManager {
    private port?: number;

    async startNewSession(): Promise<number> {
        // If there was an existing port, attempt to cancel it first to prevent port leaks
        if (this.port) {
            try {
                await invoke('plugin:oauth|cancel', { port: this.port });
            } catch {
                // Ignore if already stopped
            }
            this.port = undefined;
        }
        const port = await generate_oauth_port();
        this.port = port as number;
        return this.port;
    }

    getPort(): number {
        return this.port || 0;
    }

    reset() {
        if (this.port) {
            invoke('plugin:oauth|cancel', { port: this.port }).catch(() => {});
            this.port = undefined;
        }
    }
}

const portManager = new PortManager();

export function cancelLoginSession() {
    portManager.reset();
}

export async function getAccessToken(code: string, portOverride?: number): Promise<AccessToken> {
    try {
        const port = portOverride || portManager.getPort();
        const data = {
            code,
            client_id: getClientId(),
            client_secret: getClientSecret(),
            redirect_uri: getLocalHostUrl(port),
            grant_type: "authorization_code",
        };
        console.log(data, "data for token exchange");
        const response = await axios.post("https://oauth2.googleapis.com/token", data, { timeout: 8000 });
        console.log(response, "response from getAccessToken");
        return response.data;
    }
    catch (error) {
        console.error("Error getting access token:", error);
        throw new Error("Error getting access token");
    }
}

export async function refreshAccessToken(refreshToken: string) : Promise<AccessToken> {
    if (!refreshToken) {
        throw new Error("No refresh token provided");
    }
    try {
        const data = {
            refresh_token: refreshToken,
            client_id: getClientId(),
            client_secret: getClientSecret(),
            grant_type: "refresh_token",
        };
        console.log('attempting to refresh access token');
        const response = await axios.post("https://oauth2.googleapis.com/token", data, { timeout: 8000 });
        return {...response.data, refresh_token: refreshToken};
    } catch (error) {
        console.error("Error refreshing access token:", error);
        throw new Error("Error refreshing access token");
    }
}

export async function refreshAndSaveAccessToken(refreshToken: string): Promise<AccessToken> {
    if (!refreshToken) {
        throw new Error("No refresh token provided");
    }
    try {
        const accessToken = await refreshAccessToken(refreshToken);
        await saveAccessToken(accessToken);
        return accessToken;
    } catch (error) {
        console.error("Error refreshing and saving access token:", error);
        throw new Error("Error refreshing and saving access token");
    }
}

export async function revokeAccessToken(accessToken: string) {
    try {
        const data = {
            token: accessToken,
        };
        const response = await axios.post("https://oauth2.googleapis.com/revoke", data, { timeout: 8000 });
        return response.data;
    } catch (error) {
        console.error("Error revoking access token:", error);
        throw new Error("Error revoking access token");
    }
}



export async function fetchUserProfile(accessToken : string) : Promise<UserProfile> {
  try {
    // Fetch user profile information using the access token
    const response = await axios.get<UserProfile>("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 8000,
    });
    console.log(response.data, "response from fetchUserProfile");
    return response.data;
  }catch (error) {
    console.error("Error fetching user profile:", error);
    throw new Error("Error fetching user profile");
  }
}


 // to handle login to get auth
export async function openAuthWindow() {
    // ALWAYS start a fresh OAuth listener session so retries never reuse a dead port
    const port = await portManager.startNewSession();
    const url = new URL(GOOGLE_OAUTH_ENDPOINT);
    url.searchParams.append("scope", SCOPE);
    url.searchParams.append("access_type", "offline");
    url.searchParams.append("prompt", "consent");
    url.searchParams.append("response_type", "code");
    url.searchParams.append("client_id", getClientId());
    url.searchParams.append("redirect_uri", getLocalHostUrl(port));
    url.searchParams.append("include_granted_scopes", "true");
    url.searchParams.append("state", "state_parameter_passthrough_value");
    shell.open(url.href);
}

/**
 * Handle manual entry of the authorization code or redirected callback URL.
 * Rescues users when browser loopback redirect fails (e.g. Brave Shields, firewalls).
 */
export async function handleManualAuthCode(input: string): Promise<boolean> {
    setRecoil(authLoadingState, true);
    try {
        let code = input.trim();
        let portOverride: number | undefined;

        // Strip quotes if wrapped
        code = code.replace(/^["']|["']$/g, "").trim();

        if (code.includes("code=") || code.startsWith("http://") || code.startsWith("https://") || code.includes("localhost")) {
            try {
                const normalized = code.startsWith("http") ? code : `http://${code}`;
                const parsedUrl = new URL(normalized);
                const codeParam = parsedUrl.searchParams.get("code");
                if (codeParam) {
                    code = codeParam;
                }
                if (parsedUrl.port) {
                    portOverride = parseInt(parsedUrl.port, 10);
                }
            } catch {
                const codeMatch = code.match(/[?&]code=([^&]+)/);
                if (codeMatch) {
                    code = decodeURIComponent(codeMatch[1]);
                }
                const portMatch = code.match(/localhost:(\d+)/);
                if (portMatch) {
                    portOverride = parseInt(portMatch[1], 10);
                }
            }
        }

        if (!code) {
            throw new Error("No authorization code found in input");
        }

        const accessTokenBody = await getAccessToken(code, portOverride);
        await handleLoadFrom(accessTokenBody);
        pushNotification("Login Successful");
        return true;
    } catch (err) {
        console.error("Failed to sign in with manual authorization code:", err);
        setRecoil(authLoadingState, false);
        setRecoil(messageState, {
            title: "Authentication Error",
            body: "Invalid or expired authorization code. Please try again.",
            type: "error",
        });
        throw err;
    }
}

// save the auth code to storage
export async function saveAuthCode(code: string) {
    try {
        return await save_auth_code(code);
    } catch (error) {
        console.error("Error saving auth code:", error);
        throw new Error("Error saving auth code");
    }
}

// get the auth code from storage
export async function getAuthCode() {
    try {
        return await get_auth_code();
    } catch (error) {
        console.error("Error getting auth code:", error);
        return null;
    }
}

export async function saveAccessToken(accessToken: string|AccessToken) {
    try {
        localStorage.setItem("lastLogin", Date.now() + "");
        return await save_access_token(accessToken);
    } catch (error) {
        console.error("Error saving access token:", error);
        localStorage.removeItem("lastLogin");
        throw new Error("Error saving access token");
    }
}



export async function getAccessTokenFromStorage() {
    try {
        let accessToken = await get_access_token();
        console.log('getAccessTokenFromStorage: retrieved', accessToken);
        if (!accessToken || !accessToken.access_token) {
            console.log("getAccessTokenFromStorage: no valid access token found");
            return null;
        }

        // Check if token is expired (Google access tokens expire in 3600 seconds = 1 hour)
        const lastLogin = parseInt(localStorage.getItem("lastLogin") || "0");
        const tokenAgeMs = Date.now() - lastLogin;
        // Expired if login was more than 55 mins ago (3300 * 1000 ms) or lastLogin missing
        const isExpired = lastLogin === 0 || tokenAgeMs > 3300 * 1000;

        if (isExpired && navigator.onLine) {
            if (!accessToken.refresh_token) {
                console.warn("Access token expired and no refresh token available to refresh it");
                return accessToken;
            }
            console.log("Access token expired, attempting refresh");
            try {
                accessToken = await refreshAndSaveAccessToken(accessToken.refresh_token);
            } catch (refreshErr) {
                console.warn("Could not refresh token online (offline or dropped network), keeping existing token for offline access:", refreshErr);
                return accessToken;
            }
        }
        return accessToken;
    } catch (error) {
        console.error("Error getting access token:", error);
        return null;
    }
}


export async function deleteAccessToken() {
    try {
        return await removeFile(STORAGE_PATHS.access_token, { dir: DEFAULT_DIRECTORY });
    } catch (error) {
        // File might not exist, that's okay - fail silently
        console.debug("deleteAccessToken: file may not exist", error);
    }
}

export async function saveUserProfile(userProfile: UserProfile) {
    try {
        return await writeTextFile(STORAGE_PATHS.user_profile, JSON.stringify(userProfile), { dir: DEFAULT_DIRECTORY });
    } catch (error) {
        console.error("Error saving user profile:", error);
        throw new Error("Error saving user profile");
    }
}

export async function getUserProfileFromStorage() {
    try {
        const userProfile = await readTextFile(STORAGE_PATHS.user_profile, { dir: DEFAULT_DIRECTORY });
        return JSON.parse(userProfile) as UserProfile;
    } catch (error) {
        console.error("Error getting user profile:", error);
        return null;
    }
}

export async function deleteUserProfile() {
    try {
        return await removeFile(STORAGE_PATHS.user_profile, { dir: DEFAULT_DIRECTORY });
    } catch (error) {
        // File might not exist, that's okay - fail silently
        console.debug("deleteUserProfile: file may not exist", error);
    }
}


export async function handleLogin(forceNew: boolean = false) {
    setRecoil(authLoadingState, true)
    try {
      // If forcing new account, delete stored token first
      if (forceNew) {
        try {
          await deleteAccessToken();
          await deleteUserProfile();
        } catch {
          // Tokens might not exist, that's fine
        }
        pushNotification('Choose an account');
        await openAuthWindow();
        return;
      }

      const storedAccessToken = await getAccessTokenFromStorage();
      if (storedAccessToken) {
        handleLoadFrom(storedAccessToken);
        pushNotification('Login Successful')
        return;
      }
      pushNotification('login required')
      await openAuthWindow();
    } catch (error) {
      console.log(error);
      setRecoil(authLoadingState, false)
      setRecoil(messageState, {
        title: "Error",
        body: "Error signing in",
        type: "error"
      })
    }
}
  

export async function handleLoadFrom(accessTokenBody: AccessToken) {
    try {
      await saveAccessToken(JSON.stringify(accessTokenBody, null, 2))
      setRecoil(accessTokenState, accessTokenBody.access_token);
      const store = await import("../store");
      if (store.accessTokenAtom) setRecoil(store.accessTokenAtom, accessTokenBody.access_token);
      const userProfile = await fetchUserProfile(accessTokenBody.access_token);
      await saveUserProfile(userProfile)
      setRecoil(userProfileState, userProfile);
    }
    catch (err) {
      console.log(err);
      await handleLogout();
      setRecoil(messageState, {
        title: "Error",
        body: "Error signing in",
        type: "error"
      })
    }
    finally {
      setRecoil(authLoadingState, false);
    }
}
  
export async function handleLogout() {
    console.log("handleLogout: starting");
    setRecoil(authLoadingState, true);
    
    try {
      // Clear old auth atoms
      setRecoil(accessTokenState, null);
      setRecoil(userProfileState, null);
      setRecoil(activeTaskCategoryState, -1);
      setRecoil(activeCategoryTasksState, []);
      
      // Clear new store atoms using static import
      // Note: Import at top of file for reliability
      const store = await import("../store");
      if (store.accessTokenAtom) setRecoil(store.accessTokenAtom, null);
      if (store.taskListsAtom) setRecoil(store.taskListsAtom, []);
      if (store.starredTaskIdsAtom) setRecoil(store.starredTaskIdsAtom, new Set());
      
      // Delete stored tokens
      try {
        await deleteAccessToken();
        console.log("handleLogout: access token deleted");
      } catch (e) {
        console.log("handleLogout: error deleting token (may not exist)", e);
      }
      
      // Cancel all scheduled notifications
      try {
        await cancelAllNotifications();
        console.log("handleLogout: notifications cancelled");
      } catch (e) {
        console.log("handleLogout: error cancelling notifications", e);
      }
      
      // Cancel any ongoing OAuth session
      cancelLoginSession();
      localStorage.removeItem("is_guest_mode");
      if (store.isGuestModeAtom) setRecoil(store.isGuestModeAtom, false);

      console.log("handleLogout: complete");
    } catch (e) {
      console.error("handleLogout: error during logout", e);
    } finally {
      // ALWAYS set loading to false
      setRecoil(authLoadingState, false);
      console.log("handleLogout: loading set to false");
    }
  }

export function enterGuestMode() {
  localStorage.setItem("is_guest_mode", "true");
  setRecoil(authLoadingState, false);
}

export function exitGuestMode() {
  localStorage.removeItem("is_guest_mode");
  setRecoil(authLoadingState, false);
}

export async function handleInitialLogin() {
    // Check if user is in guest mode
    if (typeof window !== "undefined" && localStorage.getItem("is_guest_mode") === "true") {
      const store = await import("../store");
      if (store.isGuestModeAtom) setRecoil(store.isGuestModeAtom, true);
      return;
    }

    // get access token from storage
    const accessToken = await getAccessTokenFromStorage();
    if (!accessToken || !accessToken.access_token) throw new Error("Signin required");

    let profile: UserProfile | null = null;

    // If online, attempt to fetch fresh profile, but always fallback to cached profile if network fails
    if (navigator.onLine) {
        try {
            profile = await fetchUserProfile(accessToken.access_token);
            if (profile) {
                await saveUserProfile(profile);
            }
        } catch (fetchErr) {
            console.warn("Could not fetch user profile online (offline or dropped network), falling back to storage:", fetchErr);
            profile = await getUserProfileFromStorage();
        }
    } else {
        console.log("App started offline, loading cached user profile from storage");
        profile = await getUserProfileFromStorage();
    }

    // Secondary fallback in case navigator.onLine was inaccurate
    if (!profile || !profile.email) {
        profile = await getUserProfileFromStorage();
    }

    if (!profile || !profile.email) {
        throw new Error("No cached profile found. Please connect to the internet to sign in.");
    }

    setRecoil(userProfileState, profile);
    setRecoil(accessTokenState, accessToken.access_token);
    const store = await import("../store");
    if (store.accessTokenAtom) setRecoil(store.accessTokenAtom, accessToken.access_token);
    pushNotification(`Welcome back ${profile.name}`);
  }





function getLocalHostUrl(port: number) {
  return `http://localhost:${port}`;
}




