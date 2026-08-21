import { TestBed } from '@angular/core/testing';
import { DevicesStore } from './devices.store';
import { UbusClient } from './ubus-client.service';
import { UneticStore } from './unetic-store.service';
import { Device } from './models';

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
      api_version: 1,
      ok: true,
      result: mockDevices,
      state: {} as any,
    };
    mockUbus.call.mockResolvedValueOnce(mockEnvelope);

    const result = await store.fetchDevices();

    expect(mockUbus.call).toHaveBeenCalledWith('devices.list', {});
    expect(mockUneticStore.applyEnvelope).toHaveBeenCalledWith(mockEnvelope);
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
      api_version: 1,
      ok: true,
      result: { devices: mockDevices },
      state: {} as any,
    };
    mockUbus.call.mockResolvedValueOnce(mockEnvelope);

    const result = await store.fetchDevices();

    expect(store.devices()).toEqual(mockDevices);
    expect(result).toEqual(mockDevices);
  });

  it('handles domain error in envelope', async () => {
    const mockEnvelope = {
      api_version: 1,
      ok: false,
      error: {
        code: 'InternalError',
        message: 'Failed to query device list',
        stage: 'Execute',
        retryable: true,
        details: null,
      },
      state: {} as any,
    };
    mockUbus.call.mockResolvedValueOnce(mockEnvelope);

    await store.fetchDevices();

    expect(store.error()).toBe('Failed to query device list');
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
        api_version: 1,
        ok: true,
        result: [],
        state: {} as any,
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
