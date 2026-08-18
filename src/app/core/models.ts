export type Lifecycle =
  'booting' | 'ready' | 'maintenance' | 'degraded' | 'needs_setup';
export type OperationStatus =
  | 'accepted'
  | 'staging'
  | 'applying'
  | 'verifying'
  | 'persisting'
  | 'confirming'
  | 'rolling_back'
  | 'succeeded'
  | 'failed'
  | 'rollback_failed';

export interface DomainError {
  code: string;
  message: string;
  stage: string;
  operation_id?: string | null;
  request_id?: string | null;
  retryable: boolean;
  details: unknown;
}

export interface PublicOperation {
  id: string;
  request_id?: string | null;
  source: 'user' | 'reconcile' | 'recovery';
  kind: string;
  status: OperationStatus;
  requested_ssid: string;
  error?: DomainError | null;
}

export interface LastOperation extends PublicOperation {
  revision: number;
  finished_at_ms: number;
}

export interface PublicState {
  api_version: number;
  core_version: string;
  boot_id: string;
  event_seq: number;
  revision: number;
  lifecycle: Lifecycle;
  maintenance: {
    enabled: boolean;
    exiting: boolean;
    reason?: string | null;
  };
  wifi: {
    ssid: string;
    targets: string[];
    observed: Record<string, string>;
    status: 'synced' | 'drifted' | 'applying' | 'unknown';
  };
  active_operation?: PublicOperation | null;
  last_user_operation?: LastOperation | null;
  last_system_error?: DomainError | null;
  drift: {
    detected: boolean;
    fields: string[];
  };
  health: {
    core: string;
    ubus: string;
    rpcd: string;
    wireless: string;
  };
}

export interface ApiEnvelope<T> {
  api_version: number;
  ok: boolean;
  result?: T;
  error?: DomainError;
  state: PublicState;
}

export interface OperationAccepted {
  operation_id: string;
  status: OperationStatus;
  noop: boolean;
}
