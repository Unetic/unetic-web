import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WanComponent } from './wan.component';
import { WanStore } from '../wan/wan.store';
import { UneticStore } from '../core/unetic-store.service';
import { WanProtocol } from './wan.model';
import { PublicState } from '../core/models';

function createMockState(overrides?: Partial<PublicState>): PublicState {
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
      ip_address: '192.168.1.50',
      uptime_secs: 100,
      dns: ['1.1.1.1'],
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
    ...overrides,
  };
}

describe('WanComponent', () => {
  let component: WanComponent;
  let fixture: ComponentFixture<WanComponent>;
  let mockWanStore: {
    draftWanProto: ReturnType<typeof signal<WanProtocol>>;
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
  let mockUneticStore: {
    state: ReturnType<typeof signal<PublicState | null>>;
    saving: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(async () => {
    mockWanStore = {
      draftWanProto: signal<WanProtocol>('dhcp'),
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
    mockUneticStore = {
      state: signal<PublicState | null>(createMockState()),
      saving: signal(false),
    };

    await TestBed.configureTestingModule({
      imports: [WanComponent],
      providers: [
        { provide: WanStore, useValue: mockWanStore },
        { provide: UneticStore, useValue: mockUneticStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders WAN status banner and protocol selector', () => {
    const root = fixture.nativeElement as HTMLElement;
    const badge = root.querySelector('.badge');
    expect(badge?.textContent).toContain('connected');
    expect(root.querySelector('.wan-ip')?.textContent).toContain(
      '192.168.1.50',
    );

    const select = root.querySelector('select');
    expect(select).toBeTruthy();
  });

  it('shows static IP fields when protocol is static', () => {
    mockWanStore.draftWanProto.set('static');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const inputs = root.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(3);
  });

  it('includes Mesh Extender (Slave) option in protocol selector', () => {
    const select = fixture.nativeElement.querySelector(
      'select',
    ) as HTMLSelectElement;
    const options = Array.from(select.options).map((opt) => ({
      value: opt.value,
      text: opt.text.trim(),
    }));

    expect(options).toContainEqual({
      value: 'extender',
      text: 'Mesh Extender (Slave)',
    });
  });

  it('displays extender notice banner and hides other inputs when protocol is extender', () => {
    mockWanStore.draftWanProto.set('extender');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain(
      'Router is running in Extender Mode. It receives all network configuration from the Controller.',
    );

    const inputs = root.querySelectorAll('input');
    expect(inputs.length).toBe(0);
  });

  it('calls saveWan when save button is clicked', () => {
    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    button.click();

    expect(mockWanStore.saveWan).toHaveBeenCalled();
  });
});
