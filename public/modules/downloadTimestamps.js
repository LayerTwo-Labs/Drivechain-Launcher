const { app } = require('electron');
const fs = require('fs'); // NO promises here, need explicit sync
const path = require('path');

class DownloadTimestamps {
  constructor() {
    if (DownloadTimestamps.instance) {
      return DownloadTimestamps.instance;
    }
    this.timestampsPath = path.join(app.getPath('userData'), 'downloads.json');
    this.timestamps = this.loadTimestamps();
    DownloadTimestamps.instance = this;
  }

  static getInstance() {
    if (!DownloadTimestamps.instance) {
      DownloadTimestamps.instance = new DownloadTimestamps();
    }
    return DownloadTimestamps.instance;
  }

  loadTimestamps() {
    try {
      if (fs.existsSync(this.timestampsPath)) {
        return JSON.parse(fs.readFileSync(this.timestampsPath, 'utf8'));
      }
      this.timestamps = {};  // Reset cached timestamps when file doesn't exist
      return {};
    } catch (error) {
      console.error('Failed to load timestamps:', error);
      return {};
    }
  }

  saveTimestamps() {
    try {
      fs.writeFileSync(this.timestampsPath, JSON.stringify(this.timestamps, null, 2));
      // Reload timestamps after saving to ensxdgure in-memory state matches disk
      this.timestamps = this.loadTimestamps();
    } catch (error) {
      console.error('Failed to save timestamps:', error);
    }
  }

  setTimestamp(chainId, timestamp = new Date(2020, 0, 1).toISOString()) {
    this.timestamps[chainId] = timestamp;
    this.saveTimestamps();
  }

  getTimestamp(chainId) {
    return this.timestamps[chainId];
  }
}

// Export the singleton instance getter
module.exports = DownloadTimestamps.getInstance;
