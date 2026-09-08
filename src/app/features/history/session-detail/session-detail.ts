import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { WorkoutSession } from '../../../core/models/workout-session.model';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-session-detail',
  imports: [DecimalPipe],
  templateUrl: './session-detail.html',
  styleUrl: './session-detail.scss',
})
export class SessionDetail implements OnInit {
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  readonly session = signal<WorkoutSession | null>(null);
  readonly loading = signal(true);

  readonly totalVolume = computed(() => {
    const s = this.session();
    if (!s) return 0;
    return s.exerciseLogs.reduce(
      (sum, l) =>
        sum + l.sets.reduce((sSum, set) => sSum + set.reps * set.weight, 0),
      0,
    );
  });

  async ngOnInit(): Promise<void> {
    const session = await this.sessionService.getById(this.id());
    if (!session) {
      this.router.navigateByUrl('/storico');
      return;
    }
    this.session.set(session);
    this.loading.set(false);
  }

  dateLabel(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  durationLabel(startedAt: number, finishedAt?: number): string {
    if (!finishedAt) return '';
    const minutes = Math.round((finishedAt - startedAt) / 60_000);
    return `${minutes} min`;
  }

  async deleteSession(): Promise<void> {
    const session = this.session();
    if (!session) return;
    if (!confirm('Eliminare questo allenamento dallo storico? L\'operazione non è reversibile.')) {
      return;
    }
    await this.sessionService.remove(session.id);
    this.router.navigateByUrl('/storico');
  }
}
