import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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

  async ngOnInit(): Promise<void> {
    const active = await this.sessionService.getActiveSession();
    if (active) {
      this.router.navigateByUrl(`/allenamento/sessione/${active.id}`);
      return;
    }
    this.checking.set(false);
  }

  async start(planId: string): Promise<void> {
    if (this.startingPlanId()) return;
    this.startingPlanId.set(planId);
    const plan = await this.planService.getById(planId);
    if (!plan) {
      this.startingPlanId.set(null);
      return;
    }
    const session = await this.sessionService.startFromPlan(plan);
    this.router.navigateByUrl(`/allenamento/sessione/${session.id}`);
  }
}
