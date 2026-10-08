let currentUser = null;
let html5QrScanner = null;
let isBalanceRevealed = false;

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLoginBtn.className = "flex-1 py-3 text-center font-bold text-[#ff2a5f] border-b-2 border-[#ff2a5f] text-sm tracking-wide";
        tabRegisterBtn.className = "flex-1 py-3 text-center font-bold text-[#8b949e] text-sm tracking-wide";
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabRegisterBtn.className = "flex-1 py-3 text-center font-bold text-[#ff2a5f] border-b-2 border-[#ff2a5f] text-sm tracking-wide";
        tabLoginBtn.className = "flex-1 py-3 text-center font-bold text-[#8b949e] text-sm tracking-wide";
    }
}

async function updateSimulationControls() {
    const bankOutage = document.getElementById('simOutageToggle').checked;
    const fraudRingProtection = document.getElementById('simFraudToggle').checked;

    try {
        await fetch('/api/admin/toggle-simulation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bankOutage, fraudRingProtection })
        });
    } catch (err) {
        console.error('Failed to update simulation flags', err);
    }
}

async function sendOtp() {
    const mobile = document.getElementById('regMobile').value;
    if (!mobile || mobile.length !== 10) {
        alert('Please enter a valid 10-digit mobile number');
        return;
    }

    try {
        const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile })
        });
        const data = await res.json();
        if (res.ok) {
            alert(`OTP Sent! Use OTP: ${data.demoOtp} for testing.`);
            document.getElementById('regOtp').value = data.demoOtp;
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert('Network error while requesting OTP');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const mobile = document.getElementById('regMobile').value;
    const otp = document.getElementById('regOtp').value;
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, mobile, otp, password })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Registration Successful! Account credited with ₹11,000. Logging in...');
            currentUser = data.user;
            renderDashboard();
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert('Registration failed');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const mobile = document.getElementById('loginMobile').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile, password })
        });
        const data = await res.json();
        if (res.ok) {
            currentUser = data.user;
            renderDashboard();
        } else {
            alert(data.error);
        }
    } catch (err) {
        alert('Login failed');
    }
}

function logout() {
    currentUser = null;
    isBalanceRevealed = false;
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('userInfoHeader').classList.add('hidden');
    document.getElementById('logoutBtn').classList.add('hidden');
}

function renderDashboard() {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    document.getElementById('userInfoHeader').classList.remove('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');

    document.getElementById('headerUserName').innerText = currentUser.name;
    document.getElementById('headerUserVpa').innerText = currentUser.vpa;
    document.getElementById('userVpaDisplay').innerText = currentUser.vpa;

    hideBalanceUI();
    loadHistory();
}

function hideBalanceUI() {
    isBalanceRevealed = false;
    document.getElementById('userBalance').innerText = '₹ ••••••••';
    document.getElementById('checkBalanceBtnText').innerText = 'Check Balance';
}

function openBalancePasswordModal() {
    if (isBalanceRevealed) {
        hideBalanceUI();
        return;
    }
    document.getElementById('balancePasswordInput').value = '';
    document.getElementById('balancePasswordModal').classList.remove('hidden');
}

function closeBalancePasswordModal() {
    document.getElementById('balancePasswordModal').classList.add('hidden');
}

