/**
 * Un esercizio nel catalogo personale (es. "Panca piana", "Squat").
 * Viene referenziato dalle schede (PlanExercise) e, come snapshot del nome,
 * anche dallo storico delle sessioni (ExerciseLog).
 */
export interface Exercise {
  id: string;
  name: string;
  muscleGroup?: string;
  notes?: string;
  createdAt: number; // epoch ms
}

export type NewExercise = Omit<Exercise, 'id' | 'createdAt'>;
