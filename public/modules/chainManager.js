const { app, shell } = require("electron");
const fs = require("fs-extra");
const path = require("path");
const { spawn } = require("child_process");
const BitcoinMonitor = require("./bitcoinMonitor");
const BitWindowClient = require("./bitWindowClient");
const EnforcerClient = require("./enforcerClient");

class ChainManager {
  constructor(mainWindow, config, downloadManager) {
    this.mainWindow = mainWindow;
    this.config = config;
    this.downloadManager = downloadManager;
    this.runningProcesses = {};
    this.chainStatuses = new Map(); // Tracks detailed chain statuses
    this.bitcoinMonitor = new BitcoinMonitor(mainWindow);
    this.readyStates = new Map(); // Tracks when chains are fully ready
    this.bitWindowClient = new BitWindowClient();
    this.logProcesses = new Map(); // Track log streaming processes
    this.processCheckers = new Map(); // Track process check intervals
    this.enforcerClient = new EnforcerClient(); // Connect to enfocer gRPC
  }

  async isChainReady(chainId) {
    const status = this.chainStatuses.get(chainId);
    if (status !== 'running') return false;
    
    if (chainId === 'bitcoin') {
      try {
        await this.bitcoinMonitor.makeRpcCall('getblockchaininfo');
        return true;
      } catch (error) {
        return false;
      }
    }
    
    return true;
  }

  async waitForChainReady(chainId, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await this.isChainReady(chainId)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(`Timeout waiting for ${chainId} to be ready`);
  }

  getChainConfig(chainId) {
    return this.config.chains.find((c) => c.id === chainId);
  }

  getBitcoinArgs() {
    return [
      '-signet',
      '-server',
      '-addnode=172.105.148.135:38333',
      '-signetblocktime=60',
      '-signetchallenge=00141551188e5153533b4fdd555449e640d9cc129456',
      '-acceptnonstdtxn',
      '-listen',
      '-rpcbind=0.0.0.0',
      '-rpcallowip=0.0.0.0/0',
      '-txindex',
      '-fallbackfee=0.00021',
      '-zmqpubsequence=tcp://0.0.0.0:29000',
      '-rpcuser=user',
      '-rpcpassword=password',
      '-rpcport=38332'
    ];
  }

  getChainArgs(chainId) {
    if (chainId === 'bitcoin') {
      return this.getBitcoinArgs();
    }
    if (chainId === 'enforcer') {
      const mnemonicsPath = path.join(app.getPath('userData'), 'wallet_starters', 'mnemonics', 'l1.txt');
      const walletArg = fs.existsSync(mnemonicsPath) 
        ? `--wallet-seed-file=${mnemonicsPath}`
        : '--wallet-auto-create';

      return [
        '--node-rpc-pass=password',
        '--node-rpc-user=user',
        '--node-rpc-addr=127.0.0.1:38332',
        '--node-zmq-addr-sequence=tcp://127.0.0.1:29000',
        '--enable-wallet',
        walletArg
      ];
    }
    return [];
  }

  async startChain(chainId, additionalArgs = []) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const extractDir = chain.extract_dir?.[platform];
    if (!extractDir) throw new Error(`No extract directory configured for platform ${platform}`);

    const downloadsDir = app.getPath("downloads");
    const basePath = path.join(downloadsDir, extractDir);

