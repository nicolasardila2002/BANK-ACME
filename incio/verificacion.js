// ===================================
    // VERIFICACIÓN DE ESTADO
    // ===================================
    
    // Diagnóstico de autenticación mejorado
    console.log('BANCO ACME - Verificando estado...');
    console.log('URL actual:', window.location.href);
    
    // Verificar si hay datos de sesión previos
    const existingData = sessionStorage.getItem('userData');
    if (existingData) {
        console.log('Hay datos de sesión existentes');
        try {
            const userData = JSON.parse(existingData);
            console.log('Usuario en sesión:', userData.email);
            console.log('El sistema debe determinar si redirigir automáticamente o no');
        } catch (e) {
            console.log('Datos de sesión corruptos - limpiando...');
            sessionStorage.removeItem('userData');
        }
    } else {
        console.log('No hay sesión previa - perfecto para login manual');
    }
    
    // Verificar redirects excesivos
    if (window.performance && window.performance.navigation.redirectCount > 3) {
        console.log('ADVERTENCIA: Muchos redirects detectados (' + window.performance.navigation.redirectCount + ')');
        console.log('Si hay bucle, usa: window.emergencyAntiLoop.stop()');
    }
    
    console.log('Diagnóstico completado - Listo para login');