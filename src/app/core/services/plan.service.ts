import { Injectable, signal } from '@angular/core';
import { db } from '../db/gymtrack-db';
import { generateId } from '../db/id.util';
import {
  NewPlanExercise,
  NewWorkoutPlan,
  PlanExercise,
  WorkoutPlan,
} from '../models/workout-plan.model';

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly _plans = signal<WorkoutPlan[]>([]);
  /** Solo le schede non archiviate, come le vede la schermata principale. */
  readonly activePlans = signal<WorkoutPlan[]>([]);

  constructor() {
    this.reload();
  }

  private async reload(): Promise<void> {
    const all = await db.plans.orderBy('updatedAt').reverse().toArray();
    this._plans.set(all);
    this.activePlans.set(all.filter((p) => !p.archived));
  }

  async create(input: NewWorkoutPlan): Promise<WorkoutPlan> {
    const now = Date.now();
    const plan: WorkoutPlan = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      archived: false,
      exercises: input.exercises.map((e) => this.withId(e)),
    };
    await db.plans.add(plan);
    await this.reload();
    return plan;
  }

  async update(
    id: string,
    changes: Partial<Omit<WorkoutPlan, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await db.plans.update(id, { ...changes, updatedAt: Date.now() });
    await this.reload();
  }

  async setArchived(id: string, archived: boolean): Promise<void> {
    await this.update(id, { archived });
  }

  async remove(id: string): Promise<void> {
    await db.plans.delete(id);
    await this.reload();
  }

  async getById(id: string): Promise<WorkoutPlan | undefined> {
    return db.plans.get(id);
  }

  private withId(input: NewPlanExercise): PlanExercise {
    return { ...input, id: generateId() };
  }
}
