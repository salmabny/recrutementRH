import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div *ngIf="toastService.toast().show" class="toast-container" [ngClass]="toastService.toast().type">
      <div class="toast-content">
        <span class="toast-icon">
          <i [ngClass]="getIconClass()"></i>
        </span>
        <span class="toast-message">{{ toastService.toast().message }}</span>
        <button class="toast-close" (click)="toastService.hideToast()">&times;</button>
      </div>
    </div>
  `,
    styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      min-width: 320px;
      padding: 16px;
      border-radius: 12px;
      background: white;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
      border-left: 6px solid #ccc;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .toast-message {
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      color: #1a1d2e;
    }

    .toast-close {
      background: none;
      border: none;
      font-size: 20px;
      color: #94a3b8;
      cursor: pointer;
      padding: 0 4px;
    }

    /* Types */
    .success { border-left-color: #10b981; }
    .error { border-left-color: #ef4444; }
    .info { border-left-color: #3b82f6; }
    .warning { border-left-color: #f59e0b; }

    .toast-icon {
      font-size: 18px;
    }
  `]
})
export class ToastComponent {
    toastService = inject(ToastService);

    getIconClass(): string {
        const type = this.toastService.toast().type;
        switch (type) {
            case 'success': return 'info-circle'; // placeholder icon name
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
}
