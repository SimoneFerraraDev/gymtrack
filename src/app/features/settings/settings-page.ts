import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { BackupService } from '../../core/services/backup.service';
import { ExerciseService } from '../../core/services/exercise.service';
import { PlanService } from '../../core/services/plan.service';
import { SessionService } from '../../core/services/session.service';

type ImportState = 'idle' | 'importing' | 'success' | 'error';

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage {
  private readonly backupService = inject(BackupService);
  private readonly exerciseService = inject(ExerciseService);
  private readonly planService = inject(PlanService);
  private readonly sessionService = inject(SessionService);

  private readonly fileInput =
    viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly exporting = signal(false);
  readonly importState = signal<ImportState>('idle');
  readonly importError = signal('');

  /** Conteggi mostrati come promemoria di cosa include il backup — dati già
   *  reattivi nei rispettivi servizi, nessuna query aggiuntiva necessaria. */
  readonly summary = computed(() => ({
    exercises: this.exerciseService.exercises().length,
    plans: this.planService.activePlans().length,
    sessions: this.sessionService.sessions().length,
  }));

  async exportBackup(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      await this.backupService.exportToFile();
    } finally {
      this.exporting.set(false);
    }
  }

  triggerImport(): void {
    this.fileInput()?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const confirmed = confirm(
      'Importare questo backup? I dati con lo stesso ID verranno sovrascritti; il resto dei dati attuali resta invariato.',
    );
    if (!confirmed) {
      input.value = '';
      return;
    }

    this.importState.set('importing');
    this.importError.set('');
    try {
      await this.backupService.importFromFile(file);
      this.importState.set('success');
    } catch (err) {
      this.importState.set('error');
      this.importError.set(
        err instanceof Error ? err.message : 'File non valido.',
      );
    } finally {
      input.value = ''; // permette di riselezionare lo stesso file in seguito
    }
  }
}
