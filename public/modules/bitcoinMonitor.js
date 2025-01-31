const axios = require('axios');

class BitcoinMonitor {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.pollInterval = 100; // 100ms for smoother updates
    this.lastLoggedBlock = 0;
    this.monitoring = false;
    this.rpcConfig = {
      host: '127.0.0.1',  // Use explicit IP instead of localhost
      port: 38332,
      user: 'user',
      password: 'password'
    };
  }

  async makeRpcCall(method, params = [], quiet_mode = false) {
    try {
      const response = await axios.post(`http://${this.rpcConfig.host}:${this.rpcConfig.port}`, {
        jsonrpc: '1.0',
        id: 'bitcoinmonitor',
        method,
        params
      }, {
        auth: {
          username: this.rpcConfig.user,
          password: this.rpcConfig.password
        }
      });
      return response.data.result;
    } catch (error) {
      if (!quiet_mode)
        console.error(`RPC call failed (${method}):`, error.message);
      throw error;
    }
  }

  async checkIBDStatus() {
    try {
      const info = await this.makeRpcCall('getblockchaininfo');
      return {
        inIBD: info.initialblockdownload,
        progress: info.verificationprogress,
        blocks: info.blocks,
        headers: info.headers
      };
    } catch (error) {
      console.error('Failed to check IBD status:', error);
      throw error;
    }
  }

  async startMonitoring() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    console.log('Starting Bitcoin Core IBD monitoring');
    
    try {
      // Check IBD status before showing modal
      const initialStatus = await this.checkIBDStatus();
      if (initialStatus.inIBD) {
        console.log('Bitcoin Core is in IBD, showing progress modal');
        this.mainWindow.webContents.send('bitcoin-sync-started');
      }

      while (this.monitoring) {
        try {
          const status = await this.checkIBDStatus();
          
          // Calculate progress based on blocks synced vs total blocks
          const progressPercent = status.headers > 0 
            ? (status.blocks / status.headers) * 100 
            : 0;

          // Log progress every 1000 blocks
          if (status.blocks >= this.lastLoggedBlock + 1000) {
            console.log(`Bitcoin Core synced ${status.blocks}/${status.headers} blocks (${progressPercent.toFixed(2)}%)`);
            this.lastLoggedBlock = status.blocks;
          }

          // Send status update to renderer
          this.mainWindow.webContents.send('bitcoin-sync-status', {
            inProgress: status.inIBD,
            percent: progressPercent,
            currentBlock: status.blocks,
            totalBlocks: status.headers
          });

          // If IBD is complete, stop monitoring
          if (!status.inIBD) {
            console.log('Bitcoin Core IBD complete');
            this.monitoring = false;
            break;
          }

          // Wait before next check
          await new Promise(resolve => setTimeout(resolve, this.pollInterval));
        } catch (error) {
          console.error('Error monitoring Bitcoin Core:', error);
          // Wait before retry on error
          await new Promise(resolve => setTimeout(resolve, this.pollInterval * 2));
        }
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }

    // Send final status update
    this.mainWindow.webContents.send('bitcoin-sync-status', {
      inProgress: false,
      percent: 100,
      currentBlock: this.lastLoggedBlock,
      totalBlocks: this.lastLoggedBlock
    });
  }

  stopMonitoring() {
    this.monitoring = false;
    console.log('Stopping Bitcoin Core IBD monitoring');
  }
}

module.exports = BitcoinMonitor;
