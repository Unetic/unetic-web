import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DevicesStore } from '../devices/devices.store';

@Component({
  selector: 'app-devices',
  standalone: true,
  templateUrl: './devices.component.html',
  styleUrl: './devices.component.scss',
})
export class DevicesComponent implements OnInit, OnDestroy {
  readonly store = inject(DevicesStore);

  ngOnInit(): void {
    this.store.startPolling();
  }

  ngOnDestroy(): void {
    this.store.stopPolling();
  }
}
