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

export interface OperationAccepted {
  operation_id: string;
  status: OperationStatus;
  noop: boolean;
}
