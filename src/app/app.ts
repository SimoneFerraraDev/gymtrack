import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavTab {
  path: string;
  label: string;
  icon: 'plans' | 'workout' | 'history' | 'progress' | 'settings';
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly tabs: NavTab[] = [
    { path: '/schede', label: 'Schede', icon: 'plans' },
    { path: '/allenamento', label: 'Allenamento', icon: 'workout' },
    { path: '/storico', label: 'Storico', icon: 'history' },
    { path: '/progressi', label: 'Progressi', icon: 'progress' },
    { path: '/impostazioni', label: 'Impostazioni', icon: 'settings' },
  ];
}
