import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Card from './Card';
import DownloadModal from './DownloadModal';
import WalletMessageModal from './WalletMessageModal';
import { updateDownloads, updateIBDStatus } from '../store/downloadSlice';
import { showDownloadModal } from '../store/downloadModalSlice';
import { setChains, updateChainStatus } from '../store/chainsSlice';

function Nodes() {
  const chains = useSelector(state => state.chains);
  const [walletMessage, setWalletMessage] = useState(null);
  const [bitcoinSync, setBitcoinSync] = useState(null);
  const [runningNodes, setRunningNodes] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const dispatch = useDispatch();

  const fetchChains = useCallback(async () => {
    try {
      const config = await window.electronAPI.getConfig();
      const dependencyData = await import('../CardData.json');
      
      const chainsWithStatus = await Promise.all(
        config.chains
          .filter(chain => chain.enabled)
          .map(async chain => {
            const dependencyInfo = dependencyData.default.find(d => d.id === chain.id);
            return {
              ...chain,
              dependencies: dependencyInfo?.dependencies || [],
              status: await window.electronAPI.getChainStatus(chain.id),
              progress: 0,
            };
          })
      );
      dispatch(setChains(chainsWithStatus));
      
      // Initialize running nodes based on initial status
      const initialRunning = chainsWithStatus
        .filter(chain => chain.status === 'running' || chain.status === 'ready')
        .map(chain => chain.id);
      setRunningNodes(initialRunning);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to fetch chain config:', error);
      setIsInitialized(true); // Still set initialized even on error to prevent infinite loading
    }
  }, [dispatch]);

  const downloadsUpdateHandler = useCallback(
    downloads => {
      console.log('Received downloads update:', downloads);
      dispatch(updateDownloads(downloads));
      downloads.forEach(download => {
        dispatch(updateChainStatus({
          chainId: download.chainId,
          status: download.status,
          progress: download.progress
        }));
      });
    },
    [dispatch]
  );

  const chainStatusUpdateHandler = useCallback(({ chainId, status }) => {
    dispatch(updateChainStatus({ chainId, status }));
    
    // Update running nodes list
    if (status === 'running' || status === 'ready') {
      setRunningNodes(prev => [...new Set([...prev, chainId])]);
    } else if (status === 'stopped' || status === 'not_downloaded') {
      setRunningNodes(prev => prev.filter(id => id !== chainId));
    }
  }, [dispatch]);

  const downloadCompleteHandler = useCallback(({ chainId }) => {
    dispatch(updateChainStatus({ 
      chainId, 
      status: 'downloaded', 
      progress: 100 
    }));
  }, [dispatch]);

  useEffect(() => {
    fetchChains();

    const unsubscribeDownloadsUpdate = window.electronAPI.onDownloadsUpdate(
      downloadsUpdateHandler
    );
    const unsubscribeStatus = window.electronAPI.onChainStatusUpdate(
      chainStatusUpdateHandler
    );
    const unsubscribeDownloadComplete = window.electronAPI.onDownloadComplete(
      downloadCompleteHandler
    );
    const unsubscribeBitcoinSync = window.electronAPI.onBitcoinSyncStatus(
      (status) => {
        setBitcoinSync(status);
        // Update IBD status in downloads slice
        dispatch(updateIBDStatus({ chainId: 'bitcoin', status }));
      }
    );

    window.electronAPI.getDownloads().then(downloadsUpdateHandler);

    return () => {
      if (typeof unsubscribeDownloadsUpdate === 'function')
        unsubscribeDownloadsUpdate();
      if (typeof unsubscribeStatus === 'function') unsubscribeStatus();
      if (typeof unsubscribeDownloadComplete === 'function')
        unsubscribeDownloadComplete();
      if (typeof unsubscribeBitcoinSync === 'function')
        unsubscribeBitcoinSync();
    };
  }, [
    fetchChains,
    downloadsUpdateHandler,
    chainStatusUpdateHandler,
    downloadCompleteHandler,
  ]);

  const handleOpenWalletDir = useCallback(async chainId => {
    try {
      const result = await window.electronAPI.openWalletDir(chainId);
      if (!result.success) {
        setWalletMessage({
          error: result.error,
          path: result.path,
          chainName: result.chainName,
        });
      }
    } catch (error) {
      console.error(
        `Failed to open wallet directory for chain ${chainId}:`,
        error
      );
      setWalletMessage({
        error: error.message,
        path: '',
        chainName: '',
      });
    }
  }, []);

  const handleUpdateChain = useCallback((chainId, updates) => {
    dispatch(updateChainStatus({ chainId, ...updates }));
  }, [dispatch]);

  const handleDownloadChain = useCallback(
    async chainId => {
      try {
        console.log(`Attempting to download chain ${chainId}`);
        await window.electronAPI.downloadChain(chainId);
        console.log(`Download initiated for chain ${chainId}`);
        dispatch(showDownloadModal());
      } catch (error) {
        console.error(`Failed to start download for chain ${chainId}:`, error);
      }
    },
    [dispatch]
  );

  const handleStartChain = useCallback(async chainId => {
    try {
      // Find the chain and check its dependencies
      const chain = chains.find(c => c.id === chainId);
      if (!chain) {
        console.error(`Chain ${chainId} not found`);
        return;
      }

      // Check if all dependencies are running
      if (chain.dependencies && chain.dependencies.length > 0) {
        const missingDeps = chain.dependencies.filter(dep => !runningNodes.includes(dep));
        if (missingDeps.length > 0) {
          console.error(`Cannot start ${chainId}: missing dependencies: ${missingDeps.join(', ')}`);
          return;
        }
      }

      await window.electronAPI.startChain(chainId);
      dispatch(updateChainStatus({ chainId, status: 'running' }));
    } catch (error) {
      console.error(`Failed to start chain ${chainId}:`, error);
    }
  }, [chains, runningNodes, dispatch]);

  const handleStopChain = useCallback(async chainId => {
    try {
      await window.electronAPI.stopChain(chainId);
      dispatch(updateChainStatus({ chainId, status: 'stopped' }));
    } catch (error) {
      console.error(`Failed to stop chain ${chainId}:`, error);
    }
  }, [dispatch]);

  const handleResetChain = useCallback(
    async chainId => {
      const chain = chains.find(c => c.id === chainId);
      if (chain.status === 'running') {
        try {
          await handleStopChain(chainId);
        } catch (error) {
          console.error(`Failed to stop chain ${chainId} before reset:`, error);
          return;
        }
      }

      try {
        await window.electronAPI.resetChain(chainId);
      } catch (error) {
        console.error(`Failed to reset chain ${chainId}:`, error);
      }
    },
    [chains, handleStopChain]
  );

  const waitForChainRunning = useCallback((chainId) => {
    return new Promise((resolve) => {
      const checkRunning = () => {
        if (runningNodes.includes(chainId)) {
          resolve();
        } else {
          setTimeout(checkRunning, 500); // Check every 500ms
        }
      };
      checkRunning();
    });
  }, [runningNodes]);

  const isBitcoinStopped = useCallback(() => {
    const bitcoinChain = chains.find(c => c.id === 'bitcoin');
    return bitcoinChain?.status === 'stopped';
  }, [chains]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isStoppingSequence, setIsStoppingSequence] = useState(false);

  const L1_CHAINS = ['bitcoin', 'enforcer', 'bitwindow'];
  const L2_CHAINS = ['thunder', 'bitnames'];

  const areAllChainsRunning = useCallback(() => {
    return L1_CHAINS.every(chain =>
      runningNodes.includes(chain)
    );
  }, [runningNodes]);

  const isAnyL1ChainDownloading = useCallback(() => {
    return L1_CHAINS.some(chainId => {
      const chain = chains.find(c => c.id === chainId);
      return chain && (chain.status === 'downloading' || chain.status === 'extracting');
    });
  }, [chains]);

  const areAllL1ChainsDownloaded = useCallback(() => {
    return L1_CHAINS.every(chainId => {
      const chain = chains.find(c => c.id === chainId);
      return chain && chain.status !== 'not_downloaded';
    });
  }, [chains]);

  const downloadMissingL1Chains = useCallback(async () => {
    try {
      for (const chainId of L1_CHAINS) {
        const chain = chains.find(c => c.id === chainId);
        if (chain && chain.status === 'not_downloaded') {
          await handleDownloadChain(chainId);
        }
      }
    } catch (error) {
      console.error('Failed to download L1 chains:', error);
    }
  }, [chains, handleDownloadChain]);

  const handleStartSequence = useCallback(async () => {
    try {
      setIsProcessing(true);
      setIsStoppingSequence(false);
      
      // Start chains with fixed delays between each
      if (!runningNodes.includes('bitcoin')) {
        await window.electronAPI.startChain('bitcoin');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      if (!runningNodes.includes('enforcer')) {
        await window.electronAPI.startChain('enforcer');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      if (!runningNodes.includes('bitwindow')) {
        await window.electronAPI.startChain('bitwindow');
      }
    } catch (error) {
      console.error('Start sequence failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [runningNodes]);

  // Reset processing state when bitcoin status changes to stopped
  useEffect(() => {
    const bitcoinChain = chains.find(c => c.id === 'bitcoin');
    if (bitcoinChain?.status === 'stopped' && isStoppingSequence) {
      setIsProcessing(false);
      setIsStoppingSequence(false);
    }
  }, [chains]);

  const handleStopSequence = useCallback(async () => {
    try {
      setIsProcessing(true);
      setIsStoppingSequence(true);
      
      // First stop any running L2 chains
      for (const chainId of L2_CHAINS) {
        if (runningNodes.includes(chainId)) {
          await window.electronAPI.stopChain(chainId);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      // Then stop L1 chains in reverse order
      if (runningNodes.includes('bitwindow')) {
        await window.electronAPI.stopChain('bitwindow');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      if (runningNodes.includes('enforcer')) {
        await window.electronAPI.stopChain('enforcer');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      if (runningNodes.includes('bitcoin')) {
        await window.electronAPI.stopChain('bitcoin');
      }
    } catch (error) {
      console.error('Stop sequence failed:', error);
      setIsProcessing(false);
      setIsStoppingSequence(false);
    }
  }, [runningNodes]);

  const handleQuickStartStop = useCallback(async () => {
    try {
      if (!areAllL1ChainsDownloaded()) {
        await downloadMissingL1Chains();
      } else if (!areAllChainsRunning()) {
        await handleStartSequence();
      } else {
        await handleStopSequence();
      }
    } catch (error) {
      console.error('Quick start/stop failed:', error);
    }
  }, [areAllL1ChainsDownloaded, areAllChainsRunning, downloadMissingL1Chains, handleStartSequence, handleStopSequence]);

  return (
    <div className="Nodes">
      <h1>Drivechain Launcher</h1>
      <div className="chain-list">
        <div className="chain-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h2 className="chain-heading" style={{ margin: 0 }}>Layer 1</h2>
            {isInitialized && (
              <button
                onClick={handleQuickStartStop}
                disabled={isProcessing || isAnyL1ChainDownloading()}
                className={`btn ${(!isProcessing && !isAnyL1ChainDownloading() && (!areAllL1ChainsDownloaded() || (!areAllChainsRunning() && areAllL1ChainsDownloaded()))) ? 'btn-shimmer' : ''}`}
                data-state={!isProcessing && !isAnyL1ChainDownloading() && (!areAllL1ChainsDownloaded() ? 'download' : !areAllChainsRunning() ? 'start' : '')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isProcessing || isAnyL1ChainDownloading()
                    ? 'var(--downloading-btn)'  // Orange for processing/downloading
                    : !areAllL1ChainsDownloaded()
                      ? 'var(--download-btn)'  // Blue for download
                      : areAllChainsRunning()
                        ? 'var(--stop-btn)'  // Red for stop
                        : 'var(--run-btn)', // Green for start
                  cursor: (isProcessing || isAnyL1ChainDownloading()) ? 'wait' : 'pointer',
                  opacity: (isProcessing || isAnyL1ChainDownloading()) ? 0.8 : 1,
                  width: 'auto'  // Override fixed width from btn class
                }}
              >
                {isProcessing
                  ? (isStoppingSequence ? 'Stopping...' : 'Starting...')
                  : isAnyL1ChainDownloading()
                    ? 'Downloading...'
                    : !areAllL1ChainsDownloaded() 
                      ? 'Download L1' 
                      : !areAllChainsRunning() 
                        ? 'Quick Start' 
                        : 'Safe Stop'}
              </button>
            )}
          </div>
          <div className="l1-chains">
            {chains
              .filter(chain => chain.chain_type === 0)
              .map(chain => (
                <Card
                  key={chain.id}
                  chain={chain}
                  onUpdateChain={handleUpdateChain}
                  onDownload={handleDownloadChain}
                  onStart={handleStartChain}
                  onStop={handleStopChain}
                  onReset={handleResetChain}
                  onOpenWalletDir={handleOpenWalletDir}
                  runningNodes={runningNodes}
                />
              ))}
          </div>
        </div>
        <div className="chain-section">
          <h2 className="chain-heading">Layer 2</h2>
          <div className="l2-chains">
            {chains
              .filter(chain => chain.chain_type === 2)
              .map(chain => (
                <Card
                  key={chain.id}
                  chain={chain}
                  onUpdateChain={handleUpdateChain}
                  onDownload={handleDownloadChain}
                  onStart={handleStartChain}
                  onStop={handleStopChain}
                  onReset={handleResetChain}
                  onOpenWalletDir={handleOpenWalletDir}
                  runningNodes={runningNodes}
                />
              ))}
          </div>
        </div>
      </div>
      <DownloadModal />
      {walletMessage && (
        <WalletMessageModal
          error={walletMessage.error}
          path={walletMessage.path}
          onClose={() => setWalletMessage(null)}
        />
      )}
    </div>
  );
}

export default Nodes;
