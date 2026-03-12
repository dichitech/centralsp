const db = window.db;

window.mostrarToast = function(msg, type = 'success') {
    let container = document.getElementById('toastContainer');
    let toast = document.createElement('div');
    let icon = type === 'success' ? '<i class="fas fa-check-circle" style="color: #4caf50; font-size: 20px;"></i>' : '<i class="fas fa-exclamation-triangle" style="color: #ff2a2a; font-size: 20px;"></i>';
    let bc = type === 'success' ? 'var(--sup-neon)' : '#ff2a2a';
    let sc = type === 'success' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 42, 42, 0.3)';
    
    toast.className = 'toast-msg';
    toast.style.border = `1px solid ${bc}`;
    toast.style.boxShadow = `0 0 20px ${sc}`;
    toast.innerHTML = `${icon}<span style="color:#fff;">${msg}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3500);
}

window.customAlert = function(msg, title = "Aviso") {
    document.getElementById('custom-alert-title').innerHTML = `<i class="fas fa-exclamation-circle"></i> ${title}`;
    document.getElementById('custom-alert-msg').innerHTML = msg;
    document.getElementById('custom-alert-modal').style.display = 'flex';
}

let savedSelection = null;
window.saveSelection = function() {
    if (window.getSelection) {
        let sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) savedSelection = sel.getRangeAt(0);
    }
}

window.restoreSelection = function() {
    if (savedSelection) {
        if (window.getSelection) {
            let sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedSelection);
        }
    }
}

window.applyStyle = function(cmd, val) {
    event.preventDefault();
    document.execCommand(cmd, false, val);
}

window.abrirModalLink = function() {
    event.preventDefault();
    window.saveSelection();
    document.getElementById('custom-prompt-modal').style.display = 'flex';
    document.getElementById('custom-prompt-input').value = '';
    document.getElementById('custom-prompt-input').focus();
}

window.fecharCustomPrompt = function() { document.getElementById('custom-prompt-modal').style.display = 'none'; }

window.confirmarCustomPrompt = function() {
    let url = document.getElementById('custom-prompt-input').value.trim();
    window.fecharCustomPrompt();
    window.restoreSelection();
    if (url) document.execCommand("createLink", false, url);
}

window.buildEditorHTML = function(id, content = '') {
    return `
    <div class="editor-toolbar">
        <button type="button" onmousedown="window.applyStyle('bold')"><i class="fas fa-bold"></i></button>
        <button type="button" onmousedown="window.applyStyle('italic')"><i class="fas fa-italic"></i></button>
        <button type="button" onmousedown="window.applyStyle('underline')"><i class="fas fa-underline"></i></button>
        <button type="button" onmousedown="window.abrirModalLink()"><i class="fas fa-link"></i></button>
        <input type="color" title="Cor" onchange="window.applyStyle('foreColor', this.value)" style="margin-left:5px;">
    </div>
    <div class="rich-editor admin-input ev-desc" contenteditable="true" id="${id}">${content}</div>`;
}

// ARRASTAR E REDIMENSIONAR
window.aplicarPosicoes = function() {
    for (let id in window.layoutConfig) {
        if (id === 'sponsorInner') continue;
        let el = document.getElementById(id);
        if (el) {
            if (window.layoutConfig[id].left) el.style.left = window.layoutConfig[id].left;
            if (window.layoutConfig[id].top) el.style.top = window.layoutConfig[id].top;
            if (window.layoutConfig[id].width) el.style.width = window.layoutConfig[id].width;
        }
    }
    window.aplicarSponsorInner();
}

window.aplicarSponsorInner = function() {
    let conf = window.layoutConfig['sponsorInner'] || { width: '60px', left: '0px', top: '-10px' };
    document.querySelectorAll('.sponsor-avatar img').forEach(img => {
        if (conf.left) img.style.left = conf.left;
        if (conf.top) img.style.top = conf.top;
        if (conf.width) img.style.width = conf.width;
    });
}

window.carregarLayoutConfig = function() {
    db.collection("sistema").doc("config_layout").get().then((doc) => {
        if (doc.exists && doc.data().posicoes) {
            let loaded = doc.data().posicoes;
            for (let k in loaded) { window.layoutConfig[k] = { ...window.layoutConfig[k], ...loaded[k] }; }
        }
        window.aplicarPosicoes();
    });
}

window.savePositions = function() {
    db.collection("sistema").doc("config_layout").set({ posicoes: window.layoutConfig }, { merge: true }).then(() => {
        window.mostrarToast("Posições salvas!", "success");
        if (window.isEditMode) window.toggleEditMode();
    }).catch((e) => window.mostrarToast("Erro ao salvar posições: " + e.message, "error"));
}

window.toggleEditMode = function() {
    window.isEditMode = !window.isEditMode;
    let btn = document.getElementById('btn-edit-pos');
    let dica = document.getElementById('dica-resize');
    let elsDrag = document.querySelectorAll('.draggable-item');
    let elsSponImg = document.querySelectorAll('.sponsor-avatar img');
    let elsPrize = document.querySelectorAll('.resizable-prize');
    let areaDet = document.getElementById('area-detalhes-membro');
    
    if (window.isEditMode) {
        btn.innerHTML = '<i class="fas fa-times"></i> Concluir Edição';
        btn.style.borderColor = '#ef4444';
        btn.style.color = '#ef4444';
        dica.style.display = 'inline';
        areaDet.style.display = 'flex';
        areaDet.style.opacity = '1';
        
        let ts = new Date().getTime();
        let fbacks = [{ id: 'avatar-1' }, { id: 'avatar-2' }, { id: 'avatar-selecionado' }, { id: 'avatar-empate-1' }, { id: 'avatar-empate-2' }];
        
        fbacks.forEach(f => {
            let img = document.getElementById(f.id);
            if (img && (!img.src || img.src.endsWith('='))) {
                img.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=Admin&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}`;
            }
        });
        
        document.getElementById('nick-1').innerText = "NICK 1"; document.getElementById('nick-1').style.display = "block";
        document.getElementById('nick-2').innerText = "NICK 2"; document.getElementById('nick-2').style.display = "block";
        
        elsDrag.forEach(e => { e.classList.add('edit-mode'); if (e.tagName === 'IMG' || e.tagName === 'DIV') e.style.display = 'block'; });
        elsSponImg.forEach(img => { img.classList.add('sponsor-edit', 'edit-mode'); });
        elsPrize.forEach(img => { img.classList.add('edit-mode'); });
        
    } else {
        btn.innerHTML = '<i class="fas fa-arrows-alt"></i> Editar Posições';
        btn.style.borderColor = ''; btn.style.color = ''; dica.style.display = 'none';
        
        elsDrag.forEach(e => { e.classList.remove('edit-mode'); });
        elsSponImg.forEach(img => { img.classList.remove('sponsor-edit', 'edit-mode'); });
        elsPrize.forEach(img => { img.classList.remove('edit-mode'); });
        
        if (!document.getElementById('select-membro').value) {
            areaDet.style.display = 'none'; areaDet.style.opacity = '0';
        } else {
            window.renderMemberDetails();
        }
        window.processarPodio();
    }
}

