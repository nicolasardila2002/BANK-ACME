// ===================================
// BANCO ACME - LOGIN SIN BUCLES (VERSIÓN DEFINITIVA)
// ===================================

// Variables globales
let auth, firebaseFunctions;
let currentUser = null;
let isProcessingLogin = false; // Control estricto de proceso de login
let userInitiatedLogin = false; // Solo redirigir si el usuario hizo login manualmente

// Elementos del DOM
const DOM = {
    loginForm: null,
    registerForm: null,
    emailInput: null,
    passwordInput: null,
    regEmailInput: null,
    regPasswordInput: null,
    regConfirmPasswordInput: null,
    toggleAuthBtn: null,
    authTitle: null,
    authSubtitle: null,
    submitBtn: null,
    notification: null,
    notificationMessage: null,
    notificationIcon: null,
    notificationClose: null
};

// ===================================
// INICIALIZACIÓN
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('BANCO ACME - Iniciando sistema SIN BUCLES...');
    
    // Limpiar cualquier redirección automática
    clearAutoRedirects();
    
    // Esperar a que Firebase se cargue
    waitForFirebase().then(() => {
        initializeAuth();
    }).catch(error => {
        console.error('Error al cargar Firebase:', error);
        showNotification('Error de conexión. Verifica tu internet.', 'error');
    });
});

// Limpiar estados que puedan causar bucles
function clearAutoRedirects() {
    // Limpiar flags de control
    isProcessingLogin = false;
    userInitiatedLogin = false;
    
    console.log('Estados de redirección limpiados');
}

// Esperar a que Firebase esté disponible
async function waitForFirebase() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
        if (window.firebaseAuth && window.firebaseFunctions) {
            auth = window.firebaseAuth;
            firebaseFunctions = window.firebaseFunctions;
            return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    throw new Error('Firebase no se cargó correctamente');
}

// Inicializar sistema de autenticación
function initializeAuth() {
    try {
        console.log('Inicializando autenticación...');
        
        // Inicializar elementos del DOM
        initializeDOMElements();
        
        // Configurar event listeners
        setupEventListeners();
        
        // IMPORTANTE: Observer SIN redirección automática
        setupAuthObserverNoRedirect();
        
        // Mostrar formulario de login SIEMPRE al cargar
        showLoginForm();
        
        console.log('Sistema de autenticación listo - SIN BUCLES');
        
    } catch (error) {
        console.error('Error al inicializar autenticación:', error);
        showNotification('Error al inicializar el sistema', 'error');
    }
}

// ===================================
// CONFIGURACIÓN DEL DOM
// ===================================

function initializeDOMElements() {
    // Formularios
    DOM.loginForm = document.getElementById('loginForm');
    DOM.registerForm = document.getElementById('registerForm');
    
    // Campos de login
    DOM.emailInput = document.getElementById('email');
    DOM.passwordInput = document.getElementById('password');
    
    // Campos de registro
    DOM.regEmailInput = document.getElementById('regEmail');
    DOM.regPasswordInput = document.getElementById('regPassword');
    DOM.regConfirmPasswordInput = document.getElementById('regConfirmPassword');
    
    // Elementos de interfaz
    DOM.toggleAuthBtn = document.getElementById('toggleAuth');
    DOM.authTitle = document.getElementById('authTitle');
    DOM.authSubtitle = document.getElementById('authSubtitle');
    DOM.submitBtn = document.querySelector('.submit-btn');
    
    // Notificaciones
    DOM.notification = document.getElementById('notification');
    DOM.notificationMessage = DOM.notification?.querySelector('.notification-message');
    DOM.notificationIcon = DOM.notification?.querySelector('.notification-icon');
    DOM.notificationClose = DOM.notification?.querySelector('.notification-close');
    
    console.log('Elementos DOM del login inicializados');
}

