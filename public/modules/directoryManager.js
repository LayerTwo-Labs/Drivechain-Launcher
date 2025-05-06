const { app } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const shell = require("electron").shell;
const { mkdirAll } = require("./files");

class DirectoryManager {
  constructor(config) {
    this.config = config;
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
        const dirPath = path.dirname(fullPath);
        await shell.openPath(dirPath);
        return {
          success: true,
          openedPath: dirPath,
        };
      }
    } else {
      return {
        success: false,
        error: "Wallet directory not found",
        path: fullPath,
        chainName: chain.display_name,
      };
    }
  }

  async setupChainDirectories() {
    console.log("Checking chain base directories...");
    const platform = process.platform;
    const homeDir = app.getPath("home");
    let directoriesCreated = 0;

    for (const chain of this.config.chains) {
      const baseDir = chain.directories.base[platform];
      if (baseDir && typeof baseDir === "string") {
        const fullBasePath = path.join(homeDir, baseDir);
        const created = await mkdirAll(fullBasePath);
        if (created) {
          directoriesCreated++;
          console.log(`Created base directory for ${chain.id}: ${fullBasePath}`);
        }
      } else {
        console.warn(
          `No valid base directory specified for ${chain.id} on ${platform}`
        );
      }
    }

    if (directoriesCreated === 0) {
      console.log(
        "All chain directories already exist. No new directories were created."
      );
    }
  }

  getChainConfig(chainId) {
    return this.config.chains.find((c) => c.id === chainId);
  }

  getWalletDir(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");

    const platform = process.platform;
    const walletPath = chain.directories.wallet;
    const baseDir = chain.directories.base[platform];
    
    if (!baseDir) throw new Error(`No base directory configured for platform ${platform}`);
    
    // If no wallet path is configured, return null
    if (!walletPath) return null;
    
    return path.join(app.getPath("home"), baseDir, walletPath);
  }

  getFullDataDir(chainId) {
    const chain = this.getChainConfig(chainId);
    if (!chain) throw new Error("Chain not found");
    const platform = process.platform;
    const baseDir = chain.directories.base[platform];
    return path.join(app.getPath("home"), baseDir);
  }

  async openDataDir(chainId) {
    try {
      const fullPath = this.getFullDataDir(chainId);
      await shell.openPath(fullPath);
      return { success: true };
    } catch (error) {
      console.error("Failed to open data directory:", error);
      throw error;
    }
  }
}

module.exports = DirectoryManager;
