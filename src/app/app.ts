import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UneticStore } from './core/unetic-store.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
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

  save(): void {
    void this.store.saveSsid();
  }

  saveWan(): void {
    void this.store.saveWan();
  }
}
