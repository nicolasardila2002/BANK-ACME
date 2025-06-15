

    // ===================================
    // SCRIPT DE EMERGENCIA ANTI-BUCLES
    // ===================================
    
    console.log('SCRIPT DE EMERGENCIA ANTI-BUCLES ACTIVADO');
    
    // Función de emergencia para parar bucles
    function emergencyStopLoop() {
        console.log('PARANDO BUCLES DE EMERGENCIA');
        
        // 1. Detener todos los observers y timeouts
        if (window.firebaseAuth && window.firebaseFunctions) {
            try {
                window.firebaseFunctions.signOut(window.firebaseAuth);
            } catch (e) {
                console.log('Observer ya desconectado');
            }
        }
        
        // 2. Limpiar TODOS los datos de almacenamiento
        sessionStorage.clear();
        localStorage.clear();
        
        // 3. Limpiar variables globales conocidas
        if (window.authDebug) {
            window.authDebug.resetComplete();
        }
        
        // 4. Resetear flags conocidos
        window.isProcessingLogin = false;
        window.userInitiatedLogin = false;
        window.isDashboardInitialized = false;
        window.authChecked = false;
        window.isRedirecting = false;
        
        console.log('Estado completamente limpiado');
        
        // 5. Forzar ir al login después de 2 segundos
        setTimeout(() => {
            console.log('Forzando redirección al login...');
            window.location.href = '/incio/index.html';
        }, 2000);
    }
    
    // Hacer función disponible globalmente
    window.emergencyStopLoop = emergencyStopLoop;
