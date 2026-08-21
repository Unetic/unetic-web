import { Component, computed, inject } from '@angular/core';
import { SwitchFeatureStatus } from '../core/models';
import { UneticStore } from '../core/unetic-store.service';

export interface SwitchFeatureItem {
  name: string;
  status: 'connected' | 'connecting' | 'disconnected';
  text: string;
}

function toggleStatus(feat: SwitchFeatureStatus): {
  status: 'connected' | 'connecting' | 'disconnected';
  text: string;
} {
  if (feat.enabled) {
    return { status: 'connected', text: 'Active' };
  }
  if (feat.supported) {
    return { status: 'connecting', text: 'Supported' };
  }
  return { status: 'disconnected', text: 'No' };
}

@Component({
  selector: 'app-switch',
  standalone: true,
  templateUrl: './switch.component.html',
})
export class SwitchComponent {
  readonly store = inject(UneticStore);

  readonly featureList = computed<SwitchFeatureItem[]>(() => {
    const sw = this.store.switchInfo();
    if (!sw) {
      return [];
    }
    const f = sw.features;
    return [
      {
        name: 'L2 HW Switching',
        status: f.l2_hw_switching.supported ? 'connected' : 'disconnected',
        text: f.l2_hw_switching.supported ? 'Line Rate' : 'Software',
      },
      {
        name: 'L3 HW Flow Offload (PPE)',
        ...toggleStatus(f.l3_hw_flow_offload),
      },
      { name: 'L3 SW Flow Offload', ...toggleStatus(f.l3_sw_flow_offload) },
      {
        name: 'VLAN Filtering (802.1Q)',
        ...toggleStatus(f.vlan_filtering_8021q),
      },
      { name: 'Port Isolation (PVLAN)', ...toggleStatus(f.port_isolation) },
      { name: 'HW IGMP Snooping', ...toggleStatus(f.hw_igmp_snooping) },
      { name: 'Flow Control (802.3x)', ...toggleStatus(f.flow_control_8023x) },
      { name: 'Energy Efficient Ethernet', ...toggleStatus(f.eee_8023az) },
      { name: 'STP / RSTP', ...toggleStatus(f.stp_rstp) },
      { name: 'Port Mirroring (SPAN)', ...toggleStatus(f.mirroring_span) },
      { name: 'Jumbo Frames', ...toggleStatus(f.jumbo_frames) },
      {
        name: 'Link Aggregation (LAG)',
        ...toggleStatus(f.link_aggregation_lag),
      },
      {
        name: 'Cable Diagnostics (TDR)',
        status: f.tdr_cable_diag.supported ? 'connecting' : 'disconnected',
        text: f.tdr_cable_diag.supported ? 'Available' : 'No',
      },
      {
        name: 'Hardware Statistics',
        status: f.hardware_stats.supported ? 'connected' : 'disconnected',
        text: f.hardware_stats.supported ? 'Active' : 'No',
      },
    ];
  });
}
