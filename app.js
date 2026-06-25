/* ==========================================================================
   STELLAR JOURNEY TO MASTERY - WEB3 INTERACTION SCRIPT
   ========================================================================== */

// --- Network Configuration Mapping ---
const NETWORKS = {
  '0x1': { name: 'Ethereum Mainnet', color: '#00b894' },
  '0x5': { name: 'Goerli Testnet', color: '#e17055' },
  '0xaa36a7': { name: 'Sepolia Testnet', color: '#e84393' },
  '0x89': { name: 'Polygon Mainnet', color: '#6c5ce7' },
  '0x13881': { name: 'Mumbai Testnet', color: '#a29bfe' },
  '0xa4b1': { name: 'Arbitrum One', color: '#0984e3' },
  '0xa': { name: 'Optimism', color: '#ff7675' },
  '0x38': { name: 'BNB Smart Chain', color: '#fdcb6e' },
  '0x539': { name: 'Hardhat Local', color: '#ffeaa7' },
  '0x7a69': { name: 'Anvil Local', color: '#ffeaa7' }
};

// --- Application State ---
let appState = {
  isConnected: false,
  address: '',
  balance: 0.0,
  networkName: 'Unknown',
  networkColor: '#b2bec3',
  chainId: '',
  isSimulationActive: false
};

// --- DOM Elements ---
const elements = {
  // Navigation
  connectBtnNav: document.getElementById('connect-btn-nav'),
  walletBadgeNav: document.getElementById('wallet-badge-nav'),
  walletAddressNav: document.getElementById('wallet-address-nav'),
  walletNetworkNav: document.getElementById('wallet-network-nav'),
  
  // Views
  unconnectedView: document.getElementById('unconnected-view'),
  connectedView: document.getElementById('connected-view'),
  
  // Connect Hero
  connectBtnHero: document.getElementById('connect-btn-hero'),
  
  // Credentials Card
  infoNetwork: document.getElementById('info-network'),
  infoNetworkDot: document.getElementById('info-network-dot'),
  infoAddress: document.getElementById('info-address'),
  copyAddressBtn: document.getElementById('copy-address-btn'),
  
  // Balance Card
  infoBalance: document.getElementById('info-balance'),
  balanceUnit: document.getElementById('balance-unit'),
  fuelPercentage: document.getElementById('fuel-percentage'),
  fuelBarInner: document.getElementById('fuel-bar-inner'),
  
  // Missions Card
  missionFuelStatus: document.getElementById('mission-fuel-status'),
  missionJumpItem: document.getElementById('mission-jump-item'),
  missionJumpCheckbox: document.getElementById('mission-jump-checkbox'),
  missionJumpStatus: document.getElementById('mission-jump-status'),
  
  // Disconnect Buttons
  disconnectBtnTop: document.getElementById('disconnect-btn-top'),
  disconnectBtnMain: document.getElementById('disconnect-btn-main'),
  
  // Warning Modal
  noWalletModal: document.getElementById('no-wallet-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  modalCloseAction: document.getElementById('modal-close-action'),
  
  // Toast container
  toastContainer: document.getElementById('toast-container')
};

// --- Initial Setup & Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  setupInteractiveCards();
  checkMetaMaskStatus();
  registerButtonHandlers();
});

// --- Mouse-move glow card effect ---
function setupInteractiveCards() {
  const cards = document.querySelectorAll('.card, .feature-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

// --- Check MetaMask Status ---
async function checkMetaMaskStatus() {
  if (typeof window.ethereum !== 'undefined') {
    // Register chain and accounts event listeners
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    
    // Check if we already have authorized access
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        // Automatically initialize connection
        initializeConnection(accounts[0]);
      }
    } catch (err) {
      console.error("Error checking silent connection", err);
    }
  }
}

