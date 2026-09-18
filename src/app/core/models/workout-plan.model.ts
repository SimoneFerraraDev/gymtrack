/**
 * Una scheda di allenamento (template), es. "Push/Pull/Legs A - Settembre".
 * È il piano che consulti prima di allenarti; non contiene dati storici,
 * quelli vivono in WorkoutSession.
 *
 * La scheda è divisa in giorni (`days`, es. A/B/C) perché ogni giorno ha
 * i suoi esercizi (es. A = spinta, B = trazione, C = gambe), ed è divisa
 * in settimane (`weeks`) perché serie e ripetizioni cambiano nel tempo.
 * Gli esercizi di un giorno restano gli stessi tra una settimana e
 * l'altra: solo i target di ogni `PlanWeek` variano. Il riscaldamento
 * (`warmup`) è invece un blocco a parte, unico per tutta la scheda
 * (uguale in tutti i giorni e in tutte le settimane).
 */
export interface WorkoutPlan {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  days: PlanDay[]; // in ordine; almeno uno (es. A, B, C)
  weeks: PlanWeek[]; // in ordine di weekNumber; almeno una
  warmup: WarmupExercise[]; // riscaldamento, unico per tutta la scheda
}

/**
 * Un giorno di allenamento della scheda (es. "A", "B", "C"), con i propri
 * esercizi. Gli stessi esercizi di un giorno valgono per tutte le
 * settimane; a cambiare settimana per settimana sono solo i target,
 * in `PlanWeek.targetsByExerciseId`.
 */
export interface PlanDay {
  id: string;
  label: string; // es. "A", "B", "C", o un nome libero come "Spinta"
  order: number;
  exercises: PlanExercise[];
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
 * Un esercizio principale all'interno di un giorno: solo identità e
 * ordine (nel giorno), condivisi da tutte le settimane. I target
 * (serie/rip/kg) di ogni settimana vivono in
 * `PlanWeek.targetsByExerciseId`, indicizzati su `PlanExercise.id`
 * (id univoco a prescindere dal giorno che lo contiene).
 */
export interface PlanExercise {
  id: string;
  exerciseId: string; // FK -> Exercise
  order: number;
  restSeconds?: number;
  notes?: string;
}

/**
 * Una settimana della scheda, con i target serie per serie di ogni
 * esercizio di ogni giorno: la mappa è unica (non annidata per giorno)
 * perché `PlanExercise.id` è già univoco in tutta la scheda.
 */
export interface PlanWeek {
  weekNumber: number; // 1-based, in ordine
  targetsByExerciseId: Record<string, PlanSetTarget[]>; // chiave = PlanExercise.id
}

/**
 * Un esercizio di riscaldamento: stessa forma di un esercizio principale
 * (nome + serie/rip pianificate) ma con un unico set di target, uguale
 * per tutta la scheda invece di variare a settimana o a giorno.
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
