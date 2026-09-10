import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WorkoutPlan } from '../../../core/models/workout-plan.model';
import { PlanService } from '../../../core/services/plan.service';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-session-start',
  imports: [RouterLink],
  templateUrl: './session-start.html',
  styleUrl: './session-start.scss',
})
export class SessionStart implements OnInit {
  private readonly planService = inject(PlanService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  readonly plans = this.planService.activePlans;
  readonly checking = signal(true);
  readonly startingPlanId = signal<string | null>(null);

  /** Scheda scelta ma in attesa che l'utente indichi la settimana da
   *  seguire oggi (solo per schede con più di una settimana). */
  readonly pickingWeekFor = signal<WorkoutPlan | null>(null);

  async ngOnInit(): Promise<void> {
    const active = await this.sessionService.getActiveSession();
    if (active) {
      this.router.navigateByUrl(`/allenamento/sessione/${active.id}`);
      return;
    }
    this.checking.set(false);
  }

  async choosePlan(planId: string): Promise<void> {
    if (this.startingPlanId()) return;
    const plan = await this.planService.getById(planId);
    if (!plan) return;

    if (plan.weeks.length <= 1) {
      this.start(plan, plan.weeks[0]?.weekNumber ?? 1);
      return;
    }
    this.pickingWeekFor.set(plan);
  }

  cancelWeekPick(): void {
    this.pickingWeekFor.set(null);
  }

  async start(plan: WorkoutPlan, weekNumber: number): Promise<void> {
    if (this.startingPlanId()) return;
    this.startingPlanId.set(plan.id);
    const session = await this.sessionService.startFromPlan(plan, weekNumber);
    this.router.navigateByUrl(`/allenamento/sessione/${session.id}`);
  }
}
