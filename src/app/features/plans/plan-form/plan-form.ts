import { Component, effect, inject, input } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ExerciseService } from '../../../core/services/exercise.service';
import { PlanService } from '../../../core/services/plan.service';
import { PlanExercise } from '../../../core/models/workout-plan.model';

@Component({
  selector: 'app-plan-form',
  imports: [ReactiveFormsModule],
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

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    exercises: this.fb.array<
      ReturnType<typeof this.buildExerciseRow>
    >([]),
  });

  constructor() {
    // Ricarica il form ogni volta che cambia l'id nella route (navigazione
    // diretta tra due schede diverse senza ricreare il componente).
    effect(() => {
      const currentId = this.id();
      this.exercises.clear();
      if (currentId) {
        this.loadForEdit(currentId);
      } else {
        this.addExerciseRow();
      }
    });
  }

  get exercises(): FormArray {
    return this.form.controls.exercises;
  }

  private buildExerciseRow(initial?: Partial<PlanExercise> & { exerciseName?: string }) {
    return this.fb.nonNullable.group({
      exerciseName: [initial?.exerciseName ?? '', Validators.required],
      targetSets: [initial?.targetSets ?? 3, [Validators.required, Validators.min(1)]],
      targetReps: [initial?.targetReps ?? '8-10', Validators.required],
      targetWeight: [initial?.targetWeight ?? null],
      notes: [initial?.notes ?? ''],
    });
  }

  addExerciseRow(): void {
    this.exercises.push(this.buildExerciseRow());
  }

  removeExerciseRow(index: number): void {
    this.exercises.removeAt(index);
  }

  moveUp(index: number): void {
    if (index === 0) return;
    const arr = this.exercises;
    const ctrl = arr.at(index);
    arr.removeAt(index);
    arr.insert(index - 1, ctrl);
  }

  moveDown(index: number): void {
    const arr = this.exercises;
    if (index === arr.length - 1) return;
    const ctrl = arr.at(index);
    arr.removeAt(index);
    arr.insert(index + 1, ctrl);
  }

  private async loadForEdit(planId: string): Promise<void> {
    const plan = await this.planService.getById(planId);
    if (!plan) {
      this.router.navigateByUrl('/schede');
      return;
    }
    this.form.patchValue({ name: plan.name }, { emitEvent: false });
    for (const pe of [...plan.exercises].sort((a, b) => a.order - b.order)) {
      const exercise = await this.exerciseService.getById(pe.exerciseId);
      this.exercises.push(
        this.buildExerciseRow({ ...pe, exerciseName: exercise?.name ?? '' }),
      );
    }
    if (this.exercises.length === 0) this.addExerciseRow();
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
        const exercise = await this.exerciseService.findOrCreateByName(
          row.exerciseName,
        );
        exercises.push({
          id: crypto.randomUUID(),
          exerciseId: exercise.id,
          order: order++,
          targetSets: row.targetSets,
          targetReps: row.targetReps,
          targetWeight: row.targetWeight ?? undefined,
          notes: row.notes || undefined,
        });
      }

      const currentId = this.id();
      if (currentId) {
        await this.planService.update(currentId, { name: raw.name, exercises });
      } else {
        await this.planService.create({ name: raw.name, exercises });
      }
      this.router.navigateByUrl('/schede');
    } finally {
      this.saving = false;
    }
  }
}
