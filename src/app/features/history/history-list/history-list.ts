import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorkoutSession } from '../../../core/models/workout-session.model';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-history-list',
  imports: [RouterLink],
  templateUrl: './history-list.html',
  styleUrl: './history-list.scss',
})
export class HistoryList {
  private readonly sessionService = inject(SessionService);

  /** Solo le sessioni concluse: quelle in corso vivono nel tab Allenamento. */
  readonly sessions = computed(() =>
    this.sessionService.sessions().filter((s) => !!s.finishedAt),
  );

  dateLabel(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  durationLabel(startedAt: number, finishedAt?: number): string {
    if (!finishedAt) return '';
    const minutes = Math.round((finishedAt - startedAt) / 60_000);
    return `${minutes} min`;
  }

  setsCount(session: WorkoutSession): number {
    return session.exerciseLogs.reduce((sum, l) => sum + l.sets.length, 0);
  }
}
