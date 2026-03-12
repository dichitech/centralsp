const firebaseConfig = { apiKey: "AIzaSyCvyt0IyruvPqZPb6OqX5yiGuvIjUWpktA", authDomain: "central-supervisores.firebaseapp.com", projectId: "central-supervisores", storageBucket: "central-supervisores.firebasestorage.app", messagingSenderId: "882541677437", appId: "1:882541677437:web:ed25d1e7aa273ca40cda14" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); const db = firebase.firestore();

let usuarioLogadoEmail = ''; let usuarioLogadoNick = ''; let nivelUsuarioGlobal = 'SUPERVISOR'; 
let acessosData = []; let planilhaAcessos = {}; let membrosDataArray = []; let dashboardEventosData = []; let pontosExtrasMap = {}; 
let eventoAtivo = false; let eventoMult = 1; let cargosMap = {}; 

let layoutConfig = { 'img-podio-base': { left: '100px', top: '150px', width: 'auto' }, 'avatar-1': { left: '175px', top: '50px', width: 'auto' }, 'medal-1': { left: '175px', top: '0px', width: 'auto' }, 'nick-1': { left: '160px', top: '120px', width: 'auto' }, 'avatar-2': { left: '80px', top: '100px', width: 'auto' }, 'medal-2': { left: '80px', top: '50px', width: 'auto' }, 'nick-2': { left: '60px', top: '170px', width: 'auto' }, 'avatar-empate-1': { left: '175px', top: '50px', width: 'auto' }, 'txt-empate-1': { left: '175px', top: '20px', width: 'auto' }, 'avatar-empate-2': { left: '80px', top: '100px', width: 'auto' }, 'txt-empate-2': { left: '80px', top: '70px', width: 'auto' }, 'img-palco-base': { left: '50px', top: '220px', width: 'auto' }, 'img-brasao': { left: '10px', top: '10px', width: 'auto' }, 'img-emblema-sup': { left: '45px', top: '40px', width: 'auto' }, 'avatar-selecionado': { left: '130px', top: '100px', width: 'auto' }, 'sponsorInner': { left: '0px', top: '-10px', width: '60px' } };
let isEditMode = false;

window.mostrarToast = function(msg, type = 'success') { var container = document.getElementById('toastContainer'); var toast = document.createElement('div'); let icon = type === 'success' ? '<i class="fas fa-check-circle" style="color: #4caf50; font-size: 20px;"></i>' : '<i class="fas fa-exclamation-triangle" style="color: #ff2a2a; font-size: 20px;"></i>'; let bc = type === 'success' ? 'var(--sup-neon)' : '#ff2a2a'; let sc = type === 'success' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 42, 42, 0.3)'; toast.className = 'toast-msg'; toast.style.border = `1px solid ${bc}`; toast.style.boxShadow = `0 0 20px ${sc}`; toast.innerHTML = `${icon}<span style="color:#fff;">${msg}</span>`; container.appendChild(toast); setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3500); }
window.customAlert = function(msg, title = "Aviso") { document.getElementById('custom-alert-title').innerHTML = `<i class="fas fa-exclamation-circle"></i> ${title}`; document.getElementById('custom-alert-msg').innerHTML = msg; document.getElementById('custom-alert-modal').style.display = 'flex'; }

let savedSelection = null;
window.saveSelection = function() { if (window.getSelection) { let sel = window.getSelection(); if (sel.getRangeAt && sel.rangeCount) { savedSelection = sel.getRangeAt(0); } } }
window.restoreSelection = function() { if (savedSelection) { if (window.getSelection) { let sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedSelection); } } }
window.applyStyle = function(cmd, val) { event.preventDefault(); document.execCommand(cmd, false, val); }
window.abrirModalLink = function() { event.preventDefault(); window.saveSelection(); document.getElementById('custom-prompt-modal').style.display = 'flex'; document.getElementById('custom-prompt-input').value = ''; document.getElementById('custom-prompt-input').focus(); }
window.fecharCustomPrompt = function() { document.getElementById('custom-prompt-modal').style.display = 'none'; }
window.confirmarCustomPrompt = function() { let url = document.getElementById('custom-prompt-input').value.trim(); window.fecharCustomPrompt(); window.restoreSelection(); if(url) { document.execCommand("createLink", false, url); } }

window.liberarPainel = function() {
    document.getElementById('loginCard').style.display = 'none'; document.getElementById('loginLoader').style.display = 'none'; document.getElementById('loginScreen').style.opacity = '0';
    setTimeout(() => { document.getElementById('loginScreen').style.display = 'none'; document.getElementById('appWrapper').style.display = 'flex'; }, 300);
    document.getElementById('data-consulta').valueAsDate = new Date();
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    document.getElementById('mes-atual').innerText = meses[new Date().getMonth()] + " de " + new Date().getFullYear();
    carregarLayoutConfig(); escutarCargos(); escutarConfigDashboard(); escutarMetasDoFirebase(); 
    if (nivelUsuarioGlobal !== 'SUPERVISOR') { escutarMilitaresEstrelas(); }
    if (nivelUsuarioGlobal === 'LIDER' || nivelUsuarioGlobal === 'VICE-LIDER') { carregarPrivacidade(); escutarLogsEstrelas(); }
    setupAllDraggables(); 
}

auth.onAuthStateChanged((user) => { if (user) { usuarioLogadoEmail = user.email.toLowerCase(); verificarAcessoBD(usuarioLogadoEmail); } else { document.getElementById('appWrapper').style.display = 'none'; document.getElementById('loginCard').style.display = 'block'; document.getElementById('loginScreen').style.display = 'flex'; setTimeout(() => { document.getElementById('loginScreen').style.opacity = '1'; }, 10); } });

