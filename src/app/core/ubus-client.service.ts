import { Injectable } from '@angular/core';

interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: [number, T];
  error?: {
    code: number;
    message: string;
  };
}

interface ApiEnvelope<T> {
  idempotence_token: string;
  event_seq: number;
  error: number;
  result?: T;
}

const ANONYMOUS_SID = '00000000000000000000000000000000';

@Injectable({ providedIn: 'root' })
export class UbusClient {
  private sid: string | null = sessionStorage.getItem('unetic.sid');
  private nextId = 1;
  private abortSubscription?: AbortController;

  get authenticated(): boolean {
    return this.sid !== null;
  }

  async login(username: string, password: string): Promise<void> {
    const response = await this.rpc<{ ubus_rpc_session?: string }>(
      ANONYMOUS_SID,
      'session',
      'login',
      { username, password, timeout: 3600 },
    );
    const sid = response.ubus_rpc_session;
    if (!sid) {
      throw new Error('rpcd did not return a session');
    }
    this.sid = sid;
    sessionStorage.setItem('unetic.sid', sid);
  }

  logout(): void {
    this.stopSubscription();
    this.sid = null;
    sessionStorage.removeItem('unetic.sid');
  }

  stopSubscription(): void {
    this.abortSubscription?.abort();
    this.abortSubscription = undefined;
  }

  async call<T>(
    method: string,
    params: Record<string, unknown> | object = {},
  ): Promise<T> {
    if (!this.sid) {
      throw new Error('Not authenticated');
    }
    const payload = {
      ...params,
      idempotence_token: crypto.randomUUID(),
    };
    const envelope = await this.rpc<ApiEnvelope<T>>(
      this.sid,
      'unetic',
      method,
      payload,
    );
    if (envelope.error !== 0) {
      throw new Error(`API error ${envelope.error}`);
    }
    if (envelope.result === undefined) {
      throw new Error('Core returned a malformed API response');
    }
    return envelope.result;
  }

  async subscribe(
    onState: (state: unknown) => void,
    onPatch: (patch: unknown) => void,
    onDisconnect: () => void,
  ): Promise<void> {
    if (!this.sid) {
      throw new Error('Not authenticated');
    }

    this.abortSubscription?.abort();
    const abort = new AbortController();
    this.abortSubscription = abort;

    const response = await fetch('/ubus/subscribe/unetic', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.sid}`,
        Accept: 'text/event-stream',
      },
      cache: 'no-store',
      signal: abort.signal,
    });

    if (!response.ok || !response.body) {
      if (response.status === 401 || response.status === 403) {
        this.logout();
      }
      throw new Error(`Subscription failed: HTTP ${response.status}`);
    }

    void this.readSubscription(
      response.body,
      abort,
      onState,
      onPatch,
      onDisconnect,
    );
  }

  private async readSubscription(
    body: ReadableStream<Uint8Array>,
    abort: AbortController,
    onState: (state: unknown) => void,
    onPatch: (patch: unknown) => void,
    onDisconnect: () => void,
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (!abort.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');
        buffer = this.consumeSse(buffer, onState, onPatch);
      }
      if (!abort.signal.aborted) {
        onDisconnect();
      }
    } catch {
      if (!abort.signal.aborted) {
        onDisconnect();
      }
    } finally {
      reader.releaseLock();
    }
  }

  private consumeSse(
    buffer: string,
    onState: (state: unknown) => void,
    onPatch: (patch: unknown) => void,
  ): string {
    let boundary = buffer.indexOf('\n\n');
    while (boundary >= 0) {
      const event = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      let eventName = '';
      const data: string[] = [];
      for (const rawLine of event.split(/\r?\n/)) {
        const line = rawLine.trimEnd();
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          data.push(line.slice(5).trimStart());
        }
      }

      if (eventName === 'state.changed' && data.length) {
        try {
          onState(JSON.parse(data.join('\n')));
        } catch {
          // A malformed notification is ignored; the polling/resync path remains authoritative.
        }
      } else if (eventName === 'state.patched' && data.length) {
        try {
          onPatch(JSON.parse(data.join('\n')));
        } catch {
          // Polling will replace a malformed incremental update with a full state.
        }
      }

      boundary = buffer.indexOf('\n\n');
    }
    return buffer;
  }

  private async rpc<T>(
    sid: string,
    object: string,
    method: string,
    params: unknown,
  ): Promise<T> {
    const id = this.nextId++;
    const response = await fetch('/ubus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'call',
        params: [sid, object, method, params],
      }),
    });

    if (!response.ok) {
      throw new Error(`ubus HTTP ${response.status}`);
    }

    const payload = (await response.json()) as JsonRpcResponse<T>;
    if (payload.error) {
      throw new Error(payload.error.message);
    }

    if (!payload.result || payload.result[0] !== 0) {
      if (payload.result?.[0] === 6) {
        this.logout();
      }
      throw new Error(`ubus status ${payload.result?.[0] ?? 'unknown'}`);
    }

    return payload.result[1];
  }
}
