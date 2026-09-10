/**
 * Una scheda di allenamento (template), es. "Push/Pull/Legs A - Settembre".
 * È il piano che consulti prima di allenarti; non contiene dati storici,
 * quelli vivono in WorkoutSession.
 *
 * La scheda è divisa in settimane (`weeks`) perché serie e ripetizioni
 * cambiano nel tempo, ma l'elenco degli esercizi principali (`exercises`)
 * resta lo stesso tra una settimana e l'altra: solo i target di ogni
 * `PlanWeek` variano. Il riscaldamento (`warmup`) è invece un blocco a
 * parte, unico per tutta la scheda (non cambia da una settimana all'altra).
 */
export interface WorkoutPlan {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  exercises: PlanExercise[]; // catalogo esercizi principali: identità e ordine, condivisi da tutte le settimane
  weeks: PlanWeek[]; // in ordine di weekNumber; almeno una
  warmup: WarmupExercise[]; // riscaldamento, unico per tutta la scheda
}

/**
 * Target pianificato per una singola serie. Il carico può variare da una
 * serie all'altra dello stesso esercizio (es. rampa di carico: 40 - 45 - 50
 * kg su 3 serie), quindi non è un unico valore per l'intero esercizio ma
 * un elemento di un array di target.
 */
export interface PlanSetTarget {
  reps: string; // stringa: supporta "8-10", "AMRAP", ecc.
  weight?: number;
}

/**
 * Un esercizio principale all'interno di una scheda: solo identità e
 * ordine, condivisi da tutte le settimane. I target (serie/rip/kg) di
 * ogni settimana vivono in `PlanWeek.targetsByExerciseId`, indicizzati
 * su `PlanExercise.id`.
 */
export interface PlanExercise {
  id: string;
  exerciseId: string; // FK -> Exercise
  order: number;
  restSeconds?: number;
  notes?: string;
}

/** Una settimana della scheda, con i target serie per serie di ogni esercizio. */
export interface PlanWeek {
  weekNumber: number; // 1-based, in ordine
  targetsByExerciseId: Record<string, PlanSetTarget[]>; // chiave = PlanExercise.id
}

/**
 * Un esercizio di riscaldamento: stessa forma di un esercizio principale
 * (nome + serie/rip pianificate) ma con un unico set di target, uguale
 * per tutta la scheda invece di variare a settimana.
 */
export interface WarmupExercise {
  id: string;
  exerciseId: string; // FK -> Exercise
  order: number;
  targets: PlanSetTarget[];
  notes?: string;
}

export type NewWorkoutPlan = Omit<
  WorkoutPlan,
  'id' | 'createdAt' | 'updatedAt' | 'archived'
>;

export type NewPlanExercise = Omit<PlanExercise, 'id'>;
export type NewWarmupExercise = Omit<WarmupExercise, 'id'>;
