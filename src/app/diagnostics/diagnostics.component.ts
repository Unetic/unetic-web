import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToolsStore } from '../core/tools.store';

@Component({
  selector: 'app-diagnostics',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './diagnostics.component.html',
  styleUrl: './diagnostics.component.scss',
})
export class DiagnosticsComponent {
  readonly tools = inject(ToolsStore);

  ping(): void {
    void this.tools.ping();
  }
}
