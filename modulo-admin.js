const db = window.db;

window.carregarPrivacidade = function() {
    db.collection("sistema").doc("config_geral").get().then((doc) => {
        let htmlPadrao = `<p>Escreva aqui a Política de Privacidade.</p>`;
        if (doc.exists && doc.data().textoPrivacidade) {
            document.getElementById('editor-privacidade').innerHTML = doc.data().textoPrivacidade;
        } else {
            document.getElementById('editor-privacidade').innerHTML = htmlPadrao;
        }
    });
}

window.salvarPrivacidade = function() {
    db.collection("sistema").doc("config_geral").set({ 
        textoPrivacidade: document.getElementById('editor-privacidade').innerHTML 
    }, { merge: true }).then(() => window.mostrarToast("Política de Privacidade salva!", "success"));
}

window.processarCalculo = function() {
    const d1 = document.getElementById('data-login').value;
    const d2 = document.getElementById('data-aval').value;
    const dAval = parseInt(document.getElementById('dias-aval').value);
    const d3 = document.getElementById('data-consulta').value;
    
    if (!d1 || !d2 || isNaN(dAval) || !d3) return window.customAlert("Preencha todos os campos corretamente.", "Atenção");
    
    const u = new Date(d1 + 'T00:00:00');
    const i = new Date(d2 + 'T00:00:00');
    const c = new Date(d3 + 'T00:00:00');
    const f = new Date(i);
    f.setDate(i.getDate() + dAval - 1);
    
    const UM_DIA = 1000 * 60 * 60 * 24;
    const dif = (ant, nov) => Math.floor((nov - ant) / UM_DIA);
    let m = "";
    
    if (u > f) {
        m = `Aval obsoleto (terminou antes do último login). Ausência de <strong>${Math.max(0, dif(u, c))} dia(s)</strong>.`;
    } else if (c <= i) {
        m = `O aval ainda não começou. Ausência normal de <strong>${Math.max(0, dif(u, c))} dia(s)</strong>.`;
    } else {
        let a1 = Math.max(0, dif(u, i) - 1);
        if (c > f) {
            let a2 = Math.max(0, dif(f, c));
            m = `Ausência pré-aval: <strong>${a1} dia(s)</strong><br>Ausência pós-aval: <strong>${a2} dia(s)</strong><br><span style="display:block; margin-top:10px;">Total: <strong>${a1 + a2} dia(s)</strong></span>`;
        } else {
            m = `Militar em período de aval.<br>Ausência antes do aval: <strong>${a1} dia(s)</strong>.`;
        }
    }
    
    document.getElementById('texto-resultado').innerHTML = m;
    document.getElementById('resultado-aval').style.display = 'block';
}

