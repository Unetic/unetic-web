import { PublicState } from './public-state.model';
import { resolveEvent, resolvePatch, resolveSnapshot } from './state-update';

function state(eventSeq: number): PublicState {
  return {
    core_version: '1.0.0',
    boot_id: 'boot-1',
    event_seq: eventSeq,
    revision: 1,
    lifecycle: 'ready',
    maintenance: { enabled: false, exiting: false },
    wifi: { ssid: 'Home', targets: [], observed: {}, status: 'synced' },
    wan: {
      present: true,
      proto: 'dhcp',
      status: 'connected',
      uptime_secs: 0,
      dns: [],
    },
    dns: {
      upstream: [],
      local_domain: null,
      dhcp_start: 100,
      dhcp_limit: 100,
      dhcp_lease_hours: 12,
      custom_records: [],
    },
    drift: { detected: false, fields: [] },
    health: { core: 'ok', ubus: 'ok', rpcd: 'ok', wireless: 'ok', wan: 'ok' },
    extenders: [],
    pending_extenders: [],
    extender_pairing_status: 'unpaired',
    extender_ports: {},
  };
}

describe('state updates', () => {
  it('requests a refresh when an event sequence has a gap', () => {
    expect(resolveEvent(state(1), state(3))).toEqual({ action: 'refresh' });
  });

  it('ignores stale snapshots', () => {
    expect(resolveSnapshot(state(2), state(1))).toEqual({ action: 'ignore' });
  });

  it('applies RFC 7396 patches with the next sequence', () => {
    const update = resolvePatch(state(1), {
      event_seq: 2,
      lifecycle: 'degraded',
    });
    expect(update.action).toBe('apply');
    if (update.action === 'apply') {
      expect(update.state.event_seq).toBe(2);
      expect(update.state.lifecycle).toBe('degraded');
    }
  });
});
