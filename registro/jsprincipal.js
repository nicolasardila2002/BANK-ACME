// Import the functions you need from the SDKs you need (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDlSckl1iowi9rtCD_BaI5daq1DzmmApvU",
  authDomain: "banco-acme.firebaseapp.com",
  projectId: "banco-acme",
  storageBucket: "banco-acme.firebasestorage.app",
  messagingSenderId: "195296504478",
  appId: "1:195296504478:web:1d309aa89e4ed0e758e98f",
  measurementId: "G-PDWEP086PR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Verify Firebase initialization
console.log("Firebase SDK initialized successfully!");
console.log("Analytics:", analytics);
console.log("Auth:", auth);
console.log("Firestore:", db);
console.log("Config:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

// Función para registrar usuario
export async function registrarUsuario(
  nombre,
  apellidos,
  tipoId,
  numeroId,
  email,
  password,
  telefono,
  direccion,
  genero,
  ciudad
) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "usuarios", user.uid), {
      nombre,
      apellidos,
      tipoId,
      numeroId,
      email,
      telefono,
      direccion,
      genero,
      ciudad,
      fechaRegistro: new Date().toISOString(),
      estado: "activo"
    });

    // Log analytics event for successful registration
    if (analytics) {
      // Note: In production, you might want to use gtag or specific analytics calls
      console.log("Usuario registrado exitosamente");
    }

    return { success: true, message: "¡Registro exitoso!" };
  } catch (error) {
    console.error("Error en registro:", error);
    let errorMessage = "Error al registrar usuario.";
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = "Este correo electrónico ya está registrado.";
        break;
      case 'auth/weak-password':
        errorMessage = "La contraseña debe tener al menos 6 caracteres.";
        break;
      case 'auth/invalid-email':
        errorMessage = "El formato del correo electrónico no es válido.";
        break;
      default:
        errorMessage = error.message;
    }
    
    return { success: false, message: errorMessage };
  }
}

// Función para iniciar sesión (simplificada - solo email y contraseña)
export async function iniciarSesion(email, password) {
  try {
    console.log("Intentando iniciar sesión con:", email);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log("Usuario autenticado:", user.uid);

    // Get user data from Firestore (optional)
    let userData = {
      uid: user.uid,
      email: user.email,
      nombre: "Usuario"
    };

    try {
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        userData = {
          uid: user.uid,
          email: user.email,
          nombre: data.nombre || "Usuario",
          apellidos: data.apellidos || "",
          telefono: data.telefono || "",
          ciudad: data.ciudad || "",
          tipoId: data.tipoId || "",
          numeroId: data.numeroId || ""
        };
        console.log("Datos del usuario obtenidos de Firestore");
      } else {
        console.log("No se encontraron datos adicionales en Firestore");
      }
    } catch (firestoreError) {
      console.warn("Error al obtener datos de Firestore:", firestoreError);
      // Continue with basic user data from Auth
    }

    // Log successful login
    if (analytics) {
      console.log("Login exitoso registrado en Analytics");
    }

    return { 
      success: true, 
      message: `¡Bienvenido, ${userData.nombre}!`,
      userData: userData
    };
  } catch (error) {
    console.error("Error en inicio de sesión:", error);
    let errorMessage = "Error al iniciar sesión.";
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = "No existe una cuenta con este correo electrónico.";
        break;
      case 'auth/wrong-password':
        errorMessage = "Contraseña incorrecta.";
        break;
      case 'auth/invalid-credential':
        errorMessage = "Credenciales inválidas. Verifica tu email y contraseña.";
        break;
      case 'auth/too-many-requests':
        errorMessage = "Demasiados intentos fallidos. Intenta más tarde.";
        break;
      case 'auth/invalid-email':
        errorMessage = "El formato del correo electrónico no es válido.";
        break;
      case 'auth/network-request-failed':
        errorMessage = "Error de conexión. Verifica tu internet.";
        break;
      case 'auth/user-disabled':
        errorMessage = "Esta cuenta ha sido deshabilitada.";
        break;
      default:
        errorMessage = error.message || "Error inesperado al iniciar sesión.";
    }
    
    return { success: false, message: errorMessage };
  }
}

// Función para recuperación de contraseña
export async function recuperarContrasena(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { 
      success: true, 
      message: "Se ha enviado un enlace de recuperación a tu correo electrónico." 
    };
  } catch (error) {
    console.error("Error en recuperación de contraseña:", error);
    let errorMessage = "No se pudo enviar el correo de recuperación.";
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = "No existe una cuenta con este correo electrónico.";
        break;
      case 'auth/invalid-email':
        errorMessage = "El formato del correo electrónico no es válido.";
        break;
      case 'auth/too-many-requests':
        errorMessage = "Demasiadas solicitudes. Intenta más tarde.";
        break;
      default:
        errorMessage = "Error al enviar correo de recuperación. Verifica que el correo sea correcto.";
    }
    
    return { success: false, message: errorMessage };
  }
}

// Función para cerrar sesión
export async function cerrarSesion() {
  try {
    await signOut(auth);
    return { success: true, message: "Sesión cerrada correctamente." };
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    return { success: false, message: "Error al cerrar sesión." };
  }
}

// Función para obtener el usuario actual
export function obtenerUsuarioActual() {
  return auth.currentUser;
}

// Función para verificar si hay un usuario autenticado
export function usuarioAutenticado() {
  return auth.currentUser !== null;
}

// Observer para cambios en el estado de autenticación
export function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}

// Exportar instancias para uso en otros módulos si es necesario
export { app, analytics, auth, db };