// --- Register Button Click Handlers ---
function registerButtonHandlers() {
  // Connect wallet button triggers
  elements.connectBtnNav.addEventListener('click', handleConnectWallet);
  elements.connectBtnHero.addEventListener('click', handleConnectWallet);
  
  // Disconnect wallet button triggers
  elements.disconnectBtnTop.addEventListener('click', handleDisconnect);
  elements.disconnectBtnMain.addEventListener('click', handleDisconnect);
  
  // Copy address to clipboard
  elements.copyAddressBtn.addEventListener('click', handleCopyAddress);
  
  // Modal handlers
  elements.closeModalBtn.addEventListener('click', hideNoWalletModal);
  elements.modalCloseAction.addEventListener('click', hideNoWalletModal);
  
  // Close modal when clicking background overlay
  elements.noWalletModal.addEventListener('click', (e) => {
    if (e.target === elements.noWalletModal) hideNoWalletModal();
  });
}

// --- Handle Connect Action ---
async function handleConnectWallet() {
  // 1. Check if MetaMask is installed
  if (typeof window.ethereum === 'undefined') {
    showNoWalletModal();
    return;
  }
  
  try {
    showToast("Initializing telemetry uplink...", "info");
    
    // 2. Request account credentials from MetaMask
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    if (accounts.length > 0) {
      initializeConnection(accounts[0]);
      showToast("Cockpit connection established successfully!", "success");
    }
  } catch (err) {
    if (err.code === 4001) {
      showToast("Uplink request denied by pilot (User rejected connection)", "error");
    } else {
      showToast("Error establishing connection: " + err.message, "error");
    }
    console.error("Connection error:", err);
  }
}

// --- Initialize State and UI ---
async function initializeConnection(address) {
  appState.isConnected = true;
  appState.address = address;
  
  // Fetch chain and network mapping
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    appState.chainId = chainId;
    updateNetworkInfo(chainId);
    
    // Fetch balance
    await fetchBalance(address);
  } catch (err) {
    console.error("Error setting chain/balance states:", err);
    showToast("Error fetching node diagnostics.", "error");
  }
  
  // Update views
  updateUI();
}

// --- Fetch ETH Balance from Ledger ---
async function fetchBalance(address) {
  try {
    const balanceHex = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest']
    });
    
    // Parse hexadecimal balance to decimal
    const balanceWei = BigInt(balanceHex);
    // Convert to Ether representation (1 ETH = 1e18 Wei)
    appState.balance = parseFloat((Number(balanceWei) / 1e18).toFixed(4));
    appState.isSimulationActive = false; // Reset simulation if we fetch actual ledger values
  } catch (err) {
    console.error("Error fetching balance:", err);
    showToast("Failed to pull balance stats from node.", "error");
    appState.balance = 0.0;
  }
}

// --- Network Details Setup ---
function updateNetworkInfo(chainId) {
  const netDetails = NETWORKS[chainId] || { name: `Unknown Net (${chainId})`, color: '#6c5ce7' };
  appState.networkName = netDetails.name;
  appState.networkColor = netDetails.color;
}

// --- Update UI Based on Current State ---
function updateUI() {
  if (appState.isConnected) {
    // 1. Manage visible views
    elements.unconnectedView.classList.add('hidden');
    elements.connectedView.classList.remove('hidden');
    elements.connectBtnNav.classList.add('hidden');
    elements.walletBadgeNav.classList.remove('hidden');
    
    // 2. Set address displays
    const shortAddress = shortenAddress(appState.address);
    elements.walletAddressNav.textContent = shortAddress;
    elements.infoAddress.textContent = shortAddress;
    
    // 3. Set network indicators
    elements.walletNetworkNav.style.backgroundColor = appState.networkColor;
    elements.walletNetworkNav.style.boxShadow = `0 0 8px ${appState.networkColor}`;
    
    elements.infoNetwork.textContent = appState.networkName;
    elements.infoNetworkDot.style.backgroundColor = appState.networkColor;
    elements.infoNetworkDot.style.boxShadow = `0 0 8px ${appState.networkColor}`;
    elements.infoNetworkDot.classList.add('active');
    
    // 4. Update balance displays and Game loop metrics
    elements.infoBalance.textContent = appState.balance.toFixed(4);
    elements.balanceUnit.textContent = (appState.chainId === '0x89' || appState.chainId === '0x13881') ? 'MATIC' : 'ETH';
    
    updateMissionsAndFuel();
  } else {
    // Reset view visibility
    elements.unconnectedView.classList.remove('hidden');
    elements.connectedView.classList.add('hidden');
    elements.connectBtnNav.classList.remove('hidden');
    elements.walletBadgeNav.classList.add('hidden');
    
    // Reset indicators
    elements.infoNetworkDot.classList.remove('active');
    elements.infoNetworkDot.style.backgroundColor = '';
    elements.infoNetworkDot.style.boxShadow = '';
    
    appState.isSimulationActive = false;
  }
}

