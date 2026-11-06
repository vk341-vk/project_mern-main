// ==========================================================================
// 🌍 EARTHPAY GLOBAL BANKING & EXCHANGE SYSTEM - CORE LOGIC
// ==========================================================================

// Global State
let currentUser = null;
let isBalanceHidden = true;
let liveExchangeRates = {};

// Fallback rates dictionary in case API is offline
const FALLBACK_RATES = {
  USD: { INR: 83.5, EUR: 0.92, GBP: 0.78, JPY: 153.2, AUD: 1.52, CAD: 1.38, RUB: 88.5, SAR: 3.75, AED: 3.67, USD: 1.0 },
  INR: { USD: 0.012, EUR: 0.011, GBP: 0.0093, JPY: 1.83, AUD: 0.018, CAD: 0.016, RUB: 1.06, SAR: 0.045, AED: 0.044, INR: 1.0 },
  EUR: { USD: 1.09, INR: 90.7, GBP: 0.85, JPY: 166.5, AUD: 1.65, CAD: 1.50, RUB: 96.2, SAR: 4.08, AED: 4.00, EUR: 1.0 },
  GBP: { USD: 1.28, INR: 107.1, EUR: 1.18, JPY: 196.4, AUD: 1.95, CAD: 1.77, RUB: 113.4, SAR: 4.81, AED: 4.71, GBP: 1.0 },
  JPY: { USD: 0.0065, INR: 0.54, EUR: 0.006, GBP: 0.005, AUD: 0.0099, CAD: 0.009, RUB: 0.58, SAR: 0.024, AED: 0.024, JPY: 1.0 },
  AUD: { USD: 0.66, INR: 54.9, EUR: 0.60, GBP: 0.51, JPY: 100.8, CAD: 0.91, RUB: 58.2, SAR: 2.47, AED: 2.41, AUD: 1.0 },
  CAD: { USD: 0.72, INR: 60.5, EUR: 0.66, GBP: 0.56, JPY: 111.0, AUD: 1.10, RUB: 64.1, SAR: 2.71, AED: 2.66, CAD: 1.0 },
  RUB: { USD: 0.011, INR: 0.94, EUR: 0.010, GBP: 0.0088, JPY: 1.73, AUD: 0.017, CAD: 0.015, SAR: 0.042, AED: 0.041, RUB: 1.0 },
  SAR: { USD: 0.27, INR: 22.2, EUR: 0.24, GBP: 0.21, JPY: 40.8, AUD: 0.40, CAD: 0.37, RUB: 23.6, AED: 0.98, SAR: 1.0 },
  AED: { USD: 0.27, INR: 22.7, EUR: 0.25, GBP: 0.21, JPY: 41.7, AUD: 0.41, CAD: 0.38, RUB: 24.1, SAR: 1.02, AED: 1.0 }
};

// Initialization on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  initStorage();
  checkAutoLogin();
});

// ================= LOCAL STORAGE HELPERS =================
function initStorage() {
  if (!localStorage.getItem("earthpay_users")) {
    // Seed default demo user for instant testing if empty
    const demoUsers = {
      "demo": {
        username: "demo",
        password: "123",
        email: "demo@earthpay.com",
        bankAccount: {
          bankName: "Global Apex Reserve",
          accountNumber: "987654321098",
          ifsc: "APEXUS33",
          currency: "USD",
          balance: 15000.00
        },
        transactions: [
          {
            id: "TXN-908123",
            date: new Date(Date.now() - 86400000 * 2).toISOString(),
            receiver: "Sarah Connor",
            accountNumber: "4401928374",
            bankName: "Barclays Direct",
            country: "UK",
            amount: 500,
            from: "USD",
            to: "GBP",
            converted: 390.00,
            rate: 0.78,
            type: "International",
            status: "Successful"
          },
          {
            id: "TXN-541298",
            date: new Date(Date.now() - 86400000 * 5).toISOString(),
            receiver: "Raj Patel",
            accountNumber: "9182736450",
            bankName: "HDFC Bank",
            country: "India",
            amount: 200,
            from: "USD",
            to: "INR",
            converted: 16700.00,
            rate: 83.5,
            type: "International",
            status: "Successful"
          }
        ]
      }
    };
    localStorage.setItem("earthpay_users", JSON.stringify(demoUsers));
  }
}

