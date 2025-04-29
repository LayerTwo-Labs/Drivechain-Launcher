const { app, shell } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const WalletService = require("./walletService");
const { EventEmitter } = require('events');

class WalletManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.walletService = new WalletService();
    
    // Listen for wallet updates
    this.walletService.on('wallet-updated', () => {
      this.emit('wallet-updated');
    });
  }

  // HD Wallet Management Methods
  async createMasterWallet(options = {}) {
    try {
      await this.walletService.ensureDirs();

      // Generate and save master wallet
      const wallet = await this.walletService.generateWallet(options);
      const success = await this.walletService.saveWallet(wallet);
      if (!success) throw new Error('Failed to save master wallet');

      // Generate all chain starters immediately
      try {
        await this.walletService.generateAllStarters();
      } catch (error) {
        console.error('Error generating chain starters:', error);
        // Don't throw here - master wallet was created successfully
      }

      return wallet;
    } catch (error) {
      console.error('Error creating master wallet:', error);
      throw error;
    }
  }

  async importMasterWallet(mnemonic, passphrase) {
    try {
      const wallet = await this.walletService.generateWallet({
        customMnemonic: mnemonic,
        passphrase
      });
      const success = await this.walletService.saveWallet(wallet);
      if (!success) throw new Error('Failed to save imported wallet');

      // Generate all chain starters immediately
      try {
        await this.walletService.generateAllStarters();
      } catch (error) {
        console.error('Error generating chain starters:', error);
        // Don't throw here - master wallet was imported successfully
      }

      return wallet;
    } catch (error) {
      console.error('Error importing master wallet:', error);
      throw error;
    }
  }

  async getMasterWallet() {
    return await this.walletService.loadWallet();
  }

  async deleteMasterWallet() {
    return await this.walletService.deleteWallet();
  }

  // Chain-specific Wallet Methods
  async deriveChainWallet(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error('Chain not found');

    try {
      // For L1 chain
      if (chain.chain_layer === 1) {
        return await this.walletService.deriveL1Starter();
      }
      // For sidechains
      else {
        return await this.walletService.deriveSidechainStarter(chain.id);
      }
    } catch (error) {
      console.error(`Error deriving wallet for chain ${chainId}:`, error);
      throw error;
    }
  }

  async getChainWallet(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error('Chain not found');

    try {
      const walletDir = this.walletService.walletDir;
      const walletPath = chain.chain_layer === 1 
        ? path.join(walletDir, 'l1_starter.json')
        : path.join(walletDir, `sidechain_${chainId}_starter.json`);

      if (await fileExists(walletPath)) {
        return await fs.readFile(walletPath, 'utf8').then(JSON.parse);
      }
      return null;
    } catch (error) {
      console.error(`Error loading wallet for chain ${chainId}:`, error);
      return null;
    }
  }


  getChainConfig(chainId) {
    return this.config.chains.find((c) => c.id === chainId);
  }

  getWalletDir(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const baseDir = chain.directories.base[platform];
    if (!baseDir) throw new Error(`No base directory configured for platform ${platform}`);

    const walletPath = chain.directories.wallet;
    if (!walletPath) return null;

    return path.join(app.getPath("home"), baseDir, walletPath);
  }

  async analyzeWalletPath(fullPath) {
    try {
      const stats = await fs.stat(fullPath);
      return {
        exists: true,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
      };
    } catch (error) {
      return { exists: false, isDirectory: false, isFile: false };
    }
  }

  async getOpenablePath(fullPath) {
    const analysis = await this.analyzeWalletPath(fullPath);
    if (analysis.exists && analysis.isDirectory) {
      return fullPath;
    } else if (analysis.exists && analysis.isFile) {
      return path.dirname(fullPath);
    } else {
      // If path doesn't exist, return the nearest existing parent directory
      let currentPath = fullPath;
      while (currentPath !== path.parse(currentPath).root) {
        currentPath = path.dirname(currentPath);
        const parentAnalysis = await this.analyzeWalletPath(currentPath);
        if (parentAnalysis.exists && parentAnalysis.isDirectory) {
          return currentPath;
        }
      }
      throw new Error("No valid parent directory found");
    }
  }

  async openWalletLocation(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const baseDir = chain.directories.base[platform];
    if (!baseDir) throw new Error(`No base directory configured for platform ${platform}`);

    const walletPath = chain.directories.wallet;
    const fullPath = walletPath ? 
      path.join(app.getPath("home"), baseDir, walletPath) :
      path.join(app.getPath("home"), baseDir);

    const analysis = await this.analyzeWalletPath(fullPath);

    if (analysis.exists) {
      if (analysis.isDirectory) {
        await shell.openPath(fullPath);
        return {
          success: true,
          openedPath: fullPath,
        };
      } else {
        // If it's a file, open its containing directory
        const dirPath = path.dirname(fullPath);
        await shell.openPath(dirPath);
        return {
          success: true,
          openedPath: dirPath,
        };
      }
    } else {
      // If the exact path doesn't exist, don't open anything
      return {
        success: false,
        error: "Wallet directory not found",
        path: fullPath,
        chainName: chain.display_name,
      };
    }
  }
}

module.exports = WalletManager;