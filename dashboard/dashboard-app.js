// ===================================
// BANCO ACME - DASHBOARD FUNCIONAL COMPLETO
// ===================================

// Variables globales
let auth, firebaseFunctions, db;
let currentUser = null;
let userData = {};
let accountData = {
    balance: 500000, // Saldo inicial de $500,000
    accountNumber: '',
    transactions: []
};
let isDashboardInitialized = false;
let authChecked = false;
let preventRedirect = false;

// Variables para transferencias
let selectedRecipient = null;
let transferData = {};

// Variables de control para redirección
let isRedirecting = false;
let redirectReason = '';

// ===================================
// INICIALIZACIÓN
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🏦 DASHBOARD: Iniciando carga...');
    
    preventRedirect = true;
    console.log('🛡️ Redirecciones automáticas BLOQUEADAS por 10 segundos');
    
    setTimeout(() => {
        preventRedirect = false;
        console.log('🛡️ Redirecciones automáticas desbloqueadas');
    }, 10000);
    
    waitForFirebase().then(() => {
        initializeDashboard();
    }).catch(error => {
        console.error('❌ Error al cargar Firebase:', error);
        showNotification('Error de conexión. Manténgase en el dashboard...', 'error');
    });
});

async function waitForFirebase() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
        if (window.firebaseAuth && window.firebaseFunctions) {
            auth = window.firebaseAuth;
            firebaseFunctions = window.firebaseFunctions;
            
            // Verificar si Firestore está disponible
            if (window.firebaseFirestore) {
                db = window.firebaseFirestore;
                console.log('🗄️ Firestore conectado para búsquedas de usuarios');
            } else {
                console.log('⚠️ Firestore no disponible - usando búsqueda local');
            }
            
            return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    throw new Error('Firebase no se cargó correctamente');
}

function initializeDashboard() {
    try {
        console.log('🏦 DASHBOARD: Iniciando inicialización...');
        
        if (isDashboardInitialized) {
            console.log('⚠️ Dashboard ya inicializado, ignorando...');
            return;
        }
        
        const storedData = sessionStorage.getItem('userData');
        if (!storedData) {
            console.log('❌ DASHBOARD: No hay datos de usuario en sessionStorage');
            setTimeout(() => {
                const retryData = sessionStorage.getItem('userData');
                if (!retryData && !preventRedirect) {
                    redirectToLogin('NO_SESSION_DATA');
                } else if (retryData) {
                    continueInitialization();
                }
            }, 5000);
            return;
        }
        
        continueInitialization();
        
    } catch (error) {
        console.error('❌ DASHBOARD: Error al inicializar:', error);
        showNotification('Error al inicializar el dashboard', 'error');
    }
}

function continueInitialization() {
    try {
        isDashboardInitialized = true;
        
        initializeDOMElements();
        setupEventListeners();
        checkFirebaseAuthSafely();
        initializeBankingSystem();
        
        console.log('✅ DASHBOARD: Inicialización completada exitosamente');
        showNotification('Dashboard cargado correctamente', 'success', 3000);
        
    } catch (error) {
        console.error('❌ DASHBOARD: Error en continuación:', error);
        showNotification('Error en carga del dashboard', 'error');
    }
}

async function checkFirebaseAuthSafely() {
    try {
        if (authChecked) return;
        authChecked = true;
        
        if (!auth) await waitForFirebase();
        
        const firebaseUser = auth.currentUser;
        
        if (firebaseUser) {
            currentUser = firebaseUser;
            await loadUserDataSafely();
        } else {
            setTimeout(() => {
                if (!auth.currentUser && !preventRedirect) {
                    redirectToLogin('NO_FIREBASE_USER');
                } else if (auth.currentUser) {
                    currentUser = auth.currentUser;
                    loadUserDataSafely();
                }
            }, 3000);
        }
        
    } catch (error) {
        console.error('❌ DASHBOARD: Error al verificar autenticación:', error);
        showNotification('Error de autenticación - manteniéndose en dashboard', 'error');
    }
}

async function loadUserDataSafely() {
    try {
        const storedData = sessionStorage.getItem('userData');
        if (storedData) {
            userData = JSON.parse(storedData);
        } else {
            userData = {
                uid: currentUser.uid,
                email: currentUser.email,
                nombre: currentUser.displayName || currentUser.email.split('@')[0],
                apellidos: '',
                telefono: currentUser.phoneNumber || '',
                ciudad: '',
                fechaCreacion: currentUser.metadata.creationTime,
                ultimaConexion: currentUser.metadata.lastSignInTime
            };
            
            sessionStorage.setItem('userData', JSON.stringify(userData));
        }
        
        if (!accountData.accountNumber) {
            accountData.accountNumber = `4567-8901-2345-${userData.uid.slice(-4)}`;
        }
        
        // Cargar transacciones desde localStorage
        loadTransactionsFromStorage();
        
        // Asegurar que el usuario esté en Firestore para búsquedas
        await ensureUserInFirestore();
        
        updateUserInterface();
        updateDashboardInterface();
        
        console.log(' DASHBOARD: Datos de usuario cargados completamente');
        
    } catch (error) {
        console.error(' DASHBOARD: Error al cargar datos:', error);
        showNotification('Error al cargar datos - continuando con datos básicos', 'warning');
        
        if (currentUser) {
            userData = {
                uid: currentUser.uid,
                email: currentUser.email,
                nombre: currentUser.email.split('@')[0],
                apellidos: '',
                telefono: '',
                ciudad: '',
                fechaCreacion: new Date().toISOString(),
                ultimaConexion: new Date().toISOString()
            };
            updateUserInterface();
            updateDashboardInterface();
        }
    }
}

