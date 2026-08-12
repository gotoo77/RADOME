export const RADOME_PROTOCOL_VERSION = 1;

const SOCKET_OPEN = 1;

export class RadomeProtocolError extends Error {
  constructor(code, detail = null) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'RadomeProtocolError';
    this.code = code;
    this.detail = detail;
  }
}

export class RadomeCommandOutcomeUnknownError extends Error {
  constructor(commandId) {
    super(`RADOME connection closed before command outcome was known: ${commandId}`);
    this.name = 'RadomeCommandOutcomeUnknownError';
    this.commandId = commandId;
  }
}

export class RadomeClient {
  constructor({
    url,
    clientId,
    role,
    capabilities = [],
    supportedCapabilities = [],
    autoReconnect = true,
    reconnectDelayMs = 1_000,
    webSocketFactory = url => new WebSocket(url),
    schedule = (callback, delay) => setTimeout(callback, delay),
    cancelSchedule = handle => clearTimeout(handle),
  }) {
    this.url = url;
    this.clientId = clientId;
    this.role = role;
    this.capabilities = [...new Set(capabilities)];
    this.supportedCapabilities = [...new Set(supportedCapabilities)];
    this.autoReconnect = autoReconnect;
    this.reconnectDelayMs = reconnectDelayMs;
    this.webSocketFactory = webSocketFactory;
    this.schedule = schedule;
    this.cancelSchedule = cancelSchedule;

    this.sessionId = null;
    this.socket = null;
    this.listeners = new Map();
    this.sequence = 0;
    this.pendingCommands = new Map();
    this.discovery = null;
    this.selectedCapabilities = [];
    this.snapshot = null;
    this.operational = false;
    this.eventBuffer = [];
    this.manualDisconnect = false;
    this.reconnectTimer = null;
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
    if (!this.socket || this.socket.readyState !== SOCKET_OPEN) {
      throw new Error('RADOME WebSocket is not open');
    }
    this.socket.send(JSON.stringify(envelope));
  }

  connect() {
    if (this.socket) throw new Error('RADOME client is already connected or connecting');
    this.manualDisconnect = false;
    this.cancelReconnect();
    this.openSocket('connecting');
  }

  disconnect() {
    this.manualDisconnect = true;
    this.cancelReconnect();
    if (this.socket) this.socket.close();
    else this.emit('status', 'disconnected');
  }

  openSocket(status) {
    this.resetBootstrapState();
    this.emit('status', status);
    const socket = this.webSocketFactory(this.url);
    this.socket = socket;

    socket.addEventListener('open', () => {
      if (this.socket !== socket) return;
      this.emit('status', 'handshake');
      this.sendEnvelope(this.envelope(
        this.nextId('hello'),
        'hello',
        { client_id: this.clientId },
        null,
      ));
    });
    socket.addEventListener('message', ({ data }) => {
      if (this.socket !== socket) return;
      try {
        this.handleMessage(JSON.parse(data));
      } catch (error) {
        this.emit('error', error);
      }
    });
    socket.addEventListener('close', () => this.handleClose(socket));
    socket.addEventListener('error', error => this.emit('error', error));
  }

  handleClose(socket) {
    if (this.socket !== socket) return;
    this.socket = null;
    this.sessionId = null;
    this.operational = false;
    this.eventBuffer = [];

    for (const [commandId, { reject }] of this.pendingCommands) {
      reject(new RadomeCommandOutcomeUnknownError(commandId));
    }
    this.pendingCommands.clear();

    if (!this.manualDisconnect && this.autoReconnect) {
      this.emit('status', 'reconnecting');
      this.reconnectTimer = this.schedule(() => {
        this.reconnectTimer = null;
        if (!this.manualDisconnect && !this.socket) this.openSocket('reconnecting');
      }, this.reconnectDelayMs);
    } else {
      this.emit('status', 'disconnected');
    }
  }