// --- Update Fuel bar & Cadet Missions status ---
function updateMissionsAndFuel() {
  const currentBalance = appState.balance;
  
  // Fuel Tank Fill calculation:
  // Requires 0.01 to be "fueled" for mission 2. Let's set 0.05 as the target for 100% capacity.
  const targetCapacity = 0.05;
  let fuelPercent = 0;
  
  if (currentBalance > 0) {
    fuelPercent = Math.min(100, Math.floor((currentBalance / targetCapacity) * 100));
    // Ensure we show at least 8% if they have some balance
    fuelPercent = Math.max(8, fuelPercent);
  } else {
    fuelPercent = 3; // Emergency reserve glow
  }
  
  elements.fuelPercentage.textContent = `${fuelPercent}%`;
  elements.fuelBarInner.style.width = `${fuelPercent}%`;
  
  // Mission 2 Status logic:
  if (currentBalance >= 0.01) {
    // Completed
    const mission2 = elements.missionFuelStatus.closest('.mission-item');
    mission2.className = 'mission-item completed';
    mission2.querySelector('.mission-checkbox').textContent = '✓';
    elements.missionFuelStatus.textContent = 'Completed (Core fuel cells filled)';
    elements.missionFuelStatus.className = 'mission-status font-green';
    
    // Unlock Mission 3
    elements.missionJumpItem.className = 'mission-item in-progress';
    elements.missionJumpCheckbox.textContent = '▶';
    elements.missionJumpStatus.textContent = 'Uplink and Core stable. Launching calculations...';
    elements.missionJumpStatus.className = 'mission-status highlight-cyan';
    
    // Enable simulated cockpit interactions
    setupJumpMissionInteractive();
  } else {
    // In progress (Not enough balance)
    const mission2 = elements.missionFuelStatus.closest('.mission-item');
    mission2.className = 'mission-item in-progress';
    mission2.querySelector('.mission-checkbox').textContent = '▶';
    elements.missionFuelStatus.innerHTML = `Requires &gt; 0.01 ETH. <a href="#" id="faucet-sim-btn" class="highlight-cyan font-bold" style="text-decoration: underline;">Request Simulation Fuel</a>`;
    elements.missionFuelStatus.className = 'mission-status';
    
    // Lock Mission 3
    elements.missionJumpItem.className = 'mission-item locked';
    elements.missionJumpCheckbox.textContent = '🔒';
    elements.missionJumpStatus.textContent = 'Locked (Fuel core to unlock)';
    elements.missionJumpStatus.className = 'mission-status text-muted';
    
    // Re-bind the simulated faucet request
    document.getElementById('faucet-sim-btn').addEventListener('click', (e) => {
      e.preventDefault();
      simulateFaucetFunding();
    });
  }
}

