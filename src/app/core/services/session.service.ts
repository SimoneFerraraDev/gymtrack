import { inject, Injectable, signal } from '@angular/core';
import { db } from '../db/gymtrack-db';
import { generateId } from '../db/id.util';
import {
  ExerciseLog,
  NewWorkoutSession,
  ProgressionPoint,
  WorkoutSession,
} from '../models/workout-session.model';
import { WorkoutPlan } from '../models/workout-plan.model';
import { ExerciseService } from './exercise.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly exerciseService = inject(ExerciseService);

  /** Storico sessioni, più recenti prima. */
  private readonly _sessions = signal<WorkoutSession[]>([]);
  readonly sessions = this._sessions.asReadonly();

  constructor() {
    this.refresh();
  }

  async refresh(): Promise<void> {
    const all = await db.sessions.orderBy('date').reverse().toArray();
    this._sessions.set(all);
  }

  async create(input: NewWorkoutSession): Promise<WorkoutSession> {
    const session: WorkoutSession = { ...input, id: generateId() };
    await db.sessions.add(session);
    await this.refresh();
    return session;
  }

  async update(
    id: string,
    changes: Partial<Omit<WorkoutSession, 'id'>>,
  ): Promise<void> {
    await db.sessions.update(id, changes);
    await this.refresh();
  }

  async remove(id: string): Promise<void> {
    await db.sessions.delete(id);
    await this.refresh();
  }

  async getById(id: string): Promise<WorkoutSession | undefined> {
    return db.sessions.get(id);
  }

  /**
   * Una sessione senza finishedAt è un allenamento in corso (o lasciato a
   * metà, es. chiusura accidentale del browser in palestra). Usata per far
   * riprendere automaticamente l'allenamento invece di farne iniziare uno
   * nuovo per sbaglio.
   */
  async getActiveSession(): Promise<WorkoutSession | undefined> {
    const all = await db.sessions.toArray();
    return all
      .filter((s) => !s.finishedAt)
      .sort((a, b) => b.startedAt - a.startedAt)[0];
  }

  /**
   * Crea la sessione a partire da una scheda: un ExerciseLog vuoto (sets: [])
   * per ciascun esercizio della scheda, pronto per essere riempito durante
   * l'allenamento. La sessione viene salvata subito, non solo alla fine,
   * così non si perde nulla se il telefono si blocca a metà allenamento.
   */
  async startFromPlan(plan: WorkoutPlan): Promise<WorkoutSession> {
    const exerciseLogs: ExerciseLog[] = [];
    for (const pe of [...plan.exercises].sort((a, b) => a.order - b.order)) {
      const exercise = await this.exerciseService.getById(pe.exerciseId);
      exerciseLogs.push({
        id: generateId(),
        exerciseId: pe.exerciseId,
        exerciseName: exercise?.name ?? 'Esercizio',
        order: pe.order,
        sets: [],
      });
    }

    const now = Date.now();
    return this.create({
      planId: plan.id,
      planName: plan.name,
      date: now,
      startedAt: now,
      exerciseLogs,
    });
  }

  async finish(id: string): Promise<void> {
    await this.update(id, { finishedAt: Date.now() });
  }

  /**
   * Serie di dati per il grafico "carico nel tempo" di un dato esercizio:
   * per ogni sessione in cui compare, il carico massimo usato e il volume
   * totale (reps * peso, sommato su tutte le serie).
   */
  async getProgressionFor(exerciseId: string): Promise<ProgressionPoint[]> {
    const all = await db.sessions.orderBy('date').toArray();
    const points: ProgressionPoint[] = [];

    for (const session of all) {
      const log = session.exerciseLogs.find(
        (l) => l.exerciseId === exerciseId,
      );
      if (!log || log.sets.length === 0) continue;

      const maxWeight = Math.max(...log.sets.map((s) => s.weight));
      const totalVolume = log.sets.reduce(
        (sum, s) => sum + s.reps * s.weight,
        0,
      );
      points.push({ date: session.date, maxWeight, totalVolume });
    }

    return points;
  }
}
