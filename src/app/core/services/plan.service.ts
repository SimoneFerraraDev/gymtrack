import { Injectable, signal } from '@angular/core';
import { db } from '../db/gymtrack-db';
import { generateId } from '../db/id.util';
import {
  NewPlanExercise,
  NewWarmupExercise,
  NewWorkoutPlan,
  PlanExercise,
  PlanSetTarget,
  WarmupExercise,
  WorkoutPlan,
} from '../models/workout-plan.model';

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly _plans = signal<WorkoutPlan[]>([]);
  /** Solo le schede non archiviate, come le vede la schermata principale. */
  readonly activePlans = signal<WorkoutPlan[]>([]);

  constructor() {
    this.refresh();
  }

  async refresh(): Promise<void> {
    const all = await db.plans.orderBy('updatedAt').reverse().toArray();
    const normalized = all.map((p) => this.normalize(p));
    this._plans.set(normalized);
    this.activePlans.set(normalized.filter((p) => !p.archived));
  }

  async create(input: NewWorkoutPlan): Promise<WorkoutPlan> {
    const now = Date.now();
    const exercises = input.exercises.map((e) => this.withId(e));
    const plan: WorkoutPlan = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      archived: false,
      exercises,
      weeks: input.weeks,
      warmup: input.warmup.map((w) => this.withWarmupId(w)),
    };
    await db.plans.add(plan);
    await this.refresh();
    return plan;
  }

  async update(
    id: string,
    changes: Partial<Omit<WorkoutPlan, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await db.plans.update(id, { ...changes, updatedAt: Date.now() });
    await this.refresh();
  }

  async setArchived(id: string, archived: boolean): Promise<void> {
    await this.update(id, { archived });
  }

  async remove(id: string): Promise<void> {
    await db.plans.delete(id);
    await this.refresh();
  }

  async getById(id: string): Promise<WorkoutPlan | undefined> {
    const plan = await db.plans.get(id);
    return plan ? this.normalize(plan) : undefined;
  }

  private withId(input: NewPlanExercise): PlanExercise {
    return { ...input, id: generateId() };
  }

  private withWarmupId(input: NewWarmupExercise): WarmupExercise {
    return { ...input, id: generateId() };
  }

  /**
   * Retrocompatibilità: le schede create prima dell'introduzione delle
   * settimane avevano i target direttamente su ogni PlanExercise (niente
   * `weeks`, niente `warmup`). Qui le si porta alla forma attuale al volo,
   * senza bisogno di una migrazione IndexedDB vera e propria: una singola
   * settimana con quei target, riscaldamento vuoto.
   */
  private normalize(plan: WorkoutPlan): WorkoutPlan {
    if (Array.isArray(plan.weeks) && plan.weeks.length > 0) {
      return { ...plan, warmup: plan.warmup ?? [] };
    }
    const legacyExercises = plan.exercises as (PlanExercise & {
      targets?: PlanSetTarget[];
    })[];
    return {
      ...plan,
      warmup: plan.warmup ?? [],
      weeks: [
        {
          weekNumber: 1,
          targetsByExerciseId: Object.fromEntries(
            legacyExercises.map((e) => [e.id, e.targets ?? []]),
          ) as Record<string, PlanSetTarget[]>,
        },
      ],
    };
  }
}