// Asegurar que el usuario actual esté en Firestore para poder ser encontrado en búsquedas
async function ensureUserInFirestore() {
    try {
        if (!window.firebaseFirestore || !currentUser) {
            console.log(' Firestore no disponible o usuario no autenticado');
            return;
        }
        
        const db = window.firebaseFirestore;
        const userRef = db.collection('users').doc(currentUser.uid);
        
        // Verificar si el usuario ya existe
        const userDoc = await userRef.get();
        
        const userDataForFirestore = {
            uid: currentUser.uid,
            email: currentUser.email.toLowerCase(), // Asegurar que esté en minúsculas para búsquedas
            nombre: userData.nombre,
            apellidos: userData.apellidos || '',
            telefono: userData.telefono || '',
            ciudad: userData.ciudad || '',
            accountNumber: accountData.accountNumber,
            fechaCreacion: userData.fechaCreacion,
            ultimaConexion: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (!userDoc.exists) {
            // Crear nuevo documento
            await userRef.set({
                ...userDataForFirestore,
                createdAt: new Date().toISOString()
            });
            console.log(' Usuario creado en Firestore para búsquedas');
        } else {
            // Actualizar documento existente
            await userRef.update(userDataForFirestore);
            console.log(' Usuario actualizado en Firestore');
        }
        
    } catch (error) {
        console.error(' Error al guardar usuario en Firestore:', error);
        // No es crítico si falla, el sistema sigue funcionando
    }
}

// ELEMENTOS DEL DOM


const DOM = {
    notification: null,
    notificationMessage: null,
    notificationIcon: null,
    notificationClose: null
};

function initializeDOMElements() {
    try {
        DOM.notification = document.getElementById('notification');
        DOM.notificationMessage = DOM.notification?.querySelector('.notification-message');
        DOM.notificationIcon = DOM.notification?.querySelector('.notification-icon');
        DOM.notificationClose = DOM.notification?.querySelector('.notification-close');
        
        console.log(' Elementos DOM del dashboard inicializados');
        
    } catch (error) {
        console.error(' Error al inicializar elementos DOM:', error);
    }
}

function setupEventListeners() {
    try {
        // Navegación lateral
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                if (section) {
                    navigateToSection(section);
                }
            });
        });
        
        // Botón de logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        // Menú móvil
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const menuOverlay = document.getElementById('menuOverlay');
        
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                menuOverlay.classList.toggle('active');
            });
        }
        
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                menuOverlay.classList.remove('active');
            });
        }
        
        // Formularios
        setupFormListeners();
        
        // Cerrar notificaciones
        DOM.notificationClose?.addEventListener('click', hideNotification);
        
        console.log(' Event listeners del dashboard configurados');
        
    } catch (error) {
        console.error('Error al configurar event listeners:', error);
    }
}

function setupFormListeners() {
    // Formulario de consignación
    const depositForm = document.getElementById('depositForm');
    if (depositForm) {
        depositForm.addEventListener('submit', handleDeposit);
    }
    
    // Formulario de retiro
    const withdrawalForm = document.getElementById('withdrawalForm');
    if (withdrawalForm) {
        withdrawalForm.addEventListener('submit', handleWithdrawal);
    }
    
    // Formulario de servicios
    const billsForm = document.getElementById('billsForm');
    if (billsForm) {
        billsForm.addEventListener('submit', handleBillPayment);
    }
    
    // Formulario de extracto
    const statementForm = document.getElementById('statementForm');
    if (statementForm) {
        statementForm.addEventListener('submit', handleStatementRequest);
    }
    
    // Formulario de transferencia
    const searchUserForm = document.getElementById('searchUserForm');
    if (searchUserForm) {
        searchUserForm.addEventListener('submit', handleUserSearch);
    }
    
    const transferForm = document.getElementById('transferForm');
    if (transferForm) {
        transferForm.addEventListener('submit', handleTransferSubmit);
    }
}


// NAVEGACIÓN ENTRE SECCIONES