// --- Simulate Test Faucet for Zero-Balance Beginners ---
function simulateFaucetFunding() {
  if (appState.isSimulationActive) return;
  
  appState.isSimulationActive = true;
  showToast("Requesting cockpit simulator fuel cores...", "info");
  
  // Create a cool counting animation
  let start = 0.0;
  const target = 0.025;
  const steps = 25;
  const intervalTime = 60; // ms
  
  const timer = setInterval(() => {
    start += target / steps;
    elements.infoBalance.textContent = start.toFixed(4);
    
    // Fuel bar growth feedback
    const simulatedPercent = Math.min(100, Math.floor((start / 0.05) * 100));
    elements.fuelPercentage.textContent = `${simulatedPercent}%`;
    elements.fuelBarInner.style.width = `${simulatedPercent}%`;
    
    if (start >= target) {
      clearInterval(timer);
      appState.balance = target;
      updateUI();
      showToast("Simulator fuel injected! Thrusters online.", "success");
    }
  }, intervalTime);
}

// --- Setup Mission 3 Clickable Trigger ---
function setupJumpMissionInteractive() {
  const jumpItem = elements.missionJumpItem;
  
  // Prevent duplicate event attachments
  if (jumpItem.dataset.interactiveBound === 'true') return;
  jumpItem.dataset.interactiveBound = 'true';
  
  // Hover tips
  jumpItem.style.cursor = 'pointer';
  
  jumpItem.addEventListener('click', () => {
    if (jumpItem.classList.contains('completed')) return;
    
    showToast("Commencing hyperspace coordinates calculation...", "info");
    
    let countdown = 3;
    const timer = setInterval(() => {
      if (countdown > 0) {
        showToast(`Stellar navigation ignition in ${countdown}...`, "info");
        countdown--;
      } else {
        clearInterval(timer);
        jumpItem.className = 'mission-item completed';
        elements.missionJumpCheckbox.textContent = '✓';
        elements.missionJumpStatus.textContent = 'Hyperspace jump successful! Voyage mastered.';
        elements.missionJumpStatus.className = 'mission-status font-green';
        showToast("CONGRATULATIONS CADET! You have mastered the Stellar Journey!", "success");
      }
    }, 1000);
  });
}

// --- Handle Accounts Changed Event ---
function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    // User disconnected all accounts in MetaMask
    handleDisconnect();
    showToast("Cockpit connection terminated by MetaMask client.", "warning");
  } else if (accounts[0] !== appState.address) {
    // User switched account
    appState.address = accounts[0];
    showToast(`Switched telemetry pilot node: ${shortenAddress(accounts[0])}`, "info");
    // Refresh balance and UI
    fetchBalance(accounts[0]).then(() => updateUI());
  }
}

// --- Handle Chain Changed Event ---
function handleChainChanged(chainIdHex) {
  showToast(`Network coordinates changed. Re-calibrating dashboard...`, "info");
  // Recommended action on chainChange is to reload the browser window
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

// --- Disconnect Wallet (Local Session Clean) ---
function handleDisconnect() {
  appState.isConnected = false;
  appState.address = '';
  appState.balance = 0.0;
  appState.chainId = '';
  appState.networkName = 'Unknown';
  
  updateUI();
  showToast("Cockpit telemetry uplink disconnected.", "warning");
}

// --- Copy Address helper ---
function handleCopyAddress() {
  if (!appState.address) return;
  
  navigator.clipboard.writeText(appState.address)
    .then(() => {
      showToast("Coordinates copied to navigator clipboard!", "success");
    })
    .catch(err => {
      console.error("Failed to copy address:", err);
      showToast("Unable to write clipboard.", "error");
    });
}

// --- Warning Modal Toggles ---
function showNoWalletModal() {
  elements.noWalletModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Lock scrolling
}

function hideNoWalletModal() {
  elements.noWalletModal.classList.add('hidden');
  document.body.style.overflow = ''; // Unlock scrolling
}

// --- Utility Functions ---
function shortenAddress(addr) {
  if (!addr) return '';
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
}

// --- Toast notifications creator ---
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'i';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';
  if (type === 'warning') icon = '⚠';
  
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <span class="toast-message">${message}</span>
  `;
  
  elements.toastContainer.appendChild(toast);
  
  // Trigger animations
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
}
