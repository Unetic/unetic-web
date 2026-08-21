export interface SystemInfo {
  hostname: string;
  model: string;
  board_name: string;
  firmware_version: string;
  firmware_revision: string;
  target: string;
  arch: string;
  kernel_version: string;
  uptime_secs: number;
  load_average: [number, number, number];
  memory_total_kb: number;
  memory_available_kb: number;
}
