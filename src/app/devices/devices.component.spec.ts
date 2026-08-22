import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DevicesComponent } from './devices.component';
import { DevicesStore } from '../devices/devices.store';
import { Device } from './devices.model';

describe('DevicesComponent', () => {
  let component: DevicesComponent;
  let fixture: ComponentFixture<DevicesComponent>;
  let mockDevicesStore: {
    devices: ReturnType<typeof signal<Device[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    startPolling: ReturnType<typeof vi.fn>;
    stopPolling: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockDevicesStore = {
      devices: signal<Device[]>([]),
      loading: signal(false),
      error: signal<string | null>(null),
      startPolling: vi.fn(),
      stopPolling: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DevicesComponent],
      providers: [{ provide: DevicesStore, useValue: mockDevicesStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(DevicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component and starts polling on init', () => {
    expect(component).toBeTruthy();
    expect(mockDevicesStore.startPolling).toHaveBeenCalled();
  });

  it('stops polling on destroy', () => {
    fixture.destroy();
    expect(mockDevicesStore.stopPolling).toHaveBeenCalled();
  });

  it('displays empty message when no devices are connected', () => {
    const status = fixture.nativeElement.querySelector('.status');
    expect(status).toBeTruthy();
    expect(status.textContent).toContain('No connected devices found.');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('renders table with columns and device data', () => {
    const devicesList: Device[] = [
      {
        mac: '00:11:22:33:44:55',
        ip: '192.168.1.50',
        hostname: 'Alice-iPhone',
        connection: { type: 'Wireless', signal_dbm: -50, distance_m: 2.5 },
      },
      {
        mac: 'aa:bb:cc:dd:ee:ff',
        ip: '192.168.1.51',
        hostname: null,
        connection: { type: 'Wired', port_id: 1 },
      },
    ];
    mockDevicesStore.devices.set(devicesList);
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('table.devices-table');
    expect(table).toBeTruthy();

    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('th'),
    ).map((th) => (th as HTMLTableCellElement).textContent?.trim());
    expect(headers).toEqual([
      'Name / Hostname',
      'IP',
      'MAC',
      'Connection',
      'Actions',
    ]);

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    // First row with hostname
    const row1Cols = Array.from(rows[0].querySelectorAll('td')).map((td) =>
      (td as HTMLTableCellElement).textContent?.trim(),
    );
    expect(row1Cols[0]).toContain('Alice-iPhone');
    expect(row1Cols[0]).toContain('↓');
    expect(row1Cols[1]).toBe('192.168.1.50');
    expect(row1Cols[2]).toBe('00:11:22:33:44:55');
    expect(row1Cols[3]).toBe('Wi-Fi (2.5m)');
    expect(row1Cols[4]).toBe('Register'); // Since uuid is not provided, it shows Register

    // Second row without hostname -> "Unknown Device"
    const row2Cols = Array.from(rows[1].querySelectorAll('td')).map((td) =>
      (td as HTMLTableCellElement).textContent?.trim(),
    );
    expect(row2Cols[0]).toContain('Unknown Device');
    expect(row2Cols[0]).toContain('↓');
    expect(row2Cols[1]).toBe('192.168.1.51');
    expect(row2Cols[2]).toBe('aa:bb:cc:dd:ee:ff');
    expect(row2Cols[3]).toBe('LAN (Port 1)');
    expect(row2Cols[4]).toBe('Register');
  });

  it('displays error message when error exists in store', () => {
    mockDevicesStore.error.set('Failed to load devices');
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.error');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Failed to load devices');
  });
});
