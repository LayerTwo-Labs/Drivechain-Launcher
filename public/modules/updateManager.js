const { fetchGithubReleases } = require('./githubReleaseParser');
const axios = require('axios');
const DownloadTimestamps = require('./downloadTimestamps');

class UpdateManager {
  constructor(config, chainManager) {
    this.config = config;
    this.chainManager = chainManager;
    this.timestamps = new DownloadTimestamps();
  }

  async checkLastModified(url, chainId) {
    try {
      // First check if the chain is actually downloaded
      const status = await this.chainManager.getChainStatus(chainId);
      if (status === 'not_downloaded') {
        return false; // Chain isn't downloaded, so no update needed
      }

      const response = await axios.head(url);
      const serverTimestamp = response.headers['last-modified'];
      if (!serverTimestamp) return true; // If no last-modified header, assume update needed
      
      const localTimestamp = this.timestamps.getTimestamp(chainId);
      if (!localTimestamp) return true; // If no local timestamp, assume update needed
      
      // Compare timestamps
      return new Date(serverTimestamp) > new Date(localTimestamp);
    } catch (error) {
      console.error(`Failed to check last-modified for ${chainId}:`, error);
      return false; // On error, assume no update needed
    }
  }

  async checkForUpdates() {
    try {
      const updates = {};
      
      // Check each chain
      for (const chain of this.config.chains) {
        const url = chain.download.urls[process.platform];
        if (!url) continue;

        const needsUpdate = await this.checkLastModified(url, chain.id);
        if (needsUpdate) {
          updates[chain.id] = {
            displayName: chain.display_name,
            has_update: true,
            platforms: {
              [process.platform]: {
                download_url: url
              }
            }
          };
        }
      }

      return {
        success: true,
        updates
      };
    } catch (error) {
      console.error("Failed to check for updates:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = UpdateManager;
