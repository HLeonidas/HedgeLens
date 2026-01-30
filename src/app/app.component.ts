import { Component } from '@angular/core';
import { AppHeaderComponent } from './components/app-header/app-header.component';
import { AppSidebarComponent } from './components/app-sidebar/app-sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppHeaderComponent, AppSidebarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'hedgelens';
}
