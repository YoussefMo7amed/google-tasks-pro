/**
 * Typed Tauri commands wrapper
 * Hand-written equivalent for Tauri v2 migration replacing specta generation.
 * Maps to Rust commands in src-tauri/src/libs/tauri_actions.rs.
 */

import { invoke } from '@tauri-apps/api/core';

export type AccessToken = {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    token_type: string;
    id_token: string;
};

export type GreetResponse = {
    message: string;
};

export type SaveTokenResponse = {
    message: string;
    token: string;
    success: boolean;
};

export type SaveAccessTokenResponse = {
    message: string;
    success: boolean;
    token: AccessToken;
};

export function saveAccessToken(token: string): Promise<SaveAccessTokenResponse> {
    return invoke<SaveAccessTokenResponse>("save_access_token", { token });
}

export function loadAccessToken(): Promise<AccessToken> {
    return invoke<AccessToken>("load_access_token");
}

export function greet(name: string): Promise<GreetResponse> {
    return invoke<GreetResponse>("greet", { name });
}

export function saveCode(code: string): Promise<SaveTokenResponse> {
    return invoke<SaveTokenResponse>("save_code", { code });
}

export function loadCode(): Promise<string> {
    return invoke<string>("load_code");
}

export function bringToFront(): Promise<null> {
    return invoke<null>("bring_to_front");
}
