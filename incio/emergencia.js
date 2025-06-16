// ===================================
    // INTERFAZ DE EMERGENCIA
    // ===================================
    
    // Crear objeto global con todas las funciones de emergencia
    window.emergencyAntiLoop = {
        stop: window.emergencyStopLoop,
        diagnose: window.diagnoseBucleLoop,
        autoDetect: window.autoDetectLoop
    };
    
    // Ejecutar diagnóstico automático
    setTimeout(() => {
        if (window.diagnoseBucleLoop) {
            window.diagnoseBucleLoop();
        }
    }, 1000);
    
    console.log('FUNCIONES DE EMERGENCIA DISPONIBLES:');
    console.log('window.emergencyAntiLoop.stop() → Parar bucles y limpiar todo');
    console.log('window.emergencyAntiLoop.diagnose() → Diagnosticar estado actual');