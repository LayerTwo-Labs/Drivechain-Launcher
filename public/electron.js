const { app, BrowserWindow, ipcMain, shell, powerSaveBlocker } = require("electron");
const { execSync } = require('child_process');

// Disable sandbox for Linux
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-setuid-sandbox');
  process.env.ELECTRON_DISABLE_SANDBOX = '1';
}
const path = require("path");
const fs = require("fs-extra");
const isDev = require("electron-is-dev");
const axios = require("axios");
const ConfigManager = require("./modules/configManager");
const ChainManager = require("./modules/chainManager");
const WalletManager = require("./modules/walletManager");
const { FastWithdrawalManager } = require("./modules/fastWithdrawalManager");
const DownloadManager = require("./modules/downloadManager");
const ApiManager = require("./modules/apiManager");
const DirectoryManager = require("./modules/directoryManager");
const UpdateManager = require("./modules/updateManager");

// Increase file descriptor limits
function increaseFileDescriptorLimits() {
  try {
    // Lazy-load the fdLimitManager to avoid circular dependencies
    const fdLimitManager = require('./modules/fdLimitManager');
    
    // For macOS, use the native module
    if (process.platform === 'darwin') {
      // Try to set the soft limit to 1000 without changing hard limit
      const result = fdLimitManager.setFdLimit(1000);
      
      if (result.success) {
        console.log(`Successfully increased file descriptor soft limit to ${result.limit}`);
      } else {
        console.log(`Could not increase file descriptor limit using native module.`);
        console.log(`Child processes will run with default system limits.`);
      }
    } 
    // For Linux, use prlimit to just set the soft limit
    else if (process.platform === 'linux') {
      try {
        const { execSync } = require('child_process');
        // Set only the soft limit, keep hard limit as-is with empty value
        execSync(`prlimit --pid ${process.pid} --nofile=1000:`);
        
        // Verify the limit was set
        const output = execSync(`prlimit --pid ${process.pid} --nofile --raw --noheadings`).toString().trim();
        const [soft] = output.split(/\s+/).map(Number);
        console.log(`Successfully increased file descriptor soft limit to ${soft}`);
      } catch (error) {
        console.error('Failed to set file descriptor limit on Linux:', error);
      }
    }
  } catch (error) {
    // Silent error handling to avoid startup issues
  }
}

const configPath = path.join(__dirname, "chain_config.json");
let config;
let mainWindow = null;
let loadingWindow = null;
let chainManager;
let downloadManager;
let directoryManager;
let apiManager;
let updateManager;
let walletManager;
let fastWithdrawalManager;

async function loadConfig() {
  try {
    const configData = await fs.readFile(configPath, "utf8");
    config = JSON.parse(configData);
  } catch (error) {
    console.error("Failed to load config:", error);
    app.quit();
  }
}

// Track active downloads to manage power save blocking
let activeDownloadCount = 0;
let powerSaveBlockerId = null;

function updatePowerSaveBlocker() {
  if (activeDownloadCount > 0 && !powerSaveBlockerId) {
    // Start power save blocker when downloads are active
    powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
  } else if (activeDownloadCount === 0 && powerSaveBlockerId !== null) {
    // Stop power save blocker when no downloads are active
    powerSaveBlocker.stop(powerSaveBlockerId);
    powerSaveBlockerId = null;
  }
}

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false
  });

  loadingWindow.loadFile('public/loading.html');
  loadingWindow.once('ready-to-show', () => {
    loadingWindow.show();
    loadingWindow.focus();
  });
  loadingWindow.center();
}

