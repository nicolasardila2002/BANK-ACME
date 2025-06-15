// ===================================
// BANCO ACME - CONFIGURACIÓN FIREBASE
// ===================================

// Importar las funciones necesarias de los SDKs de Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js';

// Configuración de Firebase para Banco ACME
const firebaseConfig = {
    apiKey: "AIzaSyDlSckl1iowi9rtCD_BaI5daq1DzmmApvU",
    authDomain: "banco-acme.firebaseapp.com",
    projectId: "banco-acme",
    storageBucket: "banco-acme.firebasestorage.app",
    messagingSenderId: "195296504478",
    appId: "1:195296504478:web:1d309aa89e4ed0e758e98f",
    measurementId: "G-PDWEP086PR"
};

// Inicializar Firebase
let app, auth, analytics;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    analytics = getAnalytics(app);
    
    console.log('🔥 Firebase inicializado correctamente para Banco ACME');
} catch (error) {
    console.error('❌ Error al inicializar Firebase:', error);
}

// Configuración adicional para Auth
auth.languageCode = 'es'; // Establecer idioma español para mensajes de error

// Exportar las instancias para uso en otros archivos
window.firebaseAuth = auth;
window.firebaseApp = app;
window.firebaseAnalytics = analytics;

// Exportar funciones de autenticación
window.firebaseFunctions = {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail
};

// Función para verificar el estado de conexión con Firebase
window.checkFirebaseConnection = async () => {
    try {
        // Intentar una operación simple para verificar la conexión
        await auth.authStateReady();
        return true;
    } catch (error) {
        console.error('Error de conexión con Firebase:', error);
        return false;
    }
};

// Log de información para debugging (solo en desarrollo)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Modo desarrollo - Firebase Config cargado');
    console.log('📊 Analytics habilitado:', !!analytics);
    console.log('🔐 Auth configurado:', !!auth);
}