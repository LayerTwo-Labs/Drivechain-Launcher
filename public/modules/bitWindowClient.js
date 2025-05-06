const axios = require('axios');

class BitWindowClient {
  constructor() {
    this.config = {
      baseURL: 'http://127.0.0.1:8080',
      headers: {
        'Content-Type': 'application/json',
      }
    };
    this.connected = false;
    this.initializingBinary = false;
  }

  async makeConnectRequest(service, method, body = {}) {
    try {
      const response = await axios.post(
        `${this.config.baseURL}/${service}/${method}`,
        body,
        this.config
      );
      return response.data;
    } catch (error) {
      console.error(`BitWindow Connect call failed (${this.config.baseURL}/${service}/${method}):`, error.message);
      throw error;
    }
  }

  async checkConnection() {
    try {
      // Use BitcoindService for status check
      await this.makeConnectRequest('health.v1.HealthService', 'Check', {});
      return true;
    } catch (error) {
      return false;
    }
  }

  async waitForConnection(timeoutSeconds = 60) {
    this.initializingBinary = true;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutSeconds * 1000) {
      try {
        if (await this.checkConnection()) {
          this.connected = true;
          this.initializingBinary = false;
          return true;
        }
      } catch (error) {
        // Ignore errors and keep trying
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.initializingBinary = false;
    throw new Error('BitWindow connection timeout');
  }

  async stop() {
    try {
      // Use Connect protocol for stop
      await this.makeConnectRequest('bitwindowd.v1.BitwindowdService', 'Stop', {});
      
      // Wait for shutdown
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      this.connected = false;
      return true;
    } catch (error) {
      console.error('Failed to stop BitWindow:', error);
      throw error;
    }
  }
}

module.exports = BitWindowClient;