async function verifyPasswordAndShowBalance(e) {
    e.preventDefault();
    const passwordInput = document.getElementById('balancePasswordInput');
    const password = passwordInput.value.trim();

    if (!currentUser || !currentUser.mobile) {
        alert('User session not found. Please log in again.');
        return;
    }

    try {
        const res = await fetch('/api/user/check-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                mobile: String(currentUser.mobile).trim(), 
                password: password 
            })
        });

        const data = await res.json().catch(() => null);

        if (res.ok && data) {
            closeBalancePasswordModal();
            isBalanceRevealed = true;
            document.getElementById('userBalance').innerText = `₹ ${data.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            document.getElementById('checkBalanceBtnText').innerText = 'Hide Balance';
        } else {
            alert((data && data.error) || `Authentication Error`);
        }
    } catch (err) {
        alert('Network error while verifying password');
    }
}

async function executePayment(e) {
    e.preventDefault();
    
    // 1. Session Safety Check
    if (!currentUser || !currentUser.mobile) {
        alert('User session not found. Please log in again.');
        return;
    }

    const recipientInput = document.getElementById('payRecipient');
    const amountInput = document.getElementById('payAmount');

    const recipientIdentifier = recipientInput.value.trim();
    const amount = amountInput.value.trim();

    if (!recipientIdentifier || !amount) {
        alert('Please fill in all recipient and amount fields.');
        return;
    }

    try {
        const res = await fetch('/api/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderMobile: String(currentUser.mobile).trim(),
                recipientIdentifier: recipientIdentifier,
                amount: amount
            })
        });

        // 2. Safe JSON Parsing
        const data = await res.json().catch(() => null);

        if (res.ok && data) {
            // Safe Property Extraction with Fallbacks
           
            

            alert(`Payment Successful!\n\nSent: ₹${amount} to ${recipientIdentifier}`);
            
            closePayModal();
            recipientInput.value = '';
            amountInput.value = '';

            hideBalanceUI();
            await loadHistory();
        } else {
            // 3. Handled Backend Error Responses
            if (data && data.error === 'FRAUD_CONTAINED_BFS_CYCLE') {
                const trajectory = data.telemetry?.graphTrajectory || 'Circular loop detected';
                alert(`⚠️ FRAUD CONTAINED: ${data.message}\n\nGraph Trajectory: ${trajectory}`);
            } else {
                alert((data && data.error) || `Server Error (${res.status}): Could not complete transfer.`);
            }
        }
    } catch (err) {
        console.error('Payment Execution Error Details:', err);
        alert(`Connection or execution error: ${err.message}`);
    }
}

async function loadHistory() {
    if (!currentUser) return;
    try {
        const res = await fetch(`/api/transactions/${currentUser.mobile}`);
        const txList = await res.json();
        
        const container = document.getElementById('txHistoryList');
        if (!txList || txList.length === 0) {
            container.innerHTML = `<div class="text-center text-[#8b949e] py-12 text-xs code-font">No transactions recorded in ledger.</div>`;
            return;
        }

        container.innerHTML = txList.map(tx => {
            const isDebit = tx.senderMobile === currentUser.mobile;
            const amountClass = isDebit ? 'text-[#ff7b72]' : 'text-[#3fb950]';
            const sign = isDebit ? '-' : '+';
            const party = isDebit ? `To: ${tx.recipientVpa}` : `From: ${tx.senderVpa}`;
            
            // Fallback if cryptoProof is missing on older records
            const hashDisplay = tx.cryptoProof || (tx.id ? `${tx.id}` : 'Trn no.');

            return `
                <div class="bg-[#0d1117] p-3 rounded-xl border border-[#30363d] flex justify-between items-center text-xs code-font">
                    <div>
                        <p class="font-semibold text-white text-sm">${party}</p>
                        <p class="text-[11px] text-[#8b949e] mt-0.5">${tx.timestamp} • Trn no.: ${hashDisplay}</p>
                    </div>
                    <div class="font-extrabold text-sm ${amountClass}">
                        ${sign} ₹${tx.amount.toLocaleString('en-IN')}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('History load failed', err);
    }
}

function openMyQrModal() {
    document.getElementById('myQrModal').classList.remove('hidden');
    document.getElementById('qrMyName').innerText = currentUser.name;
    document.getElementById('qrMyVpa').innerText = currentUser.vpa;

    const qrContainer = document.getElementById('qrcodeCanvas');
    qrContainer.innerHTML = "";
    
    new QRCode(qrContainer, {
        text: currentUser.vpa,
        width: 140,
        height: 140
    });
}

function closeMyQrModal() {
    document.getElementById('myQrModal').classList.add('hidden');
}

function openPayModal(prefillRecipient = '') {
    document.getElementById('payModal').classList.remove('hidden');
    if (prefillRecipient) {
        document.getElementById('payRecipient').value = prefillRecipient;
    }
}

function closePayModal() {
    document.getElementById('payModal').classList.add('hidden');
}

function openScanner() {
    document.getElementById('scannerModal').classList.remove('hidden');
    
    html5QrScanner = new Html5Qrcode("qr-reader");
    html5QrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 170, height: 170 } },
        (decodedText) => {
            closeScanner();
            openPayModal(decodedText);
        },
        () => {}
    ).catch(err => {
        alert("Camera error or permission denied: " + err);
        closeScanner();
    });
}

function closeScanner() {
    if (html5QrScanner) {
        html5QrScanner.stop().then(() => {
            html5QrScanner.clear();
            document.getElementById('scannerModal').classList.add('hidden');
        }).catch(() => {
            document.getElementById('scannerModal').classList.add('hidden');
        });
    } else {
        document.getElementById('scannerModal').classList.add('hidden');
    }
}