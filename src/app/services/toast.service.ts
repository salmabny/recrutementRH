import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    message: string;
    type: ToastType;
    show: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private _toast = signal<Toast>({ message: '', type: 'info', show: false });
    toast = this._toast.asReadonly();

    showToast(message: string, type: ToastType = 'info', duration: number = 3000): void {
        this._toast.set({ message, type, show: true });
        setTimeout(() => {
            this.hideToast();
        }, duration);
    }

    hideToast(): void {
        this._toast.update(t => ({ ...t, show: false }));
    }
}
