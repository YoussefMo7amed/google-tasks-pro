import { invoke } from '@tauri-apps/api/tauri';
import * as commands from './commands';
import { AccessToken, SaveAccessTokenResponse, SaveTokenResponse } from './commands';
import {AuthStore} from './DBStores';
import settings from '../config/settings';


const storeConstant = settings.storage.constants;

export async function save_auth_code(code: string) : Promise<SaveTokenResponse> {
    // return await commands.saveCode(code);
    await AuthStore.set(storeConstant.authcode, code);
    return { message: "Code saved", token: code, success: true };


}

export async function get_auth_code() : Promise<string> {
    // return await commands.loadCode();
    return await AuthStore.get<string>(storeConstant.authcode) ?? "";
    
}

export async function save_access_token(token: string|AccessToken) : Promise<SaveAccessTokenResponse> {
    const accessTokenText: AccessToken = typeof token === "string" ? JSON.parse(token) : token;
    // return await commands.saveAccessToken(accessTokenText);
    await AuthStore.set(storeConstant.access_token, accessTokenText);
    return { message: "Token saved", success: true, token: token as AccessToken };
}

export async function get_access_token() : Promise<AccessToken> {
    // return await commands.loadAccessToken();
    return await AuthStore.get<AccessToken>(storeConstant.access_token) ?? {} as AccessToken;
}

export async function test_command() {
    return await commands.testCommand();
}

export async function greet(name: string) {
    return await commands.greet(name);
}

const OAUTH_RESPONSE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Google Tasks Pro - Connected</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #131314;
      color: #e3e3e3;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 24px;
    }
    .card {
      background: #1e1f20;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 40px 32px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
    }
    .icon {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      background: #2563eb;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: #fff;
    }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #fff; }
    p { font-size: 14px; color: #9aa0a6; line-height: 1.6; margin-bottom: 20px; }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(37, 99, 235, 0.15);
      border: 1px solid #2563eb;
      color: #8ab4f8;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Sign In Successful!</h1>
    <p>You have successfully connected to <strong>Google Tasks Pro</strong>.<br>You can now return to the desktop app.</p>
    <div class="badge">Closing tab automatically...</div>
  </div>
  <script>
    setTimeout(function() {
      try {
        window.open('', '_self', '');
        window.close();
      } catch (e) {}
    }, 1200);
  </script>
</body>
</html>`;

export async function generate_oauth_port(): Promise<number> {
    try {
        // Use Tauri invoke to call the Rust OAuth plugin v1 with custom auto-closing HTML
        const port = await invoke<number>('plugin:oauth|start', {
            config: {
                response: OAUTH_RESPONSE_HTML,
            }
        });
        return port;
    } catch (error) {
        console.error('Failed to start OAuth server:', error);
        throw error;
    }
}