function getAllUsers() {
  return JSON.parse(localStorage.getItem("earthpay_users") || "{}");
}

function saveAllUsers(users) {
  localStorage.setItem("earthpay_users", JSON.stringify(users));
}

function getUserData(username) {
  const users = getAllUsers();
  return users[username] || null;
}

function updateUserData(username, newData) {
  const users = getAllUsers();
  users[username] = newData;
  saveAllUsers(users);
}

// ================= AUTHENTICATION LOGIC =================
function showLogin() {
  document.getElementById("registerBox").style.display = "none";
  document.getElementById("loginBox").style.display = "block";
  document.getElementById("tabBtnLogin").classList.add("active");
  document.getElementById("tabBtnRegister").classList.remove("active");
}

function showRegister() {
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("registerBox").style.display = "block";
  document.getElementById("tabBtnRegister").classList.add("active");
  document.getElementById("tabBtnLogin").classList.remove("active");
}

function registerUser() {
  const username = document.getElementById("regUsername").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const msg = document.getElementById("regMessage");

  if (!username || !email || !password) {
    msg.innerHTML = `<span style="color: #f87171;">⚠️ Please fill in all fields.</span>`;
    return;
  }

  const users = getAllUsers();
  if (users[username]) {
    msg.innerHTML = `<span style="color: #f87171;">⚠️ Username already taken.</span>`;
    return;
  }

  users[username] = {
    username,
    email,
    password,
    bankAccount: null, // Will be linked via bank linking
    transactions: []
  };

  saveAllUsers(users);
  msg.innerHTML = `<span style="color: #4ade80;">✅ Account created successfully! Logging in...</span>`;

  setTimeout(() => {
    setActiveUserSession(username);
  }, 800);
}

function loginUser() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const msg = document.getElementById("loginMessage");

  if (!username || !password) {
    msg.innerHTML = `<span style="color: #f87171;">⚠️ Enter username and password.</span>`;
    return;
  }

  const user = getUserData(username);
  if (!user || user.password !== password) {
    msg.innerHTML = `<span style="color: #f87171;">⚠️ Invalid credentials.</span>`;
    return;
  }

  msg.innerHTML = `<span style="color: #4ade80;">✅ Login successful!</span>`;
  setTimeout(() => {
    setActiveUserSession(username);
  }, 600);
}

function setActiveUserSession(username) {
  currentUser = username;
  localStorage.setItem("earthpay_current_user", username);
  
  document.getElementById("authContainer").style.display = "none";
  document.getElementById("appContainer").style.display = "block";
  document.getElementById("headerProfileChip").style.display = "flex";

  refreshUI();
}

function checkAutoLogin() {
  const savedUser = localStorage.getItem("earthpay_current_user");
  if (savedUser && getUserData(savedUser)) {
    setActiveUserSession(savedUser);
  }
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem("earthpay_current_user");

  document.getElementById("authContainer").style.display = "block";
  document.getElementById("appContainer").style.display = "none";
  document.getElementById("headerProfileChip").style.display = "none";
  closeProfileModal();
}

