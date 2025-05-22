const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');

class FdLimitManager {
  constructor() {
    this.initialized = false;
    this.nativeModule = null;
    
    // Only try to load native module on macOS
    if (process.platform === 'darwin') {
      try {
        // Path to where the binary would be after building
        const modulePath = path.join(__dirname, 'build/Release/set_limits.node');
        
        // Check if the module exists
        if (fs.existsSync(modulePath)) {
          this.nativeModule = require(modulePath);
          this.initialized = true;
          console.log('Successfully loaded native setrlimit module');
        } else {
          console.error('Native module not found, perhaps it needs to be built');
        }
      } catch (error) {
        console.error('Failed to load native module:', error);
      }
    }
  }
  
  /**
   * Set file descriptor limits for the current process
   * @param {number} limit - The limit to set
   * @returns {boolean} - Whether the operation was successful
   */
  setFdLimit(limit) {
    if (process.platform === 'darwin') {
      if (this.initialized && this.nativeModule) {
        try {
          const result = this.nativeModule.setFileDescriptorLimit(limit);
          return result === 0; // 0 means success in syscalls
        } catch (error) {
          console.error('Failed to set file descriptor limit:', error);
          return false;
        }
      }
      return false;
    } 
    else if (process.platform === 'linux') {
      try {
        execSync(`prlimit --pid ${process.pid} --nofile=${limit}:${limit}`);
        return true;
      } catch (error) {
        console.error('Failed to set file descriptor limit on Linux:', error);
        return false;
      }
    }
    
    // On Windows, no special handling needed
    return true;
  }
  
  /**
   * Get the current file descriptor limit
   * @returns {number} - The current limit or -1 if unknown
   */
  getCurrentLimit() {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      try {
        const output = execSync('ulimit -n').toString().trim();
        return parseInt(output, 10) || -1;
      } catch (error) {
        console.error('Failed to get current file descriptor limit:', error);
      }
    }
    return -1;
  }
}

module.exports = new FdLimitManager(); 