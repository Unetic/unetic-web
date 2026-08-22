import { Component, OnInit, OnDestroy, computed } from '@angular/core';
import { PortsStore } from './ports.store';
import { PortInfo } from './ports.model';

@Component({
  selector: 'app-ports',
  templateUrl: './ports.component.html',
  styleUrl: './ports.component.scss',
})
export class PortsComponent implements OnInit, OnDestroy {
  readonly numberedPorts = computed(() => {
    let lanCount = 1;
    let wanCount = 1;
    const sortedPorts = [...this.store.ports()].sort((a, b) => a.id - b.id);
    return sortedPorts.map((port) => {
      let displayName = '';
      if (port.type === 'LAN') {
        displayName = `LAN ${lanCount++}`;
      } else if (port.type === 'WAN') {
        displayName = `WAN ${wanCount++}`;
      } else {
        displayName = port.type;
      }
      return {
        ...port,
        displayName,
        displaySpeed: port.speed === '0' ? 'Unplugged' : port.speed.replace(/_/g, ' '),
        isUnplugged: port.speed === '0'
      };
    });
  });

  constructor(public readonly store: PortsStore) {}

  ngOnInit(): void {
    this.store.startPolling();
  }

  ngOnDestroy(): void {
    this.store.stopPolling();
  }
}
