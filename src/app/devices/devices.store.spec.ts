import { TestBed } from '@angular/core/testing';
import { DevicesStore } from './devices.store';
import { UbusClient } from '../core/ubus-client.service';
import { UneticStore } from '../core/unetic-store.service';
import { Device } from './devices.model';
import { PublicState } from '../core/models';

function createMockState(): PublicState {
  return { extenders: [], dns: { upstream: [], local_domain: null, dhcp_start: 100, dhcp_limit: 150, dhcp_lease_hours: 24, custom_records: [] },
    
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
  };
}

describe('DevicesStore', () => {
  let store: DevicesStore;
  let mockUbus: {
    authenticated: boolean;
    call: ReturnType<typeof vi.fn>;
  };
  let mockUneticStore: {
    applyEnvelope: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockUbus = {
      authenticated: true,
      call: vi.fn(),
    };
    mockUneticStore = {
      applyEnvelope: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        DevicesStore,
        { provide: UbusClient, useValue: mockUbus },
        { provide: UneticStore, useValue: mockUneticStore },
      ],
    });

    store = TestBed.inject(DevicesStore);
  });

  afterEach(() => {
    store.stopPolling();
  });

  it('initializes with empty devices, loading false, and error null', () => {
    expect(store.devices()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('returns empty list and does not call ubus when unauthenticated', async () => {
    mockUbus.authenticated = false;
    const result = await store.fetchDevices();

    expect(result).toEqual([]);
    expect(mockUbus.call).not.toHaveBeenCalled();
  });

  it('fetches devices array successfully', async () => {
    const mockDevices: Device[] = [
      {
        mac: 'aa:bb:cc:dd:ee:01',
        ip: '192.168.1.100',
        hostname: 'my-phone',
        connection_type: 'wifi',
      },
      {
        mac: 'aa:bb:cc:dd:ee:02',
        ip: '192.168.1.101',
        hostname: null,
        connection_type: 'ethernet',
      },
    ];
    const mockEnvelope = {
      
      ok: true,
      result: mockDevices,
      state: createMockState(),
    };
    mockUbus.call.mockResolvedValueOnce(mockEnvelope);

    const result = await store.fetchDevices();

    expect(mockUbus.call).toHaveBeenCalledWith('devices.list', {});

    expect(store.devices()).toEqual(mockDevices);
    expect(result).toEqual(mockDevices);
    expect(store.error()).toBeNull();
    expect(store.loading()).toBe(false);
  });

  it('fetches devices nested in an object successfully', async () => {
    const mockDevices: Device[] = [
      {
        mac: 'aa:bb:cc:dd:ee:03',
        ip: '192.168.1.102',
        hostname: 'laptop',
        connection_type: 'wifi',
      },
    ];
    const mockEnvelope = {
      
      ok: true,
      result: { devices: mockDevices },
      state: createMockState(),
    };
    mockUbus.call.mockResolvedValueOnce(mockEnvelope);

    const result = await store.fetchDevices();

    expect(store.devices()).toEqual(mockDevices);
    expect(result).toEqual(mockDevices);
  });

  it('handles domain error in envelope', async () => {
    mockUbus.call.mockRejectedValueOnce(new Error('API Error 1'));

    await store.fetchDevices();

    expect(store.error()).toBe('API Error 1');
    expect(store.devices()).toEqual([]);
  });

  it('handles ubus call rejection', async () => {
    mockUbus.call.mockRejectedValueOnce(new Error('Network error'));

    await store.fetchDevices();

    expect(store.error()).toBe('Network error');
    expect(store.loading()).toBe(false);
  });

  it('polls at the specified interval', () => {
    vi.useFakeTimers();
    try {
      mockUbus.call.mockResolvedValue({
        
        ok: true,
        result: [],
        state: createMockState(),
      });

      store.startPolling(5000);
      expect(mockUbus.call).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(5000);
      expect(mockUbus.call).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(5000);
      expect(mockUbus.call).toHaveBeenCalledTimes(3);

      store.stopPolling();
      vi.advanceTimersByTime(5000);
      expect(mockUbus.call).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });
});
