import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Card from './Card';
import styles from './QuickStartStop.module.css';
import UnreleasedCard from './UnreleasedCard';
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

  // Initialize running nodes based on current chain statuses
  useEffect(() => {
    const initialRunning = chains
      .filter(chain => chain.status === 'running' || chain.status === 'ready')
      .map(chain => chain.id);
    setRunningNodes(initialRunning);
    setIsInitialized(true);
  }, [chains]);

  const downloadsUpdateHandler = useCallback(
    downloads => {
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
    downloadsUpdateHandler,
    chainStatusUpdateHandler,
    downloadCompleteHandler,
    dispatch
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
        await window.electronAPI.downloadChain(chainId);
        dispatch(showDownloadModal());
      } catch (error) {
        console.error(`Failed to start download for chain ${chainId}`);
      }
    },
    [dispatch]
  );

  const handleStartChain = useCallback(async chainId => {
    try {
      const chain = chains.find(c => c.id === chainId);
      if (!chain) return;

      if (chain.dependencies?.length > 0) {
        const missingDeps = chain.dependencies.filter(dep => !runningNodes.includes(dep));
        if (missingDeps.length > 0) return;
      }

      await window.electronAPI.startChain(chainId);
      dispatch(updateChainStatus({ chainId, status: 'running' }));
    } catch (error) {
      console.error(`Failed to start chain ${chainId}`);
    }
  }, [chains, runningNodes, dispatch]);

  const handleStopChain = useCallback(async chainId => {
    try {
      await window.electronAPI.stopChain(chainId);
      dispatch(updateChainStatus({ chainId, status: 'stopped' }));
    } catch (error) {
      console.error(`Failed to stop chain ${chainId}`);
    }
  }, [dispatch]);

  const handleResetChain = useCallback(
    async chainId => {
      const chain = chains.find(c => c.id === chainId);
      if (chain.status === 'running') {
        try {
          await handleStopChain(chainId);
        } catch (error) {
          return;
        }
      }

      try {
        await window.electronAPI.resetChain(chainId);
      } catch (error) {
        console.error(`Failed to reset chain ${chainId}`);
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
          setTimeout(checkRunning, 500);
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
      console.error('Failed to download L1 chains');
    }
  }, [chains, handleDownloadChain]);

  const handleStartSequence = useCallback(async () => {
    try {
      setIsProcessing(true);
      setIsStoppingSequence(false);
      
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
      console.error('Start sequence failed');
    } finally {
      setIsProcessing(false);
    }
  }, [runningNodes]);

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
      
      for (const chainId of L2_CHAINS) {
        if (runningNodes.includes(chainId)) {
          await window.electronAPI.stopChain(chainId);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
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
      console.error('Stop sequence failed');
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
      console.error('Quick start/stop failed');
    }
  }, [areAllL1ChainsDownloaded, areAllChainsRunning, downloadMissingL1Chains, handleStartSequence, handleStopSequence]);

  return (
    <div className="Nodes">
      <div className="chain-list">
        <div className="chain-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h2 className="chain-heading" style={{ margin: 0 }}>Layer 1</h2>
            {isInitialized && (
              <button
                onClick={handleQuickStartStop}
                disabled={isProcessing || isAnyL1ChainDownloading()}
                className={`btn quick-start-stop-btn ${(!isProcessing && !isAnyL1ChainDownloading() && (!areAllL1ChainsDownloaded() || (!areAllChainsRunning() && areAllL1ChainsDownloaded()))) ? styles['btn-shimmer'] : ''}`}
                data-state={!isProcessing && !isAnyL1ChainDownloading() && (!areAllL1ChainsDownloaded() ? 'download' : !areAllChainsRunning() ? 'start' : '')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isProcessing || isAnyL1ChainDownloading()
                    ? 'var(--downloading-btn)'
                    : !areAllL1ChainsDownloaded()
                      ? 'var(--download-btn)'
                      : areAllChainsRunning()
                        ? 'var(--stop-btn)'
                        : 'var(--run-btn)',
                  cursor: (isProcessing || isAnyL1ChainDownloading()) ? 'wait' : 'pointer',
                  opacity: (isProcessing || isAnyL1ChainDownloading()) ? 0.8 : 1,
                  width: 'auto',
                  transition: 'background-color 0.2s ease',
                  ':hover': {
                    backgroundColor: isProcessing || isAnyL1ChainDownloading()
                      ? 'var(--downloading-btn-hover)'
                      : !areAllL1ChainsDownloaded()
                        ? 'var(--download-btn-hover)'
                        : areAllChainsRunning()
                          ? 'var(--stop-btn-hover)'
                          : 'var(--run-btn-hover)'
                  }
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
              .map(chain => 
                chain.released === "no" ? (
                  <UnreleasedCard
                    key={chain.id}
                    chain={chain}
                  />
                ) : (
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
                )
              )}
          </div>
        </div>
        <div className="chain-section" style={{ marginBottom: '0' }}>
          <h2 className="chain-heading" style={{ marginBottom: '10px' }}>Layer 2</h2>
          <div className="l2-chains" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', width: '100%', marginBottom: '-10px' }}>
            {chains
              .filter(chain => chain.chain_type === 2)
              .map(chain => (
                <div key={chain.id} style={{ width: 'calc(50% - 10px)' }}>
                  {chain.released === "no" ? (
                    <UnreleasedCard chain={chain} />
                  ) : (
                    <Card
                      chain={chain}
                      onUpdateChain={handleUpdateChain}
                      onDownload={handleDownloadChain}
                      onStart={handleStartChain}
                      onStop={handleStopChain}
                      onReset={handleResetChain}
                      onOpenWalletDir={handleOpenWalletDir}
                      runningNodes={runningNodes}
                    />
                  )}
                </div>
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
