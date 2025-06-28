export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  metadata: Record<string, any>;
  error?: string;
}

export interface KeyState {
  currentIndex: number;
  keys: string[];
} 