// ================= UI REFRESH & STATE RENDER =================
function refreshUI() {
  if (!currentUser) return;
  const userData = getUserData(currentUser);
  if (!userData) return;

  // 1. Profile Chip & Header
  document.getElementById("chipUsername").textContent = userData.username;
  document.getElementById("userAvatar").textContent = userData.username.charAt(0).toUpperCase();

  // 2. Bank Linking & Balance Card
  const bank = userData.bankAccount;
  const chipBadge = document.getElementById("chipBankBadge");
  const bankStatusBadge = document.getElementById("bankStatusBadge");
  const cardBankName = document.getElementById("cardBankName");
  const cardAccNumber = document.getElementById("cardAccNumber");
  const linkBankBtn = document.getElementById("linkBankBtn");
  const symbolEl = document.getElementById("balanceCurrencySymbol");

  if (bank) {
    chipBadge.className = "badge badge-success";
    chipBadge.textContent = "Linked";
    bankStatusBadge.className = "badge badge-success";
    bankStatusBadge.textContent = "Verified Account";
    cardBankName.textContent = bank.bankName;
    cardAccNumber.textContent = `Acc: •••• ${bank.accountNumber.slice(-4)}`;
    linkBankBtn.style.display = "none";
    symbolEl.textContent = getCurrencySymbol(bank.currency);

    updateBalanceDisplay(bank.balance);
  } else {
    chipBadge.className = "badge badge-warning";
    chipBadge.textContent = "Unlinked";
    bankStatusBadge.className = "badge badge-danger";
    bankStatusBadge.textContent = "Unlinked Bank";
    cardBankName.textContent = "No Bank Linked";
    cardAccNumber.textContent = "Acc: ---- ---- ----";
    linkBankBtn.style.display = "inline-flex";
    symbolEl.textContent = "$";
    document.getElementById("balanceValue").textContent = "••••••••";
  }

  // 3. Mini QR Code update
  updateUserQrCodes(userData);

  // 4. Calculate live rate preview
  calculateLiveRate();

  // 5. Render Transaction History
  applyFilters();
}

// Balance Hide / Reveal Toggle
function toggleBalanceVisibility() {
  isBalanceHidden = !isBalanceHidden;
  const userData = getUserData(currentUser);
  if (userData && userData.bankAccount) {
    updateBalanceDisplay(userData.bankAccount.balance);
  }
}

function updateBalanceDisplay(balance) {
  const balanceEl = document.getElementById("balanceValue");
  const eyeIcon = document.getElementById("balanceEyeIcon");

  if (isBalanceHidden) {
    balanceEl.textContent = "••••••••";
    eyeIcon.className = "fa-solid fa-eye";
  } else {
    balanceEl.textContent = Number(balance).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    eyeIcon.className = "fa-solid fa-eye-slash";
  }
}

// Currency Symbol Helper
function getCurrencySymbol(curr) {
  const symbols = {
    USD: "$", INR: "₹", EUR: "€", GBP: "£", JPY: "¥",
    AUD: "A$", CAD: "C$", RUB: "₽", SAR: "SR", AED: "AED"
  };
  return symbols[curr] || curr;
}

// ================= BANK LINKING LOGIC =================
function openBankModal() {
  document.getElementById("bankModal").style.display = "flex";
}

function closeBankModal() {
  document.getElementById("bankModal").style.display = "none";
}

function saveBankLinking() {
  const bankName = document.getElementById("linkBankName").value.trim();
  const accNumber = document.getElementById("linkAccNumber").value.trim();
  const ifsc = document.getElementById("linkIfsc").value.trim();
  const currency = document.getElementById("linkCurrency").value;
  const initialBalance = parseFloat(document.getElementById("linkInitialBalance").value);

  if (!bankName || !accNumber || !ifsc || isNaN(initialBalance) || initialBalance <= 0) {
    alert("⚠️ Please enter valid bank details and initial balance.");
    return;
  }

  if (!/^\d{8,18}$/.test(accNumber)) {
    alert("⚠️ Account number must contain 8 to 18 digits.");
    return;
  }

  const userData = getUserData(currentUser);
  userData.bankAccount = {
    bankName,
    accountNumber: accNumber,
    ifsc,
    currency,
    balance: initialBalance
  };

  updateUserData(currentUser, userData);
  closeBankModal();
  refreshUI();
  alert("✅ Bank Account successfully linked!");
}

