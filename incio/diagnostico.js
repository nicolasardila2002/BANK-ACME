// ===================================
    // DIAGNÓSTICO DE BUCLES
    // ===================================
    
    // Función para diagnosticar bucles
    function diagnoseBucleLoop() {
        console.log('DIAGNÓSTICO DE BUCLES');
        console.log('========================');
        
        const currentPath = window.location.pathname;
        console.log('Ubicación:', currentPath);
        
        // Verificar redirects en el historial
        if (window.performance && window.performance.navigation) {
            console.log('Redirects:', window.performance.navigation.redirectCount);
        }
        
        // Verificar datos de almacenamiento
        console.log('SessionStorage:', Object.keys(sessionStorage));
        console.log('LocalStorage:', Object.keys(localStorage));
        
        // Verificar Firebase
        console.log('Usuario Firebase:', window.firebaseAuth?.currentUser?.email || 'Ninguno');
        
        console.log('========================');
    }
    
    // Hacer función disponible globalmente
    window.diagnoseBucleLoop = diagnoseBucleLoop;