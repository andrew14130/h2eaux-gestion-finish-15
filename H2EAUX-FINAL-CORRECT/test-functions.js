// Test des fonctionnalités PDF et Upload Logo
// Ce fichier sera chargé pour tester les fonctionnalités

document.addEventListener('DOMContentLoaded', function() {
    // Attendre que l'app soit chargée
    setTimeout(() => {
        console.log('=== TEST DES FONCTIONNALITÉS ===');
        
        // Test 1: Vérifier si jsPDF est chargé
        if (typeof window.jsPDF !== 'undefined') {
            console.log('✅ jsPDF est chargé et disponible');
        } else {
            console.log('❌ jsPDF n\'est pas chargé');
        }
        
        // Test 2: Vérifier les modules PDF
        if (typeof window.pdfExport !== 'undefined') {
            console.log('✅ Module PDF Export est disponible');
            
            // Test fonction PDF
            try {
                const testPDF = () => {
                    const { jsPDF } = window.jsPDF;
                    const doc = new jsPDF();
                    doc.text('Test H2eaux Gestion', 10, 10);
                    doc.save('test-h2eaux.pdf');
                    console.log('✅ Génération PDF fonctionne');
                };
                
                // Ajouter un bouton de test PDF
                const testBtn = document.createElement('button');
                testBtn.textContent = 'Test PDF';
                testBtn.style.position = 'fixed';
                testBtn.style.top = '10px';
                testBtn.style.right = '10px';
                testBtn.style.zIndex = '9999';
                testBtn.style.background = '#007AFF';
                testBtn.style.color = 'white';
                testBtn.style.border = 'none';
                testBtn.style.padding = '5px 10px';
                testBtn.style.borderRadius = '5px';
                testBtn.onclick = testPDF;
                document.body.appendChild(testBtn);
                
            } catch (error) {
                console.log('❌ Erreur PDF:', error);
            }
        } else {
            console.log('❌ Module PDF Export n\'est pas disponible');
        }
        
        // Test 3: Vérifier le module Settings
        if (typeof window.settings !== 'undefined') {
            console.log('✅ Module Settings est disponible');
            
            // Test upload logo
            const logoInput = document.getElementById('logoUpload');
            if (logoInput) {
                console.log('✅ Input upload logo trouvé');
                
                // Ajouter événement pour tester l'upload
                logoInput.addEventListener('change', function() {
                    console.log('📁 Fichier sélectionné pour upload logo');
                    if (typeof window.settings.uploadLogo === 'function') {
                        console.log('✅ Fonction uploadLogo disponible');
                    } else {
                        console.log('❌ Fonction uploadLogo non disponible');
                    }
                });
            } else {
                console.log('❌ Input upload logo non trouvé');
            }
        } else {
            console.log('❌ Module Settings n\'est pas disponible');
        }
        
        // Test 4: Vérifier gestion utilisateurs
        setTimeout(() => {
            if (window.settings && typeof window.settings.showAddUserModal === 'function') {
                console.log('✅ Fonction création utilisateur disponible');
                
                // Test des permissions
                const currentUser = JSON.parse(localStorage.getItem('h2eaux_current_user') || '{}');
                console.log('👤 Utilisateur actuel:', currentUser.username, 'Role:', currentUser.role);
                
                const users = JSON.parse(localStorage.getItem('h2eaux_users') || '[]');
                console.log('👥 Nombre d\'utilisateurs:', users.length);
                
            } else {
                console.log('❌ Fonction création utilisateur non disponible');
            }
        }, 2000);
        
    }, 3000);
});