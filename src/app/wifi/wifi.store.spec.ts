import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { WifiStore } from './wifi.store';
import { UbusClient } from '../core/ubus-client.service';
import { UneticStore } from '../core/unetic-store.service';
import { PublicState } from '../core/models';

function createMockState(overrides?: Partial<PublicState>): PublicState {
  return { extenders: [], extender_ports: {}, dns: { upstream: [], local_domain: null, dhcp_start: 100, dhcp_limit: 150, dhcp_lease_hours: 24, custom_records: [] },
    
    core_version: '1.0.0',
    boot_id: 'boot-123',
    event_seq: 1,
    revision: 5,
    lifecycle: 'ready',
    maintenance: { enabled: false, exiting: false },
    wifi: {
      ssid: 'OldNetwork',
      targets: ['radio0'],
      observed: { radio0: 'OldNetwork' },
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

describe('WifiStore', () => {
  let store: WifiStore;
  let mockUbus: {
    authenticated: boolean;
    call: ReturnType<typeof vi.fn>;
  };
  let mockUneticStore: {
    state: ReturnType<typeof signal<PublicState | null>>;
    error: { set: ReturnType<typeof vi.fn> };
    connected: { set: ReturnType<typeof vi.fn> };
    currentRequestId: string | null;
    applyEnvelope: ReturnType<typeof vi.fn>;
    scheduleReconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockUbus = {
      authenticated: true,
      call: vi.fn(),
    };
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
        WifiStore,
        { provide: UbusClient, useValue: mockUbus },
        { provide: UneticStore, useValue: mockUneticStore },
      ],
    });

    store = TestBed.inject(WifiStore);
  });

  it('initializes with default signals', () => {
    expect(store.draftSsid()).toBe('');
    expect(store.draftEncryption()).toBe('psk2');
    expect(store.draftKey()).toBe('');
  });

  describe('canSave', () => {
    it('returns false when state is null', () => {
      mockUneticStore.state.set(null);
      store.draftSsid.set('NewNetwork');
      store.draftKey.set('12345678');
      expect(store.canSave()).toBe(false);
    });

    it('returns false when lifecycle is not ready', () => {
      mockUneticStore.state.set(createMockState({ lifecycle: 'booting' }));
      store.draftSsid.set('NewNetwork');
      store.draftKey.set('12345678');
      expect(store.canSave()).toBe(false);
    });

    it('returns false when maintenance is enabled', () => {
      mockUneticStore.state.set(
        createMockState({ maintenance: { enabled: true, exiting: false } }),
      );
      store.draftSsid.set('NewNetwork');
      store.draftKey.set('12345678');
      expect(store.canSave()).toBe(false);
    });

    it('returns false when an operation is active', () => {
      mockUneticStore.state.set(
        createMockState({
          active_operation: {
            id: 'op-1',
            source: 'user',
            kind: 'wifi.set_config',
            status: 'applying',
            requested_ssid: 'NewNetwork',
          },
        }),
      );
      store.draftSsid.set('NewNetwork');
      store.draftKey.set('12345678');
      expect(store.canSave()).toBe(false);
    });

    it('returns false when SSID is empty or too long', () => {
      store.draftKey.set('12345678');
      store.draftSsid.set('');
      expect(store.canSave()).toBe(false);

      store.draftSsid.set('a'.repeat(33));
      expect(store.canSave()).toBe(false);
    });

    it('validates password length when encryption != none', () => {
      store.draftSsid.set('MyHome');
      store.draftEncryption.set('psk2');

      store.draftKey.set('short');
      expect(store.canSave()).toBe(false);

      store.draftKey.set('12345678');
      expect(store.canSave()).toBe(true);

      store.draftKey.set('a'.repeat(63));
      expect(store.canSave()).toBe(true);

      store.draftKey.set('a'.repeat(64));
      expect(store.canSave()).toBe(false);
    });

    it('allows empty password when encryption is none', () => {
      store.draftSsid.set('OpenWifi');
      store.draftEncryption.set('none');
      store.draftKey.set('');
      expect(store.canSave()).toBe(true);
    });
  });

  describe('saveConfig', () => {
    it('does nothing if canSave is false', async () => {
      store.draftSsid.set('');
      await store.saveConfig();
      expect(mockUbus.call).not.toHaveBeenCalled();
    });

    it('calls wifi.set_config with password when encryption != none', async () => {
      store.draftSsid.set('MyWifi');
      store.draftEncryption.set('psk2');
      store.draftKey.set('secretpass123');

      const mockEnvelope = {
        
        ok: true,
        result: { operation_id: 'op-1', status: 'accepted', noop: false },
        state: createMockState(),
      };
      mockUbus.call.mockResolvedValueOnce(mockEnvelope);

      await store.saveConfig();

      expect(mockUbus.call).toHaveBeenCalledWith(
        'wifi.set_config',
        expect.objectContaining({
          ssid: 'MyWifi',
          encryption: 'psk2',
          key: 'secretpass123',
          expected_revision: 5,
        }),
      );

    });

    it('calls wifi.set_config without key when encryption is none', async () => {
      store.draftSsid.set('OpenNet');
      store.draftEncryption.set('none');
      store.draftKey.set('');

      const mockEnvelope = {
        
        ok: true,
        result: { operation_id: 'op-2', status: 'accepted', noop: false },
        state: createMockState(),
      };
      mockUbus.call.mockResolvedValueOnce(mockEnvelope);

      await store.saveConfig();

      expect(mockUbus.call).toHaveBeenCalledWith('wifi.set_config', {
        ssid: 'OpenNet',
        encryption: 'none',
        expected_revision: 5,
        request_id: expect.any(String),
      });
    });

    it('handles noop response by updating draft signals', async () => {
      store.draftSsid.set('ExistingNet');
      store.draftEncryption.set('sae');
      store.draftKey.set('passphrase123');

      const returnedState = createMockState({
        wifi: {
          ssid: 'ExistingNet',
          encryption: 'sae',
          targets: ['radio0'],
          observed: { radio0: 'ExistingNet' },
          status: 'synced',
        },
      });

      const mockEnvelope = {
        
        ok: true,
        result: { operation_id: 'op-3', status: 'succeeded', noop: true },
        state: returnedState,
      };
      mockUbus.call.mockResolvedValueOnce(mockEnvelope);
      mockUneticStore.state.set(returnedState as any);

      await store.saveConfig();

      expect(store.draftSsid()).toBe('ExistingNet');
      expect(store.draftEncryption()).toBe('sae');
      expect(mockUneticStore.currentRequestId).toBeNull();
    });

    it('handles network failure during call', async () => {
      store.draftSsid.set('MyWifi');
      store.draftEncryption.set('psk2');
      store.draftKey.set('secretpass123');

      mockUbus.call.mockRejectedValueOnce(new Error('Connection dropped'));

      await store.saveConfig();

      expect(mockUneticStore.connected.set).toHaveBeenCalledWith(false);
      expect(mockUneticStore.error.set).toHaveBeenCalledWith(
        'Connection lost — checking the result…',
      );
      expect(mockUneticStore.scheduleReconnect).toHaveBeenCalled();
    });
  });
});
