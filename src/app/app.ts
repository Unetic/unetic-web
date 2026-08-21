import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UneticStore } from './core/unetic-store.service';

import { WifiComponent } from './wifi/wifi.component';
import { WanComponent } from './wan/wan.component';
import { SwitchComponent } from './switch/switch.component';
import { SystemComponent } from './system/system.component';
import { DiagnosticsComponent } from './diagnostics/diagnostics.component';

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    WifiComponent,
    WanComponent,
    SwitchComponent,
    SystemComponent,
    DiagnosticsComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly username = signal('root');
  readonly password = signal('');

  constructor(readonly store: UneticStore) {}

  ngOnInit(): void {
    void this.store.start();
  }

  login(): void {
    void this.store.login(this.username(), this.password());
  }
}
