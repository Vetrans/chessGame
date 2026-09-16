class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.queue = [];
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectTimer = null;
    this.url = '';
  }

  connect(customUrl) {
    if (customUrl) {
      this.url = customUrl;
    } else if (!this.url) {
      if (import.meta.env.VITE_WS_URL) {
        this.url = import.meta.env.VITE_WS_URL;
      } else {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // If in Vite local development mode, target backend port 3001
        if (import.meta.env.DEV || window.location.port === '5173') {
          const defaultHost = window.location.hostname || 'localhost';
          const defaultPort = import.meta.env.VITE_WS_PORT || '3001';
          this.url = `${wsProtocol}//${defaultHost}:${defaultPort}`;
        } else {
          // In production (served from Express backend or Render host)
          this.url = `${wsProtocol}//${window.location.host}`;
        }
      }
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    this.notifyStatus(false);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.notifyStatus(true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        // Flush message queue
        while (this.queue.length > 0) {
          const msg = this.queue.shift();
          this.send(msg);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.listeners.forEach((listener) => {
            try {
              listener(data);
            } catch (err) {
              console.error('Error in WS message listener:', err);
            }
          });
        } catch (e) {
          console.error('Failed to parse WebSocket message:', event.data, e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        this.notifyStatus(false);

        // Auto-reconnect after 3s if disconnected unexpectedly
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
        this.isConnecting = false;
        this.notifyStatus(false);
      };
    } catch (err) {
      console.error('Failed to instantiate WebSocket:', err);
      this.isConnecting = false;
      this.notifyStatus(false);
    }
  }

  send(data) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.queue.push(data);
      if (!this.isConnected && !this.isConnecting) {
        this.connect();
      }
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatusChange(listener) {
    this.statusListeners.add(listener);
    listener(this.isConnected);
    return () => this.statusListeners.delete(listener);
  }

  notifyStatus(connected) {
    this.statusListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (err) {
        console.error('Error in WS status listener:', err);
      }
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.notifyStatus(false);
  }
}

export const wsService = new WebSocketService();
