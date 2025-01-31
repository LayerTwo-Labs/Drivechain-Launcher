import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import ChainSettingsModal from './ChainSettingsModal';
import './StatusLight.css';
import ForceStopModal from './ForceStopModal';
import SettingsIcon from './SettingsIcon';
import Tooltip from './Tooltip';

const Card = ({
  chain,
  onUpdateChain,
  onDownload,
  onStart,
  onStop,
  onOpenWalletDir,
  onReset,
  runningNodes,
}) => {
  const { isDarkMode } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [showForceStop, setShowForceStop] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [fullChainData, setFullChainData] = useState(chain);
  const [lastActionTime, setLastActionTime] = useState(0);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [processHealth, setProcessHealth] = useState('offline'); // 'healthy', 'warning', 'error', 'offline'
  const [blockCount, setBlockCount] = useState(-1);
  const buttonRef = useRef(null);

  // Periodic chain status / health check
  useEffect(() => {
    const fetchBlockCount = async () => {
      try {
        const count = await window.electronAPI.getChainBlockCount(chain.id);
        console.log("new count: ", count)
        setBlockCount(count);
      } catch (error) {
        setBlockCount(-1)
        console.error('Failed to fetch block count:', error);
      }
    };

    // Initial fetch
    fetchBlockCount();

    const interval = setInterval(() => {
      fetchBlockCount();

      if (chain.status === 'stopping' || chain.status === 'stopped') {
        setProcessHealth('offline');
      } 
      else 
      if (blockCount === -1) {
          setProcessHealth('offline');
      }
      else 
      if (blockCount === 0) {
          setProcessHealth('warning');
      }
      else
      if (blockCount > 0) {
          setProcessHealth('healthy');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [chain.id, chain.status, blockCount]);

  const checkDependencies = () => {
    if (!chain.dependencies || chain.dependencies.length === 0) return true;
    return chain.dependencies.every(dep => runningNodes.includes(dep));
  };

  const checkReverseDependencies = () => {
    // Get all chains that depend on this chain
    const dependentChains = runningNodes.filter(nodeId => {
      const chainData = window.cardData.find(c => c.id === nodeId);
      return chainData?.dependencies?.includes(chain.id);
    });
    return dependentChains.length === 0;
  };

  const getMissingDependencies = () => {
    if (!chain.dependencies) return [];
    return chain.dependencies.filter(dep => !runningNodes.includes(dep));
  };

  const getRunningDependents = () => {
    return runningNodes.filter(nodeId => {
      const chainData = window.cardData.find(c => c.id === nodeId);
      return chainData?.dependencies?.includes(chain.id);
    });
  };

  const getTooltipText = () => {
    // Check for missing dependencies when starting
    if (chain.status === 'downloaded' || chain.status === 'stopped') {
      const missing = getMissingDependencies();
      if (missing.length > 0) {
        const missingNames = missing.map(id => {
          const depName = id.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          return depName;
        });
        return `Required dependencies not running:\n${missingNames.join('\n')}`;
      }
    }
    
    // Check for running dependents when stopping
    if (chain.status === 'running' || chain.status === 'starting' || chain.status === 'ready') {
      const dependents = getRunningDependents();
      if (dependents.length > 0) {
        const dependentNames = dependents.map(id => {
          const depName = id.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          return depName;
        });
        return `Cannot stop: Following chains depend on this:\n${dependentNames.join('\n')}`;
      }
    }
    
    return '';
  };

  const handleAction = async (event) => {
    // Add cooldown period of 2 seconds between actions
    const now = Date.now();
    if (now - lastActionTime < 2000) {
      console.log('Action blocked: cooldown period');
      return;
    }
    setLastActionTime(now);

    // Check dependencies before starting
    if ((chain.status === 'downloaded' || chain.status === 'stopped') && !checkDependencies()) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
      setTooltipVisible(true);
      return;
    }

    switch (chain.status) {
      case 'not_downloaded':
        try {
          console.log(`Initiating download for chain ${chain.id}`);
          await onDownload(chain.id);
        } catch (error) {
          console.error('Download failed:', error);
          onUpdateChain(chain.id, { status: 'not_downloaded', progress: 0 });
        }
        break;
      case 'downloaded':
      case 'stopped':
        try {
          console.log(`Starting chain ${chain.id}`);
          await onStart(chain.id);
        } catch (error) {
          console.error('Start failed:', error);
        }
        break;
      case 'running':
      case 'starting':
      case 'ready':
        try {
          // Check for running dependent chains
          if (!checkReverseDependencies()) {
            setShowForceStop(true);
            return;
          }
          
          console.log(`Stopping chain ${chain.id}`);
          // Update UI immediately to show stopping state
          onUpdateChain(chain.id, { status: 'stopping' });
          setProcessHealth('offline');
          await onStop(chain.id);
        } catch (error) {
          console.error('Stop failed:', error);
          // Revert to running state if stop fails
          onUpdateChain(chain.id, { status: 'running' });
        }
        break;
    }
  };

  const handleForceStop = async () => {
    try {
      console.log(`Force stopping chain ${chain.id}`);
      onUpdateChain(chain.id, { status: 'stopping' });
      await onStop(chain.id);
    } catch (error) {
      console.error('Force stop failed:', error);
      onUpdateChain(chain.id, { status: 'running' });
    } finally {
      setShowForceStop(false);
    }
  };

  const handleOpenSettings = useCallback(async () => {
    try {
      const fullDataDir = await window.electronAPI.getFullDataDir(chain.id);
      const walletDir = await window.electronAPI.getWalletDir(chain.id);
      const binaryDir = await window.electronAPI.getBinaryDir(chain.id);
      setFullChainData({
        ...chain,
        dataDir: fullDataDir,
        walletDir: walletDir,
        binaryDir: binaryDir,
      });
      setShowSettings(true);
    } catch (error) {
      console.error('Failed to fetch directories:', error);
    }
  }, [chain]);

  const handleOpenDataDir = async chainId => {
    try {
      await window.electronAPI.openDataDir(chainId);
    } catch (error) {
      console.error('Failed to open data directory:', error);
    }
  };

  const getButtonClass = () => {
    switch (chain.status) {
      case 'not_downloaded':
        return 'download';
      case 'downloading':
      case 'extracting':
        return 'downloading';
      case 'downloaded':
      case 'stopped':
        return 'run';
      case 'stopping':
        return 'stopping';
      case 'running':
      case 'starting':
      case 'ready':
        return isHovered ? 'stop' : 'running';
      default:
        return '';
    }
  };

  const getButtonText = () => {
    switch (chain.status) {
      case 'not_downloaded':
        return 'Download';
      case 'downloading':
        return 'Downloading';
      case 'extracting':
        return 'Extracting';
      case 'downloaded':
      case 'stopped':
        return 'Start';
      case 'stopping':
        return 'Stopping...';
      case 'running':
      case 'starting':
      case 'ready':
        if (!isHovered) return 'Running';
        return 'Stop';
      default:
        return '';
    }
  };

  // Hide tooltip when mouse leaves button
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTooltipVisible(false);
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '300px' }}>
        <div className={`card ${isDarkMode ? 'dark' : 'light'}`}>
          <div className="card-header">
            <h2>{chain.display_name}</h2>
          </div>
          <div className="card-content">
            <p>{chain.description}</p>
          </div>
          <div className="card-actions">
            <button
              ref={buttonRef}
              className={`btn ${getButtonClass()}`}
              onClick={handleAction}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={handleMouseLeave}
              disabled={
                chain.status === 'downloading' || 
                chain.status === 'extracting' ||
                chain.status === 'stopping'
              }
              id={`download-button-${chain.id}`}
            >
              {getButtonText()}
            </button>
            <button className="settings-icon-button" onClick={handleOpenSettings} aria-label="Chain Settings">
              <SettingsIcon />
            </button>
          </div>
          <Tooltip 
            text={getTooltipText()}
            visible={tooltipVisible}
            position={tooltipPosition}
          />
        </div>
      </div>
      {showSettings && (
        <ChainSettingsModal
          chain={fullChainData}
          onClose={() => setShowSettings(false)}
          onOpenDataDir={handleOpenDataDir}
          onOpenWalletDir={onOpenWalletDir}
          onReset={onReset}
        />
      )}
      {showForceStop && (
        <ForceStopModal
          chainName={chain.display_name}
          onConfirm={handleForceStop}
          onClose={() => setShowForceStop(false)}
          dependentChains={getRunningDependents().map(id => {
            const chainData = window.cardData.find(c => c.id === id);
            return chainData?.display_name || id;
          })}
        />
      )}
    </>
  );
};

export default Card;