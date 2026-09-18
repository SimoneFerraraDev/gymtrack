import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Component, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ExerciseService } from '../../../core/services/exercise.service';
import { PlanService } from '../../../core/services/plan.service';
import {
  PlanDay,
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

  /** Indice (0-based) del giorno e della settimana attualmente mostrati. */
  readonly selectedDay = signal(0);
  readonly selectedWeek = signal(0);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    days: this.fb.array<ReturnType<typeof this.buildDayGroup>>([]),
    weeks: this.fb.array<ReturnType<typeof this.buildWeekGroup>>([]),
    warmup: this.fb.array<ReturnType<typeof this.buildWarmupRow>>([]),
  });

  constructor() {
    // Ricarica il form ogni volta che cambia l'id nella route (navigazione
    // diretta tra due schede diverse senza ricreare il componente).
    effect(() => {
      const currentId = this.id();
      this.days.clear();
      this.weeks.clear();
      this.warmup.clear();
      if (currentId) {
        this.loading.set(true);
        this.loadForEdit(currentId);
      } else {
        this.addDay();
        this.addExerciseRow();
        this.addWeek();
        this.loading.set(false);
      }
    });
  }

  get days(): FormArray {
    return this.form.controls.days;
  }

  get weeks(): FormArray {
    return this.form.controls.weeks;
  }

  get warmup(): FormArray {
    return this.form.controls.warmup;
  }

  /** Serve per usare [formGroup] su un controllo preso da un FormArray
   *  generico (AbstractControl) senza dover ricorrere a formGroupName,
   *  utile quando la struttura annidata (giorni × settimane × esercizi)
   *  non corrisponde 1:1 a un unico albero di formArrayName/formGroupName. */
  asGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  dayLabelControl(dayIndex: number): FormControl<string> {
    return (this.days.at(dayIndex) as FormGroup).get('label') as FormControl<string>;
  }

  // ---------------------------------------------------------------------
  // Giorni (es. A, B, C): ciascuno con i propri esercizi. Gli stessi
  // esercizi di un giorno valgono per tutte le settimane; a cambiare sono
  // solo i target (in `weeks[].targetsByDay[dayIndex]`, un array parallelo
  // agli esercizi di quel giorno).
  // ---------------------------------------------------------------------

  private nextDayLabel(): string {
    const letters = 'ABCDEFGH';
    return letters[this.days.length] ?? `Giorno ${this.days.length + 1}`;
  }

  private buildDayGroup(initial?: {
    label?: string;
    exerciseRows?: { exerciseName?: string; notes?: string }[];
  }) {
    const label = initial?.label ?? this.nextDayLabel();
    const rows = initial?.exerciseRows ?? [];
    return this.fb.group({
      label: this.fb.nonNullable.control(label, Validators.required),
      exercises: this.fb.array(rows.map((r) => this.buildExerciseIdentityRow(r))),
    });
  }

  exercisesOfDay(dayIndex: number): FormArray {
    return (this.days.at(dayIndex) as FormGroup).get('exercises') as FormArray;
  }

  /** Esercizi del giorno attualmente selezionato. */
  get exercises(): FormArray {
    return this.exercisesOfDay(this.selectedDay());
  }

  selectDay(index: number): void {
    this.selectedDay.set(index);
  }

  addDay(): void {
    this.days.push(this.buildDayGroup());
    // Nuovo slot vuoto per il giorno in ogni settimana già esistente.
    for (const week of this.weeks.controls as FormGroup[]) {
      (week.get('targetsByDay') as FormArray).push(this.fb.array([]));
    }
    this.selectedDay.set(this.days.length - 1);
  }

  removeDay(index: number): void {
    if (this.days.length <= 1) return; // almeno un giorno
    this.days.removeAt(index);
    for (const week of this.weeks.controls as FormGroup[]) {
      (week.get('targetsByDay') as FormArray).removeAt(index);
    }
    if (this.selectedDay() >= this.days.length) {
      this.selectedDay.set(this.days.length - 1);
    }
  }

  // ---------------------------------------------------------------------
  // Esercizi principali del giorno selezionato: solo identità (nome, note)
  // e ordine. Gli stessi esercizi valgono per tutte le settimane; a
  // cambiare sono solo i target.
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
    const dayIndex = this.selectedDay();
    this.exercisesOfDay(dayIndex).push(this.buildExerciseIdentityRow());
    for (const week of this.weeks.controls as FormGroup[]) {
      const dayTargets = (week.get('targetsByDay') as FormArray).at(dayIndex) as FormArray;
      dayTargets.push(this.buildTargetsArray());
    }
  }

  removeExerciseRow(index: number): void {
    const dayIndex = this.selectedDay();
    this.exercisesOfDay(dayIndex).removeAt(index);
    for (const week of this.weeks.controls as FormGroup[]) {
      const dayTargets = (week.get('targetsByDay') as FormArray).at(dayIndex) as FormArray;
      dayTargets.removeAt(index);
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
    const dayIndex = this.selectedDay();
    const arr = this.exercisesOfDay(dayIndex);
    const ctrl = arr.at(i);
    arr.removeAt(i);
    arr.insert(j, ctrl);
    for (const week of this.weeks.controls as FormGroup[]) {
      const dayTargets = (week.get('targetsByDay') as FormArray).at(dayIndex) as FormArray;
      const t = dayTargets.at(i);
      dayTargets.removeAt(i);
      dayTargets.insert(j, t);
    }
  }

  // ---------------------------------------------------------------------
  // Settimane: ogni settimana ha, per ogni giorno, un array di target (uno
  // per esercizio di quel giorno, stesso ordine/indice del suo array
  // `exercises`).
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

  /** targetsPerDay[i] = un array di target per ogni esercizio del giorno i
   *  (o undefined per usare i default). */
  private buildWeekGroup(targetsPerDay?: (PlanSetTarget[][] | undefined)[]) {
    const perDay =
      targetsPerDay ??
      this.days.controls.map((d) =>
        Array.from({ length: (d.get('exercises') as FormArray).length }, () => undefined),
      );
    return this.fb.group({
      targetsByDay: this.fb.array(
        perDay.map((dayTargets) =>
          this.fb.array((dayTargets ?? []).map((t) => this.buildTargetsArray(t))),
        ),
      ),
    });
  }

  targetsOfWeekDayExercise(weekIndex: number, dayIndex: number, exerciseIndex: number): FormArray {
    const week = this.weeks.at(weekIndex) as FormGroup;
    const dayTargets = (week.get('targetsByDay') as FormArray).at(dayIndex) as FormArray;
    return dayTargets.at(exerciseIndex) as FormArray;
  }

  /** Serie pianificate del dato esercizio, nel giorno e nella settimana
   *  attualmente selezionati. */
  targetsOf(exerciseIndex: number): FormArray {
    return this.targetsOfWeekDayExercise(this.selectedWeek(), this.selectedDay(), exerciseIndex);
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
        ? this.days.controls.map((_, dayIndex) =>
            this.exercisesOfDay(dayIndex).controls.map(
              (_, exIndex) =>
                this.targetsOfWeekDayExercise(
                  lastWeekIndex,
                  dayIndex,
                  exIndex,
                ).getRawValue() as PlanSetTarget[],
            ),
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
  // ma un unico blocco, uguale per tutte le settimane e tutti i giorni.
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

    const sortedDays = [...plan.days].sort((a, b) => a.order - b.order);
    const sortedExercisesByDay: PlanExercise[][] = [];
    for (const day of sortedDays) {
      const sortedExercises = [...day.exercises].sort((a, b) => a.order - b.order);
      sortedExercisesByDay.push(sortedExercises);
      const exerciseRows: { exerciseName?: string; notes?: string }[] = [];
      for (const pe of sortedExercises) {
        const exercise = await this.exerciseService.getById(pe.exerciseId);
        exerciseRows.push({ exerciseName: exercise?.name ?? '', notes: pe.notes });
      }
      this.days.push(this.buildDayGroup({ label: day.label, exerciseRows }));
    }
    if (this.days.length === 0) this.addDay();
    this.selectedDay.set(0);

    const sortedWeeks = [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
    for (const week of sortedWeeks) {
      const targetsPerDay = sortedExercisesByDay.map((exs) =>
        exs.map((pe) => week.targetsByExerciseId[pe.id] ?? []),
      );
      this.weeks.push(this.buildWeekGroup(targetsPerDay));
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

      const days: PlanDay[] = [];
      let dayOrder = 0;
      for (const dayRow of raw.days) {
        const exercises: PlanExercise[] = [];
        let order = 0;
        for (const exRow of dayRow.exercises) {
          const exercise = await this.exerciseService.findOrCreateByName(exRow.exerciseName);
          exercises.push({
            id: crypto.randomUUID(),
            exerciseId: exercise.id,
            order: order++,
            notes: exRow.notes || undefined,
          });
        }
        days.push({
          id: crypto.randomUUID(),
          label: dayRow.label,
          order: dayOrder++,
          exercises,
        });
      }

      const weeks: PlanWeek[] = raw.weeks.map((week, weekIndex) => {
        const targetsByExerciseId: Record<string, PlanSetTarget[]> = {};
        days.forEach((day, dayIndex) => {
          day.exercises.forEach((ex, exIndex) => {
            targetsByExerciseId[ex.id] = week.targetsByDay[dayIndex][exIndex].map((t) => ({
              reps: t.reps,
              weight: t.weight ?? undefined,
            }));
          });
        });
        return { weekNumber: weekIndex + 1, targetsByExerciseId };
      });

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
        await this.planService.update(currentId, { name: raw.name, days, weeks, warmup });
      } else {
        await this.planService.create({ name: raw.name, days, weeks, warmup });
      }
      this.router.navigateByUrl('/schede');
    } finally {
      this.saving = false;
    }
  }
}
