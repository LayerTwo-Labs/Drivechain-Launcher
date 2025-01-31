const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  receive: (channel, callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  getConfig: () => ipcRenderer.invoke("get-config"),
  downloadChain: (chainId) => ipcRenderer.invoke("download-chain", chainId),
  startChain: (chainId, args) => ipcRenderer.invoke("start-chain", chainId, args),
  getMnemonicPath: (chainId) => ipcRenderer.invoke("get-mnemonic-path", chainId),
  stopChain: (chainId) => ipcRenderer.invoke("stop-chain", chainId),
  getChainStatus: (chainId) => ipcRenderer.invoke("get-chain-status", chainId),
  getChainBlockCount: (chainId) => ipcRenderer.invoke("get-chain-block-count", chainId),
  openDataDir: (chainId) => ipcRenderer.invoke("open-data-dir", chainId),
  getFullDataDir: (chainId) => ipcRenderer.invoke("get-full-data-dir", chainId),
  getWalletDir: (chainId) => ipcRenderer.invoke("get-wallet-dir", chainId),
  openWalletDir: (chainId) => ipcRenderer.invoke("open-wallet-dir", chainId),
  getBinaryDir: (chainId) => ipcRenderer.invoke("get-binary-dir", chainId),
  openBinaryDir: (chainId) => ipcRenderer.invoke("open-binary-dir", chainId),
  getDownloads: () => ipcRenderer.invoke("get-downloads"),
  pauseDownload: (chainId) => ipcRenderer.invoke("pause-download", chainId),
  resumeDownload: (chainId) => ipcRenderer.invoke("resume-download", chainId),
  requestFaucet: (amount, address) =>
    ipcRenderer.invoke("request-faucet", amount, address),
  listClaims: () => ipcRenderer.invoke("list-claims"),
  submitClaim: (destination, amount) =>
    ipcRenderer.invoke("submit-claim", { destination, amount }),
  sendMessage: (channel, data) => {
    let validChannels = ["toMain"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receiveMessage: (channel, func) => {
    let validChannels = ["fromMain"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  resetChain: (chainId) => ipcRenderer.invoke("reset-chain", chainId),
  onChainStatusUpdate: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on("chain-status-update", subscription);
    return () => {
      ipcRenderer.removeListener("chain-status-update", subscription);
    };
  },
  onDownloadsUpdate: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on("downloads-update", subscription);
    return () => {
      ipcRenderer.removeListener("downloads-update", subscription);
    };
  },
  onDownloadComplete: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on("download-complete", subscription);
    return () => {
      ipcRenderer.removeListener("download-complete", subscription);
    };
  },
  onDownloadStarted: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on("download-started", subscription);
    return () => {
      ipcRenderer.removeListener("download-started", subscription);
    };
  },
  onBitcoinSyncStatus: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on("bitcoin-sync-status", subscription);
    return () => {
      ipcRenderer.removeListener("bitcoin-sync-status", subscription);
    };
  },
  onBitcoinSyncStarted: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on("bitcoin-sync-started", subscription);
    return () => {
      ipcRenderer.removeListener("bitcoin-sync-started", subscription);
    };
  },
  waitForChain: (chainId) => ipcRenderer.invoke("wait-for-chain", chainId),
  
  // Wallet Methods
  createMasterWallet: (options) => ipcRenderer.invoke("create-master-wallet", options),
  importMasterWallet: (mnemonic, passphrase) => 
    ipcRenderer.invoke("import-master-wallet", { mnemonic, passphrase }),
  getMasterWallet: () => ipcRenderer.invoke("get-master-wallet"),
  deleteMasterWallet: () => ipcRenderer.invoke("delete-master-wallet"),
  deriveChainWallet: (chainId) => ipcRenderer.invoke("derive-chain-wallet", chainId),
  getChainWallet: (chainId) => ipcRenderer.invoke("get-chain-wallet", chainId),
  
  // Advanced Wallet Methods
  previewWallet: (options) => ipcRenderer.invoke("preview-wallet", options),
  createAdvancedWallet: (options) => ipcRenderer.invoke("create-advanced-wallet", options),
  generateRandomEntropy: () => ipcRenderer.invoke("generate-random-entropy"),
  
  // Wallet Events
  onWalletUpdate: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on("wallet-updated", subscription);
    return () => {
      ipcRenderer.removeListener("wallet-updated", subscription);
    };
  },

  // Fast withdrawal methods
  getBalanceBTC: () => ipcRenderer.invoke("get-balance-btc"),
  requestWithdrawal: (destination, amount, layer2Chain) => 
    ipcRenderer.invoke("request-withdrawal", destination, amount, layer2Chain),
  notifyPaymentComplete: (hash, txid) =>
    ipcRenderer.invoke("notify-payment-complete", hash, txid),

  // Shutdown handlers
  onShutdownStarted: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on("shutdown-started", subscription);
    return () => {
      ipcRenderer.removeListener("shutdown-started", subscription);
    };
  },
  forceKill: () => ipcRenderer.invoke("force-kill"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),

  // Chain logs
  onChainLog: (chainId, callback) => {
    const subscription = (event, id, log) => {
      if (id === chainId) {
        callback(log);
      }
    };
    ipcRenderer.on("chain-log", subscription);
    return () => {
      ipcRenderer.removeListener("chain-log", subscription);
    };
  },
});

console.log("Preload script has run");
