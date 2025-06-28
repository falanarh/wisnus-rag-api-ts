import { KeyState, ServiceResponse } from '../types/mainTypes';

export async function initializeKeyState(): Promise<KeyState> {
  // Ambil API key dari environment (GEMINI_API_KEY_1 hingga GEMINI_API_KEY_10)
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) {
      keys.push(key);
    }
  }
  return { currentIndex: 0, keys };
}

export async function getCurrentKey(keyState: KeyState): Promise<ServiceResponse<[string, KeyState]>> {
  try {
    if (!keyState.keys.length) {
      throw new Error('No API keys available');
    }
    const apiKey = keyState.keys[keyState.currentIndex];
    // Kembalikan API key saat ini dan state (tanpa perubahan)
    return { success: true, data: [apiKey, keyState], metadata: {} };
  } catch (error: any) {
    return { success: false, error: error.message, metadata: {} };
  }
}

export async function handleError(keyState: KeyState, error: any): Promise<ServiceResponse<[null, KeyState]>> {
  try {
    // Pada error, rotasi ke API key berikutnya (dengan wrap-around)
    if (keyState.keys.length) {
      keyState.currentIndex = (keyState.currentIndex + 1) % keyState.keys.length;
    } else {
      keyState.currentIndex = 0;
    }
    return { success: true, data: [null, keyState], metadata: {} };
  } catch (err: any) {
    return { success: false, error: err.message, metadata: {} };
  }
}

export async function resetCounters(keyState: KeyState): Promise<ServiceResponse<KeyState>> {
  try {
    keyState.currentIndex = 0;
    return { success: true, data: keyState, metadata: {} };
  } catch (error: any) {
    return { success: false, error: error.message, metadata: {} };
  }
} 