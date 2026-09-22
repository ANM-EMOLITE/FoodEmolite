import { Injectable, signal } from '@angular/core';

export interface ToastData {
  id: number;
  type: 'success' | 'error';
  message: string;
  /** Thời gian hiện (ms) — cũng là thời gian chạy của thanh đếm ngược trên toast. */
  duration: number;
}

const DEFAULT_DURATION = 3500;

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  toasts = signal<ToastData[]>([]);

  private nextId = 1;

  show(
    type: 'success' | 'error',
    message: string,
    duration = DEFAULT_DURATION
  ) {

    const toast: ToastData = {
      id: this.nextId++,
      type,
      message,
      duration
    };

    this.toasts.update(x => [...x, toast]);

    setTimeout(() => {
      this.remove(toast.id);
    }, duration);

  }

  success(message: string) {
    this.show('success', message);
  }

  error(message: string) {
    this.show('error', message);
  }

  remove(id: number) {
    this.toasts.update(x => x.filter(t => t.id !== id));
  }
}
