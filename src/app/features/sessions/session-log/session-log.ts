import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { generateId } from '../../../core/db/id.util';
import { PlanExercise } from '../../../core/models/workout-plan.model';
import {
  ExerciseLog,
  SetLog,
  WorkoutSession,
} from '../../../core/models/workout-session.model';
import { PlanService } from '../../../core/services/plan.service';
import { SessionService } from '../../../core/services/session.service';

/** Estrae il primo numero da una stringa tipo "8-10" o "AMRAP" (→ null). */
function firstNumber(text: string): number | null {
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : null;
}

@Component({
  selector: 'app-session-log',
  imports: [ReactiveFormsModule],
  templateUrl: './session-log.html',
  styleUrl: './session-log.scss',
})
export class SessionLog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly sessionService = inject(SessionService);
  private readonly planService = inject(PlanService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  readonly session = signal<WorkoutSession | null>(null);
  readonly loading = signal(true);
  readonly finishing = signal(false);

  /** Target della scheda originale, per esercizio — solo a scopo informativo. */
  private readonly targetByExerciseId = new Map<string, PlanExercise>();

  /** Form del "prossimo set" da aggiungere, uno per ExerciseLog. */
  readonly draftForms = new Map<
    string,
    ReturnType<typeof this.buildDraftForm>
  >();

  /** Coppie (log, form-bozza) pronte per il template, ricalcolate a ogni
   *  variazione della sessione (aggiunta/rimozione set). */
  readonly rows = computed(() => {
    const session = this.session();
    if (!session) return [];
    return session.exerciseLogs.map((log) => ({
      log,
      form: this.draftForms.get(log.id)!,
    }));
  });

  async ngOnInit(): Promise<void> {
    const session = await this.sessionService.getById(this.id());
    if (!session) {
      this.router.navigateByUrl('/allenamento');
      return;
    }
    this.session.set(session);

    const plan = await this.planService.getById(session.planId);
    if (plan) {
      for (const pe of plan.exercises) {
        this.targetByExerciseId.set(pe.exerciseId, pe);
      }
    }

    for (const log of session.exerciseLogs) {
      this.draftForms.set(log.id, this.buildDraftForm(log));
    }

    this.loading.set(false);
  }

  private buildDraftForm(log: ExerciseLog) {
    const lastSet = log.sets.at(-1);
    const target = this.targetByExerciseId.get(log.exerciseId);
    return this.fb.nonNullable.group({
      reps: [lastSet?.reps ?? firstNumber(target?.targetReps ?? '') ?? 8],
      weight: [lastSet?.weight ?? target?.targetWeight ?? 0],
      notes: [''],
    });
  }

  targetLabel(exerciseId: string): string | null {
    const t = this.targetByExerciseId.get(exerciseId);
    if (!t) return null;
    const weight = t.targetWeight ? ` @ ${t.targetWeight}kg` : '';
    return `Target: ${t.targetSets} x ${t.targetReps}${weight}`;
  }

  async addSet(log: ExerciseLog): Promise<void> {
    const form = this.draftForms.get(log.id);
    const session = this.session();
    if (!form || !session) return;

    const raw = form.getRawValue();
    const newSet: SetLog = {
      id: generateId(),
      setNumber: log.sets.length + 1,
      reps: raw.reps,
      weight: raw.weight,
      notes: raw.notes || undefined,
      completedAt: Date.now(),
    };

    const updatedLogs = session.exerciseLogs.map((l) =>
      l.id === log.id ? { ...l, sets: [...l.sets, newSet] } : l,
    );
    const updated = { ...session, exerciseLogs: updatedLogs };
    this.session.set(updated);
    form.patchValue({ notes: '' });
    await this.sessionService.update(session.id, { exerciseLogs: updatedLogs });
  }

  async removeSet(log: ExerciseLog, setId: string): Promise<void> {
    const session = this.session();
    if (!session) return;

    const updatedLogs = session.exerciseLogs.map((l) =>
      l.id === log.id
        ? {
            ...l,
            sets: l.sets
              .filter((s) => s.id !== setId)
              .map((s, i) => ({ ...s, setNumber: i + 1 })),
          }
        : l,
    );
    const updated = { ...session, exerciseLogs: updatedLogs };
    this.session.set(updated);
    await this.sessionService.update(session.id, { exerciseLogs: updatedLogs });
  }

  async finishWorkout(): Promise<void> {
    const session = this.session();
    if (!session || this.finishing()) return;
    if (!confirm('Terminare l\'allenamento?')) return;

    this.finishing.set(true);
    await this.sessionService.finish(session.id);
    this.router.navigateByUrl('/allenamento');
  }

  startedAtLabel(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
