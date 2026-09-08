import { Injectable, signal } from '@angular/core';
import { db } from '../db/gymtrack-db';
import { generateId } from '../db/id.util';
import { Exercise, NewExercise } from '../models/exercise.model';

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  /** Catalogo esercizi tenuto in memoria e sincronizzato con IndexedDB. */
  private readonly _exercises = signal<Exercise[]>([]);
  readonly exercises = this._exercises.asReadonly();

  constructor() {
    this.reload();
  }

  private async reload(): Promise<void> {
    const all = await db.exercises.orderBy('name').toArray();
    this._exercises.set(all);
  }

  async create(input: NewExercise): Promise<Exercise> {
    const exercise: Exercise = {
      ...input,
      id: generateId(),
      createdAt: Date.now(),
    };
    await db.exercises.add(exercise);
    await this.reload();
    return exercise;
  }

  async update(id: string, changes: Partial<NewExercise>): Promise<void> {
    await db.exercises.update(id, changes);
    await this.reload();
  }

  async remove(id: string): Promise<void> {
    await db.exercises.delete(id);
    await this.reload();
  }

  async getById(id: string): Promise<Exercise | undefined> {
    return db.exercises.get(id);
  }

  /**
   * Trova un esercizio per nome (case-insensitive) o lo crea al volo.
   * Usato dal form delle schede: l'utente digita semplicemente il nome
   * dell'esercizio, senza dover prima popolare un catalogo a parte.
   */
  async findOrCreateByName(rawName: string): Promise<Exercise> {
    const name = rawName.trim();
    const existing = this._exercises().find(
      (e) => e.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) return existing;
    return this.create({ name });
  }
}