window.renderTabelaAcessos = function() {
    var tbody = document.querySelector('#tbAcessos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let rendered = new Set();
    
    window.acessosData.forEach(item => {
        tbody.appendChild(window.criarRowAcesso(item, 'manual'));
        rendered.add(item.email.toLowerCase());
    });
    
    for (let email in window.planilhaAcessos) {
        if (!rendered.has(email.toLowerCase())) {
            let item = { email: email, nick: window.planilhaAcessos[email].nick, nivel: window.planilhaAcessos[email].nivel };
            tbody.appendChild(window.criarRowAcesso(item, 'planilha'));
        }
    }
}

window.criarRowAcesso = function(item, origem) {
    var tr = document.createElement('tr');
    
    let sL = item.nivel === 'LIDER' ? 'selected' : '';
    let sV = item.nivel === 'VICE-LIDER' ? 'selected' : '';
    let sS = item.nivel === 'SUB-LIDER' ? 'selected' : '';
    let sSup = item.nivel === 'SUPERVISOR' ? 'selected' : '';
    let sC = item.nivel === 'COMANDO' ? 'selected' : '';
    
    let hideAcoes = (window.nivelUsuarioGlobal === 'VICE-LIDER' && item.nivel === 'LIDER') ? 'display:none;' : '';
    
    let tBadge = origem === 'planilha' ? '<span style="background:rgba(251,191,36,0.2); color:var(--sup-neon); padding:2px 6px; border-radius:4px; font-size:10px; margin-left:8px;">PLANILHA</span>' : '<span style="background:rgba(76,175,80,0.2); color:#4caf50; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:8px;">MANUAL</span>';
    
    let acoes = origem === 'planilha' ? '<span style="color:#888; font-size:11px;">Via Planilha</span>' : `<button class="btn-admin-icon btn-admin-edit" onclick="window.toggleEditRow(this)" title="Editar"><i class="fas fa-pencil-alt"></i></button><button class="btn-admin-icon btn-admin-del" onclick="this.closest('tr').remove()" title="Excluir"><i class="fas fa-trash"></i></button>`;
    
    tr.innerHTML = `
        <td><input type="text" class="admin-input inp-email" value="${item.email || ''}" readonly style="width:70%; display:inline-block; margin-right:5px;">${tBadge}</td>
        <td><input type="text" class="admin-input inp-nick" value="${item.nick || ''}" readonly></td>
        <td>
            <select class="admin-input inp-nivel" disabled>
                <option value="LIDER" ${sL}>Líder</option>
                <option value="VICE-LIDER" ${sV}>Vice-Líder</option>
                <option value="SUB-LIDER" ${sS}>Sub-Líder</option>
                <option value="SUPERVISOR" ${sSup}>Supervisor</option>
                <option value="COMANDO" ${sC}>Comando</option>
            </select>
        </td>
        <td class="action-cell" style="${hideAcoes}" data-origem="${origem}">${acoes}</td>
    `;
    return tr;
}

window.addLinhaAcesso = function() {
    var tbody = document.querySelector('#tbAcessos tbody');
    var tr = window.criarRowAcesso({ email: '', nick: '', nivel: 'SUPERVISOR' }, 'manual');
    tbody.appendChild(tr);
    window.toggleEditRow(tr.querySelector('.btn-admin-edit'));
}

window.toggleEditRow = function(btn) {
    var tr = btn.closest('tr');
    tr.querySelectorAll('input, select').forEach(inp => inp.removeAttribute('disabled'));
    tr.querySelectorAll('input').forEach(inp => inp.removeAttribute('readonly'));
    btn.innerHTML = '<i class="fas fa-check"></i>';
    btn.className = 'btn-admin-icon btn-admin-check';
    btn.onclick = function() { window.confirmEditRow(btn); };
}

window.confirmEditRow = function(btn) {
    var tr = btn.closest('tr');
    tr.querySelectorAll('input, select').forEach(inp => inp.setAttribute('disabled', true));
    tr.querySelectorAll('input').forEach(inp => inp.setAttribute('readonly', true));
    btn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
    btn.className = 'btn-admin-icon btn-admin-edit';
    btn.onclick = function() { window.toggleEditRow(btn); };
}

window.salvarAcessos = function() {
    var rows = document.querySelectorAll('#tbAcessos tbody tr');
    const batch = db.batch();
    
    window.acessosData.forEach(ac => {
        batch.delete(db.collection("acessos").doc(ac.email));
    });
    
    rows.forEach(r => {
        let isManual = r.querySelector('.action-cell').getAttribute('data-origem') === 'manual';
        if (isManual) {
            var email = r.querySelector('.inp-email').value.trim().toLowerCase();
            if (email) {
                batch.set(db.collection("acessos").doc(email), {
                    email: email,
                    nick: r.querySelector('.inp-nick').value.trim(),
                    nivel: r.querySelector('.inp-nivel').value.toUpperCase()
                });
            }
        }
    });
    
    batch.commit().then(() => {
        window.mostrarToast("Acessos manuais salvos!", "success");
    }).catch((e) => {
        window.mostrarToast("Erro: " + e.message, "error");
    });
}