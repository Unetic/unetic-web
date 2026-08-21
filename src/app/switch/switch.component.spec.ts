import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwitchComponent } from './switch.component';
import { UneticStore } from '../core/unetic-store.service';
import { SwitchInfo } from './switch.model';

function createMockSwitchInfo(): SwitchInfo {
  const defaultFeature = {
    supported: false,
    enabled: false,
    controllable: false,
  };
  return {
    soc: {
      model: 'MT7621A',
      vendor: 'MediaTek',
      architecture: 'dsa',
      ports: ['lan1', 'lan2', 'lan3', 'lan4', 'wan'],
      driver: 'mt7530',
      tagging_protocol: 'mtk',
    },
    features: {
      l2_hw_switching: { supported: true, enabled: true, controllable: false },
      l3_hw_flow_offload: {
        supported: true,
        enabled: true,
        controllable: true,
      },
      l3_sw_flow_offload: {
        supported: true,
        enabled: false,
        controllable: true,
      },
      vlan_filtering_8021q: {
        supported: true,
        enabled: true,
        controllable: true,
      },
      port_isolation: { supported: true, enabled: false, controllable: true },
      hw_igmp_snooping: {
        supported: false,
        enabled: false,
        controllable: false,
      },
      flow_control_8023x: {
        supported: true,
        enabled: true,
        controllable: true,
      },
      eee_8023az: { supported: false, enabled: false, controllable: false },
      stp_rstp: { supported: true, enabled: false, controllable: true },
      mirroring_span: { supported: false, enabled: false, controllable: false },
      jumbo_frames: { supported: true, enabled: true, controllable: true },
      link_aggregation_lag: {
        supported: false,
        enabled: false,
        controllable: false,
      },
      tdr_cable_diag: { supported: true, enabled: false, controllable: false },
      hardware_stats: { supported: true, enabled: true, controllable: false },
    },
  };
}

describe('SwitchComponent', () => {
  let component: SwitchComponent;
  let fixture: ComponentFixture<SwitchComponent>;
  let mockUneticStore: {
    switchInfo: ReturnType<typeof signal<SwitchInfo | null>>;
  };

  beforeEach(async () => {
    mockUneticStore = {
      switchInfo: signal<SwitchInfo | null>(null),
    };

    await TestBed.configureTestingModule({
      imports: [SwitchComponent],
      providers: [{ provide: UneticStore, useValue: mockUneticStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(SwitchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('displays loading state when switchInfo is null', () => {
    const status = fixture.nativeElement.querySelector('.status');
    expect(status).toBeTruthy();
    expect(status.textContent).toContain('Loading switch details…');
  });

  it('renders switch SoC info and features when switchInfo is available', () => {
    mockUneticStore.switchInfo.set(createMockSwitchInfo());
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.soc-model')?.textContent).toContain('MT7621A');
    expect(root.querySelector('.soc-vendor')?.textContent).toContain(
      'MediaTek',
    );

    const portChips = root.querySelectorAll('.port-chip');
    expect(portChips.length).toBe(5);

    const featureRows = root.querySelectorAll('.feature-row');
    expect(featureRows.length).toBe(14);
  });
});
