import { Store } from '@tauri-apps/plugin-store';

export class LazyStore {
  private path: string;
  private instancePromise: Promise<Store> | null = null;

  constructor(path: string) {
    this.path = path;
  }

  private async getInstance(): Promise<Store> {
    if (!this.instancePromise) {
      this.instancePromise = Store.load(this.path);
    }
    return this.instancePromise;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const store = await this.getInstance();
    return await store.get<T>(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    const store = await this.getInstance();
    await store.set(key, value);
    await store.save();
  }

  async save(): Promise<void> {
    const store = await this.getInstance();
    await store.save();
  }

  async delete(key: string): Promise<boolean> {
    const store = await this.getInstance();
    const res = await store.delete(key);
    await store.save();
    return res;
  }

  async clear(): Promise<void> {
    const store = await this.getInstance();
    await store.clear();
    await store.save();
  }
}

export const SettingsStore = new LazyStore('.settings.dat');
export const AuthStore = new LazyStore('.auth.dat');
export const TaskStore = new LazyStore('.task.dat');
