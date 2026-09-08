import { Component, computed, effect, inject, signal } from '@angular/core';
import { ProgressionPoint } from '../../core/models/workout-session.model';
import { SessionService } from '../../core/services/session.service';
import { WeightChart } from '../../shared/weight-chart/weight-chart';

interface ExerciseOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-progress-page',
  imports: [WeightChart],
  templateUrl: './progress-page.html',
  styleUrl: './progress-page.scss',
})
export class ProgressPage {
  private readonly sessionService = inject(SessionService);

  /**
   * Solo gli esercizi con almeno una serie loggata da qualche parte: non ha
   * senso proporre un esercizio senza storico. Il nome viene dallo snapshot
   * già salvato in ExerciseLog, senza bisogno di interrogare il catalogo.
   */
  readonly exerciseOptions = computed<ExerciseOption[]>(() => {
    const byId = new Map<string, string>();
    for (const session of this.sessionService.sessions()) {
      for (const log of session.exerciseLogs) {
        if (log.sets.length > 0 && !byId.has(log.exerciseId)) {
          byId.set(log.exerciseId, log.exerciseName);
        }
      }
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly selectedExerciseId = signal<string | null>(null);
  readonly points = signal<ProgressionPoint[]>([]);
  readonly loadingPoints = signal(false);

  constructor() {
    // Seleziona automaticamente il primo esercizio disponibile (o quello
    // successivo se quello scelto sparisce, es. sessione eliminata).
    effect(() => {
      const options = this.exerciseOptions();
      const current = this.selectedExerciseId();
      if (options.length === 0) {
        this.selectedExerciseId.set(null);
      } else if (!current || !options.some((o) => o.id === current)) {
        this.selectedExerciseId.set(options[0].id);
      }
    });

    effect(() => {
      const id = this.selectedExerciseId();
      if (!id) {
        this.points.set([]);
        return;
      }
      this.loadPoints(id);
    });
  }

  private async loadPoints(exerciseId: string): Promise<void> {
    this.loadingPoints.set(true);
    const points = await this.sessionService.getProgressionFor(exerciseId);
    // Scarta il risultato se nel frattempo l'utente ha scelto un altro esercizio.
    if (this.selectedExerciseId() === exerciseId) {
      this.points.set(points);
      this.loadingPoints.set(false);
    }
  }

  selectExercise(id: string): void {
    this.selectedExerciseId.set(id);
  }

  latestWeight(): number | null {
    const pts = this.points();
    return pts.length > 0 ? pts[pts.length - 1].maxWeight : null;
  }

  bestWeight(): number | null {
    const pts = this.points();
    return pts.length > 0 ? Math.max(...pts.map((p) => p.maxWeight)) : null;
  }
}
