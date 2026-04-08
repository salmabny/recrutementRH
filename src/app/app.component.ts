import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';
import { LogoutModalComponent } from './components/logout-modal/logout-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, LogoutModalComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast></app-toast>
    <app-logout-modal></app-logout-modal>
  `,
  styles: [`:host { display: block; min-height: 100vh; }`]
})
export class AppComponent {
  constructor() {
    console.log('AppComponent: Initializing...');
  }
}