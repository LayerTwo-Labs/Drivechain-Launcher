const path = require('path');
const fs = require('fs-extra');
const os = require('os');

// Get the app data directory based on platform
function getAppDataPath() {
  switch (process.platform) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', 'Electron');
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Roaming', 'Electron');
    case 'linux':
      return path.join(os.homedir(), '.config', 'electron');
    default:
      return path.join(os.homedir(), '.electron');
  }
}

async function setOldTimestamps() {
  try {
    // Read chain config
    const configPath = path.join(__dirname, "..", "chain_config.json");
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    
    // Create downloads.json with old timestamps
    const timestamps = {};
    for (const chain of config.chains) {
      timestamps[chain.id] = "2020-01-01T00:00:00.000Z";
    }
    
    // Write to downloads.json in app data directory
    const downloadsPath = path.join(getAppDataPath(), 'downloads.json');
    await fs.ensureDir(path.dirname(downloadsPath));
    await fs.writeJson(downloadsPath, timestamps, { spaces: 2 });
    
    console.log('All chain timestamps set to 2020-01-01');
    console.log('Timestamps file:', downloadsPath);
  } catch (error) {
    console.error('Failed to set timestamps:', error);
  }
}

setOldTimestamps();
