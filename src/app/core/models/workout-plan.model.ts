/**
 * Una scheda di allenamento (template), es. "Push/Pull/Legs A - Settembre".
 * È il piano che consulti prima di allenarti; non contiene dati storici,
 * quelli vivono in WorkoutSession.
 */
export interface WorkoutPlan {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  exercises: PlanExercise[];
}

/** Un esercizio all'interno di una scheda, con i target da raggiungere. */
export interface PlanExercise {
  id: string;
  exerciseId: string; // FK -> Exercise
  order: number;
  targetSets: number;
  targetReps: string; // stringa: supporta "8-10", "AMRAP", ecc.
  targetWeight?: number;
  restSeconds?: number;
  notes?: string;
}

export type NewWorkoutPlan = Omit<
  WorkoutPlan,
  'id' | 'createdAt' | 'updatedAt' | 'archived'
>;

export type NewPlanExercise = Omit<PlanExercise, 'id'>;
