import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-back-button',
  imports: [RouterLink],
  template: `
    <a class="back-btn" [routerLink]="to()" aria-label="Indietro">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M15 6l-6 6 6 6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </a>
  `,
  styles: [
    `
      .back-btn {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text);
        flex-shrink: 0;
        text-decoration: none;
        margin-left: calc(var(--space-2) * -1);
      }
      .back-btn svg {
        width: 22px;
        height: 22px;
      }
    `,
  ],
})
export class BackButton {
  /** Rotta di destinazione: sempre esplicita, niente cronologia del browser
   *  (evita comportamenti imprevedibili se si arriva alla pagina via link
   *  diretto o refresh, senza una history da cui tornare indietro). */
  readonly to = input.required<string>();
}
