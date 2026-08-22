import { UbusClient } from './ubus-client.service';

describe('UbusClient', () => {
  beforeEach(() => {
    sessionStorage.setItem('unetic.sid', 'session-id');
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('unwraps the core API envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      rpcResponse({
        idempotence_token: 'request-id',
        event_seq: 7,
        error: 0,
        result: { hostname: 'router' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = new UbusClient();

    const result = await client.call<{ hostname: string }>('system.info');

    expect(result).toEqual({ hostname: 'router' });
  });

  it('rejects domain errors from the core envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        rpcResponse({
          idempotence_token: 'request-id',
          event_seq: 7,
          error: 3,
        }),
      ),
    );
    const client = new UbusClient();

    await expect(client.call('wifi.set_config')).rejects.toThrow('API error 3');
  });
});

function rpcResponse(
  result: unknown,
): Pick<Response, 'ok' | 'status' | 'json'> {
  return {
    ok: true,
    status: 200,
    json: async () => ({ jsonrpc: '2.0', id: 1, result: [0, result] }),
  };
}
