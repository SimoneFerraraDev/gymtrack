import { Component, input } from '@angular/core';

@Component({
  selector: 'app-placeholder-page',
  template: `
    <div class="placeholder">
      <h1>{{ title() }}</h1>
      <p>{{ message() }}</p>
    </div>
  `,
  styles: [
    `
      .placeholder {
        padding: var(--space-6) var(--space-4);
        text-align: center;
        color: var(--color-text-muted);
      }
      h1 {
        color: var(--color-text);
        margin-bottom: var(--space-2);
      }
    `,
  ],
})
export class PlaceholderPage {
  readonly title = input('');
  readonly message = input('');
}
