import { Component, inject } from '@angular/core';
import { UneticStore } from '../core/unetic-store.service';
import { WanStore } from '../wan/wan.store';

@Component({
  selector: 'app-extender-slave',
  standalone: true,
  templateUrl: './extender-slave.component.html',
  styleUrl: './extender-slave.component.scss',
})
export class ExtenderSlaveComponent {
  readonly store = inject(UneticStore);
  readonly wanStore = inject(WanStore);

  get pairingStatus() {
    return this.store.state()?.extender_pairing_status || 'unpaired';
  }

  async leaveMesh() {
    this.wanStore.draftWanProto.set('dhcp');
    await this.wanStore.saveWan();
  }
}
