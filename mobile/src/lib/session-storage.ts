// Supabase session storage on Android/iOS: expo-secure-store, split into chunks
// because SecureStore warns above ~2 KB per value and a session is often larger.
// The web build uses session-storage.web.ts instead.
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;
const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

async function readCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(countKey(key));
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

async function removeChunks(key: string, from: number, to: number) {
  for (let i = from; i < to; i++) await SecureStore.deleteItemAsync(chunkKey(key, i));
}

export const sessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await readCount(key);
    if (count === 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part === null) return null; // half-written session: treat as signed out
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const oldCount = await readCount(key);
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) chunks.push(value.slice(i, i + CHUNK_SIZE));
    for (let i = 0; i < chunks.length; i++) await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
    await SecureStore.setItemAsync(countKey(key), String(chunks.length));
    await removeChunks(key, chunks.length, oldCount);
  },

  async removeItem(key: string): Promise<void> {
    const count = await readCount(key);
    await SecureStore.deleteItemAsync(countKey(key));
    await removeChunks(key, 0, count);
  },
};