// ================= DEPOSIT / ADD FUNDS =================
function openDepositModal() {
  const userData = getUserData(currentUser);
  if (!userData || !userData.bankAccount) {
    alert("⚠️ Mandatory: Link your bank account first before depositing funds.");
    openBankModal();
    return;
  }
  document.getElementById("depositModal").style.display = "flex";
}

function closeDepositModal() {
  document.getElementById("depositModal").style.display = "none";
}

function submitDeposit() {
  const amount = parseFloat(document.getElementById("depositAmount").value);
  if (isNaN(amount) || amount <= 0) {
    alert("⚠️ Enter a valid positive deposit amount.");
    return;
  }

  const userData = getUserData(currentUser);
  userData.bankAccount.balance += amount;
  updateUserData(currentUser, userData);

  closeDepositModal();
  refreshUI();
  alert(`✅ Successfully deposited ${getCurrencySymbol(userData.bankAccount.currency)}${amount.toFixed(2)} to your linked account!`);
}

// ================= PROFILE & QR CODE MODAL =================
function openProfileModal() {
  const userData = getUserData(currentUser);
  if (!userData) return;

  document.getElementById("modalUsername").textContent = userData.username;
  document.getElementById("modalEmail").textContent = userData.email;
  document.getElementById("modalUserAvatar").textContent = userData.username.charAt(0).toUpperCase();

  const bankBox = document.getElementById("modalBankDetails");
  if (userData.bankAccount) {
    bankBox.innerHTML = `
      <p><b>Bank:</b> ${userData.bankAccount.bankName}</p>
      <p><b>Account No:</b> ${userData.bankAccount.accountNumber}</p>
      <p><b>IFSC/SWIFT:</b> ${userData.bankAccount.ifsc}</p>
      <p><b>Currency:</b> ${userData.bankAccount.currency}</p>
      <p><b>Available Balance:</b> ${getCurrencySymbol(userData.bankAccount.currency)} ${userData.bankAccount.balance.toFixed(2)}</p>
    `;
  } else {
    bankBox.innerHTML = `<p style="color: #fbbf24;">No bank linked. Click "Link Account" to attach a bank account.</p>`;
  }

  document.getElementById("profileModal").style.display = "flex";
}

function closeProfileModal() {
  document.getElementById("profileModal").style.display = "none";
}

