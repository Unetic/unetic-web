const fs = require('fs');
const file = '/home/frys/Projects/unetic/web/src/app/core/unetic-store.service.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  currentRequestId: string | null = null;\n  private pollingTimer?: number;\n  private reconnectTimer?: number;\n',
  '  currentRequestId: string | null = null;\n  private pollingTimer?: number;\n  private reconnectTimer?: number;\n  private subscriptionId: string | null = null;\n  private continueTimer?: number;\n'
);

content = content.replace(
  '  constructor(private readonly ubus: UbusClient) {\n    this.loginRequired.set(!ubus.authenticated);\n  }',
  '  constructor(private readonly ubus: UbusClient) {\n    this.loginRequired.set(!ubus.authenticated);\n    window.addEventListener(\'beforeunload\', () => this.cancelSubscription());\n  }'
);

content = content.replace(
  '  ngOnDestroy(): void {\n    if (this.pollingTimer !== undefined) {\n      window.clearInterval(this.pollingTimer);\n      this.pollingTimer = undefined;\n    }\n    if (this.reconnectTimer !== undefined) {\n      window.clearTimeout(this.reconnectTimer);\n      this.reconnectTimer = undefined;\n    }\n  }',
  `  ngOnDestroy(): void {
    if (this.pollingTimer !== undefined) {
      window.clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }
    if (this.reconnectTimer !== undefined) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.continueTimer !== undefined) {
      window.clearInterval(this.continueTimer);
      this.continueTimer = undefined;
    }
    this.cancelSubscription();
  }

  private cancelSubscription(): void {
    if (this.subscriptionId) {
      void this.ubus.call('state.subscribe.cancel', { subscription_id: this.subscriptionId }).catch(() => {});
      this.subscriptionId = null;
    }
  }

  private mergePatch(current: any, patch: any): any {
    if (patch === null) {
      return null;
    }
    if (typeof patch !== 'object' || Array.isArray(patch)) {
      return patch;
    }
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      current = {};
    }
    const result = { ...current };
    for (const key of Object.keys(patch)) {
      if (patch[key] === null) {
        delete result[key];
      } else {
        result[key] = this.mergePatch(result[key], patch[key]);
      }
    }
    return result;
  }`
);

content = content.replace(
  '    window.clearTimeout(this.reconnectTimer);\n    try {\n      await this.ubus.subscribe(\n        (value) => this.acceptIncomingState(value),\n        () => {\n          this.connected.set(false);\n          this.scheduleReconnect();\n        },\n      );',
  `    window.clearTimeout(this.reconnectTimer);
    try {
      const subRes = await this.ubus.call<{ subscription_id: string }>(
        'state.subscribe.create',
        { ttl_mins: 5 }
      );
      this.subscriptionId = subRes.subscription_id;

      window.clearInterval(this.continueTimer);
      this.continueTimer = window.setInterval(() => {
        if (this.subscriptionId) {
          void this.ubus.call('state.subscribe.continue', { subscription_id: this.subscriptionId }).catch(() => {});
        }
      }, 4 * 60 * 1000);

      await this.ubus.subscribe(
        (value) => this.acceptIncomingState(value),
        (patch) => this.applyPatch(patch),
        () => {
          this.connected.set(false);
          this.scheduleReconnect();
        },
      );`
);

content = content.replace(
  '    const state = await this.ubus.call<PublicState>(\n      \'state\',\n      {},\n    );',
  '    const state = await this.ubus.call<PublicState>(\n      \'state.get\',\n      {},\n    );'
);

content = content.replace(
  '  private applyState(state: PublicState): void {',
  `  private applyPatch(patch: any): void {
    const current = this.state();
    if (!current) {
      void this.refresh();
      return;
    }
    if (patch.boot_id !== undefined && current.boot_id !== patch.boot_id) {
      void this.refresh();
      return;
    }
    if (patch.event_seq !== undefined) {
      if (patch.event_seq > current.event_seq + 1) {
        void this.refresh();
        return;
      }
      if (patch.event_seq <= current.event_seq) {
        return;
      }
    }
    
    this.state.update((curr) => {
      if (!curr) return curr;
      const nextState = this.mergePatch(curr, patch);
      this.applyState(nextState);
      return nextState;
    });
  }

  private applyState(state: PublicState): void {`
);

fs.writeFileSync(file, content, 'utf8');
