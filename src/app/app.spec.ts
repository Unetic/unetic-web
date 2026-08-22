import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { App } from './app';
import { UneticStore } from './core/unetic-store.service';
import { WanStore } from './wan/wan.store';
import { PublicState } from './core/models';
import { WanPublicState } from './wan/wan.model';

function createMockState(): PublicState {
  return { pending_extenders: [], extender_pairing_status: 'unpaired', extenders: [], extender_ports: {}, dns: { upstream: [], local_domain: null, dhcp_start: 100, dhcp_limit: 150, dhcp_lease_hours: 24, custom_records: [] },
    core_version: '1.0.0',
    boot_id: 'boot-123',
    event_seq: 1,
    revision: 1,
    lifecycle: 'ready',
    maintenance: { enabled: false, exiting: false },
    wifi: {
      ssid: 'TestNetwork',
      targets: ['radio0'],
      observed: { radio0: 'TestNetwork' },
      status: 'synced',
    },
    wan: {
      present: true,
      proto: 'dhcp',
      status: 'connected',
      uptime_secs: 100,
      dns: [],
    },
    active_operation: null,
    last_user_operation: null,
    last_system_error: null,
    drift: { detected: false, fields: [] },
    health: {
      core: 'ok',
      ubus: 'ok',
      rpcd: 'ok',
      wireless: 'ok',
      wan: 'ok',
    },
  };
}

describe('App', () => {
  let mockUneticStore: {
    start: ReturnType<typeof vi.fn>;
    connected: ReturnType<typeof signal<boolean>>;
    loginRequired: ReturnType<typeof signal<boolean>>;
    state: ReturnType<typeof signal<PublicState | null>>;
    error: ReturnType<typeof signal<string | null>>;
    saving: ReturnType<typeof signal<boolean>>;
    activeTab: ReturnType<typeof signal<string>>;
  };
  let mockWanStore: {
    wan: ReturnType<typeof signal<WanPublicState>>;
    draftWanProto: ReturnType<typeof signal<string>>;
    draftWanIp: ReturnType<typeof signal<string>>;
    draftWanNetmask: ReturnType<typeof signal<string>>;
    draftWanGateway: ReturnType<typeof signal<string>>;
    draftWanDns: ReturnType<typeof signal<string>>;
    draftWanUsername: ReturnType<typeof signal<string>>;
    draftWanPassword: ReturnType<typeof signal<string>>;
    draftWanServiceName: ReturnType<typeof signal<string>>;
    draftWanMac: ReturnType<typeof signal<string>>;
    draftWanMtu: ReturnType<typeof signal<number | null>>;
    canSaveWan: ReturnType<typeof signal<boolean>>;
    saveWan: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockUneticStore = {
      start: vi.fn().mockResolvedValue(undefined),
      connected: signal(true),
      loginRequired: signal(false),
      state: signal<PublicState | null>(createMockState()),
      error: signal<string | null>(null),
      saving: signal(false),
      activeTab: signal('wifi'),
    };
    mockWanStore = {
      wan: signal<WanPublicState>({
        present: true,
        proto: 'dhcp',
        status: 'connected',
        dns: [],
        uptime_secs: 100,
      }),
      draftWanProto: signal('dhcp'),
      draftWanIp: signal(''),
      draftWanNetmask: signal('255.255.255.0'),
      draftWanGateway: signal(''),
      draftWanDns: signal(''),
      draftWanUsername: signal(''),
      draftWanPassword: signal(''),
      draftWanServiceName: signal(''),
      draftWanMac: signal(''),
      draftWanMtu: signal<number | null>(null),
      canSaveWan: signal(true),
      saveWan: vi.fn(),
    };
  });

  async function createComponent() {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: UneticStore, useValue: mockUneticStore },
        { provide: WanStore, useValue: mockWanStore },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture;
  }

  it('creates the shell', async () => {
    const fixture = await createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('displays all tabs in standard router mode', async () => {
    const fixture = await createComponent();
    const tabButtons = fixture.nativeElement.querySelectorAll('.tabs .tab');
    const tabNames = Array.from(tabButtons as Iterable<Element>).map(
      (btn) => btn.textContent?.trim() || '',
    );

    expect(tabNames).toEqual([
      'Wi-Fi',
      'WAN',
      'DNS',
      'DDNS',
      'Devices',
      'Ports',
      'System',
      'Diagnostics',
    ]);
  });

  it('hides all tabs and renders extender UI in extender mode', async () => {
    mockWanStore.wan.set({
      present: true,
      proto: 'extender',
      status: 'connected',
      dns: [],
      uptime_secs: 100,
    });
    mockUneticStore.activeTab.set('wan');

    const fixture = await createComponent();
    const tabButtons = fixture.nativeElement.querySelectorAll('.tabs .tab');
    const tabNames = Array.from(tabButtons as Iterable<Element>).map(
      (btn) => btn.textContent?.trim() || '',
    );

    expect(tabNames).toEqual([]);
    expect(fixture.nativeElement.querySelector('app-extender-slave')).toBeTruthy();
  });
});