  cancelReconnect() {
    if (this.reconnectTimer !== null) {
      this.cancelSchedule(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  resetBootstrapState() {
    this.sessionId = null;
    this.discovery = null;
    this.selectedCapabilities = [];
    this.snapshot = null;
    this.operational = false;
    this.eventBuffer = [];
  }

  handleMessage(message) {
    if (message.version !== RADOME_PROTOCOL_VERSION) {
      this.emit('error', new Error(`Unsupported RADOME protocol version: ${message.version}`));
      return;
    }

    switch (message.type) {
      case 'hello':
        this.handleHello(message);
        break;
      case 'discovery_result':
        this.handleDiscovery(message);
        break;
      case 'capability_announce':
        this.handleCapabilityAnnounce(message);
        break;
      case 'state_snapshot':
        this.handleSnapshot(message);
        break;
      case 'command_result':
        this.handleCommandResult(message);
        break;
      case 'event':
        if (this.operational) this.emitEvent(message);
        else this.eventBuffer.push(message);
        break;
      case 'error': {
        const code = message.payload?.code ?? 'protocol_error';
        this.emit('error', new RadomeProtocolError(code, message.payload?.detail ?? null));
        break;
      }
      default:
        this.emit('message', message);
    }
  }

  handleHello(message) {
    if (!message.session_id) {
      this.emit('error', new Error('RADOME hello response has no session_id'));
      return;
    }
    this.sessionId = message.session_id;
    this.emit('status', 'discovering');
    this.sendEnvelope(this.envelope(this.nextId('discovery'), 'discovery_request', {}));
  }

  handleDiscovery(message) {
    const commands = Array.isArray(message.payload?.commands) ? message.payload.commands : [];
    const capabilities = Array.isArray(message.payload?.capabilities)
      ? message.payload.capabilities.filter(value => typeof value === 'string')
      : [];
    this.discovery = { capabilities, commands };
    this.emit('discovery', this.discovery);

    const offered = new Set(capabilities);
    const selectedDynamic = this.supportedCapabilities.filter(capability => offered.has(capability));
    this.selectedCapabilities = [...new Set([...this.capabilities, ...selectedDynamic])];

    this.emit('status', 'announcing_capabilities');
    this.sendEnvelope(this.envelope(
      this.nextId('capabilities'),
      'capability_announce',
      { role: this.role, capabilities: this.selectedCapabilities },
    ));
  }

  handleCapabilityAnnounce(message) {
    if (!message.payload?.accepted) {
      this.emit('error', new Error('RADOME capability announcement was not accepted'));
      return;
    }
    this.emit('status', 'synchronizing');
    this.sendEnvelope(this.envelope(this.nextId('snapshot'), 'state_snapshot_request', {}));
  }

  handleSnapshot(message) {
    this.snapshot = message.payload ?? {};
    this.emit('snapshot', this.snapshot);

    if (!this.operational) {
      this.operational = true;
      this.emit('status', 'connected');
      const buffered = this.eventBuffer;
      this.eventBuffer = [];
      for (const event of buffered) this.emitEvent(event);
    }
  }

  emitEvent(message) {
    this.emit('event', message.payload);
    this.emit(`event:${message.payload?.name}`, message.payload?.data);
  }

  handleCommandResult(message) {
    const pending = this.pendingCommands.get(message.correlation_id);
    if (pending) {
      this.pendingCommands.delete(message.correlation_id);
      if (message.payload?.outcome === 'succeeded') {
        pending.resolve(message.payload);
      } else {
        const data = message.payload?.data;
        const detail = typeof data === 'object' && data !== null
          ? data.detail ?? data.code ?? JSON.stringify(data)
          : data ?? 'RADOME command failed';
        pending.reject(new Error(String(detail)));
      }
    }
    this.emit('command_result', message);
  }

  hasCommand(name) {
    return this.discovery?.commands?.some(command => command?.name === name) ?? false;
  }

  commandDefinition(name) {
    return this.discovery?.commands?.find(command => command?.name === name) ?? null;
  }

  sendCommand(name, data = null) {
    if (!this.operational || !this.sessionId) {
      return Promise.reject(new Error('RADOME client is not operational'));
    }

    const definition = this.commandDefinition(name);
    if (!definition) {
      return Promise.reject(new Error(`RADOME command was not discovered: ${name}`));
    }
    if (definition.required_capability && !this.selectedCapabilities.includes(definition.required_capability)) {
      return Promise.reject(new Error(`RADOME capability was not selected: ${definition.required_capability}`));
    }

    const id = this.nextId('command');
    return new Promise((resolve, reject) => {
      this.pendingCommands.set(id, { resolve, reject });
      try {
        this.sendEnvelope(this.envelope(id, 'command', { name, data }));
      } catch (error) {
        this.pendingCommands.delete(id);
        reject(error);
      }
    });
  }

  requestSnapshot() {
    if (!this.sessionId) throw new Error('RADOME session is not established');
    this.sendEnvelope(this.envelope(this.nextId('snapshot'), 'state_snapshot_request', {}));
  }
}
