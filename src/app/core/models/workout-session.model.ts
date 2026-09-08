/**
 * Una sessione di allenamento loggata: dato storico e immutabile.
 * planName ed exerciseName sono snapshot presi al momento del log,
 * così lo storico resta leggibile anche se in seguito rinomini
 * la scheda o l'esercizio nel catalogo.
 */
export interface WorkoutSession {
  id: string;
  planId: string;
  planName: string;
  date: number; // giorno della sessione (epoch ms, normalizzato a mezzanotte)
  startedAt: number;
  finishedAt?: number;
  notes?: string;
  exerciseLogs: ExerciseLog[];
}

export interface ExerciseLog {
  id: string;
  exerciseId: string; // FK -> Exercise
  exerciseName: string; // snapshot
  order: number;
  sets: SetLog[];
}

export interface SetLog {
  id: string;
  setNumber: number;
  reps: number;
  weight: number; // kg
  notes?: string;
  completedAt: number;
}

export type NewWorkoutSession = Omit<WorkoutSession, 'id'>;

/** Riga usata per il grafico di progressione carico nel tempo. */
export interface ProgressionPoint {
  date: number;
  maxWeight: number;
  totalVolume: number; // sum(reps * weight) della sessione, utile come metrica secondaria
}
