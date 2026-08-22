export interface PendingExtender {
  mac: string;
  model: string;
  pairing_key: string;
}

export interface KnownExtender {
  mac: string;
  ip: string;
  model: string;
}