async function verificarAcessoBD(email) {
    try {
        let authEmail = email.toLowerCase().trim();
        
        let planSnap = await db.collection("sistema").doc("acessos_planilha").get();
        if(planSnap.exists && planSnap.data().dados) { try { planilhaAcessos = JSON.parse(planSnap.data().dados); } catch(e){} }
        
        let manualSnap = await db.collection("acessos").get();
        acessosData = [];
        manualSnap.forEach(doc => { acessosData.push({ id: doc.id, ...doc.data() }); });

        // Procura ignorando espaços ocultos
        let userManual = acessosData.find(u => (u.email || '').toLowerCase().trim() === authEmail);
        let userPlan = null;
        for(let key in planilhaAcessos) {
            if(key.toLowerCase().trim() === authEmail) { userPlan = planilhaAcessos[key]; break; }
        }

        let autorizado = false;

        // Prioridade de Liderança da Planilha
        if(userPlan && (userPlan.nivel.includes("LIDER") || userPlan.nivel.includes("VICE"))) {
            autorizado = true; nivelUsuarioGlobal = userPlan.nivel; usuarioLogadoNick = userPlan.nick;
        } else if(userManual) { 
            autorizado = true; nivelUsuarioGlobal = userManual.nivel; usuarioLogadoNick = userManual.nick; 
        } else if(userPlan) { 
            autorizado = true; nivelUsuarioGlobal = userPlan.nivel; usuarioLogadoNick = userPlan.nick; 
        }

        if (autorizado) {
            nivelUsuarioGlobal = nivelUsuarioGlobal.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
            if(nivelUsuarioGlobal === 'VICELIDER') nivelUsuarioGlobal = 'VICE-LIDER'; if(nivelUsuarioGlobal === 'SUBLIDER') nivelUsuarioGlobal = 'SUB-LIDER';
            
            if (nivelUsuarioGlobal === 'COMANDO') { window.customAlert("Acesso de Comando restrito ao Painel Público.", "Aviso"); setTimeout(()=> { auth.signOut(); window.location.href = "https://dichitech.github.io/ranking"; }, 3000); return; }
            if (nivelUsuarioGlobal === 'LIDER' || nivelUsuarioGlobal === 'VICE-LIDER') { document.getElementById('admin-only-menus').style.display = 'flex'; document.getElementById('admin-drag-controls').style.display = 'flex'; renderTabelaAcessos(); }
            if (nivelUsuarioGlobal === 'SUPERVISOR') { let menuAv = document.getElementById('menu-avais'); if(menuAv) menuAv.style.display = 'none'; let menuFb = document.getElementById('menu-feedbacks'); if(menuFb) menuFb.style.display = 'none'; let menuEs = document.getElementById('menu-estrelas'); if(menuEs) menuEs.style.display = 'none'; }
            
            window.switchSection('modulo-metas', document.getElementById('menu-metas')); 
            window.liberarPainel();
        } else { 
            window.customAlert(`ACESSO NEGADO.<br><br>O e-mail <b>${authEmail}</b> não foi encontrado com permissões ativas.<br>Caso o e-mail esteja correto, procure a liderança.`, "Falha de Permissão"); 
            setTimeout(()=>auth.signOut(), 5000); 
        }
    } catch (err) {
        window.customAlert("Erro na comunicação com o banco de dados: " + err.message, "Erro Crítico");
    }
}

window.loginGoogle = function() { const provider = new firebase.auth.GoogleAuthProvider(); document.getElementById('loginCard').style.display = 'none'; document.getElementById('loginLoader').style.display = 'block'; auth.signInWithPopup(provider).catch(() => { document.getElementById('loginLoader').style.display = 'none'; document.getElementById('loginCard').style.display = 'block'; document.getElementById('login-error').style.display = 'block'; }); }
window.fazerLogout = function() { auth.signOut(); }
window.switchSection = function(idModulo, btnElement) { document.querySelectorAll('.admin-section').forEach(el => el.classList.remove('active')); document.querySelectorAll('.btn-sidebar').forEach(el => el.classList.remove('active')); document.getElementById(idModulo).classList.add('active'); btnElement.classList.add('active'); }

// ==========================================
// ESTRELAS E VALIDAÇÃO EM LOTE
// ==========================================
let militaresEstrelasData = [];
function escutarCargos() { db.collection("sistema").doc("cargos").onSnapshot((doc) => { if (doc.exists && doc.data().dados) { try { cargosMap = JSON.parse(doc.data().dados); renderTabelaEstrelas(); } catch(e) {} } }); }
function escutarMilitaresEstrelas() { db.collection("militares").onSnapshot((snapshot) => { militaresEstrelasData = []; snapshot.forEach((docSnap) => { militaresEstrelasData.push({ id: docSnap.id, ...docSnap.data() }); }); renderTabelaEstrelas(); }); }

