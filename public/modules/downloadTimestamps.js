const { app } = require('electron');
const fs = require('fs-extra');
const path = require('path');

class DownloadTimestamps {
  constructor() {
    this.timestampsPath = path.join(app.getPath('userData'), 'downloads.json');
    this.timestamps = this.loadTimestamps();
  }

  loadTimestamps() {
    try {
      if (fs.existsSync(this.timestampsPath)) {
        return JSON.parse(fs.readFileSync(this.timestampsPath, 'utf8'));
      }
      return {};
    } catch (error) {
      console.error('Failed to load timestamps:', error);
      return {};
    }
  }

  saveTimestamps() {
    try {
      fs.writeFileSync(this.timestampsPath, JSON.stringify(this.timestamps, null, 2));
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

module.exports = DownloadTimestamps;
