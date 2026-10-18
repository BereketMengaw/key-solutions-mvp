// Web build (browser testing only): localStorage. Guarded for non-browser rendering.
const hasStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const sessionStorage = {
  async getItem(key: string): Promise<string | null> {
    return hasStorage() ? window.localStorage.getItem(key) : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (hasStorage()) window.localStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (hasStorage()) window.localStorage.removeItem(key);
  },
};
