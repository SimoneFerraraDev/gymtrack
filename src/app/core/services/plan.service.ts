import { Injectable, signal } from '@angular/core';
import { db } from '../db/gymtrack-db';
import { generateId } from '../db/id.util';
import { NewWorkoutPlan, PlanDay, PlanExercise, PlanSetTarget, WorkoutPlan } from '../models/workout-plan.model';

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

  /**
   * Gli id di esercizi/giorni/riscaldamento sono già assegnati da chi
   * chiama (il form): le settimane li referenziano da subito
   * (`targetsByExerciseId`), quindi qui non vanno mai rigenerati o la
   * mappa dei target si disallinea.
   */
  async create(input: NewWorkoutPlan): Promise<WorkoutPlan> {
    const now = Date.now();
    const plan: WorkoutPlan = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      archived: false,
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

  /**
   * Retrocompatibilità: porta al volo alla forma attuale (giorni + settimane
   * + riscaldamento) le schede salvate con una forma precedente, senza
   * bisogno di una migrazione IndexedDB vera e propria. Due forme precedenti
   * possibili:
   *  - schede con `weeks`/`warmup` ma esercizi ancora su un unico elenco
   *    piatto (`exercises`), senza giorni: diventano un unico giorno "A"
   *    con tutti quegli esercizi, weeks/warmup invariati (le chiavi di
   *    `targetsByExerciseId` restano valide, sono già gli id di quegli
   *    esercizi);
   *  - schede ancora più vecchie, con i target direttamente su ogni
   *    esercizio (niente `weeks` né `warmup`): diventano un giorno "A" con
   *    una sola settimana con quei target, riscaldamento vuoto.
   */
  private normalize(plan: WorkoutPlan): WorkoutPlan {
    if (Array.isArray(plan.days) && plan.days.length > 0) {
      return { ...plan, warmup: plan.warmup ?? [] };
    }

    const flatExercises = (plan as WorkoutPlan & { exercises?: PlanExercise[] }).exercises ?? [];

    if (Array.isArray(plan.weeks) && plan.weeks.length > 0) {
      const day: PlanDay = { id: generateId(), label: 'A', order: 0, exercises: flatExercises };
      return { ...plan, days: [day], warmup: plan.warmup ?? [] };
    }

    const legacyExercises = flatExercises as (PlanExercise & { targets?: PlanSetTarget[] })[];
    const day: PlanDay = {
      id: generateId(),
      label: 'A',
      order: 0,
      exercises: legacyExercises,
    };
    return {
      ...plan,
      days: [day],
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
