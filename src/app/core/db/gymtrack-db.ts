import Dexie, { Table } from 'dexie';
import { Exercise } from '../models/exercise.model';
import { WorkoutPlan } from '../models/workout-plan.model';
import { WorkoutSession } from '../models/workout-session.model';

/**
 * Database IndexedDB dell'app, gestito con Dexie.
 *
 * Le sessioni (WorkoutSession) contengono exerciseLogs come array annidato
 * (non una tabella separata): per un uso personale il volume di dati è
 * ridotto, e tenerle come documento singolo semplifica sia il salvataggio
 * atomico di un allenamento sia l'export/import di backup.
 *
 * Per il grafico di progressione filtriamo lato client sull'array
 * `exerciseLogs` delle sessioni: con anni di storico (qualche centinaio
 * di sessioni) è comunque immediato, quindi non serve denormalizzare
 * i singoli set in una tabella a parte.
 */
export class GymTrackDb extends Dexie {
  exercises!: Table<Exercise, string>;
  plans!: Table<WorkoutPlan, string>;
  sessions!: Table<WorkoutSession, string>;

  constructor() {
    super('gymtrack-db');

    this.version(1).stores({
      // '&id' = chiave primaria; gli altri campi indicizzati servono
      // per le query più comuni (liste ordinate, filtri).
      exercises: '&id, name, muscleGroup',
      plans: '&id, name, archived, updatedAt',
      sessions: '&id, planId, date',
    });
  }
}

export const db = new GymTrackDb();
