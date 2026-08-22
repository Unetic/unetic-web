import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg viewBox="0 0 60 20" preserveAspectRatio="none" style="width: 100%; height: 20px; display: block; overflow: visible;">
      <polyline
        [attr.points]="points"
        fill="none"
        [attr.stroke]="color"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `
})
export class SparklineComponent implements OnChanges {
  @Input() values: number[] = [];
  @Input() color: string = '#4ade80';

  points = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['values']) {
      this.updatePoints();
    }
  }

  private updatePoints() {
    if (!this.values || this.values.length === 0) {
      this.points = '';
      return;
    }

    const max = Math.max(...this.values);
    const offset = 60 - this.values.length;
    
    this.points = this.values.map((val, idx) => {
      let y = 18;
      if (max > 0) {
        y = 20 - (val / max) * 18;
      } else {
        // If all values 0, flat line at the bottom (say y=18 to keep margin or y=20)
        // Requirement says "flat line at the bottom". Let's use 18 to match max=0 behavior in the formula if val=0, wait, if max=0, we can't divide by 0. So y=20. Wait, requirement says "flat line at the bottom". If val=0 and max>0, y=20. So let's make it 20.
        y = 20;
      }
      return `${offset + idx},${y}`;
    }).join(' ');
  }
}
