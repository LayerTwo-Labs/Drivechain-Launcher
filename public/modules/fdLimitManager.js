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
   * @returns {object} - Object with success boolean and actual limit set
   */
  setFdLimit(limit) {
    // This only works on macOS with the native module
    if (process.platform === 'darwin' && this.initialized && this.nativeModule) {
      try {
        const result = this.nativeModule.setFileDescriptorLimit(limit);
        
        if (result === 0) { // 0 means success in syscalls
          // Get the actual limit that was set (might be different from requested)
          const actualLimits = this.nativeModule.getFileDescriptorLimit();
          return { 
            success: true, 
            limit: actualLimits.soft 
          };
        }
        
        return { success: false, limit: 0 };
      } catch (error) {
        console.error('Failed to set file descriptor limit:', error);
        return { success: false, limit: 0 };
      }
    }
    
    return { success: false, limit: 0 };
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
          // Use the native module to get the current limit
          const limits = this.nativeModule.getFileDescriptorLimit();
          return limits.soft || -1;
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