function updateUserQrCodes(userData) {
  const qrPayload = {
    username: userData.username,
    name: userData.username,
    bankName: userData.bankAccount ? userData.bankAccount.bankName : "EarthPay Bank",
    accountNumber: userData.bankAccount ? userData.bankAccount.accountNumber : "9988776655",
    country: "Global",
    email: userData.email,
    phone: "9876543210"
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(JSON.stringify(qrPayload))}`;

  document.getElementById("miniQrImg").src = qrUrl;
  document.getElementById("fullQrImg").src = qrUrl;
  document.getElementById("qrDownloadBtn").href = qrUrl;
}

// ================= TAB SWITCHING =================
function switchTransferTab(tab) {
  const manualSec = document.getElementById("manualTxSection");
  const qrSec = document.getElementById("qrTxSection");
  const tabManual = document.getElementById("tabManualTx");
  const tabQr = document.getElementById("tabQrTx");

  if (tab === "manual") {
    manualSec.style.display = "block";
    qrSec.style.display = "none";
    tabManual.classList.add("active");
    tabQr.classList.remove("active");
  } else {
    manualSec.style.display = "none";
    qrSec.style.display = "block";
    tabQr.classList.add("active");
    tabManual.classList.remove("active");
  }
}

// ================= QR SCANNER SIMULATION =================
function simulateQrScan(name, account, bank, country, email, phone) {
  document.getElementById("receiverName").value = name;
  document.getElementById("receiverAccount").value = account;
  document.getElementById("receiverBank").value = bank;
  document.getElementById("receiverCountry").value = country;
  document.getElementById("receiverEmail").value = email;
  document.getElementById("receiverPhone").value = phone;

  updateFlag();
  switchTransferTab("manual");

  const resultEl = document.getElementById("result");
  resultEl.innerHTML = `
    <div class="result-card result-success">
      <i class="fa-solid fa-qrcode"></i> <b>QR Code Scanned Successfully!</b> Receiver details pre-filled for ${name}.
    </div>
  `;
}

function parseRawQr() {
  const rawData = document.getElementById("rawQrInput").value.trim();
  if (!rawData) {
    alert("⚠️ Please paste QR JSON payload.");
    return;
  }

  try {
    const data = JSON.parse(rawData);
    simulateQrScan(
      data.name || data.receiver || "Scanned Receiver",
      data.accountNumber || data.account || "123456789",
      data.bankName || data.bank || "Partner Bank",
      data.country || "India",
      data.email || "scanned@earthpay.com",
      data.phone || "9876543210"
    );
  } catch (err) {
    alert("⚠️ Invalid QR Code JSON format. Expected JSON object with name, account, bank keys.");
  }
}

// ================= LIVE RATE CALCULATOR & EXCHANGE API =================
async function calculateLiveRate() {
  const amountVal = parseFloat(document.getElementById("amount").value);
  const from = document.getElementById("fromCurrency").value;
  const to = document.getElementById("toCurrency").value;
  const badge = document.getElementById("transferTypeBadge");
  const liveBox = document.getElementById("liveRateBox");

  // Update National vs International Pill
  if (from === to) {
    badge.className = "type-pill pill-national";
    badge.innerHTML = `<i class="fa-solid fa-flag"></i> National (1:1)`;
  } else {
    badge.className = "type-pill pill-international";
    badge.innerHTML = `<i class="fa-solid fa-earth-americas"></i> International Conversion`;
  }

  if (isNaN(amountVal) || amountVal <= 0) {
    liveBox.innerHTML = `<i class="fa-solid fa-circle-info"></i> Enter an amount to preview exchange rate & calculation.`;
    return;
  }

  // Get Rate
  const rate = await fetchExchangeRate(from, to);
  const converted = (amountVal * rate).toFixed(2);

  liveBox.innerHTML = `
    <i class="fa-solid fa-chart-line"></i> <b>Live Rate:</b> 1 ${from} = ${rate.toFixed(4)} ${to} 
    &nbsp;|&nbsp; <b>Total Converted:</b> ${getCurrencySymbol(to)}${converted} ${to}
  `;
}

async function fetchExchangeRate(from, to) {
  if (from === to) return 1.0;

  try {
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
    if (res.ok) {
      const data = await res.json();
      if (data.rates && data.rates[to]) {
        return data.rates[to];
      }
    }
  } catch (e) {
    console.warn("Exchange Rate API call failed, using reliable fallback matrix.", e);
  }

  // Fallback calculation
  if (FALLBACK_RATES[from] && FALLBACK_RATES[from][to]) {
    return FALLBACK_RATES[from][to];
  }
  return 1.0;
}

// Country flag UI update
function updateFlag() {
  const select = document.getElementById("receiverCountry");
  const selectedOption = select.options[select.selectedIndex];
  const flag = selectedOption.getAttribute("data-flag") || "🌐";
  document.getElementById("countryFlag").textContent = flag;
}

// ================= RECEIVER VALIDATION & TRANSACTION EXECUTION =================
function validateReceiverForm() {
  const name = document.getElementById("receiverName").value.trim();
  const account = document.getElementById("receiverAccount").value.trim();
  const bank = document.getElementById("receiverBank").value.trim();
  const email = document.getElementById("receiverEmail").value.trim();
  const phone = document.getElementById("receiverPhone").value.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?\d{10,15}$/;

  if (!name || name.length < 2) {
    return { valid: false, message: "Enter a valid receiver full name (at least 2 characters)." };
  }
  if (!account || !/^\d{8,18}$/.test(account)) {
    return { valid: false, message: "Enter a valid bank account number (8-18 digits)." };
  }
  if (!bank) {
    return { valid: false, message: "Enter a valid receiver bank name." };
  }
  if (!emailRegex.test(email)) {
    return { valid: false, message: "Enter a valid receiver email address." };
  }
  if (!phoneRegex.test(phone)) {
    return { valid: false, message: "Enter a valid 10-15 digit phone number." };
  }

  return { valid: true, data: { name, account, bank, email, phone } };
}

async function convertCurrency() {
  const resultEl = document.getElementById("result");
  const userData = getUserData(currentUser);

  // 1. Mandatory Bank Link Check
  if (!userData || !userData.bankAccount) {
    resultEl.innerHTML = `
      <div class="result-card result-failed">
        <i class="fa-solid fa-triangle-exclamation"></i> <b>Transaction Blocked!</b> Mandatory: Link your bank account before making transactions.
      </div>
    `;
    openBankModal();
    return;
  }

  // 2. Amount Validation
  const amount = parseFloat(document.getElementById("amount").value);
  if (isNaN(amount) || amount <= 0) {
    resultEl.innerHTML = `
      <div class="result-card result-failed">
        <i class="fa-solid fa-circle-xmark"></i> Please enter a valid transaction amount.
      </div>
    `;
    return;
  }

  // 3. Receiver Validation
  const validation = validateReceiverForm();
  if (!validation.valid) {
    resultEl.innerHTML = `
      <div class="result-card result-failed">
        <i class="fa-solid fa-circle-xmark"></i> ${validation.message}
      </div>
    `;
    return;
  }

  const from = document.getElementById("fromCurrency").value;
  const to = document.getElementById("toCurrency").value;
  const country = document.getElementById("receiverCountry").value;

  // 4. Rate & Currency Conversion
  const rate = await fetchExchangeRate(from, to);
  const convertedAmount = parseFloat((amount * rate).toFixed(2));
  const txType = (from === to) ? "National" : "International";

  // 5. Balance Deduction Check
  // Note: If sender's bank currency differs from 'From' currency, calculate equivalent deduction in base bank currency
  const baseCurrency = userData.bankAccount.currency;
  const deductionRate = await fetchExchangeRate(from, baseCurrency);
  const requiredDeduction = parseFloat((amount * deductionRate).toFixed(2));

  const txId = "TXN-" + Math.floor(100000 + Math.random() * 900000);
  const txDate = new Date().toISOString();

  if (userData.bankAccount.balance < requiredDeduction) {
    // FAILED TRANSACTION LOG
    const failedTx = {
      id: txId,
      date: txDate,
      receiver: validation.data.name,
      accountNumber: validation.data.account,
      bankName: validation.data.bank,
      country,
      amount,
      from,
      to,
      converted: 0,
      rate,
      type: txType,
      status: "Failed (Insufficient Funds)"
    };

    userData.transactions.push(failedTx);
    updateUserData(currentUser, userData);

    resultEl.innerHTML = `
      <div class="result-card result-failed">
        <i class="fa-solid fa-circle-xmark"></i> <b>Transaction Failed: Insufficient Funds!</b><br>
        Required balance: ${getCurrencySymbol(baseCurrency)}${requiredDeduction.toFixed(2)} | Current balance: ${getCurrencySymbol(baseCurrency)}${userData.bankAccount.balance.toFixed(2)}
      </div>
    `;
    refreshUI();
    return;
  }

  // 6. SUCCESSFUL TRANSACTION DEDUCTION & SAVE
  userData.bankAccount.balance -= requiredDeduction;

  const successTx = {
    id: txId,
    date: txDate,
    receiver: validation.data.name,
    accountNumber: validation.data.account,
    bankName: validation.data.bank,
    country,
    amount,
    from,
    to,
    converted: convertedAmount,
    rate,
    type: txType,
    status: "Successful"
  };

  userData.transactions.push(successTx);
  updateUserData(currentUser, userData);

  // Output Success message & trigger receipt view
  resultEl.innerHTML = `
    <div class="result-card result-success">
      <i class="fa-solid fa-circle-check"></i> <b>${txType} Transaction Successful!</b><br>
      ID: ${txId} | Sent: ${amount} ${from} → Received: ${convertedAmount} ${to}<br>
      Deducted ${getCurrencySymbol(baseCurrency)}${requiredDeduction.toFixed(2)} from linked account.
    </div>
  `;

  refreshUI();
  showReceiptModal(successTx);
}

// ================= TRANSACTION HISTORY & FILTERING =================
function handleRangeChange(radio) {
  if (radio.value === "custom") {
    document.getElementById("customDates").style.display = "flex";
  } else {
    document.getElementById("customDates").style.display = "none";
  }
  applyFilters();
}

function applyFilters() {
  const userData = getUserData(currentUser);
  if (!userData) return;

  let history = [...userData.transactions];

  // 1. Search Filter
  const query = document.getElementById("filterSearch").value.toLowerCase().trim();
  if (query) {
    history = history.filter(tx => 
      tx.receiver.toLowerCase().includes(query) ||
      tx.bankName.toLowerCase().includes(query) ||
      (tx.id && tx.id.toLowerCase().includes(query))
    );
  }

  // 2. Date Range Filter
  const rangeRadio = document.querySelector("input[name='range']:checked");
  if (rangeRadio) {
    const val = rangeRadio.value;
    const now = new Date();

    if (val === "custom") {
      const start = document.getElementById("startDate").value;
      const end = document.getElementById("endDate").value;
      if (start && end) {
        const sDate = new Date(start);
        const eDate = new Date(end);
        eDate.setHours(23, 59, 59, 999);
        history = history.filter(tx => {
          const d = new Date(tx.date);
          return d >= sDate && d <= eDate;
        });
      }
    } else if (val !== "all") {
      const days = parseInt(val);
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - days);
      history = history.filter(tx => new Date(tx.date) >= cutoff);
    }
  }

  // 3. Transfer Type Filter
  const isNational = document.getElementById("national").checked;
  const isInternational = document.getElementById("international").checked;
  if (isNational || isInternational) {
    history = history.filter(tx => 
      (isNational && tx.type === "National") ||
      (isInternational && tx.type === "International")
    );
  }

  // 4. Status Filter
  const isSuccess = document.getElementById("success").checked;
  const isFailed = document.getElementById("failed").checked;
  if (isSuccess || isFailed) {
    history = history.filter(tx =>
      (isSuccess && tx.status === "Successful") ||
      (isFailed && tx.status.includes("Failed"))
    );
  }

  renderTransactionList(history);
}

function resetFilters() {
  document.getElementById("filterSearch").value = "";
  document.querySelectorAll("input[name='range']")[0].checked = true;
  document.getElementById("customDates").style.display = "none";
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  document.getElementById("national").checked = false;
  document.getElementById("international").checked = false;
  document.getElementById("success").checked = false;
  document.getElementById("failed").checked = false;

  applyFilters();
}

function renderTransactionList(history) {
  const container = document.getElementById("txList");
  if (!history || history.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: #64748b;">
        <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 10px;"></i>
        <p>No transactions found matching criteria.</p>
      </div>
    `;
    return;
  }

  let html = "";
  [...history].reverse().forEach(tx => {
    const isSuccess = tx.status === "Successful";
    const statusBadgeClass = isSuccess ? "badge-success" : "badge-danger";
    const iconClass = isSuccess ? "tx-icon-success fa-arrow-up-right-dots" : "tx-icon-failed fa-triangle-exclamation";
    const amountClass = isSuccess ? "tx-amount-success" : "tx-amount-failed";
    const formattedDate = new Date(tx.date).toLocaleString();

    html += `
      <div class="tx-card">
        <div class="tx-left">
          <div class="tx-icon ${iconClass}">
            <i class="fa-solid ${isSuccess ? 'fa-paper-plane' : 'fa-xmark'}"></i>
          </div>
          <div>
            <div class="tx-info-title">${tx.receiver} (${tx.bankName})</div>
            <div class="tx-info-sub">
              ${formattedDate} &bull; <span class="badge ${statusBadgeClass}">${tx.status}</span> &bull; ${tx.type}
            </div>
          </div>
        </div>

        <div class="tx-right">
          <div class="tx-amount ${amountClass}">
            -${tx.amount} ${tx.from}
          </div>
          <div class="tx-info-sub">
            &rarr; ${tx.converted} ${tx.to}
          </div>
          <button class="btn btn-xs btn-outline" style="margin-top: 4px;" onclick='showReceiptModal(${JSON.stringify(tx).replace(/'/g, "&apos;")})'>
            <i class="fa-solid fa-receipt"></i> Receipt
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ================= DOWNLOAD STATEMENT (.CSV) =================
function downloadStatementCSV() {
  const userData = getUserData(currentUser);
  if (!userData || !userData.transactions || userData.transactions.length === 0) {
    alert("⚠️ No transactions to download.");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Transaction ID,Date,Type,Receiver,Bank Name,Country,Sent Amount,From Currency,Received Amount,To Currency,Rate,Status\n";

  userData.transactions.forEach(tx => {
    const dateStr = `"${new Date(tx.date).toLocaleString()}"`;
    const line = [
      tx.id || "N/A",
      dateStr,
      tx.type,
      `"${tx.receiver}"`,
      `"${tx.bankName}"`,
      `"${tx.country}"`,
      tx.amount,
      tx.from,
      tx.converted,
      tx.to,
      tx.rate,
      `"${tx.status}"`
    ].join(",");
    csvContent += line + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `EarthPay_Statement_${currentUser}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ================= RECEIPT MODAL =================
function showReceiptModal(tx) {
  const body = document.getElementById("receiptBody");
  const isSuccess = tx.status === "Successful";

  body.innerHTML = `
    <div style="text-align:center; margin-bottom: 20px;">
      <i class="fa-solid ${isSuccess ? 'fa-circle-check' : 'fa-circle-xmark'}" style="font-size: 3rem; color: ${isSuccess ? '#4ade80' : '#f87171'};"></i>
      <h3 style="margin-top: 10px;">${isSuccess ? 'Payment Successful' : 'Payment Failed'}</h3>
      <p class="subtext">${new Date(tx.date).toLocaleString()}</p>
    </div>

    <div class="receipt-item"><span>Transaction ID:</span><span>${tx.id || 'N/A'}</span></div>
    <div class="receipt-item"><span>Transfer Type:</span><span>${tx.type}</span></div>
    <div class="receipt-item"><span>Receiver Name:</span><span>${tx.receiver}</span></div>
    <div class="receipt-item"><span>Bank Name:</span><span>${tx.bankName}</span></div>
    <div class="receipt-item"><span>Account Number:</span><span>${tx.accountNumber || 'N/A'}</span></div>
    <div class="receipt-item"><span>Country:</span><span>${tx.country || 'Global'}</span></div>
    <div class="receipt-item"><span>Amount Sent:</span><span>${tx.amount} ${tx.from}</span></div>
    <div class="receipt-item"><span>Exchange Rate:</span><span>1 ${tx.from} = ${tx.rate} ${tx.to}</span></div>
    <div class="receipt-item"><span>Amount Received:</span><span>${tx.converted} ${tx.to}</span></div>
    <div class="receipt-item"><span>Status:</span><span style="color: ${isSuccess ? '#4ade80' : '#f87171'};">${tx.status}</span></div>
  `;

  document.getElementById("receiptModal").style.display = "flex";
}

function closeReceiptModal() {
  document.getElementById("receiptModal").style.display = "none";
}