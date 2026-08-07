export const RADOME_PROTOCOL_VERSION = 1;

export class RadomeClient {
  constructor({ url, clientId, role, capabilities = [] }) {
    this.url = url;
    this.clientId = clientId;
    this.role = role;
    this.capabilities = capabilities;
    this.sessionId = null;
    this.socket = null;
    this.listeners = new Map();
    this.sequence = 0;
  }

  on(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
    return () => this.listeners.set(type, listeners.filter(item => item !== listener));
  }

  emit(type, value) {
    for (const listener of this.listeners.get(type) ?? []) listener(value);
  }

  nextId(prefix) {
    this.sequence += 1;
    return `${this.clientId}-${prefix}-${this.sequence}`;
  }

  envelope(id, type, payload, sessionId = this.sessionId) {
    const message = { version: RADOME_PROTOCOL_VERSION, id, type, payload };
    if (sessionId) message.session_id = sessionId;
    return message;
  }

  sendEnvelope(envelope) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('RADOME WebSocket is not open');
    }
    this.socket.send(JSON.stringify(envelope));
  }

  connect() {
    if (this.socket) throw new Error('RADOME client is already connected or connecting');
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener('open', () => {
      this.emit('status', 'handshake');
      this.sendEnvelope(this.envelope(this.nextId('hello'), 'hello', { client_id: this.clientId }, null));
    });
    this.socket.addEventListener('message', ({ data }) => this.handleMessage(JSON.parse(data)));
    this.socket.addEventListener('close', () => {
      this.sessionId = null;
      this.socket = null;
      this.emit('status', 'disconnected');
    });
    this.socket.addEventListener('error', error => this.emit('error', error));
  }

  disconnect() {
    this.socket?.close();
  }

  handleMessage(message) {
    if (message.version !== RADOME_PROTOCOL_VERSION) {
      this.emit('error', new Error(`Unsupported RADOME protocol version: ${message.version}`));
      return;
    }
    if (message.type === 'hello') {
      this.sessionId = message.session_id;
      this.sendEnvelope(this.envelope(this.nextId('capabilities'), 'capability_announce', {
        role: this.role,
        capabilities: this.capabilities,
      }));
      return;
    }
    if (message.type === 'capability_announce' && message.payload?.accepted) {
      this.emit('status', 'connected');
      return;
    }
    if (message.type === 'event') {
      this.emit('event', message.payload);
      this.emit(`event:${message.payload?.name}`, message.payload?.data);
      return;
    }
    if (message.type === 'error') {
      this.emit('error', new Error(message.payload?.reason ?? 'RADOME protocol error'));
      return;
    }
    this.emit('message', message);
  }
}
