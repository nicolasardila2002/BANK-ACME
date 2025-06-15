// ===================================
    // AUTO-DETECCIÓN DE BUCLES
    // ===================================
    
    // Auto-detectar bucles por redirects excesivos
    function autoDetectLoop() {
        if (window.performance && window.performance.navigation.redirectCount > 5) {
            console.log('BUCLE DETECTADO AUTOMÁTICAMENTE - Activando emergencia');
            if (window.emergencyStopLoop) {
                window.emergencyStopLoop();
            }
            return true;
        }
        return false;
    }
    
    // Ejecutar auto-detección
    autoDetectLoop();
    
    // Hacer función disponible globalmente
    window.autoDetectLoop = autoDetectLoop;