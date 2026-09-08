import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { generateId } from '../../../core/db/id.util';
import { PlanSetTarget } from '../../../core/models/workout-plan.model';
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
  readonly cancelling = signal(false);

  /** Serie pianificate dalla scheda originale, per esercizio: il carico può
   *  variare da una serie all'altra (es. rampa 40-45-50kg), quindi qui
   *  teniamo l'intero array invece di un singolo valore. */
  private readonly targetsByExerciseId = new Map<string, PlanSetTarget[]>();

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
        this.targetsByExerciseId.set(pe.exerciseId, pe.targets);
      }
    }

    for (const log of session.exerciseLogs) {
      this.draftForms.set(log.id, this.buildDraftForm(log));
    }

    this.loading.set(false);
  }

  /** Il target pianificato per la PROSSIMA serie da loggare (indice = quante
   *  serie sono già state fatte). Torna null oltre le serie pianificate. */
  private nextTargetFor(log: ExerciseLog): PlanSetTarget | null {
    const targets = this.targetsByExerciseId.get(log.exerciseId);
    return targets?.[log.sets.length] ?? null;
  }

  private buildDraftForm(log: ExerciseLog) {
    const lastSet = log.sets.at(-1);
    const next = this.nextTargetFor(log);
    return this.fb.nonNullable.group({
      reps: [
        next ? (firstNumber(next.reps) ?? lastSet?.reps ?? 8) : (lastSet?.reps ?? 8),
      ],
      weight: [next?.weight ?? lastSet?.weight ?? 0],
      notes: [''],
    });
  }

  /** Riepilogo di tutte le serie pianificate per l'esercizio, mostrato come
   *  promemoria in testa alla card (es. "10@40kg · 10@45kg · 10@50kg"). */
  targetSummary(exerciseId: string): string | null {
    const targets = this.targetsByExerciseId.get(exerciseId);
    if (!targets || targets.length === 0) return null;
    return targets
      .map((t) => `${t.reps}${t.weight ? '@' + t.weight + 'kg' : ''}`)
      .join(' · ');
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
    await this.sessionService.update(session.id, { exerciseLogs: updatedLogs });

    // Prepara il form per la serie successiva, suggerendo il carico/rip
    // pianificati per quella serie (che possono differire da quella appena
    // loggata) invece di ripetere semplicemente gli ultimi valori inseriti.
    const updatedLog = updatedLogs.find((l) => l.id === log.id)!;
    const next = this.nextTargetFor(updatedLog);
    form.patchValue({
      reps: next ? (firstNumber(next.reps) ?? raw.reps) : raw.reps,
      weight: next?.weight ?? raw.weight,
      notes: '',
    });
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

  /**
   * Annulla l'allenamento: cancella la sessione dal database, senza
   * salvarla nello storico. Usato per uscire da un allenamento aperto per
   * sbaglio (o da abbandonare), a differenza di "Termina" che lo conclude
   * e lo mantiene come sessione registrata.
   */
  async cancelWorkout(): Promise<void> {
    const session = this.session();
    if (!session || this.cancelling() || this.finishing()) return;
    if (
      !confirm(
        'Annullare questo allenamento? Le serie registrate andranno perse e non verrà salvato nello storico.',
      )
    ) {
      return;
    }

    this.cancelling.set(true);
    await this.sessionService.remove(session.id);
    this.router.navigateByUrl('/allenamento');
  }

  startedAtLabel(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