function createWindow() {
  if (mainWindow === null) {
    // Create main window completely hidden
    const options = {
      width: 900,
      height: 400,
      show: false,
      frame: true,
      resizable: false,
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, "preload.js"),
        sandbox: false
      }
    };

    if (process.platform === 'linux') {
      options.icon = path.join(__dirname, 'icon/icon.png');
    } else {
      options.icon = path.join(__dirname, '512.png');
    }

    mainWindow = new BrowserWindow(options);

    // Load the URL
    mainWindow.loadURL(
      isDev
        ? "http://localhost:3000"
        : `file://${path.join(__dirname, "../build/index.html")}`
    );

    // Wait for window content to be ready
    mainWindow.once('ready-to-show', () => {
      // Add handler for app ready notification
      ipcMain.handle("notify-ready", () => {
        if (loadingWindow) {
          loadingWindow.destroy();
          loadingWindow = null;
        }
        mainWindow.show();
        mainWindow.focus();
      });
    });

    mainWindow.on('close', (event) => {
      if (!isShuttingDown) {
        event.preventDefault();
        // Check for active downloads before initiating shutdown
        const activeDownloads = downloadManager?.getDownloads() || [];
        if (activeDownloads.length > 0) {
          // Serialize download data to ensure it can be sent through IPC
          const serializedDownloads = activeDownloads.map(download => ({
            chainId: download.chainId,
            progress: download.progress,
            status: download.status,
            downloadedLength: download.downloadedLength,
            totalLength: download.totalLength
          }));
          mainWindow.webContents.send("downloads-in-progress", serializedDownloads);
          return;
        }
        performGracefulShutdown();
      }
    });

    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  }
}

