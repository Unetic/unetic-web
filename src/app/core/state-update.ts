import { mergeJsonPatch } from './json-merge-patch';
import { PublicState } from './public-state.model';

export type StateUpdate =
  | { action: 'apply'; state: PublicState }
  | { action: 'refresh' }
  | { action: 'ignore' };

export function resolveEvent(
  current: PublicState | null,
  value: unknown,
): StateUpdate {
  if (!isPublicState(value)) {
    return { action: 'refresh' };
  }
  if (!current) {
    return { action: 'apply', state: value };
  }
  if (
    current.boot_id !== value.boot_id ||
    value.event_seq > current.event_seq + 1
  ) {
    return { action: 'refresh' };
  }
  if (value.event_seq <= current.event_seq) {
    return { action: 'ignore' };
  }
  return { action: 'apply', state: value };
}

export function resolveSnapshot(
  current: PublicState | null,
  value: unknown,
): StateUpdate {
  if (!isPublicState(value)) {
    return { action: 'refresh' };
  }
  if (
    current &&
    current.boot_id === value.boot_id &&
    value.event_seq < current.event_seq
  ) {
    return { action: 'ignore' };
  }
  return { action: 'apply', state: value };
}

export function resolvePatch(
  current: PublicState | null,
  patch: unknown,
): StateUpdate {
  if (!current || !patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { action: 'refresh' };
  }
  const patchObject = patch as Record<string, unknown>;
  if (
    patchObject['boot_id'] !== undefined &&
    current.boot_id !== patchObject['boot_id']
  ) {
    return { action: 'refresh' };
  }

  const eventSeq = patchObject['event_seq'];
  if (eventSeq !== undefined) {
    if (typeof eventSeq !== 'number' || eventSeq > current.event_seq + 1) {
      return { action: 'refresh' };
    }
    if (eventSeq <= current.event_seq) {
      return { action: 'ignore' };
    }
  }

  const state = mergeJsonPatch(current, patch);
  return isPublicState(state)
    ? { action: 'apply', state }
    : { action: 'refresh' };
}

function isPublicState(value: unknown): value is PublicState {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const state = value as Partial<PublicState>;
  return (
    typeof state.boot_id === 'string' &&
    typeof state.event_seq === 'number' &&
    typeof state.revision === 'number' &&
    typeof state.lifecycle === 'string' &&
    !!state.wifi &&
    !!state.wan
  );
}
