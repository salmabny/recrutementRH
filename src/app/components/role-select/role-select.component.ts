import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/auth.model';

@Component({
  selector: 'app-role-select',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './role-select.component.html',
  styleUrls: ['./role-select.component.css']
})
export class RoleSelectComponent {

  hoveredRole: UserRole | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  selectRole(role: UserRole): void {
    console.log('RoleSelectComponent: selectRole called with role:', role);
    this.authService.setRole(role);
    this.router.navigate([`/signup/${role.toLowerCase()}`]);
  }

  goToLogin(): void {
    console.log('RoleSelectComponent: goToLogin called');
    this.router.navigate(['/login']);
  }
}