function setupIPCHandlers() {
  // Add handler for update messages from frontend
  ipcMain.on('toMain', (event, data) => {
    switch (data.type) {
      case 'update-status':
        console.log(data.message);
        break;
      case 'update-progress':
        console.log(data.message);
        break;
      case 'update-error':
        console.error(data.message);
        break;
    }
  });

  // API handlers
  ipcMain.handle("list-claims", async () => {
    try {
      const claims = await apiManager.listClaims();
      return { success: true, data: claims };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("submit-claim", async (event, { destination, amount }) => {
    try {
      const result = await apiManager.submitClaim(destination, amount);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Wallet handlers
  ipcMain.handle("get-wallet-dir", async (event, chainId) => {
    try {
      return directoryManager.getWalletDir(chainId);
    } catch (error) {
      console.error("Failed to get wallet directory:", error);
      return null;
    }
  });

  ipcMain.handle("open-wallet-dir", async (event, chainId) => {
    try {
      return await directoryManager.openWalletLocation(chainId);
    } catch (error) {
      console.error("Failed to open wallet directory:", error);
      return { success: false, error: error.message };
    }
  });

  // Directory handlers
  ipcMain.handle("get-full-data-dir", async (event, chainId) => {
    try {
      return directoryManager.getFullDataDir(chainId);
    } catch (error) {
      console.error("Failed to get full data directory:", error);
      throw error;
    }
  });

  ipcMain.handle("open-data-dir", async (event, chainId) => {
    try {
      return await directoryManager.openDataDir(chainId);
    } catch (error) {
      console.error("Failed to open data directory:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-binary-dir", async (event, chainId) => {
    try {
      return chainManager.getBinaryDir(chainId);
    } catch (error) {
      console.error("Failed to get binary directory:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("open-binary-dir", async (event, chainId) => {
    try {
      return await chainManager.openBinaryDir(chainId);
    } catch (error) {
      console.error("Failed to open binary directory:", error);
      return { success: false, error: error.message };
    }
  });

  // Chain handlers
  ipcMain.handle("get-mnemonic-path", async (event, chainId) => {
    try {
      return walletManager.walletService.getMnemonicPath(chainId);
    } catch (error) {
      console.error("Failed to get mnemonic path:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("start-chain", async (event, chainId) => {
    try {
      const chain = config.chains.find(c => c.id === chainId);
      let args = [];
      
      // For all layer 2 chains with a slot number
      if (chain && chain.chain_layer === 2 && chain.slot) {
        // Determine the correct wallet path based on chain configuration
        const baseDir = path.join(
          app.getPath("home"),
          chain.directories.base[process.platform]
        );
        
        // Get the wallet path, which might be a subdirectory or direct file based on chain config
        let walletPath;
        if (chain.directories.wallet) {
          walletPath = path.join(baseDir, chain.directories.wallet);
        } else {
          walletPath = path.join(baseDir, "wallet.mdb");
        }
        
        const walletExists = await fs.pathExists(walletPath);
        console.log(`[${chainId}] Checking wallet at: ${walletPath}`);
        
        if (!walletExists) {
          // Get mnemonic path using slot (not chain ID)
          const mnemonicPath = walletManager.walletService.getMnemonicPath(chain.slot);
          
          if (!mnemonicPath) {
            console.error(`[${chainId}] No mnemonic file found for slot ${chain.slot}`);
          } else {
            args = ['--mnemonic-seed-phrase-path', mnemonicPath];
            console.log(`[${chainId}] First run detected - passing mnemonic arg: ${mnemonicPath}`);
          }
        } else {
          console.log(`[${chainId}] Wallet exists at ${walletPath} - skipping mnemonic arg`);
        }
      }
      
      return await chainManager.startChain(chainId, args);
    } catch (error) {
      console.error("Failed to start chain:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("stop-chain", async (event, chainId) => {
    try {
      console.log(`[${chainId}] Stopping chain...`);
      return await chainManager.stopChain(chainId);
    } catch (error) {
      console.error("Failed to stop chain:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-chain-status", async (event, chainId) => {
    try {
      return await chainManager.getChainStatus(chainId);
    } catch (error) {
      console.error("Failed to get chain status:", error);
      return "error";
    }
  });

  ipcMain.handle("get-chain-block-count", async (event, chainId) => {
    try {
      return await chainManager.getChainBlockCount(chainId);
    } catch (error) {
      console.error("Failed to get chain block count:", error);
      return 0;
    }
  });

  ipcMain.handle("get-bitcoin-info", async () => {
    try {
      const info = await chainManager.getBitcoinInfo();
      return {
        blocks: info.blocks,
        initialblockdownload: info.inIBD
      };
    } catch (error) {
      console.error("Failed to get Bitcoin info:", error);
      return {
        blocks: 0,
        initialblockdownload: false
      };
    }
  });

  ipcMain.handle("reset-chain", async (event, chainId) => {
    try {
      return await chainManager.resetChain(chainId);
    } catch (error) {
      console.error("Failed to reset chain:", error);
      return { success: false, error: error.message };
    }
  });

  // Download handlers
  ipcMain.handle("download-chain", async (event, chainId) => {
    const chain = config.chains.find((c) => c.id === chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const extractDir = chain.extract_dir?.[platform];
    if (!extractDir) throw new Error(`No extract directory configured for platform ${platform}`);

    const downloadsDir = app.getPath("downloads");
    const extractPath = path.join(downloadsDir, extractDir);

    let url;
    if (chain.github?.use_github_releases) {
      // For GitHub-based releases, fetch the latest release to get download URL
      const response = await axios.get(
        `https://api.github.com/repos/${chain.github.owner}/${chain.github.repo}/releases/latest`
      );
      
      const pattern = chain.github.asset_patterns[platform];
      if (!pattern) throw new Error(`No asset pattern found for platform ${platform}`);
      
      const regex = new RegExp(pattern);
      const asset = response.data.assets.find(a => regex.test(a.name));
      if (!asset) throw new Error(`No matching asset found for platform ${platform}`);
      
      url = asset.browser_download_url;
    } else {
      // Traditional releases.drivechain.info approach
      url = chain.download.urls[platform];
      if (!url) throw new Error(`No download URL found for platform ${platform}`);
    }

    await fs.ensureDir(extractPath);
    activeDownloadCount++;
    updatePowerSaveBlocker();
    
    try {
      await downloadManager.startDownload(chainId, url, extractPath);
      return { success: true };
    } catch (error) {
      console.error(`Download failed for ${chainId}:`, error);
      throw error;
    } finally {
      activeDownloadCount--;
      updatePowerSaveBlocker();
    }
  });

  ipcMain.handle("pause-download", async (event, chainId) => {
    return { success: await downloadManager.pauseDownload(chainId) };
  });

  ipcMain.handle("resume-download", async (event, chainId) => {
    return { success: await downloadManager.resumeDownload(chainId) };
  });

  ipcMain.handle("get-downloads", () => {
    return downloadManager.getDownloads();
  });

  // Wallet management handlers
  ipcMain.handle("create-master-wallet", async (event, options) => {
    try {
      const wallet = await walletManager.createMasterWallet(options);
      return { success: true, data: wallet };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("import-master-wallet", async (event, { mnemonic, passphrase }) => {
    try {
      const wallet = await walletManager.importMasterWallet(mnemonic, passphrase);
      return { success: true, data: wallet };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-master-wallet", async () => {
    try {
      const wallet = await walletManager.getMasterWallet();
      return { success: true, data: wallet };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("delete-master-wallet", async () => {
    try {
      const success = await walletManager.deleteMasterWallet();
      return { success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("derive-chain-wallet", async (event, chainId) => {
    try {
      const wallet = await walletManager.deriveChainWallet(chainId);
      return { success: true, data: wallet };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-chain-wallet", async (event, chainId) => {
    try {
      const wallet = await walletManager.getChainWallet(chainId);
      return { success: true, data: wallet };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get wallet starter data
  ipcMain.handle("get-wallet-starter", async (event, type) => {
    try {
      const walletDir = path.join(app.getPath('userData'), 'wallet_starters');
      let filePath;
      
      switch (type) {
        case 'master':
          filePath = path.join(walletDir, 'master_starter.json');
          break;
        case 'layer1':
          filePath = path.join(walletDir, 'l1_starter.json');
          break;
        case 'thunder':
          filePath = path.join(walletDir, 'sidechain_9_starter.json');
          break;
        case 'bitnames':
          filePath = path.join(walletDir, 'sidechain_2_starter.json');
          break;
        case 'zside':
          filePath = path.join(walletDir, 'sidechain_3_starter.json');
          break;
        default:
          throw new Error('Invalid wallet type');
      }

      if (await fs.pathExists(filePath)) {
        const data = await fs.readJson(filePath);
        return { success: true, data: data.mnemonic };
      }
      return { success: false, error: 'Wallet starter not found' };
    } catch (error) {
      console.error('Error reading wallet starter:', error);
      return { success: false, error: error.message };
    }
  });

  // Advanced wallet handlers
  ipcMain.handle("preview-wallet", async (event, options) => {
    try {
      return await walletManager.walletService.previewWallet(options);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("create-advanced-wallet", async (event, options) => {
    try {
      return await walletManager.walletService.createAdvancedWallet(options);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("generate-random-entropy", async () => {
    try {
      return walletManager.walletService.generateRandomEntropy();
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Other handlers
  ipcMain.handle("get-config", async () => {
    return config;
  });

  ipcMain.handle("request-faucet", async (event, amount, address) => {
    try {
      const result = await apiManager.requestFaucet(amount, address);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("check-for-updates", async () => {
    return await updateManager.checkForUpdates();
  });

  ipcMain.handle("apply-updates", async (event, chainIds) => {
    try {
      // First stop any running chains
      for (const chainId of chainIds) {
        const chain = config.chains.find(c => c.id === chainId);
        if (!chain) continue;

        const status = await chainManager.getChainStatus(chainId);
        if (status === 'running' || status === 'ready') {
          console.log(`[Update Status] Stopping ${chain.display_name}...`);
          await chainManager.stopChain(chainId);
        }
      }

      // Delete existing binaries and download updates
      for (const chainId of chainIds) {
        const chain = config.chains.find(c => c.id === chainId);
        if (!chain) continue;

        // Get extract path
        const platform = process.platform;
        const extractDir = chain.extract_dir?.[platform];
        if (!extractDir) continue;

        const downloadsDir = app.getPath("downloads");
        const extractPath = path.join(downloadsDir, extractDir);

        // Delete existing binary directory
        console.log(`[Update Status] Removing old binaries for ${chain.display_name}...`);
        await fs.remove(extractPath);

        // Get download URL based on chain type
        let url;
        if (chain.github?.use_github_releases) {
          // For GitHub-based releases, fetch the latest release to get download URL
          const response = await axios.get(
            `https://api.github.com/repos/${chain.github.owner}/${chain.github.repo}/releases/latest`
          );
          
          const pattern = chain.github.asset_patterns[platform];
          if (!pattern) continue;
          
          const regex = new RegExp(pattern);
          const asset = response.data.assets.find(a => regex.test(a.name));
          if (!asset) continue;
          
          url = asset.browser_download_url;
          // Set timestamp immediately after successful download
          await downloadManager.timestamps.setTimestamp(chainId, new Date().toISOString());
        } else {
          // Traditional releases.drivechain.info approach
          url = chain.download.urls[platform];
          if (!url) continue;
        }

        await fs.ensureDir(extractPath);
        downloadManager.startDownload(chainId, url, extractPath);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to apply updates:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-balance-btc", async (event, options) => {
    try {
      return await fastWithdrawalManager.getBalanceBTC();
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("request-withdrawal", async (event, destination, amount, layer2Chain) => {
    try {
      return await fastWithdrawalManager.requestWithdrawal(destination, amount, layer2Chain);
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  });

  ipcMain.handle("set-fast-withdrawal-server", async (event, serverUrl) => {
    fastWithdrawalManager.setServerUrl(serverUrl);
  });

  ipcMain.handle("notify-payment-complete", async (event, hash, txid) => {
    try {
      return await fastWithdrawalManager.notifyPaymentComplete(hash, txid);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Master wallet directory handler
  ipcMain.handle("open-wallet-starters-dir", async () => {
    try {
      const walletDir = path.join(app.getPath('userData'), 'wallet_starters');
      await fs.ensureDir(walletDir); // Create if doesn't exist
      await shell.openPath(walletDir);
      return { success: true };
    } catch (error) {
      console.error('Failed to open wallet starters directory:', error);
      return { success: false, error: error.message };
    }
  });

  // Wallet directory handlers
  ipcMain.handle("delete-wallet-starters-dir", async () => {
    try {
      const walletDir = path.join(app.getPath('userData'), 'wallet_starters');
      if (await fs.pathExists(walletDir)) {
        await fs.remove(walletDir);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to delete wallet starters directory:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("init-wallet-dirs", async () => {
    try {
      const walletDir = path.join(app.getPath('userData'), 'wallet_starters');
      // Mnemonics are now stored in chain extract directories, not in a subdirectory here
      await fs.ensureDir(walletDir);
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize wallet directories:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('force-kill', () => {
    forceKillAllProcesses();
  });

  // Add handler for force quit with active downloads
  ipcMain.handle('force-quit-with-downloads', async () => {
    try {
      // Cancel all downloads first
      if (downloadManager) {
        const activeDownloads = downloadManager.getDownloads();
        for (const download of activeDownloads) {
          await downloadManager.pauseDownload(download.chainId);
        }
      }
      // Then force quit
      isShuttingDown = true;
      app.exit(0);
    } catch (error) {
      console.error('Error during force quit:', error);
      app.exit(1);
    }
  });
}

async function migrateExistingMnemonics() {
  try {
    console.log("Checking for mnemonic files to migrate...");
    
    const walletStartersDir = path.join(app.getPath('userData'), 'wallet_starters');
    const oldMnemonicsDir = path.join(walletStartersDir, 'mnemonics');
    
    if (!fs.existsSync(oldMnemonicsDir)) {
      console.log("No old mnemonics directory found, skipping migration");
      return;
    }
    
    const files = await fs.readdir(oldMnemonicsDir);
    if (files.length === 0) {
      console.log("No mnemonic files to migrate");
      // Delete empty mnemonics directory
      await fs.remove(oldMnemonicsDir);
      console.log("Removed empty mnemonics directory");
      return;
    }
    
    if (!config || !config.chains || !Array.isArray(config.chains)) {
      console.log("Chain configuration not available, cannot migrate mnemonics yet");
      return;
    }
    
    const platform = process.platform;
    const downloadsDir = app.getPath('downloads');
    
    // Map filenames to their target chain extract directories
    const fileToChainMap = {};
    
    // Map L1 to enforcer
    const enforcerChain = config.chains.find(chain => chain.id === 'enforcer');
    if (enforcerChain && enforcerChain.extract_dir && enforcerChain.extract_dir[platform]) {
      fileToChainMap['l1.txt'] = enforcerChain;
    }
    
    // Map sidechain files to their chains
    for (const chain of config.chains) {
      if (chain.slot) {
        fileToChainMap[`sidechain_${chain.slot}.txt`] = chain;
      }
    }
    
    // Track files that were migrated so we can remove them later
    const migratedFiles = [];
    
    // Migrate files
    for (const file of files) {
      const chain = fileToChainMap[file];
      if (!chain) {
        console.log(`Unknown mnemonic file ${file}, skipping migration`);
        continue;
      }
      
      const extractDir = chain.extract_dir?.[platform];
      if (!extractDir) {
        console.log(`No extract directory configured for ${chain.id} on platform ${platform}, skipping migration of ${file}`);
        continue;
      }
      
      const sourceFile = path.join(oldMnemonicsDir, file);
      const targetExtractDir = path.join(downloadsDir, extractDir);
      
      // Check if the extract directory exists (chain has been downloaded)
      if (!fs.existsSync(targetExtractDir)) {
        console.log(`Extract directory ${targetExtractDir} doesn't exist yet, chain ${chain.id} may not be downloaded, skipping migration of ${file}`);
        continue;
      }
      
      // Create mnemonic directory
      const targetMnemonicDir = path.join(targetExtractDir, 'mnemonic');
      await fs.ensureDir(targetMnemonicDir);
      
      // Use standardized filename
      const targetFile = path.join(targetMnemonicDir, 'mnemonic.txt');
      
      // Skip if target file already exists
      if (fs.existsSync(targetFile)) {
        console.log(`Mnemonic file ${targetFile} already exists, skipping migration`);
        migratedFiles.push(file); // Consider this file migrated
        continue;
      }
      
      // Copy the file
      await fs.copy(sourceFile, targetFile);
      console.log(`Migrated mnemonic file from ${sourceFile} to ${targetFile}`);
      migratedFiles.push(file);
    }
    
    // Clean up old files that were successfully migrated
    for (const file of migratedFiles) {
      await fs.remove(path.join(oldMnemonicsDir, file));
      console.log(`Removed old mnemonic file: ${file}`);
    }
    
    // If all files were migrated, remove the old directory
    const remainingFiles = await fs.readdir(oldMnemonicsDir);
    if (remainingFiles.length === 0) {
      await fs.remove(oldMnemonicsDir);
      console.log(`Deleted empty mnemonics folder: ${oldMnemonicsDir}`);
    } else {
      console.log(`${remainingFiles.length} mnemonic files couldn't be migrated yet, kept in original location`);
    }
    
    console.log("Mnemonic migration completed");
  } catch (error) {
    console.error("Error migrating mnemonics:", error);
  }
}

async function initialize() {
  try {
    await loadConfig();
    
    // Initialize managers that don't depend on mainWindow
    directoryManager = new DirectoryManager(config);
    await directoryManager.setupChainDirectories();
    
    const configManager = new ConfigManager(configPath);
    await configManager.loadConfig();
    await configManager.setupExtractDirectories();
    
    walletManager = new WalletManager(config);
    fastWithdrawalManager = new FastWithdrawalManager();
    apiManager = new ApiManager();
    
    // Create window first
    createWindow();
    
    // Then initialize managers that need mainWindow
    downloadManager = new DownloadManager(mainWindow, config);
    chainManager = new ChainManager(mainWindow, config, downloadManager);
    updateManager = new UpdateManager(config, chainManager);
    
    // Run migration function to handle any existing mnemonics
    await migrateExistingMnemonics();
    
    // Finally setup IPC handlers after everything is initialized
    setupIPCHandlers();
  } catch (error) {
    console.error('Initialization error:', error);
    app.quit();
  }
}

// Disable sandbox
app.commandLine.appendSwitch('no-sandbox');

async function startApp() {
  // Increase file descriptor limits first
  increaseFileDescriptorLimits();
  
  // Show loading window first
  createLoadingWindow();
  
  // Wait a bit to ensure loading window is visible
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Then start initialization
  await initialize();
}

app.whenReady().then(startApp);

let isShuttingDown = false;
let forceKillTimeout;
const SHUTDOWN_TIMEOUT = 10000; // Reduced to 10 seconds

async function performGracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (mainWindow) {
    mainWindow.webContents.send("shutdown-started");
  }

  // Start force kill timeout immediately
  forceKillTimeout = setTimeout(() => {
    console.log("Shutdown timeout reached, forcing quit...");
    forceKillAllProcesses();
  }, SHUTDOWN_TIMEOUT);

  try {
    // Clean up power save blocker if active
    if (powerSaveBlockerId !== null) {
      powerSaveBlocker.stop(powerSaveBlockerId);
      powerSaveBlockerId = null;
    }

    // First handle any active downloads
    if (downloadManager) {
      const activeDownloads = downloadManager.getDownloads();
      for (const download of activeDownloads) {
        try {
          console.log(`Canceling download for ${download.chainId}`);
          await downloadManager.pauseDownload(download.chainId);
        } catch (error) {
          console.error(`Error canceling download for ${download.chainId}:`, error);
        }
      }
    }

    // Then stop running chains with a timeout
    if (chainManager) {
      const runningChains = Object.keys(chainManager.runningProcesses);
      await Promise.race([
        Promise.all(runningChains.map(chainId => 
          chainManager.stopChain(chainId).catch(err => 
            console.error(`Error stopping ${chainId}:`, err)
          )
        )),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout for chain stopping
      ]);
    }

    clearTimeout(forceKillTimeout);
    process.nextTick(() => app.exit(0)); // Force exit on next tick
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    forceKillAllProcesses();
  }
}

function forceKillAllProcesses() {
  // Clean up power save blocker if active
  if (powerSaveBlockerId !== null) {
    try {
      powerSaveBlocker.stop(powerSaveBlockerId);
      powerSaveBlockerId = null;
    } catch (error) {
      console.error("Error stopping power save blocker:", error);
    }
  }

  // First cancel all downloads
  if (downloadManager) {
    const activeDownloads = downloadManager.getDownloads();
    for (const download of activeDownloads) {
      try {
        console.log(`Force canceling download for ${download.chainId}`);
        downloadManager.pauseDownload(download.chainId);
      } catch (error) {
        console.error(`Error force canceling download for ${download.chainId}:`, error);
      }
    }
  }

  // Then kill chain processes
  if (chainManager) {
    Object.entries(chainManager.runningProcesses).forEach(([chainId, process]) => {
      try {
        if (process.kill) {
          console.log(`Force killing process for ${chainId}`);
          process.kill('SIGKILL');
        }
      } catch (error) {
        console.error(`Error force killing ${chainId}:`, error);
      }
    });
  }
  
  if (forceKillTimeout) {
    clearTimeout(forceKillTimeout);
  }

  // Force exit the app
  process.nextTick(() => {
    try {
      // On Linux/Windows, ensure all child processes are terminated
      if (process.platform !== 'darwin') {
        process.kill(-process.pid, 'SIGKILL');
      }
      app.exit(0);
    } catch (error) {
      console.error("Error during force exit:", error);
      process.exit(1);
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    performGracefulShutdown();
  }
});

app.on('before-quit', (event) => {
  if (!isShuttingDown) {
    event.preventDefault();
    performGracefulShutdown();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
