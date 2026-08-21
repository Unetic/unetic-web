import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { WanStore } from './wan.store';
import { UbusClient } from '../core/ubus-client.service';
import { UneticStore } from '../core/unetic-store.service';
import { PublicState } from '../core/models';

function createMockState(overrides?: Partial<PublicState>): PublicState {
  return {
    api_version: 1,
    core_version: '1.0.0',
    boot_id: 'boot-123',
    event_seq: 1,
    revision: 3,
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
    ...overrides,
  };
}

describe('WanStore', () => {
  let store: WanStore;
  let mockUbus: { call: ReturnType<typeof vi.fn> };
  let mockUneticStore: {
    state: ReturnType<typeof signal<PublicState | null>>;
    error: { set: ReturnType<typeof vi.fn> };
    connected: { set: ReturnType<typeof vi.fn> };
    currentRequestId: string | null;
    applyEnvelope: ReturnType<typeof vi.fn>;
    scheduleReconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockUbus = { call: vi.fn() };
    mockUneticStore = {
      state: signal<PublicState | null>(createMockState()),
      error: { set: vi.fn() },
      connected: { set: vi.fn() },
      currentRequestId: null,
      applyEnvelope: vi.fn(),
      scheduleReconnect: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        WanStore,
        { provide: UbusClient, useValue: mockUbus },
        { provide: UneticStore, useValue: mockUneticStore },
      ],
    });

    store = TestBed.inject(WanStore);
  });

  it('initializes with default values', () => {
    expect(store.draftWanProto()).toBe('dhcp');
    expect(store.draftWanNetmask()).toBe('255.255.255.0');
    expect(store.canSaveWan()).toBe(true);
  });

  describe('canSaveWan', () => {
    it('returns false if state is null or not ready', () => {
      mockUneticStore.state.set(null);
      expect(store.canSaveWan()).toBe(false);

      mockUneticStore.state.set(createMockState({ lifecycle: 'booting' }));
      expect(store.canSaveWan()).toBe(false);
    });

    it('validates static IP required fields', () => {
      store.draftWanProto.set('static');
      store.draftWanIp.set('');
      expect(store.canSaveWan()).toBe(false);

      store.draftWanIp.set('192.168.1.100');
      store.draftWanNetmask.set('255.255.255.0');
      store.draftWanGateway.set('192.168.1.1');
      expect(store.canSaveWan()).toBe(true);
    });

    it('validates PPPoE username', () => {
      store.draftWanProto.set('pppoe');
      store.draftWanUsername.set('');
      expect(store.canSaveWan()).toBe(false);

      store.draftWanUsername.set('user123');
      expect(store.canSaveWan()).toBe(true);
    });

    it('allows saving extender mode', () => {
      store.draftWanProto.set('extender');
      expect(store.canSaveWan()).toBe(true);
    });
  });

  describe('wan computed', () => {
    it('returns the current WAN state from uneticStore', () => {
      expect(store.wan().proto).toBe('dhcp');
      expect(store.wan().status).toBe('connected');

      mockUneticStore.state.set(
        createMockState({
          wan: {
            present: true,
            proto: 'extender',
            status: 'connected',
            uptime_secs: 200,
            dns: [],
          },
        }),
      );

      expect(store.wan().proto).toBe('extender');
    });
  });

  describe('saveWan', () => {
    it('calls wan.set with structured payload', async () => {
      store.draftWanProto.set('dhcp');
      store.draftWanDns.set('1.1.1.1, 8.8.8.8');
      const mockEnvelope = {
        api_version: 1,
        ok: true,
        result: { operation_id: 'op-wan', status: 'accepted', noop: false },
        state: createMockState(),
      };
      mockUbus.call.mockResolvedValueOnce(mockEnvelope);

      await store.saveWan();

      expect(mockUbus.call).toHaveBeenCalledWith(
        'wan.set',
        expect.objectContaining({
          wan: expect.objectContaining({
            present: true,
            proto: 'dhcp',
            custom_dns: ['1.1.1.1', '8.8.8.8'],
          }),
          expected_revision: 3,
        }),
      );
      expect(mockUneticStore.applyEnvelope).toHaveBeenCalledWith(mockEnvelope);
    });

    it('calls wan.set with extender payload', async () => {
      store.draftWanProto.set('extender');
      const mockEnvelope = {
        api_version: 1,
        ok: true,
        result: {
          operation_id: 'op-extender',
          status: 'accepted',
          noop: false,
        },
        state: createMockState(),
      };
      mockUbus.call.mockResolvedValueOnce(mockEnvelope);

      await store.saveWan();

      expect(mockUbus.call).toHaveBeenCalledWith(
        'wan.set',
        expect.objectContaining({
          wan: expect.objectContaining({
            present: true,
            proto: 'extender',
          }),
          expected_revision: 3,
        }),
      );
    });
  });
});
