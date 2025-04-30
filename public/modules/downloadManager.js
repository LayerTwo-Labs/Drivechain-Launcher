const { app } = require("electron");
const { EventEmitter } = require('events');
const fs = require("fs/promises");
const { createReadStream, createWriteStream } = require('fs');
const path = require("path");
const axios = require("axios");
const AdmZip = require("adm-zip");
const tar = require("tar");
const { pipeline } = require('stream/promises');
const getDownloadTimestamps = require('./downloadTimestamps');
const { removePath } = require("./files");

class DownloadManager extends EventEmitter {
  constructor(mainWindow, config) {
    super();
    this.mainWindow = mainWindow;
    this.config = config;
    this.activeDownloads = new Map();
    this.pausedDownloads = new Map();
    this.timestamps = getDownloadTimestamps();
    this.extractionQueue = [];
    this.isExtracting = false;
  }

  async processExtractionQueue() {
    if (this.isExtracting || this.extractionQueue.length === 0) return;
    
    this.isExtracting = true;
    const { chainId, zipPath, basePath, resolve, reject } = this.extractionQueue[0];

    try {
      if (process.platform === 'darwin' && chainId === 'bitwindow') {
        await this.extractMacOSApp(chainId, zipPath, basePath);
      } else {
        const zip = new AdmZip(zipPath);
        await new Promise((res, rej) => {
          zip.extractAllToAsync(basePath, true, (error) => {
            if (error) {
              console.error(`Extraction error for ${chainId}: ${error.message}`);
              rej(error);
            } else {
              res();
            }
          });
        });
      }
      resolve();
    } catch (error) {
      console.error(`Error in extractZip for ${chainId}: ${error.message}`);
      reject(error);
    } finally {
      this.extractionQueue.shift();
      this.isExtracting = false;
      this.processExtractionQueue();
    }
  }

