const fs = require('fs');
const file = 'src/app/core/unetic-store.service.ts';
let code = fs.readFileSync(file, 'utf8');

const mockState = `{
  api_version: 1,
  core_version: "0.2.0",
  boot_id: "dev",
  event_seq: 1,
  revision: 1,
  lifecycle: "Ready",
  maintenance: { enabled: false, exiting: false, reason: null },
  wifi: {
    ssid: "Unetic-Demo",
    encryption: "sae-mixed",
    key: "password123",
    targets: ["radio0"],
    observed: { radio0: "Unetic-Demo" },
    status: "synced"
  },
  wan: {
    status: "synced",
    desired: { present: true, proto: "dhcp", custom_dns: [] },
    discovered: { present: true, proto: "dhcp", device: "eth0", custom_mac: null, custom_mtu: null, custom_dns: [], static_config: null, pppoe_config: null },
    runtime: { up: true, device: "eth0", ip_address: "192.168.1.100", netmask: "255.255.255.0", gateway: "192.168.1.1", dns: ["8.8.8.8"] }
  },
  active_operation: null,
  last_user_operation: null,
  last_system_error: null,
  drift: { detected: false, fields: [] },
  health: { core: "ok", ubus: "ok", rpcd: "ok", wireless: "ok", wan: "ok" }
}`;

const mockSystemInfo = `{
  hostname: "Unetic-Dev",
  model: "Mock Router",
  board_name: "dev",
  firmware_version: "0.2.0",
  firmware_revision: "dev",
  target: "x86_64",
  arch: "x86_64",
  kernel_version: "6.0",
  uptime_secs: 3600,
  load_average: [0.1, 0.05, 0.01],
  memory_total_kb: 1024000,
  memory_available_kb: 512000
}`;

code = code.replace(
  'async start(): Promise<void> {',
  `async start(): Promise<void> {
    this.loginRequired.set(false);
    this.state.set(${mockState} as any);
    this.systemInfo.set(${mockSystemInfo} as any);
    return;`
);

fs.writeFileSync(file, code);
