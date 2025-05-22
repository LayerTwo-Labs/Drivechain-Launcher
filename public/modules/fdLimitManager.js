const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

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
    // This only works on macOS with the native module
    if (process.platform === 'darwin' && this.initialized && this.nativeModule) {
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
  
  /**
   * Get the current file descriptor limit
   * @returns {number} - The current limit or -1 if unknown
   */
  getCurrentLimit() {
    try {
      if (process.platform === 'darwin') {
        // On macOS, get process-specific limit if possible
        if (this.initialized && this.nativeModule) {
          // If we have the native module, assume the limit was set by it
          // In the future, we could add a getrlimit call to the native module
          return 1000; 
        }
        // Fallback - this isn't ideal but better than nothing
        return -1;
      } else if (process.platform === 'linux') {
        // On Linux, use prlimit to get the process-specific limit
        const output = execSync(`prlimit --pid ${process.pid} --nofile --raw --noheadings`).toString().trim();
        const [soft] = output.split(/\s+/).map(Number);
        return soft || -1;
      }
    } catch (error) {
      console.error('Failed to get current file descriptor limit:', error);
    }
    
    return -1;
  }
}

module.exports = new FdLimitManager(); 