    // Special handling for BitWindow
    if (chainId === 'bitwindow') {
      try {
        if (platform === 'darwin') {
          // On macOS, launch the .app bundle
          const appBundlePath = path.join(downloadsDir, extractDir, 'BitWindow.app');
          await fs.promises.access(appBundlePath, fs.constants.F_OK);
          console.log(`Starting BitWindow app bundle at: ${appBundlePath}`);
          
          // Launch using 'open' command for snappy startup
          const childProcess = spawn('open', ['-a', appBundlePath], { 
            cwd: path.dirname(appBundlePath) 
          });
          
          // Wait for the app to start
          await new Promise((resolve, reject) => {
            childProcess.on('exit', async (code) => {
              if (code === 0) {
                // Check if BitWindow is actually running using AppleScript
                const checkProcess = spawn('osascript', ['-e', 'tell application "System Events" to count processes whose name is "bitwindow"']);
                const isRunning = await new Promise((resolve) => {
                  checkProcess.stdout.on('data', (data) => {
                    resolve(parseInt(data.toString().trim()) > 0);
                  });
                  checkProcess.on('error', () => resolve(false));
                });
                
                if (isRunning) {
                  // Store process info
                  this.runningProcesses[chainId] = {};
                  
                  // Start process checker
                  const checkInterval = setInterval(async () => {
                    const checkProcess = spawn('osascript', ['-e', 'tell application "System Events" to count processes whose name is "bitwindow"']);
                    const stillRunning = await new Promise((resolve) => {
                      checkProcess.stdout.on('data', (data) => {
                        resolve(parseInt(data.toString().trim()) > 0);
                      });
                      checkProcess.on('error', () => resolve(false));
                    });

                    if (!stillRunning) {
                      // BitWindow was closed
                      clearInterval(this.processCheckers.get(chainId));
                      this.processCheckers.delete(chainId);
                      delete this.runningProcesses[chainId];
                      this.chainStatuses.set(chainId, 'stopped');
                      this.mainWindow.webContents.send("chain-status-update", {
                        chainId,
                        status: "stopped"
                      });
                    }
                  }, 1000);
                  this.processCheckers.set(chainId, checkInterval);
                  
                  resolve();
                } else {
                  reject(new Error('BitWindow failed to start'));
                }
              } else {
                reject(new Error(`Failed to start BitWindow, exit code: ${code}`));
              }
            });
          });
        } else {
          // For other platforms, launch binary directly
          const binaryPath = chain.binary[platform];
          if (!binaryPath) throw new Error(`No binary configured for platform ${platform}`);
          
          const fullBinaryPath = path.join(basePath, binaryPath);
          await fs.promises.access(fullBinaryPath, fs.constants.F_OK);
          
          if (process.platform !== "win32") {
            await fs.promises.chmod(fullBinaryPath, "755");
          }
          
          const childProcess = spawn(fullBinaryPath, [], { cwd: basePath });
          this.runningProcesses[chainId] = childProcess;
          this.setupProcessListeners(childProcess, chainId, basePath);
        }

        this.chainStatuses.set(chainId, 'running');
        this.mainWindow.webContents.send("chain-status-update", {
          chainId,
          status: "running"
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to start BitWindow:", error);
        this.chainStatuses.set(chainId, 'error');
        return { success: false, error: error.message };
      }
    }

    // Standard handling for other chains
    const binaryPath = chain.binary[platform];
    if (!binaryPath) throw new Error(`No binary configured for platform ${platform}`);

    const fullBinaryPath = path.join(basePath, binaryPath);

    try {
      await fs.promises.access(fullBinaryPath, fs.constants.F_OK);

      if (process.platform !== "win32") {
        await fs.promises.chmod(fullBinaryPath, "755");
      }

      const baseArgs = this.getChainArgs(chainId);
      const args = [...baseArgs, ...additionalArgs];
      console.log(`Starting ${chainId} with args:`, args);
      
      const childProcess = spawn(fullBinaryPath, args, { cwd: basePath });
      this.runningProcesses[chainId] = childProcess;
      
      if (chainId !== 'bitcoin') {
        this.chainStatuses.set(chainId, 'running');
        this.mainWindow.webContents.send("chain-status-update", {
          chainId,
          status: "running"
        });
      } else {
        this.chainStatuses.set(chainId, 'starting');
        this.mainWindow.webContents.send("chain-status-update", {
          chainId,
          status: "starting"
        });
      }

      this.setupProcessListeners(childProcess, chainId, basePath);

      return { success: true };
    } catch (error) {
      console.error("Failed to start chain:", error);
      this.chainStatuses.set(chainId, 'error');
      return { success: false, error: error.message };
    }
  }

  setupProcessListeners(childProcess, chainId, basePath) {
    let buffer = '';
    let readyDetected = false;
    let rpcCheckInterval = null;

    const checkBitcoinRPC = async () => {
      if (!readyDetected && chainId === 'bitcoin') {
        try {
          await this.bitcoinMonitor.makeRpcCall('getblockchaininfo');
          readyDetected = true;
          this.chainStatuses.set(chainId, 'running');
          this.mainWindow.webContents.send("chain-status-update", {
            chainId,
            status: "running"
          });
          this.bitcoinMonitor.startMonitoring().catch(error => {
            console.error('Failed to start IBD monitoring:', error);
          });
          if (rpcCheckInterval) {
            clearInterval(rpcCheckInterval);
            rpcCheckInterval = null;
          }
        } catch (error) {
          // Ignore errors - we'll try again
        }
      }
    };

    if (chainId === 'bitcoin') {
      rpcCheckInterval = setInterval(checkBitcoinRPC, 1000);
    }

    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      buffer += output;
      console.log(`[${chainId}] stdout: ${output}`);
      
      if (chainId === 'bitcoin' && !readyDetected) {
        if (buffer.includes('Bound to')) {
          readyDetected = true;
          this.chainStatuses.set(chainId, 'running');
          this.mainWindow.webContents.send("chain-status-update", {
            chainId,
            status: "running"
          });
          this.bitcoinMonitor.startMonitoring().catch(error => {
            console.error('Failed to start IBD monitoring:', error);
          });
          if (rpcCheckInterval) {
            clearInterval(rpcCheckInterval);
            rpcCheckInterval = null;
          }
        }
      }
      
      if (chainId !== 'bitcoin' && !readyDetected) {
        readyDetected = true;
        this.chainStatuses.set(chainId, 'running');
        this.mainWindow.webContents.send("chain-status-update", {
          chainId,
          status: "running"
        });
      }

      this.mainWindow.webContents.send("chain-output", {
        chainId,
        type: 'stdout',
        data: output
      });
      
      this.mainWindow.webContents.send("chain-log", chainId, output);
    });

