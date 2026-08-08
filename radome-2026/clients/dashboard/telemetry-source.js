export class RadomeTelemetrySource {
  constructor(client) {
    this.client = client;
  }

  start() {
    this.client.connect();
  }

  stop() {
    this.client.disconnect();
  }
}

export class DemoTelemetrySource {
  constructor({ app, play }) {
    this.app = app;
    this.play = play;
    this.cancel = null;
  }

  start() {
    if (this.cancel) return;
    this.cancel = this.play(this.app);
  }

  stop() {
    this.cancel?.();
    this.cancel = null;
  }
}