window.setupPrizesResizable = function() {
    document.querySelectorAll('.resizable-prize').forEach(img => {
        if (img.dataset.dragReady) return;
        img.dataset.dragReady = "true";
        img.ondragstart = () => false;
        
        img.addEventListener('wheel', (e) => {
            if (!window.isEditMode) return;
            e.preventDefault(); e.stopPropagation();
            let w = parseFloat(img.style.width) || img.offsetWidth;
            w += e.deltaY < 0 ? 5 : -5;
            if (w < 15) w = 15;
            img.style.width = w + 'px';
            window.layoutConfig[img.id] = window.layoutConfig[img.id] || {};
            window.layoutConfig[img.id].width = w + 'px';
        }, { passive: false });
    });
}

window.setupAllDraggables = function() {
    document.querySelectorAll('.draggable-item').forEach(el => {
        if (el.dataset.dragReady) return;
        el.dataset.dragReady = "true";
        el.ondragstart = () => false;
        
        el.addEventListener('mousedown', (e) => {
            if (!window.isEditMode) return;
            e.preventDefault(); e.stopPropagation();
            let startX = e.clientX; let startY = e.clientY;
            let startLeft = el.offsetLeft; let startTop = el.offsetTop;
            
            const onMouseMove = (mEv) => {
                mEv.preventDefault();
                el.style.left = (startLeft + (mEv.clientX - startX)) + 'px';
                el.style.top = (startTop + (mEv.clientY - startY)) + 'px';
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                window.layoutConfig[el.id] = window.layoutConfig[el.id] || {};
                window.layoutConfig[el.id].left = el.style.left;
                window.layoutConfig[el.id].top = el.style.top;
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        el.addEventListener('wheel', (e) => {
            if (!window.isEditMode) return;
            e.preventDefault(); e.stopPropagation();
            let w = parseFloat(window.getComputedStyle(el).width) || el.offsetWidth;
            w += e.deltaY < 0 ? 5 : -5;
            if (w < 15) w = 15;
            el.style.width = w + 'px';
            window.layoutConfig[el.id] = window.layoutConfig[el.id] || {};
            window.layoutConfig[el.id].width = el.style.width;
        }, { passive: false });
    });
}