    childProcess.stderr.on('data', (data) => {
      const output = data.toString();
      buffer += output;
      console.error(`[${chainId}] stderr: ${output}`);
      
      this.mainWindow.webContents.send("chain-output", {
        chainId,
        type: 'stderr',
        data: output
      });
      
      this.mainWindow.webContents.send("chain-log", chainId, output);
    });

    childProcess.on("error", (error) => {
      console.error(`Process for ${chainId} encountered an error:`, error);
      this.chainStatuses.set(chainId, 'error');
      this.mainWindow.webContents.send("chain-status-update", {
        chainId,
        status: "error",
        error: error.message,
      });
    });

    childProcess.on("exit", (code, signal) => {
      console.log(`Process for ${chainId} exited with code ${code} (signal: ${signal})`);
      if (rpcCheckInterval) {
        clearInterval(rpcCheckInterval);
        rpcCheckInterval = null;
      }
      delete this.runningProcesses[chainId];
      this.chainStatuses.set(chainId, 'stopped');
      this.mainWindow.webContents.send("chain-status-update", {
        chainId,
        status: "stopped",
        exitCode: code,
        exitSignal: signal
      });
    });
  }

  async stopChain(chainId) {
    const childProcess = this.runningProcesses[chainId];
    if (!childProcess) {
      return { success: false, error: "Process not found" };
    }

    try {
      // Special handling for BitWindow
      if (chainId === 'bitwindow') {
        try {
          // Update UI to show stopping state
          this.chainStatuses.set(chainId, 'stopping');
          this.mainWindow.webContents.send("chain-status-update", {
            chainId,
            status: "stopping"
          });

          // Kill both processes
          if (process.platform === 'darwin') {
            const killBitWindow = spawn('killall', ['bitwindow']);
            const killBitWindowd = spawn('killall', ['bitwindowd']);
            
            // Wait for both kill commands to complete
            await Promise.all([
              new Promise(resolve => killBitWindow.on('exit', resolve)),
              new Promise(resolve => killBitWindowd.on('exit', resolve))
            ]);

            // Let the process checker detect the stop and update status
            await new Promise(resolve => {
              const maxWaitTime = 5000; // 5 second timeout
              const startTime = Date.now();
              
              const waitInterval = setInterval(() => {
                const checkProcess = spawn('osascript', ['-e', 'tell application "System Events" to count processes whose name is "bitwindow"']);
                checkProcess.stdout.on('data', (data) => {
                  const isRunning = parseInt(data.toString().trim()) > 0;
                  if (!isRunning || Date.now() - startTime > maxWaitTime) {
                    clearInterval(waitInterval);
                    
                    // Now that we confirmed processes are dead, clean up
                    const checkInterval = this.processCheckers.get(chainId);
                    if (checkInterval) {
                      clearInterval(checkInterval);
                      this.processCheckers.delete(chainId);
                    }
                    
                    delete this.runningProcesses[chainId];
                    this.chainStatuses.set(chainId, 'stopped');
                    this.mainWindow.webContents.send("chain-status-update", {
                      chainId,
                      status: "stopped"
                    });
                    
                    resolve();
                  }
                });
              }, 100);
            });
          } else {
            childProcess.kill();
          }
          return { success: true };
        } catch (error) {
          console.error('Failed to stop BitWindow gracefully:', error);
          // Just in case process is still in our tracking
          delete this.runningProcesses[chainId];
          this.chainStatuses.set(chainId, 'stopped');
          return { success: true };
        }
      }

      // For Bitcoin Core, try graceful shutdown first
      if (chainId === 'bitcoin') {
        this.bitcoinMonitor.stopMonitoring();

        const platform = process.platform;
        const chain = this.getChainConfig(chainId);
        if (!chain) throw new Error("Chain not found");
        
        const extractDir = chain.extract_dir?.[platform];
        if (!extractDir) throw new Error(`No extract directory configured for platform ${platform}`);
        
        const downloadsDir = app.getPath("downloads");
        const basePath = path.join(downloadsDir, extractDir);
        const binaryDir = path.dirname(path.join(basePath, chain.binary[platform]));
        const bitcoinCliPath = path.join(binaryDir, platform === 'win32' ? 'bitcoin-cli.exe' : 'bitcoin-cli');
        
        try {
          if (process.platform !== "win32") {
            await fs.promises.chmod(bitcoinCliPath, "755");
          }

          console.log('Attempting graceful shutdown with:', bitcoinCliPath);
          const stopProcess = spawn(bitcoinCliPath, [
            '-signet',
            '-rpcuser=user',
            '-rpcpassword=password',
            '-rpcport=38332',
            'stop'
          ], {
            shell: true
          });

          stopProcess.stderr.on('data', (data) => {
            console.error('bitcoin-cli error:', data.toString());
          });
          stopProcess.stdout.on('data', (data) => {
            console.log('bitcoin-cli output:', data.toString());
          });
          stopProcess.on('error', (error) => {
            console.error('bitcoin-cli spawn error:', error);
          });

          await new Promise((resolve) => stopProcess.on('close', resolve));
          
          await new Promise((resolve) => {
            const checkInterval = setInterval(() => {
              if (!this.runningProcesses[chainId]) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
          });
          
          return { success: true };
        } catch (error) {
          console.warn('Graceful shutdown failed, forcing process termination:', error);
        }
      }
      
      childProcess.kill();
      delete this.runningProcesses[chainId];
      this.chainStatuses.set(chainId, 'stopped');
      return { success: true };
    } catch (error) {
      console.error("Failed to stop chain:", error);
      return { success: false, error: error.message };
    }
  }

  async getChainStatus(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const extractDir = chain.extract_dir?.[platform];
    if (!extractDir) throw new Error(`No extract directory configured for platform ${platform}`);

    const downloadsDir = app.getPath("downloads");

    // Special handling for BitWindow on macOS
    if (chainId === 'bitwindow' && platform === 'darwin') {
      const appBundlePath = path.join(downloadsDir, extractDir, 'BitWindow.app');
      try {
        await fs.promises.access(appBundlePath);
        if (this.runningProcesses[chainId]) {
          return this.chainStatuses.get(chainId) || "running";
        }
        return "stopped";
      } catch (error) {
        return "not_downloaded";
      }
    }

    // Standard handling for other chains
    const binaryPath = chain.binary[platform];
    if (!binaryPath) throw new Error(`No binary configured for platform ${platform}`);

    const basePath = path.join(downloadsDir, extractDir);
    const fullBinaryPath = path.join(basePath, binaryPath);

    try {
      await fs.promises.access(fullBinaryPath);
      if (this.runningProcesses[chainId]) {
        return this.chainStatuses.get(chainId) || "running";
      }
      return "stopped";
    } catch (error) {
      return "not_downloaded";
    }
  }

  async resetChain(chainId) {
    try {
      const chain = this.getChainConfig(chainId);
      if (!chain) throw new Error("Chain not found");

      const platform = process.platform;
      const baseDir = chain.directories.base[platform];
      if (!baseDir) throw new Error(`No base directory configured for platform ${platform}`);

      // Set status to stopped immediately to avoid yellow flash
      this.chainStatuses.set(chainId, 'stopped');
      this.mainWindow.webContents.send("chain-status-update", {
        chainId,
        status: "stopped",
      });

      // Aggressively clean up any active downloads first
      if (this.downloadManager) {
        const platform = process.platform;
        const extractDir = chain.extract_dir?.[platform];
        if (extractDir) {
          const downloadsDir = app.getPath("downloads");
          const extractPath = path.join(downloadsDir, extractDir);
          await this.downloadManager.cleanupChainDownloads(chainId, extractPath);
        }
      }

      // Stop the chain if running
      if (this.runningProcesses[chainId]) {
        await this.stopChain(chainId);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const homeDir = app.getPath("home");
      const fullPath = path.join(homeDir, baseDir);
      await fs.remove(fullPath);
      console.log(`Reset chain ${chainId}: removed data directory ${fullPath}`);

    // Remove extra folders (no OS-specific logic needed)
    if (chain.extra_delete && Array.isArray(chain.extra_delete)) {
      for (const extraFolder of chain.extra_delete) {
        const extraPath = path.join(homeDir, extraFolder);
        if (await fs.pathExists(extraPath)) {
          await fs.remove(extraPath);
          console.log(`Reset chain ${chainId}: removed extra folder ${extraPath}`);
        } else {
          console.log(`Extra folder ${extraPath} does not exist, skipping deletion.`);
        }
      }
    }

      const extractDir = chain.extract_dir?.[platform];
      if (extractDir) {
        const downloadsDir = app.getPath("downloads");
        const binariesPath = path.join(downloadsDir, extractDir);
        await fs.remove(binariesPath);
        console.log(`Reset chain ${chainId}: removed binaries directory ${binariesPath}`);
      }

      await fs.ensureDir(fullPath);
      console.log(`Recreated empty data directory for chain ${chainId}: ${fullPath}`);

      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now set to not_downloaded for final state
      this.chainStatuses.set(chainId, 'not_downloaded');
      this.mainWindow.webContents.send("chain-status-update", {
        chainId,
        status: "not_downloaded",
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to reset chain:", error);
      return { success: false, error: error.message };
    }
  }

  async openDataDir(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const baseDir = chain.directories.base[platform];
    if (!baseDir) throw new Error(`No base directory configured for platform ${platform}`);

    const homeDir = app.getPath("home");
    const fullPath = path.join(homeDir, baseDir);

    try {
      await shell.openPath(fullPath);
      return { success: true };
    } catch (error) {
      console.error("Failed to open data directory:", error);
      return { success: false, error: error.message };
    }
  }

  async openBinaryDir(chainId) {
    try {
      const binaryDir = this.getBinaryDir(chainId);
      await shell.openPath(binaryDir);
      return { success: true };
    } catch (error) {
      console.error("Failed to open binary directory:", error);
      return { success: false, error: error.message };
    }
  }

  getFullDataDir(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");
    
    const platform = process.platform;
    const baseDir = chain.directories.base[platform];
    if (!baseDir) throw new Error(`No base directory configured for platform ${platform}`);
    
    return path.join(app.getPath("home"), baseDir);
  }

  getBinaryDir(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const extractDir = chain.extract_dir?.[platform];
    if (!extractDir) throw new Error(`No extract directory configured for platform ${platform}`);

    const binaryPath = chain.binary[platform];
    if (!binaryPath) throw new Error(`No binary configured for platform ${platform}`);

    const downloadsDir = app.getPath("downloads");
    const basePath = path.join(downloadsDir, extractDir);
    return path.join(basePath, path.dirname(binaryPath));
  }

  async getBitcoinInfo() {
    try {
      const status = await this.bitcoinMonitor.checkIBDStatus();
      return {
        blocks: status.blocks,
        inIBD: status.inIBD
      };
    } catch (error) {
      console.error("Failed to get Bitcoin info:", error);
      return {
        blocks: 0,
        inIBD: false
      };
    }
  }

  async getChainBlockCount(chainId) {
    const status = this.chainStatuses.get(chainId);
    if (status !== 'running') return -1;

    if (chainId === 'bitcoin') {
      try {
        return await this.bitcoinMonitor.makeRpcCall('getblockcount', [], true);
      } catch (error) {
        return -1;
      }
    }
    else
    if (chainId == "enforcer") {
      try {
        return await this.enforcerClient.getBlockCount();
      } catch (error) {
        return -1;
      }
    }

    return -1;
  }

  async resetAllChains() {
    try {
      // First clean up all downloads
      if (this.downloadManager) {
        await this.downloadManager.cleanupAllDownloads();
      }

      // Stop all running chains
      const runningChains = Object.keys(this.runningProcesses);
      for (const chainId of runningChains) {
        await this.stopChain(chainId);
      }
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reset each chain's data
      for (const chain of this.config.chains) {
        const chainId = chain.id;
        const platform = process.platform;
        
        // Remove data directory
        const baseDir = chain.directories.base[platform];
        if (baseDir) {
          const homeDir = app.getPath("home");
          const fullPath = path.join(homeDir, baseDir);
          await fs.remove(fullPath);
          await fs.ensureDir(fullPath);
          console.log(`Reset chain ${chainId}: removed and recreated data directory ${fullPath}`);

        }


        // Remove binaries directory
        const extractDir = chain.extract_dir?.[platform];
        if (extractDir) {
          const downloadsDir = app.getPath("downloads");
          const binariesPath = path.join(downloadsDir, extractDir);
          await fs.remove(binariesPath);
          console.log(`Reset chain ${chainId}: removed binaries directory ${binariesPath}`);
        }

        // Update chain status
        this.chainStatuses.set(chainId, 'not_downloaded');
        this.mainWindow.webContents.send("chain-status-update", {
          chainId,
          status: "not_downloaded",
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to reset all chains:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ChainManager;