function setupEventListeners() {
    // Formularios
    DOM.loginForm?.addEventListener('submit', handleUserLogin);
    DOM.registerForm?.addEventListener('submit', handleUserRegister);
    
    // Toggle entre login y registro
    DOM.toggleAuthBtn?.addEventListener('click', toggleAuthMode);
    
    // Cerrar notificaciones
    DOM.notificationClose?.addEventListener('click', hideNotification);
    
    console.log('Event listeners del login configurados');
}

// ===================================
// OBSERVER SIN REDIRECCIÓN AUTOMÁTICA
// ===================================

function setupAuthObserverNoRedirect() {
    if (!firebaseFunctions?.onAuthStateChanged) {
        console.error('Firebase Auth no disponible');
        return;
    }
    
    firebaseFunctions.onAuthStateChanged(auth, (user) => {
        console.log('Observer activado - Usuario:', user ? user.email : 'Ninguno');
        
        currentUser = user;
        
        // SOLO redirigir si el usuario inició login manualmente
        if (user && userInitiatedLogin) {
            console.log('Login exitoso detectado - procediendo a dashboard');
            proceedToDashboard(user);
        } else if (user && !userInitiatedLogin) {
            console.log('Sesión existente detectada pero NO iniciada por usuario - manteniendo en login');
            // NO redirigir automáticamente - dejar al usuario decidir
        } else if (!user) {
            console.log('No hay usuario - manteniendo en login');
            // Resetear flags
            isProcessingLogin = false;
            userInitiatedLogin = false;
        }
    });
}

// ===================================
// MANEJO DE LOGIN (SOLO MANUAL)
// ===================================

async function handleUserLogin(e) {
    e.preventDefault();
    
    if (isProcessingLogin) {
        console.log('Login ya en proceso...');
        return;
    }
    
    const email = DOM.emailInput?.value?.trim();
    const password = DOM.passwordInput?.value;
    
    // Validaciones básicas
    if (!email || !password) {
        showNotification('Por favor completa todos los campos', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('Por favor ingresa un email válido', 'error');
        return;
    }
    
    try {
        isProcessingLogin = true;
        userInitiatedLogin = true; // MARCAR que fue iniciado por el usuario
        
        console.log('USUARIO INICIÓ LOGIN para:', email);
        
        // Mostrar estado de carga
        updateSubmitButton(true, 'Iniciando sesión...');
        showNotification('Verificando credenciales...', 'info', 0);
        
        // Intentar login con Firebase
        const userCredential = await firebaseFunctions.signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('Credenciales válidas para:', user.email);
        
        // El observer detectará esto y redirigirá porque userInitiatedLogin = true
        
    } catch (error) {
        // Reset en caso de error
        isProcessingLogin = false;
        userInitiatedLogin = false;
        
        console.error('Error en login:', error);
        
        // Mostrar error específico
        let errorMessage = 'Error al iniciar sesión';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No existe una cuenta con este email';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Contraseña incorrecta';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email inválido';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Esta cuenta ha sido deshabilitada';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Demasiados intentos. Intenta más tarde';
                break;
            default:
                errorMessage = `Error: ${error.message}`;
        }
        
        hideNotification();
        showNotification(errorMessage, 'error');
        updateSubmitButton(false, 'Iniciar Sesión');
    }
}

// ===================================
// MANEJO DE REGISTRO
// ===================================

