const { app } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const { mkdirAll } = require("./files");

class ConfigManager {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = null;
  }

  async loadConfig() {
    try {
      const configData = await fs.readFile(this.configPath, "utf8");
      this.config = JSON.parse(configData);
      return this.config;
    } catch (error) {
      console.error("Failed to load config:", error);
      throw error;
    }
  }

  getConfig() {
    return this.config;
  }

  async setupChainDirectories() {
    if (!this.config) {
      throw new Error("Config not loaded. Call loadConfig() first.");
    }

    console.log("Checking chain base directories...");
    const platform = process.platform;
    const homeDir = app.getPath("home");
    let directoriesCreated = 0;

    for (const chain of this.config.chains) {
      if (!chain.directories?.base) {
        console.warn(`No directories configuration found for chain ${chain.id}`);
        continue;
      }

      const baseDir = chain.directories.base[platform];
      if (!baseDir) {
        console.warn(`No base directory configured for chain ${chain.id} on platform ${platform}`);
        continue;
      }

      if (typeof baseDir !== "string") {
        console.warn(`Invalid base directory for chain ${chain.id}: expected string, got ${typeof baseDir}`);
        continue;
      }

      try {
        const fullPath = path.join(homeDir, baseDir);
        const created = await mkdirAll(fullPath);
        if (created) {
          directoriesCreated++;
          console.log(`Created base directory for ${chain.id}: ${fullPath}`);
        }
      } catch (error) {
        console.error(`Failed to create directory for chain ${chain.id}:`, error);
      }
    }

    if (directoriesCreated === 0) {
      console.log("All chain directories already exist. No new directories were created.");
    } else {
      console.log(`Created ${directoriesCreated} new chain directories.`);
    }

    return directoriesCreated;
  }

  getChainBasePath(chainId) {
    if (!this.config) {
      throw new Error("Config not loaded. Call loadConfig() first.");
    }

    const chain = this.config.chains.find(c => c.id === chainId);
    if (!chain) {
      throw new Error(`Chain not found: ${chainId}`);
    }

    const platform = process.platform;
    const baseDir = chain.directories?.base?.[platform];
    if (!baseDir) {
      throw new Error(`No base directory configured for chain ${chainId} on platform ${platform}`);
    }

    return path.join(app.getPath("home"), baseDir);
  }

  getChainExtractPath(chainId) {
    if (!this.config) {
      throw new Error("Config not loaded. Call loadConfig() first.");
    }

    const chain = this.config.chains.find(c => c.id === chainId);
    if (!chain) {
      throw new Error(`Chain not found: ${chainId}`);
    }

    const platform = process.platform;
    const extractDir = chain.extract_dir?.[platform];
    if (!extractDir) {
      throw new Error(`No extract directory configured for chain ${chainId} on platform ${platform}`);
    }

    return path.join(app.getPath("downloads"), extractDir);
  }

  async setupExtractDirectories() {
    if (!this.config) {
      throw new Error("Config not loaded. Call loadConfig() first.");
    }

    console.log("Checking chain extract directories...");
    const platform = process.platform;
    const downloadsDir = app.getPath("downloads");
    let directoriesCreated = 0;

    for (const chain of this.config.chains) {
      if (!chain.extract_dir) {
        console.warn(`No extract directory configuration found for chain ${chain.id}`);
        continue;
      }

      const extractDir = chain.extract_dir[platform];
      if (!extractDir) {
        console.warn(`No extract directory configured for chain ${chain.id} on platform ${platform}`);
        continue;
      }

      if (typeof extractDir !== "string") {
        console.warn(`Invalid extract directory for chain ${chain.id}: expected string, got ${typeof extractDir}`);
        continue;
      }

      try {
        const fullPath = path.join(downloadsDir, extractDir);
        const created = await mkdirAll(fullPath);
        if (created) {
          directoriesCreated++;
          console.log(`Created extract directory for ${chain.id}: ${fullPath}`);
        }
      } catch (error) {
        console.error(`Failed to create extract directory for chain ${chain.id}:`, error);
      }
    }

    if (directoriesCreated === 0) {
      console.log("All chain extract directories already exist. No new directories were created.");
    } else {
      console.log(`Created ${directoriesCreated} new chain extract directories.`);
    }

    return directoriesCreated;
  }
}

module.exports = ConfigManager;
