let militaresEstrelasData = [];

window.escutarCargos = function() {
    db.collection("sistema").doc("cargos").onSnapshot((doc) => {
        if (doc.exists && doc.data().dados) {
            try {
                window.cargosMap = JSON.parse(doc.data().dados);
                window.renderTabelaEstrelas();
            } catch (e) {
                console.error("Erro no parse dos cargos", e);
            }
        }
    });
}

window.escutarMilitaresEstrelas = function() {
    db.collection("militares").onSnapshot((snapshot) => {
        militaresEstrelasData = [];
        snapshot.forEach((docSnap) => {
            militaresEstrelasData.push({ id: docSnap.id, ...docSnap.data() });
        });
        window.renderTabelaEstrelas();
    });
}

window.renderTabelaEstrelas = function() {
    let tbody = document.querySelector('#tb-militares-estrelas tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (militaresEstrelasData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-sub);">Nenhum policial registrado.</td></tr>';
        return;
    }
    
    let lista = [...militaresEstrelasData];
    lista.sort((a, b) => (b.estrelas || 0) - (a.estrelas || 0) || (b.promocoes_realizadas || 0) - (a.promocoes_realizadas || 0));
    
    lista.forEach(dados => {
        let cargo = window.cargosMap[dados.nome] || '';
        let cargoHtml = cargo ? `<span style="color:var(--text-sub); font-size:11px; text-transform:uppercase; letter-spacing:1px; display:block; margin-top:2px;">${cargo}</span>` : '';
        
        let str = '★'.repeat(dados.estrelas || 0);
        let eHtml = `<span style="color:var(--sup-neon); font-size:14px; letter-spacing:2px; filter: drop-shadow(0 0 5px var(--sup-glow));">${str}</span> <span style="font-weight:bold; color:#fff; margin-left:5px;">(${dados.estrelas || 0})</span>`;
        
        let sHtml = dados.status === 'Suspenso' ? '<span style="color:#ff2a2a; font-weight:bold; background:rgba(255,42,42,0.1); padding:4px 8px; border-radius:4px; font-size:12px;">SUSPENSO</span>' : '<span style="color:#4caf50; background:rgba(76,175,80,0.1); padding:4px 8px; border-radius:4px; font-size:12px;">ATIVO</span>';
        
        let ts = new Date().getTime();
        let avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${dados.nome}&action=std&direction=2&head_direction=2&gesture=sml&size=m&time=${ts}`;
        
        let premiosHtml = dados.premios_acumulados > 0 ? `<span title="${dados.premios_acumulados} Prêmio(s)">🎖️ x${dados.premios_acumulados}</span>` : '';
        
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${avatarUrl}" onerror="this.style.display='none'" style="width:45px; height:45px; border-radius:50%; background:rgba(0,0,0,0.8); border:2px solid var(--sup-neon); box-shadow:0 0 10px var(--sup-neon); object-fit:cover; object-position:center top;">
                    <div>
                        <div style="font-weight:bold; color:#fff; font-size:15px;">${dados.nome} ${premiosHtml}</div>
                        ${cargoHtml}
                    </div>
                </div>
            </td>
            <td style="text-align:center; font-weight:bold; font-size:16px;">${dados.promocoes_realizadas || 0} <span style="color:#555; font-size:12px;">/ 3</span></td>
            <td>${eHtml}</td>
            <td style="text-align:center;">${sHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.registrarLogEstrela = function(bene, acao, idProm, detalhes) {
    db.collection("logs_estrelas").add({
        timestamp: new Date().getTime(),
        data_hora: new Date().toLocaleString('pt-BR'),
        autor: window.usuarioLogadoNick,
        beneficiado: bene,
        acao: acao,
        id_promocao: idProm || '-',
        detalhes: detalhes
    });
}

window.buscarPromocoesLote = async function() {
    let dateVal = document.getElementById('lote-data').value;
    if (!dateVal) return window.mostrarToast("Selecione uma data para a validação.", "error");

    let [y, m, d] = dateVal.split('-');
    let dataBr = `${d}/${m}/${y}`;
    
    let excluidosStr = document.getElementById('lote-excluidos').value;
    let excluidosArr = excluidosStr.split(',').map(s => s.trim()).filter(s => s !== "");

    let docSnap = await db.collection("sistema").doc("promocoes").get();
    if (!docSnap.exists) return window.customAlert("A planilha oficial ainda não enviou os dados de promoções para o sistema.", "Erro de Sincronização");

    let promocoes = [];
    try {
        promocoes = JSON.parse(docSnap.data().dados);
    } catch (e) {
        return window.mostrarToast("Erro ao processar dados.", "error");
    }

    let filtradas = promocoes.filter(p => p.data === dataBr && !excluidosArr.includes(p.id));
    if (filtradas.length === 0) return window.customAlert(`Nenhuma promoção válida encontrada para a data ${dataBr}.`, "Busca Vazia");

    let contagem = {};
    let idsColetados = [];
    
    filtradas.forEach(p => {
        contagem[p.promotor] = (contagem[p.promotor] || 0) + 1;
        idsColetados.push(p.id);
    });

    let html = `<div style="color:#fff; margin-bottom:10px; font-size:15px;"><i class="fas fa-check-circle" style="color:#4caf50;"></i> ${filtradas.length} promoções válidas localizadas.</div><ul style="color:var(--text-sub); margin-bottom:15px;">`;
    for (let nick in contagem) {
        html += `<li><strong style="color:var(--sup-neon);">${nick}</strong>: validou ${contagem[nick]} promoção(ões)</li>`;
    }
    html += `</ul><button class="btn-tech btn-save" style="width:100%;" onclick='window.confirmarLote(${JSON.stringify(contagem)}, ${JSON.stringify(idsColetados)})'><i class="fas fa-check-double"></i> Atribuir Ciclos Oficiais</button>`;

    document.getElementById('resultado-lote').innerHTML = html;
    document.getElementById('resultado-lote').style.display = 'block';
}

window.confirmarLote = async function(contagem, idsColetados) {
    let idLoteStr = idsColetados.join(', ');
    if (idLoteStr.length > 50) idLoteStr = idLoteStr.substring(0, 47) + "...";

    for (let nick in contagem) {
        let qtd = contagem[nick];
        let officialNick = Object.keys(window.cargosMap).find(k => k.toLowerCase() === nick.toLowerCase());
        let dbNick = officialNick || nick;

        let ref = db.collection("militares").doc(dbNick);
        let docM = await ref.get();
        
        let p = 0; let e = 0; let pr = 0; let status = 'Ativo';
        
        if (docM.exists) {
            let dados = docM.data();
            if (dados.status === 'Suspenso') continue;
            p = dados.promocoes_realizadas || 0;
            e = dados.estrelas || 0;
            pr = dados.premios_acumulados || 0;
            status = dados.status;
        }

        let estrelasAntes = e;
        p += qtd;
        let estrelasGanhas = Math.floor(p / 3);
        p = p % 3;
        e += estrelasGanhas;

        let detailLog = `Validou ${qtd} promoção(ões). `;
        if (estrelasGanhas > 0) detailLog += `Conquistou ${estrelasGanhas} estrela(s)! `;

        let atingiuPremio = Math.floor(estrelasAntes / 10) < Math.floor(e / 10);
        if (atingiuPremio) {
            window.customAlert(`🏅 O policial ${dbNick} acaba de atingir ${e} estrelas no sistema!<br><br>Avise o Comando para realizar o pagamento oficial destas 10 estrelas.`, "Aguardando Pagamento!");
            detailLog += " Atingiu cota para prêmio. (Aguardando Comando)";
        }

        await ref.set({ nome: dbNick, status: status, promocoes_realizadas: p, estrelas: e, premios_acumulados: pr }, { merge: true });
        window.registrarLogEstrela(dbNick, "Validação em Lote", idLoteStr, detailLog);
    }

    window.mostrarToast("Lote processado com sucesso!", "success");
    document.getElementById('resultado-lote').style.display = 'none';
    document.getElementById('lote-data').value = '';
    document.getElementById('lote-excluidos').value = '';
}

window.escutarLogsEstrelas = function() {
    db.collection("logs_estrelas").orderBy("timestamp", "desc").limit(50).onSnapshot(snap => {
        let tbody = document.querySelector('#tb-logs tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        snap.forEach(doc => {
            let d = doc.data();
            let cor = d.acao.includes("Validação") || d.acao.includes("Promoção") ? "color:#4caf50;" : "color:#ff2a2a;";
            if (d.acao.includes("Pagamento")) cor = "color:#fbbf24;";
            
            tbody.innerHTML += `<tr><td style="font-size:12px;">${d.data_hora}</td><td><strong>${d.autor}</strong></td><td>${d.beneficiado}</td><td style="${cor} font-weight:bold;">${d.acao}</td><td style="font-size:13px; color:var(--text-sub);">ID/Lote: ${d.id_promocao} <br> ${d.detalhes}</td></tr>`;
        });
    });
}