auth.onAuthStateChanged((user) => {
    if (user) {
        window.usuarioLogadoEmail = user.email.toLowerCase();
        window.verificarAcessoBD(window.usuarioLogadoEmail);
    } else {
        document.getElementById('appWrapper').style.display = 'none';
        document.getElementById('loginCard').style.display = 'block';
        document.getElementById('loginScreen').style.display = 'flex';
        setTimeout(() => {
            document.getElementById('loginScreen').style.opacity = '1';
        }, 10);
    }
});

window.verificarAcessoBD = async function(email) {
    try {
        let authEmail = email.toLowerCase().trim();
        
        let planSnap = await db.collection("sistema").doc("acessos_planilha").get();
        if (planSnap.exists && planSnap.data().dados) {
            try {
                window.planilhaAcessos = JSON.parse(planSnap.data().dados);
            } catch (e) {
                console.error("Erro JSON", e);
            }
        }
        
        let manualSnap = await db.collection("acessos").get();
        window.acessosData = [];
        manualSnap.forEach(doc => {
            window.acessosData.push({ id: doc.id, ...doc.data() });
        });

        if (window.acessosData.length === 0 && Object.keys(window.planilhaAcessos).length === 0) {
            await db.collection("acessos").doc(authEmail).set({ email: authEmail, nick: 'Admin', nivel: "LIDER" });
            window.location.reload();
            return;
        }

        let userManual = window.acessosData.find(u => (u.email || '').toLowerCase().trim() === authEmail);
        let userPlan = null;
        for (let key in window.planilhaAcessos) {
            if (key.toLowerCase().trim() === authEmail) {
                userPlan = window.planilhaAcessos[key];
                break;
            }
        }

        let autorizado = false;

        if (userPlan && (userPlan.nivel.includes("LIDER") || userPlan.nivel.includes("VICE"))) {
            autorizado = true;
            window.nivelUsuarioGlobal = userPlan.nivel;
            window.usuarioLogadoNick = userPlan.nick;
        } else if (userManual) {
            autorizado = true;
            window.nivelUsuarioGlobal = userManual.nivel;
            window.usuarioLogadoNick = userManual.nick;
        } else if (userPlan) {
            autorizado = true;
            window.nivelUsuarioGlobal = userPlan.nivel;
            window.usuarioLogadoNick = userPlan.nick;
        }

        if (autorizado) {
            window.nivelUsuarioGlobal = window.nivelUsuarioGlobal.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (window.nivelUsuarioGlobal === 'VICELIDER') window.nivelUsuarioGlobal = 'VICE-LIDER';
            if (window.nivelUsuarioGlobal === 'SUBLIDER') window.nivelUsuarioGlobal = 'SUB-LIDER';
            
            if (window.nivelUsuarioGlobal === 'COMANDO') {
                window.customAlert("Acesso de Comando restrito ao Painel Público.", "Aviso");
                setTimeout(() => {
                    auth.signOut();
                    window.location.href = "https://dichitech.github.io/ranking";
                }, 3000);
                return;
            }
            
            if (window.nivelUsuarioGlobal === 'LIDER' || window.nivelUsuarioGlobal === 'VICE-LIDER') {
                document.getElementById('admin-only-menus').style.display = 'flex';
                document.getElementById('admin-drag-controls').style.display = 'flex';
                window.renderTabelaAcessos();
                
                let boxPrivacidade = document.getElementById('box-editor-privacidade');
                if (boxPrivacidade) {
                    boxPrivacidade.innerHTML = window.buildEditorHTML('editor-privacidade', 'Carregando...');
                }
            }
            
            if (window.nivelUsuarioGlobal === 'SUPERVISOR') {
                let menuAv = document.getElementById('menu-avais');
                if (menuAv) menuAv.style.display = 'none';
                
                let menuFb = document.getElementById('menu-feedbacks');
                if (menuFb) menuFb.style.display = 'none';
                
                let menuEs = document.getElementById('menu-estrelas');
                if (menuEs) menuEs.style.display = 'none';
            }
            
            window.switchSection('modulo-metas', document.getElementById('menu-metas'));
            window.liberarPainel();
        } else {
            window.customAlert(`ACESSO NEGADO.<br><br>O e-mail <b>${authEmail}</b> não foi encontrado com permissões ativas.`, "Falha de Permissão");
            setTimeout(() => auth.signOut(), 5000);
        }
    } catch (err) {
        window.customAlert("Erro na comunicação com o banco de dados: " + err.message, "Erro Crítico");
    }
}

window.loginGoogle = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('loginLoader').style.display = 'block';
    
    auth.signInWithPopup(provider).catch(() => {
        document.getElementById('loginLoader').style.display = 'none';
        document.getElementById('loginCard').style.display = 'block';
        document.getElementById('login-error').style.display = 'block';
    });
}

window.fazerLogout = function() {
    auth.signOut();
}

window.switchSection = function(idModulo, btnElement) {
    document.querySelectorAll('.admin-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.btn-sidebar').forEach(el => el.classList.remove('active'));
    document.getElementById(idModulo).classList.add('active');
    btnElement.classList.add('active');
}