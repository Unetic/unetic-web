import { TestBed } from '@angular/core/testing';
import { ToolsStore } from './tools.store';
import { UbusClient } from './ubus-client.service';
import { UneticStore } from './unetic-store.service';

describe('ToolsStore', () => {
  let store: ToolsStore;
  let mockUbus: { call: ReturnType<typeof vi.fn> };
  let mockUneticStore: { applyEnvelope: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockUbus = {
      call: vi.fn(),
    };
    mockUneticStore = {
      applyEnvelope: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ToolsStore,
        { provide: UbusClient, useValue: mockUbus },
        { provide: UneticStore, useValue: mockUneticStore },
      ],
    });

    store = TestBed.inject(ToolsStore);
  });

  it('initializes with empty target, not pinging, and cannot ping', () => {
    expect(store.targetHost()).toBe('');
    expect(store.pingOutput()).toBe('');
    expect(store.pinging()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.canPing()).toBe(false);
  });

  it('canPing is true only when targetHost is non-empty and not pinging', () => {
    store.targetHost.set('1.1.1.1');
    expect(store.canPing()).toBe(true);

    store.targetHost.set('   ');
    expect(store.canPing()).toBe(false);
  });

  it('ping executes tools.ping ubus call with object result', async () => {
    store.targetHost.set('8.8.8.8');
    const mockEnvelope = {
      api_version: 1,
      ok: true,
      result: {
        output: 'PING 8.8.8.8: 56 data bytes\n64 bytes from 8.8.8.8: seq=0',
      },
      state: {} as any,
    };
    mockUbus.call.mockResolvedValueOnce(mockEnvelope);

    const result = await store.ping();

    expect(mockUbus.call).toHaveBeenCalledWith('tools.ping', {
      host: '8.8.8.8',
    });
    expect(mockUneticStore.applyEnvelope).toHaveBeenCalledWith(mockEnvelope);
    expect(store.pingOutput()).toBe(
      'PING 8.8.8.8: 56 data bytes\n64 bytes from 8.8.8.8: seq=0',
    );
    expect(result).toBe(
      'PING 8.8.8.8: 56 data bytes\n64 bytes from 8.8.8.8: seq=0',
    );
    expect(store.pinging()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('ping handles string result', async () => {
    store.targetHost.set('google.com');
    const mockEnvelope = {
      api_version: 1,
      ok: true,
      result: 'PING google.com (142.250.74.206): 56 data bytes',
      state: {} as any,
    };
    mockUbus.call.mockResolvedValueOnce(mockEnvelope);

    await store.ping();

    expect(store.pingOutput()).toBe(
      'PING google.com (142.250.74.206): 56 data bytes',
    );
  });

  it('ping handles domain error in envelope', async () => {
    store.targetHost.set('invalid');
    const mockEnvelope = {
      api_version: 1,
      ok: false,
      error: {
        code: 'InvalidArgument',
        message: 'Invalid hostname or IP address',
        stage: 'Validate',
        retryable: false,
        details: null,
      },
      state: {} as any,
    };
    mockUbus.call.mockResolvedValueOnce(mockEnvelope);

    await store.ping();

    expect(store.error()).toBe('Invalid hostname or IP address');
    expect(store.pingOutput()).toBe('');
  });

  it('ping handles network error exception', async () => {
    store.targetHost.set('192.168.1.1');
    mockUbus.call.mockRejectedValueOnce(new Error('Connection timed out'));

    await store.ping();

    expect(store.error()).toBe('Connection timed out');
    expect(store.pinging()).toBe(false);
  });

  it('returns null if host is empty', async () => {
    store.targetHost.set('');
    const result = await store.ping();

    expect(result).toBeNull();
    expect(mockUbus.call).not.toHaveBeenCalled();
  });
});