async function handleUserRegister(e) {
    e.preventDefault();
    
    if (isProcessingLogin) return;
    
    const email = DOM.regEmailInput?.value?.trim();
    const password = DOM.regPasswordInput?.value;
    const confirmPassword = DOM.regConfirmPasswordInput?.value;
    
    // Validaciones
    if (!email || !password || !confirmPassword) {
        showNotification('Por favor completa todos los campos', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('Por favor ingresa un email válido', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Las contraseñas no coinciden', 'error');
        return;
    }
    
    try {
        isProcessingLogin = true;
        userInitiatedLogin = true; // MARCAR que fue iniciado por el usuario
        
        console.log('USUARIO INICIÓ REGISTRO para:', email);
        
        updateSubmitButton(true, 'Creando cuenta...');
        showNotification('Creando tu cuenta...', 'info', 0);
        
        // Crear cuenta con Firebase
        const userCredential = await firebaseFunctions.createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('Cuenta creada para:', user.email);
        
        // El observer detectará esto y redirigirá porque userInitiatedLogin = true
        
    } catch (error) {
        // Reset en caso de error
        isProcessingLogin = false;
        userInitiatedLogin = false;
        
        console.error('Error en registro:', error);
        
        let errorMessage = 'Error al crear la cuenta';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Ya existe una cuenta con este email';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email inválido';
                break;
            case 'auth/weak-password':
                errorMessage = 'La contraseña es demasiado débil';
                break;
            default:
                errorMessage = `Error: ${error.message}`;
        }
        
        hideNotification();
        showNotification(errorMessage, 'error');
        updateSubmitButton(false, 'Crear Cuenta');
    }
}

// ===================================
// PROCEDER AL DASHBOARD (SOLO CUANDO CORRESPONDA)
// ===================================

async function proceedToDashboard(user) {
    try {
        console.log('Procesando ingreso al dashboard para:', user.email);
        
        // Crear datos del usuario
        const userData = {
            uid: user.uid,
            email: user.email,
            nombre: user.displayName || user.email.split('@')[0],
            apellidos: '',
            telefono: user.phoneNumber || '',
            ciudad: '',
            fechaCreacion: user.metadata.creationTime,
            ultimaConexion: user.metadata.lastSignInTime
        };
        
        // Guardar en sessionStorage
        sessionStorage.setItem('userData', JSON.stringify(userData));
        console.log('Datos guardados en sessionStorage');
        
        // Resetear flags
        isProcessingLogin = false;
        
        // Mostrar éxito y redirigir
        hideNotification();
        showNotification('¡Bienvenido! Redirigiendo al dashboard...', 'success', 2000);
        
        // Redirigir después de delay
        setTimeout(() => {
            console.log('Redirigiendo a dashboard...');
            window.location.href = '../dashboard/Dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error al procesar dashboard:', error);
        isProcessingLogin = false;
        userInitiatedLogin = false;
        showNotification('Error al procesar datos', 'error');
    }
}

// ===================================
// INTERFAZ DE USUARIO
// ===================================

function showLoginForm() {
    const loginContainer = document.getElementById('loginContainer');
    const registerContainer = document.getElementById('registerContainer');
    
    if (loginContainer && registerContainer) {
        loginContainer.classList.remove('hidden');
        registerContainer.classList.add('hidden');
        
        // Actualizar textos
        if (DOM.authTitle) DOM.authTitle.textContent = 'Iniciar Sesión';
        if (DOM.authSubtitle) DOM.authSubtitle.textContent = 'Accede a tu cuenta bancaria';
        if (DOM.toggleAuthBtn) DOM.toggleAuthBtn.textContent = '¿No tienes cuenta? Regístrate';
        
        // Limpiar campos
        if (DOM.emailInput) DOM.emailInput.value = '';
        if (DOM.passwordInput) DOM.passwordInput.value = '';
        
        updateSubmitButton(false, 'Iniciar Sesión');
    }
}

function showRegisterForm() {
    const loginContainer = document.getElementById('loginContainer');
    const registerContainer = document.getElementById('registerContainer');
    
    if (loginContainer && registerContainer) {
        loginContainer.classList.add('hidden');
        registerContainer.classList.remove('hidden');
        
        // Actualizar textos
        if (DOM.authTitle) DOM.authTitle.textContent = 'Crear Cuenta';
        if (DOM.authSubtitle) DOM.authSubtitle.textContent = 'Únete a Banco ACME';
        if (DOM.toggleAuthBtn) DOM.toggleAuthBtn.textContent = '¿Ya tienes cuenta? Inicia sesión';
        
        // Limpiar campos
        if (DOM.regEmailInput) DOM.regEmailInput.value = '';
        if (DOM.regPasswordInput) DOM.regPasswordInput.value = '';
        if (DOM.regConfirmPasswordInput) DOM.regConfirmPasswordInput.value = '';
        
        updateSubmitButton(false, 'Crear Cuenta');
    }
}

function toggleAuthMode() {
    const loginContainer = document.getElementById('loginContainer');
    const isLoginVisible = loginContainer && !loginContainer.classList.contains('hidden');
    
    if (isLoginVisible) {
        showRegisterForm();
    } else {
        showLoginForm();
    }
    
    // Limpiar notificaciones y resetear estados
    hideNotification();
    isProcessingLogin = false;
    userInitiatedLogin = false;
}

function updateSubmitButton(loading, text) {
    if (!DOM.submitBtn) return;
    
    DOM.submitBtn.disabled = loading;
    DOM.submitBtn.innerHTML = loading 
        ? `<i class="fas fa-spinner fa-spin"></i> ${text}`
        : `<i class="fas fa-sign-in-alt"></i> ${text}`;
    
    if (loading) {
        DOM.submitBtn.style.opacity = '0.7';
        DOM.submitBtn.style.cursor = 'not-allowed';
    } else {
        DOM.submitBtn.style.opacity = '1';
        DOM.submitBtn.style.cursor = 'pointer';
    }
}

// ===================================
// VALIDACIONES
// ===================================

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// ===================================
// SISTEMA DE NOTIFICACIONES
// ===================================

function showNotification(message, type = 'info', duration = 5000) {
    if (!DOM.notification || !DOM.notificationMessage || !DOM.notificationIcon) {
        console.log(`${type.toUpperCase()}: ${message}`);
        return;
    }
    
    // Limpiar clases anteriores
    DOM.notification.className = 'notification';
    
    // Configurar contenido
    DOM.notificationMessage.textContent = message;
    DOM.notification.classList.add(type);
    
    // Configurar icono
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    DOM.notificationIcon.className = `notification-icon ${icons[type] || icons.info}`;
    
    // Mostrar notificación
    DOM.notification.classList.remove('hidden');
    DOM.notification.setAttribute('role', 'alert');
    
    // Auto-ocultar si se especifica duración
    if (duration > 0) {
        setTimeout(() => {
            hideNotification();
        }, duration);
    }
    
    console.log(`${type.toUpperCase()}: ${message}`);
}

function hideNotification() {
    if (DOM.notification) {
        DOM.notification.classList.add('hidden');
        DOM.notification.removeAttribute('role');
    }
}

// ===================================
// FUNCIÓN DE LIMPIEZA TOTAL
// ===================================

function resetCompleteState() {
    console.log('RESETEO COMPLETO DEL ESTADO');
    
    // Limpiar variables de control
    isProcessingLogin = false;
    userInitiatedLogin = false;
    currentUser = null;
    
    // Limpiar storage
    sessionStorage.removeItem('userData');
    localStorage.removeItem('userData');
    localStorage.removeItem('bankAccountData');
    
    // Limpiar formularios
    if (DOM.loginForm) DOM.loginForm.reset();
    if (DOM.registerForm) DOM.registerForm.reset();
    
    // Cerrar sesión de Firebase
    if (auth && firebaseFunctions) {
        firebaseFunctions.signOut(auth).catch(() => {});
    }
    
    // Mostrar login
    showLoginForm();
    hideNotification();
    
    console.log('Estado completamente reseteado');
}

// ===================================
// FUNCIONES GLOBALES PARA DEBUG
// ===================================

window.authDebug = {
    getCurrentUser: () => currentUser,
    getIsProcessingLogin: () => isProcessingLogin,
    getUserInitiatedLogin: () => userInitiatedLogin,
    showNotification: (msg, type) => showNotification(msg, type),
    toggleMode: () => toggleAuthMode(),
    resetComplete: () => resetCompleteState(),
    testLogin: (email, password) => {
        if (DOM.emailInput && DOM.passwordInput) {
            DOM.emailInput.value = email;
            DOM.passwordInput.value = password;
            handleUserLogin({ preventDefault: () => {} });
        }
    }
};

console.log('Sistema de login SIN BUCLES cargado');
console.log('Debug: window.authDebug.resetComplete() para limpiar todo');