function renderTabelaEstrelas() {
    let tbody = document.querySelector('#tb-militares-estrelas tbody'); if(!tbody) return; tbody.innerHTML = '';
    if(militaresEstrelasData.length === 0) return tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-sub);">Nenhum policial registrado.</td></tr>';
    let lista = [...militaresEstrelasData]; lista.sort((a,b) => (b.estrelas||0) - (a.estrelas||0) || (b.promocoes_realizadas||0) - (a.promocoes_realizadas||0));
    lista.forEach(dados => {
        let cargo = cargosMap[dados.nome] || ''; let cargoHtml = cargo ? `<span style="color:var(--text-sub); font-size:11px; text-transform:uppercase; letter-spacing:1px; display:block; margin-top:2px;">${cargo}</span>` : '';
        let str = '★'.repeat(dados.estrelas || 0); let eHtml = `<span style="color:var(--sup-neon); font-size:14px; letter-spacing:2px; filter: drop-shadow(0 0 5px var(--sup-glow));">${str}</span> <span style="font-weight:bold; color:#fff; margin-left:5px;">(${dados.estrelas || 0})</span>`;
        let sHtml = dados.status === 'Suspenso' ? '<span style="color:#ff2a2a; font-weight:bold; background:rgba(255,42,42,0.1); padding:4px 8px; border-radius:4px; font-size:12px;">SUSPENSO</span>' : '<span style="color:#4caf50; background:rgba(76,175,80,0.1); padding:4px 8px; border-radius:4px; font-size:12px;">ATIVO</span>';
        let avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${dados.nome}&action=std&direction=2&head_direction=2&gesture=sml&size=m`;
        let tr = document.createElement('tr');
        tr.innerHTML = `<td><div style="display:flex; align-items:center; gap:12px;"><img src="${avatarUrl}" onerror="this.style.display='none'" style="width:45px; height:45px; border-radius:50%; background:rgba(0,0,0,0.8); border:2px solid var(--sup-neon); box-shadow:0 0 10px var(--sup-neon); object-fit:cover; object-position:center top;"><div><div style="font-weight:bold; color:#fff; font-size:15px;">${dados.nome} ${dados.premios_acumulados > 0 ? `<span title="${dados.premios_acumulados} Prêmio(s)">🎖️ x${dados.premios_acumulados}</span>` : ''}</div>${cargoHtml}</div></div></td><td style="text-align:center; font-weight:bold; font-size:16px;">${dados.promocoes_realizadas || 0} <span style="color:#555; font-size:12px;">/ 3</span></td><td>${eHtml}</td><td style="text-align:center;">${sHtml}</td>`;
        tbody.appendChild(tr);
    });
}

function registrarLogEstrela(bene, acao, idProm, detalhes) { db.collection("logs_estrelas").add({ timestamp: new Date().getTime(), data_hora: new Date().toLocaleString('pt-BR'), autor: usuarioLogadoNick, beneficiado: bene, acao: acao, id_promocao: idProm || '-', detalhes: detalhes }); }

// LOTE DE VALIDAÇÕES
window.buscarPromocoesLote = async function() {
    let dateVal = document.getElementById('lote-data').value;
    if(!dateVal) return window.mostrarToast("Selecione uma data para a validação.", "error");

    let [y, m, d] = dateVal.split('-'); let dataBr = `${d}/${m}/${y}`;
    let excluidosStr = document.getElementById('lote-excluidos').value;
    let excluidosArr = excluidosStr.split(',').map(s => s.trim()).filter(s => s !== "");

    let docSnap = await db.collection("sistema").doc("promocoes").get();
    if(!docSnap.exists) return window.customAlert("A planilha oficial ainda não enviou os dados de promoções para o sistema.", "Erro de Sincronização");

    let promocoes = [];
    try { promocoes = JSON.parse(docSnap.data().dados); } catch(e) { return window.mostrarToast("Erro ao processar dados.", "error"); }

    let filtradas = promocoes.filter(p => p.data === dataBr && !excluidosArr.includes(p.id));
    if(filtradas.length === 0) return window.customAlert(`Nenhuma promoção válida encontrada para a data ${dataBr}.`, "Busca Vazia");

    let contagem = {}; let idsColetados = [];
    filtradas.forEach(p => { contagem[p.promotor] = (contagem[p.promotor] || 0) + 1; idsColetados.push(p.id); });

    let html = `<div style="color:#fff; margin-bottom:10px; font-size:15px;"><i class="fas fa-check-circle" style="color:#4caf50;"></i> ${filtradas.length} promoções válidas localizadas.</div><ul style="color:var(--text-sub); margin-bottom:15px;">`;
    for(let nick in contagem) { html += `<li><strong style="color:var(--sup-neon);">${nick}</strong>: validou ${contagem[nick]} promoção(ões)</li>`; }
    html += `</ul><button class="btn-tech btn-save" style="width:100%;" onclick='window.confirmarLote(${JSON.stringify(contagem)}, ${JSON.stringify(idsColetados)})'><i class="fas fa-check-double"></i> Atribuir Ciclos Oficiais</button>`;

    document.getElementById('resultado-lote').innerHTML = html; document.getElementById('resultado-lote').style.display = 'block';
}

window.confirmarLote = async function(contagem, idsColetados) {
    let idLoteStr = idsColetados.join(', '); if(idLoteStr.length > 50) idLoteStr = idLoteStr.substring(0, 47) + "...";

    for(let nick in contagem) {
        let qtd = contagem[nick];
        let officialNick = Object.keys(cargosMap).find(k => k.toLowerCase() === nick.toLowerCase());
        let dbNick = officialNick || nick;

        let ref = db.collection("militares").doc(dbNick);
        let docM = await ref.get();
        
        let p = 0; let e = 0; let pr = 0; let status = 'Ativo';
        if(docM.exists) {
            let dados = docM.data();
            if(dados.status === 'Suspenso') continue; 
            p = dados.promocoes_realizadas || 0; e = dados.estrelas || 0; pr = dados.premios_acumulados || 0; status = dados.status;
        }

        let estrelasAntes = e;
        p += qtd;
        let estrelasGanhas = Math.floor(p / 3);
        p = p % 3; 
        e += estrelasGanhas;

        let detailLog = `Validou ${qtd} promoção(ões). `;
        if(estrelasGanhas > 0) detailLog += `Conquistou ${estrelasGanhas} estrela(s)! `;

        // Aviso visual sem resetar a pontuação automaticamente
        let atingiuPremio = Math.floor(estrelasAntes / 10) < Math.floor(e / 10);
        if (atingiuPremio) {
             window.customAlert(`🏅 O policial ${dbNick} acaba de atingir ${e} estrelas no sistema!<br><br>Avise o Comando para realizar o pagamento oficial destas 10 estrelas.`, "Aguardando Pagamento!");
             detailLog += " Atingiu cota para prêmio. (Aguardando Comando)";
        }

        await ref.set({ nome: dbNick, status: status, promocoes_realizadas: p, estrelas: e, premios_acumulados: pr }, {merge:true});
        registrarLogEstrela(dbNick, "Validação em Lote", idLoteStr, detailLog);
    }

    window.mostrarToast("Lote processado com sucesso!", "success");
    document.getElementById('resultado-lote').style.display = 'none';
    document.getElementById('lote-data').value = ''; document.getElementById('lote-excluidos').value = '';
}

function escutarLogsEstrelas() {
    db.collection("logs_estrelas").orderBy("timestamp", "desc").limit(50).onSnapshot(snap => {
        let tbody = document.querySelector('#tb-logs tbody'); tbody.innerHTML = '';
        snap.forEach(doc => {
            let d = doc.data(); let cor = d.acao.includes("Validação") || d.acao.includes("Promoção") ? "color:#4caf50;" : "color:#ff2a2a;";
            if(d.acao.includes("Pagamento")) cor = "color:#fbbf24;";
            tbody.innerHTML += `<tr><td style="font-size:12px;">${d.data_hora}</td><td><strong>${d.autor}</strong></td><td>${d.beneficiado}</td><td style="${cor} font-weight:bold;">${d.acao}</td><td style="font-size:13px; color:var(--text-sub);">ID/Lote: ${d.id_promocao} <br> ${d.detalhes}</td></tr>`;
        });
    });
}

// DASHBOARD & EVENTOS, PONTOS EXTRAS E ARRASTO
window.abrirDashboard = function() { document.getElementById('modal-dashboard').style.display = 'flex'; renderAdminEventosList(); }
window.fecharDashboard = function() { document.getElementById('modal-dashboard').style.display = 'none'; }
function formatarDataBR(dataStr) { if(!dataStr) return ""; let d = new Date(dataStr + "T00:00:00"); return d.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}); }
window.adicionarNovoEventoBox = function() { dashboardEventosData.push({ nome: '', dataInicio: '', dataFim: '', descricao: '', premiosTexto: '', hc: false, moedas: false }); renderAdminEventosList(); }
window.removerEventoBox = function(index) { dashboardEventosData.splice(index, 1); renderAdminEventosList(); }

function renderAdminEventosList() {
    let container = document.getElementById('dash-eventos-container'); container.innerHTML = '';
    if(dashboardEventosData.length === 0) container.innerHTML = '<p style="color:var(--text-sub); font-style:italic; font-size:14px; margin-bottom:20px;">Nenhum evento criado.</p>';
    dashboardEventosData.forEach((ev, i) => {
        let html = `<div class="admin-evento-item"><button type="button" onclick="window.removerEventoBox(${i})" style="position:absolute; right:15px; top:15px; background:rgba(255,42,42,0.1); border:none; color:#ef4444; width:30px; height:30px; border-radius:50%; cursor:pointer;"><i class="fas fa-trash"></i></button><h4 style="color:#fff; margin-bottom:10px; font-size:13px; text-transform:uppercase;">Evento ${i+1}</h4><div class="input-block" style="margin-bottom:10px;"><input type="text" class="ev-nome" placeholder="Nome do Evento" value="${ev.nome}"></div><div style="display:flex; gap:15px; margin-bottom:10px;"><div style="flex:1;"><label class="tech-label">Início</label><div class="input-block" style="margin:0;"><input type="date" class="ev-data-inicio" value="${ev.dataInicio}"></div></div><div style="flex:1;"><label class="tech-label">Fim</label><div class="input-block" style="margin:0;"><input type="date" class="ev-data-fim" value="${ev.dataFim}"></div></div></div><label class="tech-label">Regras e Descrição</label>${buildEditorHTML(`ev-desc-${i}`, ev.descricao)}<label class="tech-label">Texto da Premiação</label><input type="text" class="admin-input ev-premios-txt" style="margin-bottom:10px;" placeholder="Ex: 4 HCs para o 1º lugar..." value="${ev.premiosTexto || ''}"><div style="display:flex; gap:20px; background: rgba(0,0,0,0.2); padding: 10px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);"><label style="color:#fff; cursor:pointer;"><input type="checkbox" class="ev-hc" ${ev.hc ? 'checked' : ''}> HC</label><label style="color:#fff; cursor:pointer;"><input type="checkbox" class="ev-moedas" ${ev.moedas ? 'checked' : ''}> Moedas</label></div></div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
}
window.salvarDashboard = function() {
    let evs = []; document.querySelectorAll('.admin-evento-item').forEach(el => { evs.push({ nome: el.querySelector('.ev-nome').value, dataInicio: el.querySelector('.ev-data-inicio').value, dataFim: el.querySelector('.ev-data-fim').value, descricao: el.querySelector('.ev-desc').innerHTML, premiosTexto: el.querySelector('.ev-premios-txt').value, hc: el.querySelector('.ev-hc').checked, moedas: el.querySelector('.ev-moedas').checked }); });
    db.collection("sistema").doc("config_metas").set({ eventoAtivo: document.getElementById('dash-toggle-evento').checked, eventoMult: parseInt(document.getElementById('dash-mult-evento').value) || 1, textoPatrocinio: document.getElementById('dash-txt-patrocinio').value, eventos: evs }, {merge:true}).then(() => { window.mostrarToast("Painel Atualizado!", "success"); window.fecharDashboard(); }).catch((e) => window.mostrarToast("Erro ao salvar Dashboard.", "error"));
}

function escutarConfigDashboard() {
    db.collection("sistema").doc("config_metas").onSnapshot((doc) => {
        if (doc.exists) {
            let d = doc.data(); eventoAtivo = d.eventoAtivo || false; eventoMult = parseInt(d.eventoMult) || 1; pontosExtrasMap = d.pontosExtras || {}; dashboardEventosData = d.eventos || [];
            if(nivelUsuarioGlobal === 'LIDER' || nivelUsuarioGlobal === 'VICE-LIDER') {
                let tg = document.getElementById('dash-toggle-evento'); if(tg) tg.checked = eventoAtivo; let ml = document.getElementById('dash-mult-evento'); if(ml) ml.value = eventoMult; let pr = document.getElementById('dash-txt-patrocinio'); if(pr) pr.value = d.textoPatrocinio || '';
            }
            
            let btnPE = document.getElementById('btn-pontos-extras');
            if(btnPE && (nivelUsuarioGlobal === 'LIDER' || nivelUsuarioGlobal === 'VICE-LIDER')) {
                btnPE.style.display = eventoAtivo ? 'inline-flex' : 'none';
            }

            let banner = document.getElementById('evento-banner'); if(eventoAtivo && eventoMult > 1) { banner.style.display = 'flex'; } else { banner.style.display = 'none'; eventoMult = 1; }
            document.getElementById('ui-txt-patrocinio').innerText = d.textoPatrocinio || 'Deseja patrocinar algum dos eventos e ajudar a divisão? Procure a Liderança!';

            let uiLista = document.getElementById('ui-lista-eventos'); uiLista.innerHTML = '';
            if(dashboardEventosData.length === 0) uiLista.innerHTML = `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 3px solid var(--sup-neon); margin-bottom: 15px;"><div style="color: #fff; font-size: 14px;">Fique atento aos anúncios no grupo!</div></div>`;
            else {
                dashboardEventosData.forEach((ev, i) => {
                    let dtTxt = ''; if(ev.dataInicio && ev.dataFim) dtTxt = `${formatarDataBR(ev.dataInicio)} a ${formatarDataBR(ev.dataFim)}`; else if(ev.dataInicio) dtTxt = `A partir de ${formatarDataBR(ev.dataInicio)}`;
                    let pUI = '';
                    if(ev.premiosTexto || ev.hc || ev.moedas) {
                        pUI = `<div style="margin-top:15px; padding-top:15px; border-top:1px dashed rgba(251,191,36,0.2);">`;
                        if(ev.premiosTexto) pUI += `<div style="color:var(--sup-neon); font-size:13px; margin-bottom:10px; font-weight:600;">${ev.premiosTexto}</div>`;
                        if(ev.hc || ev.moedas) {
                            let wHC = layoutConfig[`img-premio-hc-${i}`] ? layoutConfig[`img-premio-hc-${i}`].width : '40px'; let wM = layoutConfig[`img-premio-moedas-${i}`] ? layoutConfig[`img-premio-moedas-${i}`].width : '40px';
                            pUI += `<div style="display:flex; gap:15px; align-items:center;">`;
                            if(ev.hc) pUI += `<img id="img-premio-hc-${i}" src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEirfXmN9g_cDNpjq8o7oXeKFIRwJLgI-w2FEisZ3iJdxqblDlMM858H3fDrWh-PpDE12pNyMmPBdxX8TRgBU95PXO8nd24V9Gny1nFTkhqsGKUKfMmtK-AEoIAvFTsJBjsNV2gk2oUkTTpf/s1600/HC31.gif" class="resizable-prize" draggable="false" style="display:block; width:${wHC};">`;
                            if(ev.moedas) pUI += `<img id="img-premio-moedas-${i}" src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjDZ6AWqYyPxpnw-heLbJ-k1qoyj_EZN8_wWWotWVW5MzTQZKPQEY-L3zuPCYIK-ExBKbQFBxyfS_c_F4xY6pPUAgRoHiJvC9HgpWYj6iVUCp4eXDF7M-ilisPyCQ6KBpGfdqgwjpmvWrsi/s1600/15c6908117fc3.gif" class="resizable-prize" draggable="false" style="display:block; width:${wM};">`;
                            pUI += `</div>`;
                        }
                        pUI += `</div>`;
                    }
                    uiLista.insertAdjacentHTML('beforeend', `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 3px solid var(--sup-neon); margin-bottom: 15px;"><h4 style="color:var(--sup-neon); margin-bottom: 5px; font-size: 18px; text-transform: uppercase;">${ev.nome || 'Evento'}</h4>${dtTxt ? `<div style="color: var(--text-sub); font-size: 13px; margin-bottom: 10px; display:flex; align-items:center; gap:5px; font-weight:600;"><i class="far fa-calendar-day"></i> <span>${dtTxt}</span></div>` : ''}<div style="color: #fff; font-size: 14px; line-height: 1.5;">${ev.descricao || ''}</div>${pUI}</div>`);
                });
            }
            setupPrizesResizable(); if(membrosDataArray.length > 0) { processarPodio(); if(document.getElementById('select-membro').value) window.renderMemberDetails(); renderTabelaPontosExtras(); }
        }
    });
}

window.abrirModalPontosExtras = function() { document.getElementById('modal-pontos-extras').style.display = 'flex'; let sel = document.getElementById('pe-select-membro'); sel.innerHTML = '<option value="" disabled selected>Selecione...</option>'; [...membrosDataArray].sort((a,b) => a.nick.localeCompare(b.nick)).forEach(m => { sel.innerHTML += `<option value="${m.nick}">${m.nick}</option>`; }); renderTabelaPontosExtras(); }
window.fecharModalPontosExtras = function() { document.getElementById('modal-pontos-extras').style.display = 'none'; }
window.salvarPontoExtra = function() { let nick = document.getElementById('pe-select-membro').value; let pts = parseInt(document.getElementById('pe-input-pontos').value); if(!nick || isNaN(pts)) return window.mostrarToast("Selecione um membro e digite a pontuação.", "error"); pontosExtrasMap[nick] = pts; db.collection("sistema").doc("config_metas").set({ pontosExtras: pontosExtrasMap }, {merge:true}).then(() => { document.getElementById('pe-input-pontos').value = ''; window.mostrarToast(`+${pts} pontos para ${nick}`, "success"); }); }
window.removerPontoExtra = function(nick) { delete pontosExtrasMap[nick]; db.collection("sistema").doc("config_metas").set({ pontosExtras: pontosExtrasMap }, {merge:true}); }
function renderTabelaPontosExtras() { let tbody = document.querySelector('#tb-pontos-extras tbody'); tbody.innerHTML = ''; for(let n in pontosExtrasMap) { tbody.innerHTML += `<tr><td>${n}</td><td style="text-align:center; color:var(--sup-neon); font-weight:bold;">+${pontosExtrasMap[n]}</td><td style="text-align:right;"><button class="btn-admin-icon btn-admin-del" onclick="window.removerPontoExtra('${n}')"><i class="fas fa-trash"></i></button></td></tr>`; } if(Object.keys(pontosExtrasMap).length === 0) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-sub);">Nenhum ponto extra.</td></tr>'; }

function aplicarPosicoes() { for(let id in layoutConfig) { if(id === 'sponsorInner') continue; let el = document.getElementById(id); if(el) { if(layoutConfig[id].left) el.style.left = layoutConfig[id].left; if(layoutConfig[id].top) el.style.top = layoutConfig[id].top; if(layoutConfig[id].width) el.style.width = layoutConfig[id].width; } } aplicarSponsorInner(); }
function aplicarSponsorInner() { let conf = layoutConfig['sponsorInner'] || {width: '60px', left: '0px', top: '-10px'}; document.querySelectorAll('.sponsor-avatar img').forEach(img => { if(conf.left) img.style.left = conf.left; if(conf.top) img.style.top = conf.top; if(conf.width) img.style.width = conf.width; }); }
function carregarLayoutConfig() { db.collection("sistema").doc("config_layout").get().then((doc) => { if(doc.exists && doc.data().posicoes) { let loaded = doc.data().posicoes; for(let k in loaded) { layoutConfig[k] = { ...layoutConfig[k], ...loaded[k] }; } } aplicarPosicoes(); }); }
window.savePositions = function() { db.collection("sistema").doc("config_layout").set({ posicoes: layoutConfig }, {merge: true}).then(() => { window.mostrarToast("Posições salvas!", "success"); if(isEditMode) window.toggleEditMode(); }).catch((e) => window.mostrarToast("Erro ao salvar posições: " + e.message, "error")); }

window.toggleEditMode = function() {
    isEditMode = !isEditMode; let btn = document.getElementById('btn-edit-pos'); let dica = document.getElementById('dica-resize'); let elsDrag = document.querySelectorAll('.draggable-item'); let elsSponImg = document.querySelectorAll('.sponsor-avatar img'); let elsPrize = document.querySelectorAll('.resizable-prize'); let areaDet = document.getElementById('area-detalhes-membro');
    if(isEditMode) {
        btn.innerHTML = '<i class="fas fa-times"></i> Concluir Edição'; btn.style.borderColor = '#ef4444'; btn.style.color = '#ef4444'; dica.style.display = 'inline'; areaDet.style.display = 'flex'; areaDet.style.opacity = '1';
        let fbacks = [ {id:'avatar-1'}, {id:'avatar-2'}, {id:'avatar-selecionado'}, {id:'avatar-empate-1'}, {id:'avatar-empate-2'} ];
        fbacks.forEach(f => { let img = document.getElementById(f.id); if(img && (!img.src || img.src.endsWith('='))) img.src = 'https://www.habbo.com.br/habbo-imaging/avatarimage?user=Admin&action=std&direction=2&head_direction=2&gesture=sml&size=b'; });
        document.getElementById('nick-1').innerText = "NICK 1"; document.getElementById('nick-1').style.display = "block"; document.getElementById('nick-2').innerText = "NICK 2"; document.getElementById('nick-2').style.display = "block";
        elsDrag.forEach(e => { e.classList.add('edit-mode'); if(e.tagName === 'IMG' || e.tagName === 'DIV') e.style.display = 'block'; }); elsSponImg.forEach(img => { img.classList.add('sponsor-edit', 'edit-mode'); }); elsPrize.forEach(img => { img.classList.add('edit-mode'); });
    } else {
        btn.innerHTML = '<i class="fas fa-arrows-alt"></i> Editar Posições'; btn.style.borderColor = ''; btn.style.color = ''; dica.style.display = 'none';
        elsDrag.forEach(e => { e.classList.remove('edit-mode'); }); elsSponImg.forEach(img => { img.classList.remove('sponsor-edit', 'edit-mode'); }); elsPrize.forEach(img => { img.classList.remove('edit-mode'); });
        if(!document.getElementById('select-membro').value) { areaDet.style.display = 'none'; areaDet.style.opacity = '0'; } else { window.renderMemberDetails(); }
        processarPodio(); 
    }
}
function setupPrizesResizable() { document.querySelectorAll('.resizable-prize').forEach(img => { if(img.dataset.dragReady) return; img.dataset.dragReady = "true"; img.ondragstart = () => false; img.addEventListener('wheel', (e) => { if(!isEditMode) return; e.preventDefault(); e.stopPropagation(); let w = parseFloat(img.style.width) || img.offsetWidth; w += e.deltaY < 0 ? 5 : -5; if(w < 15) w = 15; img.style.width = w + 'px'; layoutConfig[img.id] = layoutConfig[img.id] || {}; layoutConfig[img.id].width = w + 'px'; }, { passive: false }); }); }
function setupAllDraggables() { document.querySelectorAll('.draggable-item').forEach(el => { if(el.dataset.dragReady) return; el.dataset.dragReady = "true"; el.ondragstart = () => false; el.addEventListener('mousedown', (e) => { if(!isEditMode) return; e.preventDefault(); e.stopPropagation(); let startX = e.clientX; let startY = e.clientY; let startLeft = el.offsetLeft; let startTop = el.offsetTop; const onMouseMove = (mEv) => { mEv.preventDefault(); el.style.left = (startLeft + (mEv.clientX - startX)) + 'px'; el.style.top = (startTop + (mEv.clientY - startY)) + 'px'; }; const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); layoutConfig[el.id] = layoutConfig[el.id] || {}; layoutConfig[el.id].left = el.style.left; layoutConfig[el.id].top = el.style.top; }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }); el.addEventListener('wheel', (e) => { if(!isEditMode) return; e.preventDefault(); e.stopPropagation(); let w = parseFloat(window.getComputedStyle(el).width) || el.offsetWidth; w += e.deltaY < 0 ? 5 : -5; if(w < 15) w = 15; el.style.width = w + 'px'; layoutConfig[el.id] = layoutConfig[el.id] || {}; layoutConfig[el.id].width = el.style.width; }, { passive: false }); }); }

