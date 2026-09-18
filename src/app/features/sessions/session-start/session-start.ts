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

  /** Scheda + settimana scelte ma in attesa che l'utente indichi il
   *  giorno da seguire oggi (solo per schede con più di un giorno). */
  readonly pickingDayFor = signal<{ plan: WorkoutPlan; weekNumber: number } | null>(null);

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
      this.afterWeekChosen(plan, plan.weeks[0]?.weekNumber ?? 1);
      return;
    }
    this.pickingWeekFor.set(plan);
  }

  cancelWeekPick(): void {
    this.pickingWeekFor.set(null);
  }

  chooseWeek(plan: WorkoutPlan, weekNumber: number): void {
    this.pickingWeekFor.set(null);
    this.afterWeekChosen(plan, weekNumber);
  }

  private afterWeekChosen(plan: WorkoutPlan, weekNumber: number): void {
    if (plan.days.length <= 1) {
      this.start(plan, weekNumber, plan.days[0]?.id ?? '');
      return;
    }
    this.pickingDayFor.set({ plan, weekNumber });
  }

  cancelDayPick(): void {
    this.pickingDayFor.set(null);
  }

  async start(plan: WorkoutPlan, weekNumber: number, dayId: string): Promise<void> {
    if (this.startingPlanId()) return;
    this.startingPlanId.set(plan.id);
    const session = await this.sessionService.startFromPlan(plan, weekNumber, dayId);
    this.router.navigateByUrl(`/allenamento/sessione/${session.id}`);
  }
}