function navigateToSection(sectionName) {
    try {
        // Actualizar navegación activa
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        
        const activeItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
        
        // Ocultar todas las secciones
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => section.classList.remove('active'));
        
        // Mostrar sección solicitada
        const targetSection = document.getElementById(`${sectionName}Section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Actualizar título
        const titles = {
            'dashboard': 'Resumen de Cuenta',
            'transactions': 'Resumen de Transacciones',
            'deposit': 'Consignación Electrónica',
            'withdrawal': 'Retiro de Dinero',
            'bills': 'Pago de Servicios',
            'statement': 'Extracto Bancario',
            'certificate': 'Certificado Bancario',
            'transfer': 'Transferir Dinero'
        };
        
        const sectionTitle = document.getElementById('sectionTitle');
        if (sectionTitle && titles[sectionName]) {
            sectionTitle.textContent = titles[sectionName];
        }
        
        // Inicializar datos específicos de la sección
        initializeSectionData(sectionName);
        
        console.log(' Navegando a sección:', sectionName);
        
    } catch (error) {
        console.error(' Error al navegar:', error);
    }
}

function initializeSectionData(sectionName) {
    switch (sectionName) {
        case 'dashboard':
            updateDashboardInterface();
            break;
        case 'transactions':
            displayTransactions();
            break;
        case 'deposit':
            initializeDepositForm();
            break;
        case 'withdrawal':
            initializeWithdrawalForm();
            break;
        case 'bills':
            initializeBillsForm();
            break;
        case 'statement':
            initializeStatementForm();
            break;
        case 'certificate':
            generateCertificate();
            break;
        case 'transfer':
            initializeTransferForm();
            break;
    }
}

function initializeBankingSystem() {
    try {
        // Inicializar datos de cuenta
        if (!accountData.accountNumber && userData.uid) {
            accountData.accountNumber = `4567-8901-2345-${userData.uid.slice(-4)}`;
        }
        
        // Mostrar dashboard por defecto
        navigateToSection('dashboard');
        
        console.log(' Sistema bancario inicializado');
        
    } catch (error) {
        console.error(' Error al inicializar sistema bancario:', error);
    }
}


// GESTIÓN DE TRANSACCIONES


function generateReferenceNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `REF${timestamp.slice(-6)}${random}`;
}

function createTransaction(type, description, amount, serviceType = null) {
    const transaction = {
        id: generateReferenceNumber(),
        fecha: new Date().toISOString(),
        tipo: type,
        descripcion: description,
        valor: amount,
        servicioTipo: serviceType,
        saldoAnterior: accountData.balance,
        saldoNuevo: type === 'Consignación' ? accountData.balance + amount : accountData.balance - amount
    };
    
    // Actualizar saldo
    if (type === 'Consignación') {
        accountData.balance += amount;
    } else {
        accountData.balance -= amount;
    }
    
    // Agregar transacción
    accountData.transactions.unshift(transaction);
    
    // Guardar en localStorage
    saveTransactionsToStorage();
    
    console.log(' Transacción creada:', transaction);
    return transaction;
}

function saveTransactionsToStorage() {
    try {
        const dataToSave = {
            balance: accountData.balance,
            transactions: accountData.transactions,
            accountNumber: accountData.accountNumber,
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('bankAccountData', JSON.stringify(dataToSave));
        console.log(' Datos guardados en localStorage');
        
    } catch (error) {
        console.error(' Error al guardar datos:', error);
    }
}

function loadTransactionsFromStorage() {
    try {
        const savedData = localStorage.getItem('bankAccountData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            accountData.balance = parsedData.balance || 500000;
            accountData.transactions = parsedData.transactions || [];
            console.log('📄 Transacciones cargadas desde localStorage');
        }
    } catch (error) {
        console.error(' Error al cargar transacciones:', error);
    }
}


// INTERFAZ DE USUARIO


function updateUserInterface() {
    try {
        // Actualizar nombre de usuario
        const userNameElements = document.querySelectorAll('#userName, #fullName, #transferFromHolder, #depositAccountHolder, #withdrawalAccountHolder, #billsAccountHolder, #statementAccountHolder, #certificateHolderName');
        userNameElements.forEach(element => {
            if (element && userData.nombre) {
                element.textContent = userData.nombre;
            }
        });
        
        // Actualizar email
        const userEmailElements = document.querySelectorAll('#userEmail, #emailDisplay');
        userEmailElements.forEach(element => {
            if (element && userData.email) {
                element.textContent = userData.email;
            }
        });
        
        // Actualizar número de cuenta
        const accountNumberElements = document.querySelectorAll('#accountNumberDisplay, #transferFromAccount, #depositAccountNumber, #withdrawalAccountNumber, #billsAccountNumber, #statementAccountNumber, #certificateAccountNumber');
        accountNumberElements.forEach(element => {
            if (element && accountData.accountNumber) {
                element.textContent = accountData.accountNumber;
            }
        });
        
        // Actualizar fecha de creación
        const creationDateElements = document.querySelectorAll('#accountCreationDate, #certificateCreationDate');
        creationDateElements.forEach(element => {
            if (element && userData.fechaCreacion) {
                const date = new Date(userData.fechaCreacion);
                element.textContent = date.toLocaleDateString('es-ES');
            }
        });
        
        console.log(' Interfaz de usuario actualizada');
        
    } catch (error) {
        console.error(' Error al actualizar interfaz de usuario:', error);
    }
}

function updateDashboardInterface() {
    try {
        // Actualizar saldo principal
        const balanceElements = document.querySelectorAll('#currentBalance, #transferAvailableBalance, #withdrawalBalance, #billsBalance');
        balanceElements.forEach(element => {
            if (element) {
                element.textContent = `$${accountData.balance.toLocaleString('es-ES')}`;
            }
        });
        
        // Actualizar total de transacciones
        const totalTransactionsElement = document.getElementById('totalTransactions');
        if (totalTransactionsElement) {
            totalTransactionsElement.textContent = accountData.transactions.length;
        }
        
        // Actualizar actividad reciente
        displayRecentActivity();
        
        console.log('Dashboard actualizado');
        
    } catch (error) {
        console.error(' Error al actualizar dashboard:', error);
    }
}

function displayRecentActivity() {
    const recentActivityContainer = document.getElementById('recentActivity');
    if (!recentActivityContainer) return;
    
    if (accountData.transactions.length === 0) {
        recentActivityContainer.innerHTML = `
            <div class="no-transactions">
                <i class="fas fa-info-circle"></i>
                <p>No hay transacciones recientes</p>
            </div>
        `;
        return;
    }
    
    const recentTransactions = accountData.transactions.slice(0, 3);
    recentActivityContainer.innerHTML = recentTransactions.map(transaction => `
        <div class="info-item">
            <span class="label">${transaction.tipo}:</span>
            <span class="value ${transaction.tipo === 'Consignación' ? 'credit' : 'debit'}">
                ${transaction.tipo === 'Consignación' ? '+' : '-'}$${Math.abs(transaction.valor).toLocaleString('es-ES')}
            </span>
        </div>
    `).join('');
}


// RESUMEN DE TRANSACCIONES


function displayTransactions() {
    const transactionsTable = document.getElementById('transactionsTable');
    if (!transactionsTable) return;
    
    if (accountData.transactions.length === 0) {
        transactionsTable.innerHTML = `
            <div class="no-transactions">
                <i class="fas fa-info-circle"></i>
                <p>No hay transacciones registradas</p>
            </div>
        `;
        return;
    }
    
    const last10Transactions = accountData.transactions.slice(0, 10);
    
    transactionsTable.innerHTML = `
        <table class="transactions-table-display">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Referencia</th>
                    <th>Tipo</th>
                    <th>Concepto</th>
                    <th>Valor</th>
                </tr>
            </thead>
            <tbody>
                ${last10Transactions.map(transaction => `
                    <tr>
                        <td>${new Date(transaction.fecha).toLocaleDateString('es-ES')}</td>
                        <td class="account-number">${transaction.id}</td>
                        <td>${transaction.tipo}</td>
                        <td>${transaction.descripcion}</td>
                        <td class="${transaction.tipo === 'Consignación' ? 'credit' : 'debit'}">
                            ${transaction.tipo === 'Consignación' ? '+' : '-'}$${Math.abs(transaction.valor).toLocaleString('es-ES')}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// CONSIGNACIÓN ELECTRÓNICA


function initializeDepositForm() {
    updateUserInterface();
}

async function handleDeposit(e) {
    e.preventDefault();
    
    const depositAmount = document.getElementById('depositAmount');
    const amount = parseFloat(depositAmount.value);
    
    if (!amount || amount < 1000) {
        showNotification('El monto mínimo de consignación es $1,000', 'error');
        return;
    }
    
    try {
        showNotification('Procesando consignación...', 'info');
        
        const transaction = createTransaction(
            'Consignación',
            'Consignación por canal electrónico',
            amount
        );
        
        updateDashboardInterface();
        displayTransactionSummary(transaction);
        
        depositAmount.value = '';
        showNotification('Consignación realizada exitosamente', 'success');
        
    } catch (error) {
        console.error (' Error en consignación:', error);
        showNotification('Error al procesar la consignación', 'error');
    }
}


// RETIRO DE DINERO


function initializeWithdrawalForm() {
    updateUserInterface();
}

async function handleWithdrawal(e) {
    e.preventDefault();
    
    const withdrawalAmount = document.getElementById('withdrawalAmount');
    const amount = parseFloat(withdrawalAmount.value);
    
    if (!amount || amount < 10000) {
        showNotification('El monto mínimo de retiro es $10,000', 'error');
        return;
    }
    
    if (amount > accountData.balance) {
        showNotification('Saldo insuficiente para realizar el retiro', 'error');
        return;
    }
    
    try {
        showNotification('Procesando retiro...', 'info');
        
        const transaction = createTransaction(
            'Retiro',
            'Retiro de dinero',
            amount
        );
        
        updateDashboardInterface();
        displayTransactionSummary(transaction);
        
        withdrawalAmount.value = '';
        showNotification('Retiro realizado exitosamente', 'success');
        
    } catch (error) {
        console.error(' Error en retiro:', error);
        showNotification('Error al procesar el retiro', 'error');
    }
}


// PAGO DE SERVICIOS PÚBLICOS


function initializeBillsForm() {
    updateUserInterface();
}

async function handleBillPayment(e) {
    e.preventDefault();
    
    const serviceType = document.getElementById('serviceType').value;
    const serviceReference = document.getElementById('serviceReference').value;
    const billAmount = parseFloat(document.getElementById('billAmount').value);
    
    if (!serviceType) {
        showNotification('Selecciona un tipo de servicio', 'error');
        return;
    }
    
    if (!serviceReference.trim()) {
        showNotification('Ingresa la referencia del servicio', 'error');
        return;
    }
    
    if (!billAmount || billAmount < 1000) {
        showNotification('El monto mínimo de pago es $1,000', 'error');
        return;
    }
    
    if (billAmount > accountData.balance) {
        showNotification('Saldo insuficiente para realizar el pago', 'error');
        return;
    }
    
    try {
        showNotification('Procesando pago...', 'info');
        
        const transaction = createTransaction(
            'Retiro',
            `Pago de servicio público ${serviceType}`,
            billAmount,
            serviceType
        );
        
        // Agregar referencia del servicio a la transacción
        transaction.referenciaServicio = serviceReference;
        
        updateDashboardInterface();
        displayTransactionSummary(transaction);
        
        // Limpiar formulario
        document.getElementById('serviceType').value = '';
        document.getElementById('serviceReference').value = '';
        document.getElementById('billAmount').value = '';
        
        showNotification('Pago realizado exitosamente', 'success');
        
    } catch (error) {
        console.error(' Error en pago de servicios:', error);
        showNotification('Error al procesar el pago', 'error');
    }
}


// EXTRACTO BANCARIO


function initializeStatementForm() {
    updateUserInterface();
    
    // Llenar años disponibles
    const yearSelect = document.getElementById('statementYear');
    if (yearSelect) {
        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '';
        
        for (let year = currentYear; year >= currentYear - 5; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    }
}

async function handleStatementRequest(e) {
    e.preventDefault();
    
    const year = document.getElementById('statementYear').value;
    const month = document.getElementById('statementMonth').value;
    
    if (!year || !month) {
        showNotification('Selecciona año y mes', 'error');
        return;
    }
    
    try {
        showNotification('Generando extracto...', 'info');
        
        const filteredTransactions = accountData.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.fecha);
            return transactionDate.getFullYear() == year && 
                   (transactionDate.getMonth() + 1).toString().padStart(2, '0') == month;
        });
        
        displayStatement(filteredTransactions, year, month);
        showNotification('Extracto generado exitosamente', 'success');
        
    } catch (error) {
        console.error('❌ Error al generar extracto:', error);
        showNotification('Error al generar el extracto', 'error');
    }
}

function displayStatement(transactions, year, month) {
    const statementResults = document.getElementById('statementResults');
    const statementTable = document.getElementById('statementTable');
    
    if (!statementResults || !statementTable) return;
    
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    if (transactions.length === 0) {
        statementTable.innerHTML = `
            <div class="statement-header">
                <h4>Extracto Bancario - ${monthNames[parseInt(month) - 1]} ${year}</h4>
                <p>Cuenta: ${accountData.accountNumber}</p>
                <p>Titular: ${userData.nombre}</p>
            </div>
            <div class="no-transactions">
                <i class="fas fa-info-circle"></i>
                <p>No hay movimientos en el período seleccionado</p>
            </div>
        `;
    } else {
        statementTable.innerHTML = `
            <div class="statement-header">
                <h4>Extracto Bancario - ${monthNames[parseInt(month) - 1]} ${year}</h4>
                <p>Cuenta: ${accountData.accountNumber}</p>
                <p>Titular: ${userData.nombre}</p>
                <p>Total de movimientos: ${transactions.length}</p>
            </div>
            <table class="transactions-table-display">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Referencia</th>
                        <th>Tipo</th>
                        <th>Concepto</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(transaction => `
                        <tr>
                            <td>${new Date(transaction.fecha).toLocaleDateString('es-ES')}</td>
                            <td class="account-number">${transaction.id}</td>
                            <td>${transaction.tipo}</td>
                            <td>${transaction.descripcion}</td>
                            <td class="${transaction.tipo === 'Consignación' ? 'credit' : 'debit'}">
                                ${transaction.tipo === 'Consignación' ? '+' : '-'}$${Math.abs(transaction.valor).toLocaleString('es-ES')}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    statementResults.style.display = 'block';
}

// ===================================
// CERTIFICADO BANCARIO
// ===================================

function generateCertificate() {
    updateUserInterface();
    
    // Actualizar fecha de expedición
    const certificateIssueDate = document.getElementById('certificateIssueDate');
    if (certificateIssueDate) {
        certificateIssueDate.textContent = new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// ===================================
// TRANSFERIR DINERO
// ===================================

function initializeTransferForm() {
    updateUserInterface();
    resetTransferForm();
}

function resetTransferForm() {
    // Mostrar paso 1 y ocultar otros pasos
    const searchStep = document.getElementById('searchUserStep');
    const formStep = document.getElementById('transferFormStep');
    const confirmStep = document.getElementById('transferConfirmStep');
    
    if (searchStep) searchStep.style.display = 'block';
    if (formStep) formStep.style.display = 'none';
    if (confirmStep) confirmStep.style.display = 'none';
    
    selectedRecipient = null;
    transferData = {};
}

async function handleUserSearch(e) {
    e.preventDefault();
    
    const recipientEmail = document.getElementById('recipientSearch').value.trim();
    
    if (!recipientEmail) {
        showNotification('Ingresa un email válido', 'error');
        return;
    }
    
    if (recipientEmail === userData.email) {
        showNotification('No puedes transferir a tu propia cuenta', 'error');
        return;
    }
    
    try {
        showNotification('Buscando usuario...', 'info');
        
        // Simular búsqueda de usuario
        const foundUser = await simulateUserSearch(recipientEmail);
        
        displaySearchResults(foundUser, recipientEmail);
        
    } catch (error) {
        console.error('❌ Error en búsqueda:', error);
        showNotification('Error al buscar usuario', 'error');
    }
}

async function simulateUserSearch(email) {
    try {
        // Mostrar loading
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Primero verificar si tenemos acceso a Firebase
        if (!auth || !firebaseFunctions) {
            console.log('⚠️ Firebase no disponible, usando búsqueda local');
            return await searchInLocalUsers(email);
        }
        
        // Si tenemos Firestore disponible, buscar en la base de datos
        if (window.firebaseFirestore) {
            return await searchInFirestore(email);
        }
        
        // Si solo tenemos Auth, buscar por métodos de Auth
        return await searchWithAuth(email);
        
    } catch (error) {
        console.error('❌ Error en búsqueda:', error);
        // Fallback a búsqueda local si hay error
        return await searchInLocalUsers(email);
    }
}

// Buscar en Firestore
async function searchInFirestore(email) {
    try {
        console.log('🔍 Buscando en Firestore:', email);
        
        const db = window.firebaseFirestore;
        const usersRef = db.collection('users');
        const querySnapshot = await usersRef.where('email', '==', email.toLowerCase()).get();
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            console.log('✅ Usuario encontrado en Firestore:', userData);
            
            return {
                email: userData.email,
                nombre: userData.nombre || userData.displayName || userData.email.split('@')[0],
                accountNumber: userData.accountNumber || `4567-8901-2345-${userDoc.id.slice(-4)}`
            };
        }
        
        console.log('❌ Usuario no encontrado en Firestore');
        return null;
        
    } catch (error) {
        console.error('❌ Error buscando en Firestore:', error);
        return null;
    }
}

// Buscar usando Firebase Auth (método alternativo)
async function searchWithAuth(email) {
    try {
        console.log('🔍 Buscando con Auth methods:', email);
        
        // Intentar obtener información básica del usuario
        // Nota: Firebase Auth no permite buscar otros usuarios directamente por seguridad
        // Esta es una implementación alternativa que simula la búsqueda
        
        // Verificar si el email tiene formato válido
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return null;
        }
        
        // Simular búsqueda exitosa para emails con formato válido
        // En un entorno real, esto debería conectarse a tu backend o Cloud Functions
        console.log('⚠️ Simulando búsqueda con Auth - considera implementar Cloud Functions');
        
        return {
            email: email,
            nombre: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            accountNumber: `4567-8901-2345-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`
        };
        
    } catch (error) {
        console.error('❌ Error en búsqueda con Auth:', error);
        return null;
    }
}

// Búsqueda local como fallback
async function searchInLocalUsers(email) {
    console.log('🔍 Búsqueda local para:', email);
    
    // Lista de usuarios de prueba expandida
    const mockUsers = [
        { email: 'maria.gonzalez@email.com', nombre: 'María González', accountNumber: '4567-8901-2345-1234' },
        { email: 'juan.perez@email.com', nombre: 'Juan Pérez', accountNumber: '4567-8901-2345-5678' },
        { email: 'ana.rodriguez@email.com', nombre: 'Ana Rodríguez', accountNumber: '4567-8901-2345-9012' },
        { email: 'carlos.martinez@email.com', nombre: 'Carlos Martínez', accountNumber: '4567-8901-2345-3456' },
        { email: 'test@test.com', nombre: 'Usuario de Prueba', accountNumber: '4567-8901-2345-0000' },
        { email: 'demo@banco.com', nombre: 'Demo Usuario', accountNumber: '4567-8901-2345-1111' }
    ];
    
    const foundUser = mockUsers.find(user => user.email.toLowerCase() === email.toLowerCase());
    
    if (foundUser) {
        console.log('✅ Usuario encontrado localmente:', foundUser);
    } else {
        console.log('❌ Usuario no encontrado localmente');
    }
    
    return foundUser || null;
}

function displaySearchResults(foundUser, searchEmail) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    
    if (foundUser) {
        searchResults.innerHTML = `
            <div class="user-found">
                <div class="user-card">
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="user-details">
                        <h4>${foundUser.nombre}</h4>
                        <p class="user-email">${foundUser.email}</p>
                        <p class="user-account">Cuenta: ${foundUser.accountNumber}</p>
                    </div>
                    <button class="select-user-btn" onclick="selectRecipient('${foundUser.email}', '${foundUser.nombre}', '${foundUser.accountNumber}')">
                        <i class="fas fa-check"></i> Seleccionar
                    </button>
                </div>
            </div>
        `;
    } else {
        searchResults.innerHTML = `
            <div class="no-user-found">
                <i class="fas fa-user-times"></i>
                <h4>Usuario no encontrado</h4>
                <p>No se encontró ningún usuario con el email: <strong>${searchEmail}</strong></p>
                <p>Verifica que el email esté escrito correctamente.</p>
                <p>El usuario debe estar registrado en Banco ACME.</p>
            </div>
        `;
    }
    
    searchResults.style.display = 'block';
    hideNotification();
}

function selectRecipient(email, nombre, accountNumber) {
    selectedRecipient = { email, nombre, accountNumber };
    
    // Mostrar información del destinatario
    const recipientInfo = document.getElementById('recipientInfo');
    if (recipientInfo) {
        recipientInfo.innerHTML = `
            <div class="recipient-card">
                <h5>Destinatario Seleccionado</h5>
                <div class="recipient-details">
                    <div class="detail-row">
                        <span class="label">Nombre:</span>
                        <span class="value">${nombre}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Email:</span>
                        <span class="value">${email}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Cuenta:</span>
                        <span class="value account-number">${accountNumber}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Ocultar paso 1 y mostrar paso 2
    document.getElementById('searchUserStep').style.display = 'none';
    document.getElementById('transferFormStep').style.display = 'block';
    
    showNotification('Usuario seleccionado correctamente', 'success');
}

async function handleTransferSubmit(e) {
    e.preventDefault();
    
    const transferAmount = parseFloat(document.getElementById('transferAmount').value);
    const transferDescription = document.getElementById('transferDescription').value.trim();
    
    if (!transferAmount || transferAmount < 1000) {
        showNotification('El monto mínimo de transferencia es $1,000', 'error');
        return;
    }
    
    if (transferAmount > accountData.balance) {
        showNotification('Saldo insuficiente para realizar la transferencia', 'error');
        return;
    }
    
    if (!selectedRecipient) {
        showNotification('Selecciona un destinatario válido', 'error');
        return;
    }
    
    transferData = {
        recipient: selectedRecipient,
        amount: transferAmount,
        description: transferDescription || 'Transferencia entre cuentas'
    };
    
    displayTransferConfirmation();
}

function displayTransferConfirmation() {
    const transferSummary = document.getElementById('transferSummary');
    if (!transferSummary) return;
    
    transferSummary.innerHTML = `
        <div class="transfer-confirmation">
            <div class="transfer-detail">
                <h5>Resumen de Transferencia</h5>
                
                <div class="summary-section">
                    <h6>Cuenta Origen</h6>
                    <div class="account-summary">
                        <p><strong>Titular:</strong> <span>${userData.nombre}</span></p>
                        <p><strong>Cuenta:</strong> <span class="account-number">${accountData.accountNumber}</span></p>
                        <p><strong>Saldo actual:</strong> <span>$${accountData.balance.toLocaleString('es-ES')}</span></p>
                    </div>
                </div>
                
                <div class="summary-section">
                    <h6>Cuenta Destino</h6>
                    <div class="account-summary">
                        <p><strong>Titular:</strong> <span>${transferData.recipient.nombre}</span></p>
                        <p><strong>Cuenta:</strong> <span class="account-number">${transferData.recipient.accountNumber}</span></p>
                        <p><strong>Email:</strong> <span>${transferData.recipient.email}</span></p>
                    </div>
                </div>
                
                <div class="summary-section">
                    <h6>Detalles de la Transferencia</h6>
                    <div class="transfer-details">
                        <p><strong>Monto:</strong> <span class="debit">$${transferData.amount.toLocaleString('es-ES')}</span></p>
                        <p><strong>Descripción:</strong> <span>${transferData.description}</span></p>
                        <p><strong>Nuevo saldo:</strong> <span>$${(accountData.balance - transferData.amount).toLocaleString('es-ES')}</span></p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Ocultar paso 2 y mostrar paso 3
    document.getElementById('transferFormStep').style.display = 'none';
    document.getElementById('transferConfirmStep').style.display = 'block';
}

function confirmTransfer() {
    try {
        showNotification('Procesando transferencia...', 'info');
        
        const transaction = createTransaction(
            'Transferencia',
            `Transferencia a ${transferData.recipient.nombre} - ${transferData.description}`,
            transferData.amount
        );
        
        // Agregar datos adicionales de la transferencia
        transaction.destinatario = transferData.recipient;
        
        updateDashboardInterface();
        displayTransactionSummary(transaction);
        
        resetTransferForm();
        showNotification('Transferencia realizada exitosamente', 'success');
        
        // Volver al dashboard después de un momento
        setTimeout(() => {
            navigateToSection('dashboard');
        }, 3000);
        
    } catch (error) {
        console.error('❌ Error en transferencia:', error);
        showNotification('Error al procesar la transferencia', 'error');
    }
}

function cancelTransfer() {
    resetTransferForm();
    showNotification('Transferencia cancelada', 'info');
}

// ===================================
// RESUMEN DE TRANSACCIÓN
// ===================================

function displayTransactionSummary(transaction) {
    const modal = document.getElementById('transactionModal');
    const summary = document.getElementById('transactionSummary');
    
    if (!modal || !summary) return;
    
    const isCredit = transaction.tipo === 'Consignación';
    const typeIcon = isCredit ? 'fas fa-plus-circle' : 'fas fa-minus-circle';
    const typeClass = isCredit ? 'credit' : 'debit';
    
    let summaryContent = `
        <div class="transaction-summary-content">
            <div class="summary-header">
                <i class="${typeIcon}"></i>
                <h4>Transacción ${isCredit ? 'Exitosa' : 'Procesada'}</h4>
                <p>Tu ${transaction.tipo.toLowerCase()} se ha procesado correctamente</p>
            </div>
            
            <div class="summary-details">
                <div class="detail-row">
                    <span class="label">Número de Referencia:</span>
                    <span class="value account-number">${transaction.id}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Fecha y Hora:</span>
                    <span class="value">${new Date(transaction.fecha).toLocaleString('es-ES')}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Tipo de Transacción:</span>
                    <span class="value">${transaction.tipo}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Descripción:</span>
                    <span class="value">${transaction.descripcion}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Valor:</span>
                    <span class="value ${typeClass}">
                        ${isCredit ? '+' : '-'}$${Math.abs(transaction.valor).toLocaleString('es-ES')}
                    </span>
                </div>
    `;
    
    // Agregar información específica según el tipo de transacción
    if (transaction.servicioTipo) {
        summaryContent += `
                <div class="detail-row">
                    <span class="label">Tipo de Servicio:</span>
                    <span class="value">${transaction.servicioTipo}</span>
                </div>
        `;
        
        if (transaction.referenciaServicio) {
            summaryContent += `
                <div class="detail-row">
                    <span class="label">Referencia del Servicio:</span>
                    <span class="value">${transaction.referenciaServicio}</span>
                </div>
            `;
        }
    }
    
    if (transaction.destinatario) {
        summaryContent += `
            </div>
            
            <div class="service-details">
                <h6>Información del Destinatario</h6>
                <div class="detail-row">
                    <span class="label">Nombre:</span>
                    <span class="value">${transaction.destinatario.nombre}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Cuenta:</span>
                    <span class="value account-number">${transaction.destinatario.accountNumber}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Email:</span>
                    <span class="value">${transaction.destinatario.email}</span>
                </div>
        `;
    }
    
    summaryContent += `
                <div class="detail-row">
                    <span class="label">Saldo Anterior:</span>
                    <span class="value">$${transaction.saldoAnterior.toLocaleString('es-ES')}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Nuevo Saldo:</span>
                    <span class="value">$${transaction.saldoNuevo.toLocaleString('es-ES')}</span>
                </div>
            </div>
        </div>
    `;
    
    summary.innerHTML = summaryContent;
    modal.style.display = 'flex';
}

function closeTransactionModal() {
    const modal = document.getElementById('transactionModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ===================================
// FUNCIONES DE IMPRESIÓN
// ===================================

function printTransactions() {
    const printContent = generateTransactionsPrintContent();
    openPrintWindow(printContent, 'Resumen de Transacciones');
}

function printStatement() {
    const statementTable = document.getElementById('statementTable');
    if (!statementTable) {
        showNotification('No hay extracto para imprimir', 'error');
        return;
    }
    
    const printContent = generateStatementPrintContent();
    openPrintWindow(printContent, 'Extracto Bancario');
}

function printCertificate() {
    const certificate = document.getElementById('certificateContent');
    if (!certificate) {
        showNotification('No hay certificado para imprimir', 'error');
        return;
    }
    
    const printContent = generateCertificatePrintContent();
    openPrintWindow(printContent, 'Certificado Bancario');
}

function printTransactionSummary() {
    const summary = document.getElementById('transactionSummary');
    if (!summary) {
        showNotification('No hay resumen para imprimir', 'error');
        return;
    }
    
    const printContent = generateTransactionSummaryPrintContent();
    openPrintWindow(printContent, 'Resumen de Transacción');
}

function generateTransactionsPrintContent() {
    const last10Transactions = accountData.transactions.slice(0, 10);
    
    return `
        <html>
        <head>
            <title>Resumen de Transacciones - Banco ACME</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2a5298; padding-bottom: 20px; }
                .bank-name { color: #2a5298; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                .document-title { font-size: 18px; margin-bottom: 5px; }
                .account-info { margin: 20px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #2a5298; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #f8f9fa; font-weight: bold; }
                .credit { color: #28a745; font-weight: bold; }
                .debit { color: #dc3545; font-weight: bold; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="bank-name">BANCO ACME</div>
                <div class="document-title">RESUMEN DE TRANSACCIONES</div>
                <div>Últimas 10 Operaciones</div>
            </div>
            
            <div class="account-info">
                <p><strong>Titular:</strong> ${userData.nombre}</p>
                <p><strong>Número de Cuenta:</strong> ${accountData.accountNumber}</p>
                <p><strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
                <p><strong>Saldo Actual:</strong> $${accountData.balance.toLocaleString('es-ES')}</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Referencia</th>
                        <th>Tipo</th>
                        <th>Concepto</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${last10Transactions.map(transaction => `
                        <tr>
                            <td>${new Date(transaction.fecha).toLocaleDateString('es-ES')}</td>
                            <td>${transaction.id}</td>
                            <td>${transaction.tipo}</td>
                            <td>${transaction.descripcion}</td>
                            <td class="${transaction.tipo === 'Consignación' ? 'credit' : 'debit'}">
                                ${transaction.tipo === 'Consignación' ? '+' : '-'}$${Math.abs(transaction.valor).toLocaleString('es-ES')}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <p>Banco ACME - Banca Digital Segura</p>
                <p>Documento generado el ${new Date().toLocaleString('es-ES')}</p>
            </div>
        </body>
        </html>
    `;
}

function generateStatementPrintContent() {
    const statementTable = document.getElementById('statementTable');
    return `
        <html>
        <head>
            <title>Extracto Bancario - Banco ACME</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2a5298; padding-bottom: 20px; }
                .bank-name { color: #2a5298; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                .account-info { margin: 20px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #2a5298; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #f8f9fa; font-weight: bold; }
                .credit { color: #28a745; font-weight: bold; }
                .debit { color: #dc3545; font-weight: bold; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="bank-name">BANCO ACME</div>
            </div>
            ${statementTable.innerHTML}
            <div class="footer">
                <p>Banco ACME - Banca Digital Segura</p>
                <p>Documento generado el ${new Date().toLocaleString('es-ES')}</p>
            </div>
        </body>
        </html>
    `;
}
//certificar
function generateCertificatePrintContent() {
    const certificate = document.getElementById('certificateContent');
    return `
        <html>
        <head>
            <title>Certificado Bancario - Banco ACME</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .certificate { max-width: 800px; margin: 0 auto; padding: 3rem; background: #ffffff; border: 3px solid #2a5298; border-radius: 10px; }
                .certificate-header { text-align: center; margin-bottom: 3rem; padding-bottom: 2rem; border-bottom: 2px solid #2a5298; }
                .bank-logo { margin-bottom: 1.5rem; }
                .bank-logo h2 { color: #1e3c72; font-size: 2rem; font-weight: 700; letter-spacing: 2px; }
                .certificate-title h3 { color: #2a5298; font-size: 1.5rem; font-weight: 600; letter-spacing: 1px; }
                .certificate-body { line-height: 1.8; font-size: 1rem; }
                .certificate-text { margin-bottom: 2rem; font-size: 1.125rem; text-align: justify; }
                .certificate-info { margin-bottom: 2rem; }
                .certificate-info p { margin-bottom: 1rem; text-align: justify; }
                .account-details { background: #f8f9fa; padding: 2rem; border-radius: 10px; margin: 2rem 0; border-left: 4px solid #2a5298; }
                .account-details p { margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; }
                .account-details p:last-child { margin-bottom: 0; }
                .certificate-footer-text { margin-top: 2rem; font-style: italic; text-align: justify; }
                .certificate-footer { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e0e0e0; }
                .date-issued { margin-bottom: 3rem; }
                .signature-section { text-align: center; }
                .signature-line { width: 300px; height: 1px; background: #333333; margin: 0 auto 1rem; }
                .signature-section p { margin-bottom: 0.25rem; font-weight: 600; }
            </style>
        </head>
        <body>
            ${certificate.outerHTML}
        </body>
        </html>
    `;
}

function generateTransactionSummaryPrintContent() {
    const summary = document.getElementById('transactionSummary');
    return `
        <html>
        <head>
            <title>Resumen de Transacción - Banco ACME</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2a5298; padding-bottom: 20px; }
                .bank-name { color: #2a5298; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                .credit { color: #28a745; font-weight: bold; }
                .debit { color: #dc3545; font-weight: bold; }
                .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                .label { font-weight: bold; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="bank-name">BANCO ACME</div>
                <div>COMPROBANTE DE TRANSACCIÓN</div>
            </div>
            ${summary.innerHTML}
            <div class="footer">
                <p>Banco ACME - Banca Digital Segura</p>
                <p>Documento generado el ${new Date().toLocaleString('es-ES')}</p>
            </div>
        </body>
        </html>
    `;
}

function openPrintWindow(content, title) {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

// ===================================
// LOGOUT Y REDIRECCIÓN
// ===================================

async function handleLogout() {
    try {
        console.log('🚪 DASHBOARD: Iniciando logout MANUAL...');
        showNotification('Cerrando sesión...', 'info');
        
        redirectReason = 'LOGOUT_MANUAL';
        
        sessionStorage.removeItem('userData');
        localStorage.removeItem('bankAccountData');
        
        if (auth && firebaseFunctions) {
            await firebaseFunctions.signOut(auth);
            console.log('✅ DASHBOARD: Sesión de Firebase cerrada');
        }
        
        console.log('✅ DASHBOARD: Logout completado');
        redirectToLogin('LOGOUT_MANUAL');
        
    } catch (error) {
        console.error('❌ DASHBOARD: Error al cerrar sesión:', error);
        showNotification('Error al cerrar sesión', 'error');
        setTimeout(() => {
            redirectToLogin('LOGOUT_ERROR');
        }, 2000);
    }
}

function redirectToLogin(reason = 'UNKNOWN') {
    if (isRedirecting) {
        console.log('⚠️ DASHBOARD: Ya redirigiendo al login, ignorando...');
        return;
    }
    
    if (preventRedirect && reason !== 'LOGOUT_MANUAL') {
        console.log('🛡️ DASHBOARD: Redirección automática bloqueada - Razón:', reason);
        return;
    }
    
    isRedirecting = true;
    redirectReason = reason;
    
    console.log('🔄 DASHBOARD: Redirigiendo al login...');
    console.log('📋 DASHBOARD: Razón de redirección:', reason);
    
    if (reason !== 'LOGOUT_MANUAL') {
        sessionStorage.removeItem('userData');
    }
    
    let message = 'Redirigiendo al login...';
    switch (reason) {
        case 'LOGOUT_MANUAL':
            message = 'Sesión cerrada. Redirigiendo...';
            break;
        case 'NO_SESSION_DATA':
            message = 'Sesión expirada. Redirigiendo...';
            break;
        case 'NO_FIREBASE_USER':
            message = 'Autenticación perdida. Redirigiendo...';
            break;
        case 'LOGOUT_ERROR':
            message = 'Error en logout. Redirigiendo...';
            break;
    }
    
    showNotification(message, 'info', 2000);
    
    setTimeout(() => {
        console.log('🔄 DASHBOARD: Ejecutando redirección a /incio/');
        window.location.href = '../incio/index.html';
    }, 1000);
}

// ===================================
// SISTEMA DE NOTIFICACIONES
// ===================================

function showNotification(message, type = 'info', duration = 5000) {
    if (!DOM.notification || !DOM.notificationMessage || !DOM.notificationIcon) {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        return;
    }
    
    DOM.notification.className = 'notification';
    DOM.notificationMessage.textContent = message;
    DOM.notification.classList.add(type);
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    DOM.notificationIcon.className = `notification-icon ${icons[type] || icons.info}`;
    
    DOM.notification.classList.remove('hidden');
    DOM.notification.setAttribute('role', 'alert');
    
    if (duration > 0) {
        setTimeout(hideNotification, duration);
    }
    
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
}

function hideNotification() {
    if (DOM.notification) {
        DOM.notification.classList.add('hidden');
        DOM.notification.removeAttribute('role');
    }
}

// ===================================
// FUNCIONES GLOBALES PARA WINDOW
// ===================================

// Hacer funciones disponibles globalmente para los botones HTML
window.selectRecipient = selectRecipient;
window.confirmTransfer = confirmTransfer;
window.cancelTransfer = cancelTransfer;
window.closeTransactionModal = closeTransactionModal;
window.printTransactions = printTransactions;
window.printStatement = printStatement;
window.printCertificate = printCertificate;
window.printTransactionSummary = printTransactionSummary;

// ===================================
// FUNCIONES DE DEBUG
// ===================================

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.bankingDebug = {
        getCurrentUser: () => currentUser,
        getUserData: () => userData,
        getAccountData: () => accountData,
        showNotification: (msg, type) => showNotification(msg, type),
        addTestTransaction: (type, desc, amount) => createTransaction(type, desc, amount),
        resetAccount: () => {
            accountData.balance = 500000;
            accountData.transactions = [];
            saveTransactionsToStorage();
            updateDashboardInterface();
            console.log('🔄 Cuenta reseteada');
        },
        addTestData: () => {
            createTransaction('Consignación', 'Consignación de prueba', 50000);
            createTransaction('Retiro', 'Retiro de prueba', 25000);
            createTransaction('Retiro', 'Pago de servicio público Energía', 15000, 'Energía');
            updateDashboardInterface();
            console.log('✅ Datos de prueba agregados');
        },
        navigateTo: (section) => navigateToSection(section),
        getSelectedRecipient: () => selectedRecipient,
        getTransferData: () => transferData,
        forceStayInDashboard: () => {
            preventRedirect = true;
            isRedirecting = false;
            console.log('🛡️ Forzando permanencia en dashboard');
        },
        
        // NUEVAS funciones específicas para búsqueda de usuarios
        testUserSearch: async (email) => {
            console.log('🧪 Probando búsqueda de usuario:', email);
            const result = await simulateUserSearch(email);
            if (result) {
                console.log('✅ Usuario encontrado:', result);
            } else {
                console.log('❌ Usuario no encontrado');
            }
            return result;
        },
        
        checkFirestoreConnection: async () => {
            if (window.checkFirestoreConnection) {
                const connected = await window.checkFirestoreConnection();
                console.log('🔍 Estado Firestore:', connected ? '✅ Conectado' : '❌ Desconectado');
                return connected;
            } else {
                console.log('⚠️ Función de verificación Firestore no disponible');
                return false;
            }
        },
        
        listFirestoreUsers: async () => {
            if (window.firestoreDebug && window.firestoreDebug.listUsers) {
                const count = await window.firestoreDebug.listUsers();
                console.log(`📊 Total usuarios en Firestore: ${count}`);
                return count;
            } else {
                console.log('⚠️ Debug de Firestore no disponible');
                return 0;
            }
        },
        
        forceUserToFirestore: async () => {
            console.log('🔧 Forzando guardado de usuario actual en Firestore...');
            try {
                await ensureUserInFirestore();
                console.log('✅ Usuario guardado en Firestore exitosamente');
                return true;
            } catch (error) {
                console.error('❌ Error guardando usuario:', error);
                return false;
            }
        },
        
        searchSpecificUser: async (email) => {
            if (window.firestoreDebug && window.firestoreDebug.searchUser) {
                return await window.firestoreDebug.searchUser(email);
            } else {
                console.log('⚠️ Búsqueda específica no disponible - usando búsqueda normal');
                return await simulateUserSearch(email);
            }
        },
        
        diagnoseTransferSearch: () => {
            console.log('🔍 DIAGNÓSTICO DE BÚSQUEDA DE TRANSFERENCIAS');
            console.log('===============================================');
            console.log('🔥 Firebase Auth:', !!window.firebaseAuth);
            console.log('🗄️ Firestore:', !!window.firebaseFirestore);
            console.log('👤 Usuario actual:', currentUser?.email || 'No autenticado');
            console.log('📧 Email usuario:', userData?.email || 'No disponible');
            console.log('🔧 Debug Firestore:', !!window.firestoreDebug);
            console.log('===============================================');
            console.log('💡 Comandos útiles:');
            console.log('window.bankingDebug.testUserSearch("email@test.com")');
            console.log('window.bankingDebug.checkFirestoreConnection()');
            console.log('window.bankingDebug.listFirestoreUsers()');
            console.log('window.bankingDebug.forceUserToFirestore()');
        }
    };
    
    console.log('🔧 Funciones de debug disponibles en window.bankingDebug');
    console.log('💡 Para diagnosticar búsquedas: window.bankingDebug.diagnoseTransferSearch()');
}

console.log('🏦 Sistema Bancario ACME - Dashboard funcional completo cargado');