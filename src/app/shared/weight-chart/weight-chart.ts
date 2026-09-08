import {
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  viewChild,
} from '@angular/core';
import {
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { ProgressionPoint } from '../../core/models/workout-session.model';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
);

@Component({
  selector: 'app-weight-chart',
  template: `<canvas #canvas></canvas>`,
  styles: [
    `
      :host {
        display: block;
        height: 240px;
      }
      canvas {
        width: 100% !important;
        height: 100% !important;
      }
    `,
  ],
})
export class WeightChart implements OnDestroy {
  readonly points = input.required<ProgressionPoint[]>();

  private readonly canvasRef =
    viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  constructor() {
    effect(() => {
      const points = this.points();
      const canvas = this.canvasRef();
      if (!canvas) return;
      this.render(points, canvas.nativeElement);
    });
  }

  private render(points: ProgressionPoint[], canvas: HTMLCanvasElement): void {
    const labels = points.map((p) =>
      new Date(p.date).toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
      }),
    );
    const data = points.map((p) => p.maxWeight);

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = data;
      this.chart.update();
      return;
    }

    // Legge i colori dai design token CSS così il grafico resta coerente
    // col resto dell'app senza duplicare la palette qui dentro.
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--color-accent').trim() || '#f0a63c';
    const textMuted =
      styles.getPropertyValue('--color-text-muted').trim() || '#9297a3';
    const border = styles.getPropertyValue('--color-border').trim() || '#2f323b';

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Carico massimo (kg)',
            data,
            borderColor: accent,
            backgroundColor: `${accent}33`,
            fill: true,
            tension: 0.25,
            pointRadius: 3,
            pointBackgroundColor: accent,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y} kg`,
            },
          },
        },
        scales: {
          x: { ticks: { color: textMuted }, grid: { color: border } },
          y: { ticks: { color: textMuted }, grid: { color: border } },
        },
      },
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
