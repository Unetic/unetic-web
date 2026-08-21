import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WifiComponent } from './wifi.component';
import { WifiStore } from '../core/wifi.store';
import { UneticStore } from '../core/unetic-store.service';
import { PublicState } from '../core/models';

function createMockState(overrides?: Partial<PublicState>): PublicState {
  return {
    api_version: 1,
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
      uptime_secs: 10,
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
    ...overrides,
  };
}

describe('WifiComponent', () => {
  let component: WifiComponent;
  let fixture: ComponentFixture<WifiComponent>;
  let mockWifiStore: {
    draftSsid: ReturnType<typeof signal<string>>;
    draftEncryption: ReturnType<typeof signal<string>>;
    draftKey: ReturnType<typeof signal<string>>;
    canSave: ReturnType<typeof signal<boolean>>;
    saveConfig: ReturnType<typeof vi.fn>;
  };
  let mockUneticStore: {
    state: ReturnType<typeof signal<PublicState | null>>;
    saving: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(async () => {
    mockWifiStore = {
      draftSsid: signal('TestNetwork'),
      draftEncryption: signal('psk2'),
      draftKey: signal('secretpass'),
      canSave: signal(true),
      saveConfig: vi.fn(),
    };
    mockUneticStore = {
      state: signal<PublicState | null>(createMockState()),
      saving: signal(false),
    };

    await TestBed.configureTestingModule({
      imports: [WifiComponent],
      providers: [
        { provide: WifiStore, useValue: mockWifiStore },
        { provide: UneticStore, useValue: mockUneticStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WifiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders SSID input and encryption select', () => {
    const root = fixture.nativeElement as HTMLElement;
    const inputs = root.querySelectorAll('input');
    const select = root.querySelector('select');

    expect(inputs.length).toBeGreaterThanOrEqual(1);
    expect(select).toBeTruthy();

    const options = Array.from(select!.querySelectorAll('option')).map(
      (opt) => opt.value,
    );
    expect(options).toEqual(['none', 'psk2', 'sae', 'sae-mixed']);
  });

  it('shows password input and show-password checkbox when encryption != none', () => {
    mockWifiStore.draftEncryption.set('psk2');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const passwordInput = root.querySelector(
      'input[type="password"], input[placeholder="8–63 characters"]',
    ) as HTMLInputElement | null;
    const checkbox = root.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement | null;

    expect(passwordInput).toBeTruthy();
    expect(checkbox).toBeTruthy();
  });

  it('hides password input and checkbox when encryption is none', () => {
    mockWifiStore.draftEncryption.set('none');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const passwordInput = root.querySelector(
      'input[placeholder="8–63 characters"]',
    );
    const checkbox = root.querySelector('input[type="checkbox"]');

    expect(passwordInput).toBeNull();
    expect(checkbox).toBeNull();
  });

  it('toggles password input type between password and text', () => {
    mockWifiStore.draftEncryption.set('psk2');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    let passwordInput = root.querySelector(
      'input[placeholder="8–63 characters"]',
    ) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    component.showPassword.set(true);
    fixture.detectChanges();

    passwordInput = root.querySelector(
      'input[placeholder="8–63 characters"]',
    ) as HTMLInputElement;
    expect(passwordInput.type).toBe('text');
  });

  it('disables save button when canSave is false', () => {
    mockWifiStore.canSave.set(false);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('calls saveConfig when save button is clicked', () => {
    mockWifiStore.canSave.set(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    button.click();

    expect(mockWifiStore.saveConfig).toHaveBeenCalled();
  });
});
