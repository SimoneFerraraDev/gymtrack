import { Injectable } from '@angular/core';
import { db } from '../db/gymtrack-db';
import { Exercise } from '../models/exercise.model';
import { WorkoutPlan } from '../models/workout-plan.model';
import { WorkoutSession } from '../models/workout-session.model';

interface BackupFile {
  formatVersion: 1;
  exportedAt: number;
  exercises: Exercise[];
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
}

/**
 * Export/import manuale in JSON: unico meccanismo di backup dell'app,
 * dato che non c'è alcun backend. L'import sovrascrive i dati esistenti
 * (bulkPut) confrontando per id, così un file esportato oggi e reimportato
 * domani aggiorna invece di duplicare.
 */
@Injectable({ providedIn: 'root' })
export class BackupService {
  async exportToFile(): Promise<void> {
    const backup: BackupFile = {
      formatVersion: 1,
      exportedAt: Date.now(),
      exercises: await db.exercises.toArray(),
      plans: await db.plans.toArray(),
      sessions: await db.sessions.toArray(),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `gymtrack-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importFromFile(file: File): Promise<void> {
    const text = await file.text();
    const backup = JSON.parse(text) as BackupFile;

    if (backup.formatVersion !== 1) {
      throw new Error('Formato di backup non riconosciuto');
    }

    await db.transaction(
      'rw',
      db.exercises,
      db.plans,
      db.sessions,
      async () => {
        await db.exercises.bulkPut(backup.exercises);
        await db.plans.bulkPut(backup.plans);
        await db.sessions.bulkPut(backup.sessions);
      },
    );
  }
}
