import { Injectable, signal } from '@angular/core';
import { db } from '../db/gymtrack-db';
import { generateId } from '../db/id.util';
import {
  NewWorkoutSession,
  ProgressionPoint,
  WorkoutSession,
} from '../models/workout-session.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  /** Storico sessioni, più recenti prima. */
  private readonly _sessions = signal<WorkoutSession[]>([]);
  readonly sessions = this._sessions.asReadonly();

  constructor() {
    this.reload();
  }

  private async reload(): Promise<void> {
    const all = await db.sessions.orderBy('date').reverse().toArray();
    this._sessions.set(all);
  }

  async create(input: NewWorkoutSession): Promise<WorkoutSession> {
    const session: WorkoutSession = { ...input, id: generateId() };
    await db.sessions.add(session);
    await this.reload();
    return session;
  }

  async update(
    id: string,
    changes: Partial<Omit<WorkoutSession, 'id'>>,
  ): Promise<void> {
    await db.sessions.update(id, changes);
    await this.reload();
  }

  async remove(id: string): Promise<void> {
    await db.sessions.delete(id);
    await this.reload();
  }

  async getById(id: string): Promise<WorkoutSession | undefined> {
    return db.sessions.get(id);
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
