/**
 * Account Service
 * 
 * Manages multiple Google accounts and seamless switching between accounts and Guest mode.
 * Persists known accounts in local storage so users don't have to re-authenticate every time.
 */

import { UserProfile } from "../types/googleapis";
import { AccessToken } from "../helpers/commands";

export interface StoredAccount {
  id: string; // unique identifier (email)
  email: string;
  name: string;
  picture?: string;
  accessToken: AccessToken;
  lastActive: number;
}

const ACCOUNTS_STORAGE_KEY = "google_tasks_saved_accounts_v1";

class AccountService {
  private accounts: Map<string, StoredAccount> = new Map();
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized || typeof window === "undefined") return;
    try {
      const data = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (data) {
        const parsed: StoredAccount[] = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.accounts.clear();
          for (const acc of parsed) {
            if (acc && acc.email) {
              this.accounts.set(acc.email.toLowerCase().trim(), acc);
            }
          }
        }
      }
      this.initialized = true;
    } catch (e) {
      console.warn("Failed to load saved accounts from storage:", e);
      this.accounts.clear();
      this.initialized = true;
    }
  }

  private save() {
    try {
      const list = Array.from(this.accounts.values());
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("Failed to persist saved accounts:", e);
    }
  }

  /**
   * Save or update an account with fresh profile & token
   */
  public saveAccount(profile: UserProfile, token: AccessToken): void {
    if (!profile || !profile.email) return;
    this.init();
    const email = profile.email.toLowerCase().trim();
    const account: StoredAccount = {
      id: email,
      email,
      name: profile.name || email,
      picture: profile.picture || undefined,
      accessToken: token,
      lastActive: Date.now(),
    };
    this.accounts.set(email, account);
    this.save();
  }

  /**
   * Get all saved Google accounts, sorted by last active
   */
  public getAccounts(): StoredAccount[] {
    this.init();
    return Array.from(this.accounts.values()).sort((a, b) => b.lastActive - a.lastActive);
  }

  /**
   * Find a specific account by email
   */
  public getAccount(email: string): StoredAccount | null {
    this.init();
    return this.accounts.get(email.toLowerCase().trim()) || null;
  }

  /**
   * Remove an account
   */
  public removeAccount(email: string): void {
    this.init();
    const key = email.toLowerCase().trim();
    if (this.accounts.has(key)) {
      this.accounts.delete(key);
      this.save();
    }
  }

  /**
   * Clear all saved accounts
   */
  public clearAll(): void {
    this.accounts.clear();
    this.save();
  }
}

export const accountService = new AccountService();
