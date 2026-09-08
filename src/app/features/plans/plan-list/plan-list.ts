import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlanService } from '../../../core/services/plan.service';

@Component({
  selector: 'app-plan-list',
  imports: [RouterLink],
  templateUrl: './plan-list.html',
  styleUrl: './plan-list.scss',
})
export class PlanList {
  private readonly planService = inject(PlanService);

  readonly plans = this.planService.activePlans;

  exerciseCountLabel(count: number): string {
    return count === 1 ? '1 esercizio' : `${count} esercizi`;
  }

  updatedAtLabel(timestamp: number): string {
    const days = Math.floor((Date.now() - timestamp) / 86_400_000);
    if (days <= 0) return 'Aggiornata oggi';
    if (days === 1) return 'Aggiornata ieri';
    return `Aggiornata ${days} giorni fa`;
  }

  async delete(id: string, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (confirm('Eliminare questa scheda? L\'operazione non è reversibile.')) {
      await this.planService.remove(id);
    }
  }
}