  async extractMacOSApp(chainId, zipPath, basePath) {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const ditto = spawn('ditto', ['-xk', zipPath, basePath]);
      
      ditto.stderr.on('data', (data) => {
        console.error(`Ditto stderr: ${data}`);
      });

      ditto.on('close', (code) => {
        if (code === 0) {
          const appPath = path.join(basePath, 'bitwindow.app');
          spawn('chmod', ['-R', '+x', appPath])
            .on('close', (chmodCode) => {
              if (chmodCode === 0) {
                resolve();
              } else {
                reject(new Error(`Failed to set permissions: ${chmodCode}`));
              }
            });
        } else {
          reject(new Error(`Ditto extraction failed with code: ${code}`));
        }
      });

      ditto.on('error', (error) => {
        reject(new Error(`Ditto error: ${error.message}`));
      });
    });
  }

  startDownload(chainId, url, basePath) {
    if (this.activeDownloads.has(chainId) || this.pausedDownloads.has(chainId))
      return;

    this.activeDownloads.set(chainId, {
      progress: 0,
      status: "downloading",
      downloadedLength: 0,
      totalLength: 0,
    });
    this.mainWindow.webContents.send("download-started", { chainId });

    console.log(`[${chainId}] Downloading and extracting`);
    this.downloadAndExtract(chainId, url, basePath);

    console.log(`[${chainId}] Sending downloads update`);
    this.sendDownloadsUpdate();
  }

  getFileExtension(url) {
    const fileName = url.split('/').pop();
    if (fileName.endsWith('.tar.gz')) return '.tar.gz';
    if (fileName.endsWith('.zip')) return '.zip';
    return '.zip';
  }

  async downloadAndExtract(chainId, url, basePath) {
    const chain = this.config.chains.find(c => c.id === chainId);
    const isDirectBinary = chain?.direct_binary === true;
    const fileExt = isDirectBinary ? '' : this.getFileExtension(url);
    const fileName = url.split('/').pop();
    const tempPath = path.join(basePath, `temp_${chainId}${fileExt}`);
    const finalPath = path.join(basePath, fileName);

    console.log(`[${chainId}] Attempting download:`);
    console.log(`[${chainId}] Base path: ${basePath}`);
    console.log(`[${chainId}] Temp path: ${tempPath}`);
    console.log(`[${chainId}] Final path: ${finalPath}`);

    try {
      await this.downloadFile(chainId, url, tempPath);
      
      // Force progress to 100%
      const download = this.activeDownloads.get(chainId);
      if (download) {
        download.progress = 100;
        if (!isDirectBinary) {
          download.status = "extracting";
        }
        this.sendDownloadsUpdate();
      }
      
      if (isDirectBinary) {
        // For direct binary, just move to final location and make executable
        await fs.rename(tempPath, finalPath);
        
        console.log(`[${chainId}] Downloaded direct binary to: ${finalPath}`);
        if (process.platform !== 'win32') {
          await fs.chmod(finalPath, 0o755);
          console.log(`[${chainId}] Made binary executable`);
        }
      } else {
        // For archives, extract as usual
        if (fileExt === '.tar.gz') {
          console.log(`[${chainId}] Extracting tar.gz file`);
          await this.extractTarGz(chainId, tempPath, basePath);
        } else {
          console.log(`[${chainId}] Extracting zip file`);
          await this.extractZip(chainId, tempPath, basePath);
        }
        console.log(`[${chainId}] Deleting temp file: ${tempPath}`);
        await fs.unlink(tempPath);
      }

      // Save download timestamp
      this.timestamps.setTimestamp(chainId, new Date().toISOString());
      
      this.activeDownloads.delete(chainId);
      this.sendDownloadsUpdate();
      this.mainWindow.webContents.send("download-complete", { chainId });
      this.emit('download-complete', chainId);
    } catch (error) {
      // Don't report cancellation errors during reset
      if (!axios.isCancel(error) || error.message !== 'Reset chain requested') {
        console.error(`Error processing ${chainId}:`, error);
        this.mainWindow.webContents.send("download-error", {
          chainId,
          error: error.message,
          stack: error.stack,
        });
      }

      // Clean up regardless of error type
      this.activeDownloads.delete(chainId);
      this.pausedDownloads.delete(chainId);
      this.sendDownloadsUpdate();

      try {
        await fs.unlink(tempPath);
      } catch (unlinkError) {
        console.error(`Failed to delete partial download for ${chainId}:`, unlinkError);
      }
    }
  }

  async extractTarGz(chainId, tarPath, basePath) {
    try {
      await pipeline(
        createReadStream(tarPath),
        tar.x({
          cwd: basePath,
          strip: 0
        })
      );
    } catch (error) {
      console.error(`Error in extractTarGz for ${chainId}: ${error.message}`);
      throw error;
    }
  }

  async downloadFile(chainId, url, zipPath) {
    return new Promise(async (resolve, reject) => {
      const download = this.activeDownloads.get(chainId) || {
        progress: 0,
        downloadedLength: 0,
      };
      this.activeDownloads.set(chainId, download);

      const writer = createWriteStream(zipPath, { flags: "a" });
      let downloadedLength = download.downloadedLength || 0;

      try {
        const cancelSource = axios.CancelToken.source();
        download.cancelSource = cancelSource;
        download.writer = writer; // Store writer reference for cleanup

        // Configure axios with timeout and keepalive
        const { data, headers } = await axios({
          timeout: 30000, // 30 second timeout
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          httpAgent: new (require('http').Agent)({ keepAlive: true }),
          httpsAgent: new (require('https').Agent)({ keepAlive: true }),
          method: "GET",
          url: url,
          responseType: "stream",
          headers: downloadedLength > 0 ? { Range: `bytes=${downloadedLength}-` } : {},
          cancelToken: cancelSource.token,
        });

        const totalLength = parseInt(headers["content-length"], 10) + downloadedLength;
        download.totalLength = totalLength;
        this.sendDownloadsUpdate();

        data.pipe(writer);

        let accumulatedLength = 0;
        const updateInterval = 250; // 250ms = 4 updates per second
        let lastUpdate = Date.now();

        data.on("data", (chunk) => {
          downloadedLength += chunk.length;
          accumulatedLength += chunk.length;
          
          const now = Date.now();
          if (now - lastUpdate >= updateInterval) {
            const progress = (downloadedLength / totalLength) * 100;
            this.updateDownloadProgress(chainId, progress, downloadedLength);
            lastUpdate = now;
            accumulatedLength = 0;
          }

          if (this.pausedDownloads.has(chainId)) {
            data.pause();
            writer.end();
          }
        });

        data.on("error", async (error) => {
          writer.end();
          reject(error);
        });

        writer.on("error", async (error) => {
          reject(error);
        });

        writer.on("close", () => {
          // Force final progress update to 100% before resolving
          this.updateDownloadProgress(chainId, 100, downloadedLength);
          resolve();
        });
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("Download canceled:", error.message);
          resolve();
        } else {
          reject(error);
        }
      }
    });
  }

  async extractZip(chainId, zipPath, basePath) {
    return new Promise((resolve, reject) => {
      this.extractionQueue.push({ chainId, zipPath, basePath, resolve, reject });
      this.processExtractionQueue();
    });
  }

  async pauseDownload(chainId) {
    const download = this.activeDownloads.get(chainId);
    if (download) {
      if (download.cancelSource) {
        download.cancelSource.cancel("Download paused");
      }
      this.pausedDownloads.set(chainId, download);
      this.activeDownloads.delete(chainId);
      this.updateDownloadProgress(chainId, download.progress, download.downloadedLength, "paused");
      return true;
    }
    return false;
  }

  async resumeDownload(chainId) {
    const download = this.pausedDownloads.get(chainId);
    if (download) {
      this.activeDownloads.set(chainId, download);
      this.pausedDownloads.delete(chainId);
      this.updateDownloadProgress(chainId, download.progress, download.downloadedLength, "downloading");
      return true;
    }
    return false;
  }

  updateDownloadProgress(chainId, progress, downloadedLength, status = "downloading") {
    const download = this.activeDownloads.get(chainId) || this.pausedDownloads.get(chainId);
    if (download) {
      // If status is extracting, always keep progress at 100%
      download.progress = status === "extracting" ? 100 : progress;
      download.status = status;
      download.downloadedLength = downloadedLength;
      
      // Force update for extraction state or throttle for normal progress
      if (status === "extracting") {
        this.sendDownloadsUpdate();
      } else {
        // Throttle progress updates to max 4 times per second per download
        const now = Date.now();
        if (!download.lastUpdate || now - download.lastUpdate >= 250) {
          download.lastUpdate = now;
          this.sendDownloadsUpdate();
        }
      }
    }
  }

  sendDownloadsUpdate() {
    if (this.mainWindow) {
      try {
        // Ensure we only send serializable data
        const downloadsArray = [...this.activeDownloads.entries(), ...this.pausedDownloads.entries()]
          .map(([chainId, download]) => {
            // Extract only the serializable properties we need
            const serializedDownload = {
              chainId,
              displayName: this.config.chains.find(c => c.id === chainId)?.display_name || chainId,
              progress: download.progress || 0,
              status: download.status || 'unknown',
              downloadedLength: typeof download.downloadedLength === 'number' ? download.downloadedLength : 0,
              totalLength: typeof download.totalLength === 'number' ? download.totalLength : 0,
              retryCount: download.retryCount || 0
            };
            
            // Ensure all numeric values are finite
            if (!Number.isFinite(serializedDownload.progress)) {
              serializedDownload.progress = 0;
            }
            if (!Number.isFinite(serializedDownload.downloadedLength)) {
              serializedDownload.downloadedLength = 0;
            }
            if (!Number.isFinite(serializedDownload.totalLength)) {
              serializedDownload.totalLength = 0;
            }
            
            return serializedDownload;
          });
        
        // Wrap IPC send in try-catch to handle potential window destruction
        try {
          if (!this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send("downloads-update", downloadsArray);
          }
        } catch (error) {
          console.error("Failed to send downloads update:", error);
        }
      } catch (error) {
        console.error("Error preparing downloads update:", error);
      }
    }
  }

  getDownloads() {
    return [...this.activeDownloads.entries(), ...this.pausedDownloads.entries()]
      .map(([chainId, download]) => ({
        chainId,
        progress: download.progress || 0,
        status: download.status || 'unknown',
        downloadedLength: typeof download.downloadedLength === 'number' ? download.downloadedLength : 0,
        totalLength: typeof download.totalLength === 'number' ? download.totalLength : 0,
        retryCount: download.retryCount || 0
      }));
  }

  async cleanupChainDownloads(chainId, basePath) {
    // Cancel any active downloads
    const download = this.activeDownloads.get(chainId) || this.pausedDownloads.get(chainId);
    if (download && download.cancelSource) {
      // Force cancel the download and prevent retries
      download.cancelSource.cancel('Reset chain requested');
      download.writer?.end?.();
    }

    // Immediately remove from tracking maps to prevent any retry attempts
    this.activeDownloads.delete(chainId);
    this.pausedDownloads.delete(chainId);

    // Force a small delay to ensure cancellation is processed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Clean up any temp files that might exist
    try {
      const tempFiles = [
        path.join(basePath, `temp_${chainId}.zip`),
        path.join(basePath, `temp_${chainId}.tar.gz`)
      ];

      for (const tempFile of tempFiles) {
        try {
          await removePath(tempFile);
        } catch (err) {
          // Ignore errors for individual temp files
          console.log(`Could not remove temp file ${tempFile}:`, err.message);
        }
      }
    } catch (err) {
      console.error(`Error cleaning up downloads for ${chainId}:`, err);
    }

    // Force UI update
    this.sendDownloadsUpdate();
  }

  async cleanupAllDownloads() {
    // Get all chains with active or paused downloads
    const activeChains = [...this.activeDownloads.keys(), ...this.pausedDownloads.keys()];
    
    for (const chainId of activeChains) {
      const chain = this.config.chains.find(c => c.id === chainId);
      if (!chain) continue;

      const platform = process.platform;
      const extractDir = chain.extract_dir?.[platform];
      if (!extractDir) continue;

      const downloadsDir = app.getPath("downloads");
      const extractPath = path.join(downloadsDir, extractDir);

      await this.cleanupChainDownloads(chainId, extractPath);
    }

    // Double check all maps are cleared
    this.activeDownloads.clear();
    this.pausedDownloads.clear();
    this.sendDownloadsUpdate();
  }
}

module.exports = DownloadManager;
