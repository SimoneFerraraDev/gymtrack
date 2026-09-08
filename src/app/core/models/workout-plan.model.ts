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

/**
 * Target pianificato per una singola serie. Il carico può variare da una
 * serie all'altra dello stesso esercizio (es. rampa di carico: 40 - 45 - 50
 * kg su 3 serie), quindi non è un unico valore per l'intero esercizio ma
 * un elemento dell'array `targets` di PlanExercise.
 */
export interface PlanSetTarget {
  reps: string; // stringa: supporta "8-10", "AMRAP", ecc.
  weight?: number;
}

/** Un esercizio all'interno di una scheda, con i target serie per serie. */
export interface PlanExercise {
  id: string;
  exerciseId: string; // FK -> Exercise
  order: number;
  targets: PlanSetTarget[]; // una voce per ogni serie pianificata, in ordine
  restSeconds?: number;
  notes?: string;
}

export type NewWorkoutPlan = Omit<
  WorkoutPlan,
  'id' | 'createdAt' | 'updatedAt' | 'archived'
>;

export type NewPlanExercise = Omit<PlanExercise, 'id'>;
