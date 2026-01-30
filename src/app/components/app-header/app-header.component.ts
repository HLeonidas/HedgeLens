import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Output, inject } from '@angular/core';
import { NavigationEnd, Router, ActivatedRoute } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';
import { filter, map, startWith } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.css'
})
export class AppHeaderComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  @Output() toggleSidebar = new EventEmitter<void>();

  title = 'Dashboard';
  subtitle = '';

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        map(() => {
          let activeRoute = this.route;
          while (activeRoute.firstChild) {
            activeRoute = activeRoute.firstChild;
          }
          return activeRoute.snapshot.data;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => {
        this.title = data['title'] ?? 'Dashboard';
        this.subtitle = data['subtitle'] ?? '';
      });
  }
}