function escutarMetasDoFirebase() { db.collection("sistema").doc("metas").onSnapshot((doc) => { if (doc.exists && doc.data().dados) { let rows = []; try { rows = JSON.parse(doc.data().dados); } catch(e) { return; } if(rows.length > 17 && rows[17][1]) document.getElementById('meta-week-title').innerText = rows[17][1]; membrosDataArray = []; let sponsorsList = []; for(let i = 3; i < rows.length; i++) { if(rows[i][15]) sponsorsList.push(rows[i][15]); if(rows[i][16]) sponsorsList.push(rows[i][16]); if(rows[i][17]) sponsorsList.push(rows[i][17]); } renderSponsors(sponsorsList); for(let i = 20; i < rows.length; i++) { if(!rows[i][3]) continue; membrosDataArray.push({ cargo: rows[i][2] || '', nick: rows[i][3].trim(), convite: parseInt(rows[i][5]) || 0, ppp: parseInt(rows[i][6]) || 0, rels: parseInt(rows[i][7]) || 0, relcg: parseInt(rows[i][9]) || 0, avisos: parseInt(rows[i][10]) || 0, total_base: parseInt(rows[i][11]) || 0, status_base: (rows[i][12] || '').toString().trim() }); } popularSelectMembros(); processarPodio(); } }); }
function renderSponsors(lista) { let unique = [...new Set(lista.filter(n => n.trim() !== ''))]; let container = document.getElementById('sponsors-container'); container.innerHTML = ''; unique.forEach(nick => { container.innerHTML += `<div class="sponsor-item" style="display:flex; flex-direction:column; align-items:center; gap:5px;"><div class="sponsor-avatar" title="${nick.trim()}"><img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nick.trim()}&action=std&direction=2&head_direction=2&gesture=sml&size=b" draggable="false"></div><span style="color:var(--sup-neon); font-size:11px; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">${nick.trim()}</span></div>`; }); aplicarSponsorInner(); document.querySelectorAll('.sponsor-avatar img').forEach(img => { if (img.dataset.dragReady) return; img.dataset.dragReady = "true"; img.ondragstart = () => false; img.addEventListener('mousedown', (e) => { if(!isEditMode) return; e.preventDefault(); e.stopPropagation(); let sX = e.clientX; let sY = e.clientY; let sL = img.offsetLeft; let sT = img.offsetTop; const onMv = (mEv) => { mEv.preventDefault(); layoutConfig['sponsorInner'] = layoutConfig['sponsorInner'] || {}; layoutConfig['sponsorInner'].left = (sL + (mEv.clientX - sX)) + 'px'; layoutConfig['sponsorInner'].top = (sT + (mEv.clientY - sY)) + 'px'; aplicarSponsorInner(); }; const onUp = () => { document.removeEventListener('mousemove', onMv); document.removeEventListener('mouseup', onUp); }; document.addEventListener('mousemove', onMv); document.addEventListener('mouseup', onUp); }); img.addEventListener('wheel', (e) => { if(!isEditMode) return; e.preventDefault(); e.stopPropagation(); let w = parseFloat(window.getComputedStyle(img).width) || img.offsetWidth; w += e.deltaY < 0 ? 3 : -3; if(w < 10) w = 10; layoutConfig['sponsorInner'] = layoutConfig['sponsorInner'] || {}; layoutConfig['sponsorInner'].width = w + 'px'; aplicarSponsorInner(); }, { passive: false }); if(isEditMode) img.classList.add('sponsor-edit', 'edit-mode'); }); }
function popularSelectMembros() { let sel = document.getElementById('select-membro'); let valAtual = sel.value; sel.innerHTML = '<option value="" disabled selected>Selecione um membro...</option>'; let sorted = [...membrosDataArray].sort((a,b) => a.nick.localeCompare(b.nick)); sorted.forEach(m => { sel.innerHTML += `<option value="${m.nick}">${m.cargo} ${m.nick}</option>`; }); if(valAtual) sel.value = valAtual; }
function getPontuacaoFinal(m) { return (m.total_base * eventoMult) + (pontosExtrasMap[m.nick] || 0); }
function processarPodio() { if(isEditMode) return; let a1 = document.getElementById('avatar-1'); let m1 = document.getElementById('medal-1'); let n1 = document.getElementById('nick-1'); let a2 = document.getElementById('avatar-2'); let m2 = document.getElementById('medal-2'); let n2 = document.getElementById('nick-2'); let ae1 = document.getElementById('avatar-empate-1'); let te1 = document.getElementById('txt-empate-1'); let ae2 = document.getElementById('avatar-empate-2'); let te2 = document.getElementById('txt-empate-2'); [a1,m1,n1,a2,m2,n2,ae1,te1,ae2,te2].forEach(el => el.style.display = 'none'); if(membrosDataArray.length === 0) return; let top = [...membrosDataArray].sort((a,b) => getPontuacaoFinal(b) - getPontuacaoFinal(a)); let p1 = getPontuacaoFinal(top[0]); let p2 = (top.length > 1) ? getPontuacaoFinal(top[1]) : 0; if(top.length >= 2 && p1 > 0 && p1 === p2) { ae1.src = ae2.src = "https://www.habbo.com.br/habbo-imaging/avatarimage?user=DIC-Sp&action=std&direction=2&head_direction=2&gesture=sml&size=b"; [ae1,te1,ae2,te2].forEach(el => el.style.display = 'block'); } else if(top.length > 0 && p1 > 0) { a1.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${top[0].nick}&action=std&direction=2&head_direction=2&gesture=sml&size=b`; n1.innerText = top[0].nick; [a1,m1,n1].forEach(el => el.style.display = 'block'); if(top.length > 1 && p2 > 0) { a2.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${top[1].nick}&action=std&direction=2&head_direction=2&gesture=sml&size=b`; n2.innerText = top[1].nick; [a2,m2,n2].forEach(el => el.style.display = 'block'); } } }
window.renderMemberDetails = function() { let nick = document.getElementById('select-membro').value; let m = membrosDataArray.find(x => x.nick === nick); if(!m) return; document.getElementById('area-detalhes-membro').style.display = 'flex'; setTimeout(() => { document.getElementById('area-detalhes-membro').style.opacity = '1'; }, 50); let tCalc = getPontuacaoFinal(m); let ptsExtra = pontosExtrasMap[m.nick] || 0; document.getElementById('avatar-selecionado').src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${m.nick}&action=std&direction=2&head_direction=2&gesture=sml&size=b`; document.getElementById('det-total').innerHTML = `<span>${tCalc}</span>` + (ptsExtra > 0 ? `<span style="font-size:16px; color:#4caf50; font-weight:normal;">(+${ptsExtra} bônus)</span>` : ''); document.getElementById('det-convite').innerText = m.convite * eventoMult; document.getElementById('det-ppp').innerText = m.ppp * eventoMult; document.getElementById('det-rels').innerText = m.rels * eventoMult; document.getElementById('det-relcg').innerText = m.relcg * eventoMult; document.getElementById('det-avisos').innerText = m.avisos * eventoMult; let stEl = document.getElementById('det-status'); let sFinal = m.status_base; if(tCalc >= 5) sFinal = "CUMPRIDA"; stEl.innerText = sFinal; stEl.style.color = sFinal.toLowerCase().includes('não') ? '#ef4444' : '#4caf50'; }

// ==========================================
// PRIVACIDADE E AVAIS
// ==========================================
function carregarPrivacidade() { db.collection("sistema").doc("config_geral").get().then((doc) => { let htmlPadrao = `<p>Escreva aqui a Política de Privacidade.</p>`; if (doc.exists && doc.data().textoPrivacidade) document.getElementById('editor-privacidade').innerHTML = doc.data().textoPrivacidade; else document.getElementById('editor-privacidade').innerHTML = htmlPadrao; }); }
window.salvarPrivacidade = function() { db.collection("sistema").doc("config_geral").set({ textoPrivacidade: document.getElementById('editor-privacidade').innerHTML }, { merge: true }).then(() => window.mostrarToast("Política de Privacidade salva!", "success")); }
window.processarCalculo = function() { const d1 = document.getElementById('data-login').value; const d2 = document.getElementById('data-aval').value; const dAval = parseInt(document.getElementById('dias-aval').value); const d3 = document.getElementById('data-consulta').value; if (!d1 || !d2 || isNaN(dAval) || !d3) return window.customAlert("Preencha todos os campos corretamente.", "Atenção"); const u = new Date(d1+'T00:00:00'); const i = new Date(d2+'T00:00:00'); const c = new Date(d3+'T00:00:00'); const f = new Date(i); f.setDate(i.getDate() + dAval - 1); const UM_DIA = 1000*60*60*24; const dif = (ant, nov) => Math.floor((nov - ant)/UM_DIA); let m = ""; if (u > f) { m = `Aval obsoleto (terminou antes do último login). Ausência de <strong>${Math.max(0, dif(u,c))} dia(s)</strong>.`; } else if (c <= i) { m = `O aval ainda não começou. Ausência normal de <strong>${Math.max(0, dif(u,c))} dia(s)</strong>.`; } else { let a1 = Math.max(0, dif(u,i) - 1); if(c > f) { let a2 = Math.max(0, dif(f,c)); m = `Ausência pré-aval: <strong>${a1} dia(s)</strong><br>Ausência pós-aval: <strong>${a2} dia(s)</strong><br><span style="display:block; margin-top:10px;">Total: <strong>${a1+a2} dia(s)</strong></span>`; } else { m = `Militar em período de aval.<br>Ausência antes do aval: <strong>${a1} dia(s)</strong>.`; } } document.getElementById('texto-resultado').innerHTML = m; document.getElementById('resultado-aval').style.display = 'block'; }

// ==========================================
// GERENCIADOR DE ACESSOS (Planilha + Manual)
// ==========================================
function renderTabelaAcessos() { 
    var tbody = document.querySelector('#tbAcessos tbody'); tbody.innerHTML = ''; 
    let rendered = new Set();
    window.acessosData.forEach(item => { tbody.appendChild(criarRowAcesso(item, 'manual')); rendered.add(item.email.toLowerCase()); });
    for(let email in planilhaAcessos) {
        if(!rendered.has(email.toLowerCase())) {
            let item = { email: email, nick: planilhaAcessos[email].nick, nivel: planilhaAcessos[email].nivel };
            tbody.appendChild(criarRowAcesso(item, 'planilha'));
        }
    }
}
function criarRowAcesso(item, origem) { 
    var tr = document.createElement('tr'); 
    let sL = item.nivel === 'LIDER' ? 'selected' : ''; let sV = item.nivel === 'VICE-LIDER' ? 'selected' : ''; let sS = item.nivel === 'SUB-LIDER' ? 'selected' : ''; let sSup = item.nivel === 'SUPERVISOR' ? 'selected' : ''; let hideAcoes = (nivelUsuarioGlobal === 'VICE-LIDER' && item.nivel === 'LIDER') ? 'display:none;' : ''; 
    let tBadge = origem === 'planilha' ? '<span style="background:rgba(251,191,36,0.2); color:var(--sup-neon); padding:2px 6px; border-radius:4px; font-size:10px; margin-left:8px;">PLANILHA</span>' : '<span style="background:rgba(76,175,80,0.2); color:#4caf50; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:8px;">MANUAL</span>';
    let acoes = origem === 'planilha' ? '<span style="color:#888; font-size:11px;">Via Planilha</span>' : `<button class="btn-admin-icon btn-admin-edit" onclick="window.toggleEditRow(this)" title="Editar"><i class="fas fa-pencil-alt"></i></button><button class="btn-admin-icon btn-admin-del" onclick="this.closest('tr').remove()" title="Excluir"><i class="fas fa-trash"></i></button>`;
    tr.innerHTML = `<td><input type="text" class="admin-input inp-email" value="${item.email || ''}" readonly style="width:70%; display:inline-block; margin-right:5px;">${tBadge}</td><td><input type="text" class="admin-input inp-nick" value="${item.nick || ''}" readonly></td><td><select class="admin-input inp-nivel" disabled><option value="LIDER" ${sL}>Líder</option><option value="VICE-LIDER" ${sV}>Vice-Líder</option><option value="SUB-LIDER" ${sS}>Sub-Líder</option><option value="SUPERVISOR" ${sSup}>Supervisor</option></select></td><td class="action-cell" style="${hideAcoes}" data-origem="${origem}">${acoes}</td>`; return tr; 
}
window.addLinhaAcesso = function() { var tbody = document.querySelector('#tbAcessos tbody'); var tr = criarRowAcesso({ email: '', nick: '', nivel: 'SUPERVISOR' }, 'manual'); tbody.appendChild(tr); window.toggleEditRow(tr.querySelector('.btn-admin-edit')); }
window.toggleEditRow = function(btn) { var tr = btn.closest('tr'); tr.querySelectorAll('input, select').forEach(inp => inp.removeAttribute('disabled')); tr.querySelectorAll('input').forEach(inp => inp.removeAttribute('readonly')); btn.innerHTML = '<i class="fas fa-check"></i>'; btn.className = 'btn-admin-icon btn-admin-check'; btn.onclick = function() { window.confirmEditRow(btn); }; }
window.confirmEditRow = function(btn) { var tr = btn.closest('tr'); tr.querySelectorAll('input, select').forEach(inp => inp.setAttribute('disabled', true)); tr.querySelectorAll('input').forEach(inp => inp.setAttribute('readonly', true)); btn.innerHTML = '<i class="fas fa-pencil-alt"></i>'; btn.className = 'btn-admin-icon btn-admin-edit'; btn.onclick = function() { window.toggleEditRow(btn); }; }
window.salvarAcessos = function() { 
    var rows = document.querySelectorAll('#tbAcessos tbody tr'); const batch = db.batch(); 
    window.acessosData.forEach(ac => { batch.delete(db.collection("acessos").doc(ac.email)); }); 
    rows.forEach(r => { 
        let isManual = r.querySelector('.action-cell').getAttribute('data-origem') === 'manual';
        if(isManual) { var email = r.querySelector('.inp-email').value.trim().toLowerCase(); if(email) { batch.set(db.collection("acessos").doc(email), { email: email, nick: r.querySelector('.inp-nick').value.trim(), nivel: r.querySelector('.inp-nivel').value.toUpperCase() }); } }
    }); 
    batch.commit().then(() => { window.mostrarToast("Acessos manuais salvos!", "success"); }).catch((e) => { window.mostrarToast("Erro: " + e.message, "error"); }); 
}
