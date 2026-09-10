import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Component, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ExerciseService } from '../../../core/services/exercise.service';
import { PlanService } from '../../../core/services/plan.service';
import {
  PlanExercise,
  PlanSetTarget,
  PlanWeek,
  WarmupExercise,
} from '../../../core/models/workout-plan.model';
import { BackButton } from '../../../shared/back-button/back-button';

@Component({
  selector: 'app-plan-form',
  imports: [ReactiveFormsModule, BackButton],
  templateUrl: './plan-form.html',
  styleUrl: './plan-form.scss',
})
export class PlanForm {
  private readonly fb = inject(FormBuilder);
  private readonly planService = inject(PlanService);
  private readonly exerciseService = inject(ExerciseService);
  private readonly router = inject(Router);

  /** Presente solo in modalità modifica (route /schede/:id/modifica). */
  readonly id = input<string>();

  protected readonly isEditMode = () => !!this.id();
  protected saving = false;

  /**
   * In modalità modifica il form parte "vuoto" finché loadForEdit (asincrono)
   * non ha popolato gli array. Senza questo segnale, in un'app zoneless come
   * questa la vista non si ridisegna da sola quando quel caricamento finisce
   * (nessun signal cambia dopo gli `await`), e il contenuto resta invisibile
   * finché non arriva un'altra interazione a forzare un nuovo giro di change
   * detection.
   */
  readonly loading = signal(true);

