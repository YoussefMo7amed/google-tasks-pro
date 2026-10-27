import { Store } from '@tauri-apps/plugin-store';

export class LazyStore {
  private path: string;
  private instancePromise: Promise<Store> | null = null;

  constructor(path: string) {
    this.path = path;
  }

  private async getInstance(): Promise<Store> {
    if (!this.instancePromise) {
      this.instancePromise = Store.load(this.path).catch((err) => {
        this.instancePromise = null;
        throw err;
      });
    }
    return this.instancePromise;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const store = await this.getInstance();
      return await store.get<T>(key);
    } catch (err) {
      console.warn(`[LazyStore] Failed to get key "${key}" from ${this.path}:`, err);
      return undefined;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    try {
      const store = await this.getInstance();
      await store.set(key, value);
      await store.save();
    } catch (err) {
      console.warn(`[LazyStore] Failed to set key "${key}" in ${this.path}:`, err);
    }
  }

  async save(): Promise<void> {
    try {
      const store = await this.getInstance();
      await store.save();
    } catch (err) {
      console.warn(`[LazyStore] Failed to save ${this.path}:`, err);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const store = await this.getInstance();
      const res = await store.delete(key);
      await store.save();
      return res;
    } catch (err) {
      console.warn(`[LazyStore] Failed to delete key "${key}" from ${this.path}:`, err);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const store = await this.getInstance();
      await store.clear();
      await store.save();
    } catch (err) {
      console.warn(`[LazyStore] Failed to clear ${this.path}:`, err);
    }
  }
}

export const SettingsStore = new LazyStore('.settings.dat');
export const AuthStore = new LazyStore('.auth.dat');
export const TaskStore = new LazyStore('.task.dat');