  /** Indice (0-based) della settimana attualmente mostrata nel form. */
  readonly selectedWeek = signal(0);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    exercises: this.fb.array<ReturnType<typeof this.buildExerciseIdentityRow>>([]),
    weeks: this.fb.array<ReturnType<typeof this.buildWeekGroup>>([]),
    warmup: this.fb.array<ReturnType<typeof this.buildWarmupRow>>([]),
  });

  constructor() {
    // Ricarica il form ogni volta che cambia l'id nella route (navigazione
    // diretta tra due schede diverse senza ricreare il componente).
    effect(() => {
      const currentId = this.id();
      this.exercises.clear();
      this.weeks.clear();
      this.warmup.clear();
      if (currentId) {
        this.loading.set(true);
        this.loadForEdit(currentId);
      } else {
        this.addExerciseRow();
        this.addWeek();
        this.loading.set(false);
      }
    });
  }

  get exercises(): FormArray {
    return this.form.controls.exercises;
  }

  get weeks(): FormArray {
    return this.form.controls.weeks;
  }

  get warmup(): FormArray {
    return this.form.controls.warmup;
  }

  /** Serve per usare [formGroup] su un controllo preso da un FormArray
   *  generico (AbstractControl) senza dover ricorrere a formGroupName,
   *  utile per i target che vivono dentro `weeks` invece che dentro
   *  `exercises` (i due array vanno tenuti allineati a mano, vedi sotto). */
  asGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  // ---------------------------------------------------------------------
  // Esercizi principali: solo identità (nome, note) e ordine. Gli stessi
  // esercizi valgono per tutte le settimane; a cambiare sono solo i target
  // (in `weeks[].targets`, un array parallelo a questo per indice).
  // ---------------------------------------------------------------------

  private buildExerciseIdentityRow(initial?: { exerciseName?: string; notes?: string }) {
    return this.fb.group({
      exerciseName: this.fb.nonNullable.control(
        initial?.exerciseName ?? '',
        Validators.required,
      ),
      notes: this.fb.nonNullable.control(initial?.notes ?? ''),
    });
  }

  addExerciseRow(): void {
    this.exercises.push(this.buildExerciseIdentityRow());
    // Nuovo slot target (vuoto, un default da 10 rip) in ogni settimana già esistente.
    for (const week of this.weeks.controls as FormGroup[]) {
      (week.get('targets') as FormArray).push(this.buildTargetsArray());
    }
  }

  removeExerciseRow(index: number): void {
    this.exercises.removeAt(index);
    for (const week of this.weeks.controls as FormGroup[]) {
      (week.get('targets') as FormArray).removeAt(index);
    }
  }

  moveUp(index: number): void {
    if (index === 0) return;
    this.swapExercise(index, index - 1);
  }

  moveDown(index: number): void {
    if (index === this.exercises.length - 1) return;
    this.swapExercise(index, index + 1);
  }

  private swapExercise(i: number, j: number): void {
    const arr = this.exercises;
    const ctrl = arr.at(i);
    arr.removeAt(i);
    arr.insert(j, ctrl);
    for (const week of this.weeks.controls as FormGroup[]) {
      const targets = week.get('targets') as FormArray;
      const t = targets.at(i);
      targets.removeAt(i);
      targets.insert(j, t);
    }
  }

  // ---------------------------------------------------------------------
  // Settimane: ogni settimana ha un array di target (uno per esercizio,
  // stesso ordine/indice dell'array `exercises`).
  // ---------------------------------------------------------------------

  private buildTargetRow(initial?: Partial<PlanSetTarget>) {
    return this.fb.nonNullable.group({
      reps: [initial?.reps ?? '10', Validators.required],
      weight: [initial?.weight ?? null],
    });
  }

  private buildTargetsArray(initial?: PlanSetTarget[]) {
    const rows = initial && initial.length > 0 ? initial : [{ reps: '10' }];
    return this.fb.array(rows.map((t) => this.buildTargetRow(t)));
  }

  private buildWeekGroup(initialTargetsPerExercise?: (PlanSetTarget[] | undefined)[]) {
    const count = this.exercises.length;
    const perExercise =
      initialTargetsPerExercise ?? Array.from({ length: count }, () => undefined);
    return this.fb.group({
      targets: this.fb.array(perExercise.map((t) => this.buildTargetsArray(t))),
    });
  }

  /** Serie pianificate del dato esercizio, nella settimana selezionata. */
  targetsOf(exerciseIndex: number): FormArray {
    return this.targetsOfWeek(this.selectedWeek(), exerciseIndex);
  }

  targetsOfWeek(weekIndex: number, exerciseIndex: number): FormArray {
    const week = this.weeks.at(weekIndex) as FormGroup;
    return (week.get('targets') as FormArray).at(exerciseIndex) as FormArray;
  }

  /** Aggiunge una nuova serie pianificata, ripetendo i valori dell'ultima
   *  come comodo punto di partenza (spesso rip/peso sono simili tra serie
   *  vicine, es. una rampa di carico). */
  addTargetRow(exerciseIndex: number): void {
    const targets = this.targetsOf(exerciseIndex);
    const last = targets.length > 0 ? targets.at(targets.length - 1).value : undefined;
    targets.push(this.buildTargetRow(last));
  }

  removeTargetRow(exerciseIndex: number, targetIndex: number): void {
    const targets = this.targetsOf(exerciseIndex);
    if (targets.length <= 1) return; // almeno una serie pianificata
    targets.removeAt(targetIndex);
  }

  selectWeek(index: number): void {
    this.selectedWeek.set(index);
  }

  /** Aggiunge una nuova settimana, ripetendo i target dell'ultima come
   *  punto di partenza (una settimana è spesso simile alla precedente,
   *  con piccoli aggiustamenti di carico). */
  addWeek(): void {
    const lastWeekIndex = this.weeks.length - 1;
    const initial =
      lastWeekIndex >= 0
        ? this.exercises.controls.map(
            (_, i) => this.targetsOfWeek(lastWeekIndex, i).getRawValue() as PlanSetTarget[],
          )
        : undefined;
    this.weeks.push(this.buildWeekGroup(initial));
    this.selectedWeek.set(this.weeks.length - 1);
  }

  removeWeek(index: number): void {
    if (this.weeks.length <= 1) return; // almeno una settimana
    this.weeks.removeAt(index);
    if (this.selectedWeek() >= this.weeks.length) {
      this.selectedWeek.set(this.weeks.length - 1);
    }
  }

  // ---------------------------------------------------------------------
  // Riscaldamento: stessa forma degli esercizi principali (nome + serie/rip)
  // ma un unico blocco, uguale per tutte le settimane.
  // ---------------------------------------------------------------------

  private buildWarmupRow(initial?: {
    exerciseName?: string;
    targets?: PlanSetTarget[];
    notes?: string;
  }) {
    const initialTargets =
      initial?.targets && initial.targets.length > 0 ? initial.targets : [{ reps: '10' }];
    return this.fb.group({
      exerciseName: this.fb.nonNullable.control(
        initial?.exerciseName ?? '',
        Validators.required,
      ),
      notes: this.fb.nonNullable.control(initial?.notes ?? ''),
      targets: this.fb.array(initialTargets.map((t) => this.buildTargetRow(t))),
    });
  }

  addWarmupRow(): void {
    this.warmup.push(this.buildWarmupRow());
  }

  removeWarmupRow(index: number): void {
    this.warmup.removeAt(index);
  }

  warmupTargetsOf(index: number): FormArray {
    return (this.warmup.at(index) as FormGroup).get('targets') as FormArray;
  }

  addWarmupTargetRow(index: number): void {
    const targets = this.warmupTargetsOf(index);
    const last = targets.length > 0 ? targets.at(targets.length - 1).value : undefined;
    targets.push(this.buildTargetRow(last));
  }

  removeWarmupTargetRow(index: number, targetIndex: number): void {
    const targets = this.warmupTargetsOf(index);
    if (targets.length <= 1) return;
    targets.removeAt(targetIndex);
  }

  // ---------------------------------------------------------------------
  // Load / Save
  // ---------------------------------------------------------------------

  private async loadForEdit(planId: string): Promise<void> {
    const plan = await this.planService.getById(planId);
    if (!plan) {
      this.router.navigateByUrl('/schede');
      return;
    }
    this.form.patchValue({ name: plan.name }, { emitEvent: false });

    const sortedExercises = [...plan.exercises].sort((a, b) => a.order - b.order);
    for (const pe of sortedExercises) {
      const exercise = await this.exerciseService.getById(pe.exerciseId);
      this.exercises.push(
        this.buildExerciseIdentityRow({ exerciseName: exercise?.name ?? '', notes: pe.notes }),
      );
    }
    if (this.exercises.length === 0) this.addExerciseRow();

    const sortedWeeks = [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
    for (const week of sortedWeeks) {
      const perExercise = sortedExercises.map((pe) => week.targetsByExerciseId[pe.id] ?? []);
      this.weeks.push(this.buildWeekGroup(perExercise));
    }
    if (this.weeks.length === 0) this.addWeek();
    this.selectedWeek.set(0);

    for (const we of [...plan.warmup].sort((a, b) => a.order - b.order)) {
      const exercise = await this.exerciseService.getById(we.exerciseId);
      this.warmup.push(
        this.buildWarmupRow({
          exerciseName: exercise?.name ?? '',
          targets: we.targets,
          notes: we.notes,
        }),
      );
    }

    this.loading.set(false);
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    try {
      const raw = this.form.getRawValue();

      const exercises: PlanExercise[] = [];
      let order = 0;
      for (const row of raw.exercises) {
        const exercise = await this.exerciseService.findOrCreateByName(row.exerciseName);
        exercises.push({
          id: crypto.randomUUID(),
          exerciseId: exercise.id,
          order: order++,
          notes: row.notes || undefined,
        });
      }

      const weeks: PlanWeek[] = raw.weeks.map((week, weekIndex) => ({
        weekNumber: weekIndex + 1,
        targetsByExerciseId: Object.fromEntries(
          exercises.map((ex, i) => [
            ex.id,
            week.targets[i].map((t) => ({ reps: t.reps, weight: t.weight ?? undefined })),
          ]),
        ),
      }));

      const warmup: WarmupExercise[] = [];
      let warmupOrder = 0;
      for (const row of raw.warmup) {
        const exercise = await this.exerciseService.findOrCreateByName(row.exerciseName);
        warmup.push({
          id: crypto.randomUUID(),
          exerciseId: exercise.id,
          order: warmupOrder++,
          targets: row.targets.map((t) => ({ reps: t.reps, weight: t.weight ?? undefined })),
          notes: row.notes || undefined,
        });
      }

      const currentId = this.id();
      if (currentId) {
        await this.planService.update(currentId, { name: raw.name, exercises, weeks, warmup });
      } else {
        await this.planService.create({ name: raw.name, exercises, weeks, warmup });
      }
      this.router.navigateByUrl('/schede');
    } finally {
      this.saving = false;
    }
  }
}
