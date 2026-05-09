// ============================================================
// APPS SCRIPT UNIFICADO — v10 COMPLETO  ★ P27 INCLUÍDO ★
// Mães e Pais Atípicos do Norte do ES — CMMPANE/NES
// Gerado em: 09/05/2026
//
// NOVIDADES v10 (P27):
//   • doGet() responde acao=contagem → { total, aberto, limite }
//   • doPost() grava lista de espera → acao=listaEspera
//   • inicializarPlanilha() cria _Config e _ListaEspera
//   • notificarFabioLimite_() dispara email+WhatsApp ao atingir limite
//
// INSTRUÇÕES:
//   1. Abra o Apps Script da sua planilha Google
//      (Extensões → Apps Script)
//   2. APAGUE tudo que existir no editor
//   3. Cole TODO este arquivo de uma vez
//   4. Clique em "Salvar" (Ctrl+S)
//   5. Clique em "Implantar" → "Gerenciar implantações"
//      → Editar implantação existente → Nova versão → Implantar
//      (se ainda não implantou: "Nova implantação" → Web App
//       → Executar como: Sua conta → Acesso: Qualquer pessoa)
//   6. Copie a URL gerada → cole no app (aba Dados)
//   7. Execute inicializarPlanilha() para criar as abas
//   8. Autorize as permissões quando solicitado
//   9. Teste: abra [URL_DO_SCRIPT]?acao=contagem no browser
//      → deve retornar {"total":0,"aberto":true,"limite":1200}
// ============================================================


// ════════════════════════════════════════════════════════════
// BLOCO 0 — CONFIGURAÇÃO GLOBAL
// ════════════════════════════════════════════════════════════

const CONFIG = {
  FUSO_HORARIO:     'America/Sao_Paulo',
  LIMITE_INSCRICOES: 1200,
  AVUL_INICIO:       1,
  AVUL_FIM:          100,

  // ── CallMeBot (WhatsApp automático) ──────────────────────
  // Substitua pelo seu número e apikey do CallMeBot
  CALLMEBOT_NUMERO:  '5527998431344',   // ← seu número com DDI+DDD
  CALLMEBOT_APIKEY:  'SUA_APIKEY_AQUI', // ← sua chave CallMeBot

  // ── Email do organizador ─────────────────────────────────
  EMAIL_ORGANIZADOR: 'maesepaisatipicosdonortees@gmail.com',

  // ── Setores ─────────────────────────────────────────────
  SETORES: {
    'SM-AT': 'Mãe/Pai Atípico — São Mateus',
    'OT-AT': 'Mãe/Pai Atípico — Outra cidade',
    'PR-SA': 'Profissional da Saúde',
    'PR-ED': 'Profissional da Educação',
    'PR-AS': 'Profissional da Assistência Social',
    'FAM':   'Familiar sem diagnóstico',
    'OUT':   'Outro',
  },

  // ── Abas da planilha ─────────────────────────────────────
  ABA_INSCRITOS:    'Inscritos',
  ABA_VOLUNTARIOS:  '_Voluntarios',
  ABA_SORTEIO:      '_Sorteio',
  ABA_RELATORIOS:   '_Relatorios',
  ABA_CONFIG:       '_Config',       // ← P27: flag aberto|fechado|reaberto
  ABA_LISTA_ESPERA: '_ListaEspera',  // ← P27: cadastros quando esgotado

  // ── Limites de inscrição ──────────────────────────────────
  LIMITE_NORMAL:   1200,  // ← limite padrão (_Config A2 = 'aberto')
  LIMITE_REABERTO: 1500,  // ← limite quando Fábio reativa (_Config A2 = 'reaberto')
};

// Contadores por setor (prefixos dos números sequenciais)
const PREFIXO_SETOR = {
  'SM-AT': 'SM-AT',
  'OT-AT': 'OT-AT',
  'PR-SA': 'PR-SA',
  'PR-ED': 'PR-ED',
  'PR-AS': 'PR-AS',
  'FAM':   'FAM',
  'OUT':   'OUT',
};


// ════════════════════════════════════════════════════════════
// BLOCO 1 — doGet / doPost  (roteador principal)
// ════════════════════════════════════════════════════════════

function doGet(e) {
  const acao = (e && e.parameter && e.parameter.acao) || '';
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    if (acao === 'obterInscritos' || acao === 'exportarJSON') {
      output.setContent(JSON.stringify(obterInscritos()));

    } else if (acao === 'obterStats') {
      output.setContent(JSON.stringify(obterStats()));

    } else if (acao === 'exportarVoluntarios') {
      output.setContent(JSON.stringify(exportarVoluntarios()));

    // ── P27 — Contagem de vagas (inscricao_v20.html) ──────
    } else if (acao === 'contagem') {
      output.setContent(JSON.stringify(obterContagem_()));

    } else {
      // Sem ação → retorna stats básicos (health check)
      output.setContent(JSON.stringify({
        ok: true,
        sistema: 'CMMPANE/NES',
        versao: 'v10',
        timestamp: new Date().toISOString(),
      }));
    }
  } catch (err) {
    output.setContent(JSON.stringify({ ok: false, erro: err.message }));
  }

  return output;
}

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (_) {
    output.setContent(JSON.stringify({ ok: false, erro: 'JSON inválido' }));
    return output;
  }

  try {
    // ── Inscrição pública (inscricao.html) ────────────────
    if (body.acao === 'inscrever') {
      const resultado = receberInscricaoPublica(body);
      output.setContent(JSON.stringify(resultado));

    // ── Check-in presencial ───────────────────────────────
    } else if (body.acao === 'checkin') {
      const resultado = checkInViaPOST(body);
      output.setContent(JSON.stringify(resultado));

    // ── Salvar voluntário ─────────────────────────────────
    } else if (body.acao === 'salvarVoluntario') {
      const resultado = salvarVoluntarioPOST(body);
      output.setContent(JSON.stringify(resultado));

    // ── P18 — Gerar relatório PDF ────────────────────────
    } else if (body.acao === 'gerarRelatorio') {
      const resultado = gerarRelatorioPDF(body.enviarEmail !== false);
      output.setContent(JSON.stringify(resultado));

    // ── P19 — Registrar sorteio na aba _Sorteio ──────────
    } else if (body.acao === 'registrarSorteio') {
      const resultado = registrarSorteioNaAba(body);
      output.setContent(JSON.stringify(resultado));

    // ── P27 — Lista de espera (inscricao_v20.html) ────────
    } else if (body.acao === 'listaEspera') {
      const resultado = salvarListaEspera_(body);
      output.setContent(JSON.stringify(resultado));

    } else {
      output.setContent(JSON.stringify({ ok: false, erro: 'Ação desconhecida: ' + body.acao }));
    }

  } catch (err) {
    Logger.log('[doPost] ERRO: ' + err.message);
    output.setContent(JSON.stringify({ ok: false, erro: err.message }));
  }

  return output;
}


// ════════════════════════════════════════════════════════════
// BLOCO 2 — INICIALIZAÇÃO DA PLANILHA
// ════════════════════════════════════════════════════════════

/**
 * Execute esta função UMA VEZ para criar as abas e o cabeçalho.
 * Menu: execute manualmente no editor → Executar → inicializarPlanilha
 */
function inicializarPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Aba Inscritos ──────────────────────────────────────
  let abaInscritos = ss.getSheetByName(CONFIG.ABA_INSCRITOS);
  if (!abaInscritos) {
    abaInscritos = ss.insertSheet(CONFIG.ABA_INSCRITOS);
  }
  const headerInscritos = [
    'Numero','Timestamp','Nome','Telefone','Email',
    'Cidade','Perfil','EhMae','FilhoNome','FilhoIdade',
    'Condicao','Quiz','NumerosExtrasQuiz','Termo1','Termo2',
    'KG','ExtrasAlimento','FlagDuplicado','NumAvulso','Presente','CheckinTS',
  ];
  abaInscritos.getRange(1, 1, 1, headerInscritos.length).setValues([headerInscritos]);
  abaInscritos.getRange(1, 1, 1, headerInscritos.length)
    .setBackground('#534AB7').setFontColor('#FFFFFF').setFontWeight('bold');
  abaInscritos.setFrozenRows(1);

  // ── Aba _Voluntarios ───────────────────────────────────
  garantirAbaVoluntarios();

  // ── Aba _Sorteio ───────────────────────────────────────
  let abaSorteio = ss.getSheetByName(CONFIG.ABA_SORTEIO);
  if (!abaSorteio) {
    abaSorteio = ss.insertSheet(CONFIG.ABA_SORTEIO);
    const h = abaSorteio.getRange(1, 1, 1, 6);
    h.setValues([['Timestamp','Nome','Número','Prêmio','Setor','Tipo']]);
    h.setBackground('#534AB7').setFontColor('#FFFFFF').setFontWeight('bold');
    abaSorteio.setFrozenRows(1);
  }

  // ── Aba _Relatorios ────────────────────────────────────
  let abaRel = ss.getSheetByName(CONFIG.ABA_RELATORIOS);
  if (!abaRel) {
    abaRel = ss.insertSheet(CONFIG.ABA_RELATORIOS);
    const h = abaRel.getRange(1, 1, 1, 7);
    h.setValues([['Timestamp','Titulo','Inscritos','Presentes','KG','DocURL','PDFURL']]);
    h.setBackground('#534AB7').setFontColor('#FFFFFF').setFontWeight('bold');
    abaRel.setFrozenRows(1);
  }

  // ── Aba _Config (P27) ──────────────────────────────────
  let abaConfig = ss.getSheetByName(CONFIG.ABA_CONFIG);
  if (!abaConfig) {
    abaConfig = ss.insertSheet(CONFIG.ABA_CONFIG);
  }
  // Cabeçalho + valor padrão (sempre repõe para garantir)
  abaConfig.getRange('A1').setValue('status');
  abaConfig.getRange('A1').setBackground('#EF9F27').setFontColor('#fff').setFontWeight('bold');
  const flagAtual = String(abaConfig.getRange('A2').getValue()).toLowerCase().trim();
  if (!flagAtual || flagAtual === '') {
    abaConfig.getRange('A2').setValue('aberto');
  }
  abaConfig.getRange('B1').setValue('Valores válidos para A2:');
  abaConfig.getRange('B2').setValue('aberto | fechado | reaberto');
  abaConfig.getRange('B2').setFontColor('#7a7698').setFontStyle('italic');
  abaConfig.setColumnWidth(1, 120);
  abaConfig.setColumnWidth(2, 260);

  // ── Aba _ListaEspera (P27) ─────────────────────────────
  let abaEspera = ss.getSheetByName(CONFIG.ABA_LISTA_ESPERA);
  if (!abaEspera) {
    abaEspera = ss.insertSheet(CONFIG.ABA_LISTA_ESPERA);
    const h = abaEspera.getRange(1, 1, 1, 4);
    h.setValues([['Timestamp','Nome','Telefone','Email']]);
    h.setBackground('#E05252').setFontColor('#FFFFFF').setFontWeight('bold');
    abaEspera.setFrozenRows(1);
    abaEspera.setColumnWidth(1, 160);
    abaEspera.setColumnWidth(2, 200);
    abaEspera.setColumnWidth(3, 140);
    abaEspera.setColumnWidth(4, 200);
  }

  SpreadsheetApp.getUi().alert('✅ Planilha inicializada com sucesso!\n\nAbas criadas:\n• Inscritos\n• _Voluntarios\n• _Sorteio\n• _Relatorios\n• _Config  ← P27 (A2 = "aberto")\n• _ListaEspera  ← P27\n\nPróximo passo: Implantar como Web App e testar\n[URL]?acao=contagem');
}

/**
 * Adiciona menu personalizado na planilha.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🎪 CMMPANE/NES')
    .addItem('🔧 Inicializar planilha', 'inicializarPlanilha')
    .addSeparator()
    .addItem('✅ Check-in manual', 'menuCheckIn')
    .addItem('🎲 Sortear por setor', 'menuSortear')
    .addItem('🌾 Registrar alimento', 'menuRegistrarAlimento')
    .addSeparator()
    .addItem('📊 Ver contagem de vagas (P27)', 'menuVerContagem')
    .addItem('🔓 Reabrir inscrições manualmente', 'menuReabrirInscricoes')
    .addSeparator()
    .addItem('📄 Gerar relatório PDF', 'menuGerarRelatorio')
    .addItem('📊 Ver inscrições online', 'verInscricoesOnline')
    .addSeparator()
    .addItem('🧪 Teste: contagem (P27)', 'testarContagem')
    .addItem('🧪 Teste: lista de espera (P27)', 'testarListaEspera')
    .addItem('🧪 Teste: registrar sorteio (P19)', 'testarRegistroSorteio')
    .addItem('🧪 Teste: email inscrito (P21)', 'testarEmailInscrito')
    .addToUi();
}


// ════════════════════════════════════════════════════════════
// BLOCO 3 — INSCRIÇÃO PÚBLICA (v7)
// ════════════════════════════════════════════════════════════

/**
 * Recebe inscrição via POST do inscricao.html.
 * Salva na aba Inscritos com anti-duplicidade.
 */
function receberInscricaoPublica(dados) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const aba   = ss.getSheetByName(CONFIG.ABA_INSCRITOS);
  if (!aba) return { ok: false, erro: 'Aba Inscritos não encontrada. Execute inicializarPlanilha().' };

  const agora = new Date().toLocaleString('pt-BR', { timeZone: CONFIG.FUSO_HORARIO });

  // ── Anti-duplicidade: telefone + email + nome ──────────
  const dados2D   = aba.getDataRange().getValues();
  const telefone  = (dados.telefone || '').replace(/\D/g, '');
  const email     = (dados.email    || '').toLowerCase().trim();
  const nomeNorm  = (dados.nome     || '').toLowerCase().trim();

  for (let i = 1; i < dados2D.length; i++) {
    const rowTel   = String(dados2D[i][3] || '').replace(/\D/g, '');
    const rowEmail = String(dados2D[i][4] || '').toLowerCase().trim();
    const rowNome  = String(dados2D[i][2] || '').toLowerCase().trim();
    if (
      (telefone && rowTel   === telefone) ||
      (email    && rowEmail === email)    ||
      (nomeNorm && rowNome  === nomeNorm)
    ) {
      Logger.log('[P17] Duplicado detectado: ' + dados.nome);
      return {
        ok: false,
        duplicado: true,
        numero: dados2D[i][0],
        erro: 'Inscrição já encontrada para este telefone/email/nome.',
      };
    }
  }

  // ── Verificar limite total ─────────────────────────────
  if (dados2D.length - 1 >= CONFIG.LIMITE_INSCRICOES) {
    return { ok: false, esgotado: true, erro: 'Vagas esgotadas.' };
  }

  // ── Gerar número sequencial por perfil ─────────────────
  const perfilFinal = dados.perfil || 'OUT';
  const numero      = gerarNumeroInscricao(aba, dados2D, perfilFinal);

  // ── Números extras do quiz ─────────────────────────────
  const quizAcertos    = Number(dados.quizAcertos) || 0;
  const numerosExtrasQuiz = [];
  for (let q = 1; q <= quizAcertos; q++) {
    numerosExtrasQuiz.push(numero + '-Q0' + q);
  }

  // ── Gravar linha na planilha ───────────────────────────
  aba.appendRow([
    numero,
    agora,
    dados.nome         || '',
    dados.telefone     || '',
    dados.email        || '',
    dados.cidade       || '',
    perfilFinal,
    dados.ehMae        || '',
    dados.filhoNome    || '',
    dados.filhoIdade   || '',
    dados.condicao     || '',
    dados.quiz         || '',
    numerosExtrasQuiz.join(', '),
    dados.termo1       || '',
    dados.termo2       || '',
    0,   // KG inicial
    '',  // ExtrasAlimento
    '',  // FlagDuplicado
    '',  // NumAvulso
    '',  // Presente
    '',  // CheckinTS
  ]);

  Logger.log('[P17] Inscrito: ' + dados.nome + ' → ' + numero);

  // ── P21 — Email de confirmação ao inscrito ─────────────
  if (dados.email) {
    enviarConfirmacaoEmailInscrito({
      nome:          dados.nome,
      email:         dados.email,
      numero:        numero,
      numerosExtras: numerosExtrasQuiz,
      quizAcertos:   quizAcertos,
      perfil:        perfilFinal,
    });
  }

  // ── WhatsApp de confirmação (CallMeBot) ────────────────
  try {
    enviarConfirmacaoWhatsApp(dados.nome, numero, dados.telefone);
  } catch (_) {}

  return {
    ok:            true,
    numero:        numero,
    numerosExtras: numerosExtrasQuiz,
    mensagem:      '✅ Inscrição confirmada! Número: ' + numero,
  };
}

/**
 * Gera número sequencial no formato SETOR-XXXX.
 * Ex: SM-AT-0001, PR-SA-0042
 */
function gerarNumeroInscricao(aba, dados2D, perfil) {
  const prefixo = PREFIXO_SETOR[perfil] || 'OUT';
  let max = 0;
  for (let i = 1; i < dados2D.length; i++) {
    const num = String(dados2D[i][0] || '');
    if (num.startsWith(prefixo + '-')) {
      const parte = parseInt(num.split('-').pop(), 10);
      if (!isNaN(parte) && parte > max) max = parte;
    }
  }
  const seq = String(max + 1).padStart(4, '0');
  return prefixo + '-' + seq;
}

/**
 * Envia WhatsApp de confirmação via CallMeBot.
 */
function enviarConfirmacaoWhatsApp(nome, numero, telefoneInscrito) {
  if (!CONFIG.CALLMEBOT_APIKEY || CONFIG.CALLMEBOT_APIKEY === 'SUA_APIKEY_AQUI') return;
  const msg = encodeURIComponent(
    '✅ *Inscrição confirmada!*\n' +
    'Nome: ' + nome + '\n' +
    'Número: *' + numero + '*\n\n' +
    'Evento: 30/05/2026 — Centro de Vivência Amélia Boroto\n' +
    'São Mateus/ES'
  );
  const url = 'https://api.callmebot.com/whatsapp.php?phone=' +
              CONFIG.CALLMEBOT_NUMERO + '&text=' + msg + '&apikey=' + CONFIG.CALLMEBOT_APIKEY;
  UrlFetchApp.fetch(url, { muteHttpExceptions: true });
}

/**
 * Menu helper — ver inscrições no Apps Script.
 */
function verInscricoesOnline() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(CONFIG.ABA_INSCRITOS);
  if (!aba) { SpreadsheetApp.getUi().alert('Aba Inscritos não encontrada.'); return; }
  const total = Math.max(0, aba.getLastRow() - 1);
  SpreadsheetApp.getUi().alert('📊 Total de inscritos: ' + total + '\nVagas restantes: ' + (CONFIG.LIMITE_INSCRICOES - total));
}


// ════════════════════════════════════════════════════════════
// BLOCO 4 — CHECK-IN E DADOS (v6)
// ════════════════════════════════════════════════════════════

/**
 * Retorna lista de inscritos como JSON para o app mobile.
 */
function obterInscritos() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(CONFIG.ABA_INSCRITOS);
  if (!aba) return { ok: false, erro: 'Aba não encontrada' };

  const dados = aba.getDataRange().getValues();
  const inscritos = [];

  for (let i = 1; i < dados.length; i++) {
    inscritos.push({
      numero:        dados[i][0],
      timestamp:     dados[i][1],
      nome:          dados[i][2],
      telefone:      dados[i][3],
      email:         dados[i][4],
      cidade:        dados[i][5],
      perfil:        dados[i][6],
      ehMae:         dados[i][7],
      filhoNome:     dados[i][8],
      filhoIdade:    dados[i][9],
      condicao:      dados[i][10],
      quiz:          dados[i][11],
      numerosExtras: dados[i][12],
      kg:            dados[i][15],
      presente:      dados[i][19],
      checkinTS:     dados[i][20],
    });
  }

  return { ok: true, inscritos, total: inscritos.length };
}

/**
 * Retorna estatísticas por setor.
 */
function obterStats() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(CONFIG.ABA_INSCRITOS);
  if (!aba) return { ok: false, erro: 'Aba não encontrada' };

  const dados    = aba.getDataRange().getValues();
  const stats    = {};
  let totalKg    = 0;
  let presentes  = 0;

  Object.keys(CONFIG.SETORES).forEach(s => { stats[s] = { total: 0, presentes: 0 }; });

  for (let i = 1; i < dados.length; i++) {
    const perfil  = dados[i][6] || 'OUT';
    const pres    = dados[i][19];
    const kg      = Number(dados[i][15]) || 0;
    if (!stats[perfil]) stats[perfil] = { total: 0, presentes: 0 };
    stats[perfil].total++;
    if (pres) { stats[perfil].presentes++; presentes++; }
    totalKg += kg;
  }

  return {
    ok: true,
    stats,
    totalInscritos: dados.length - 1,
    totalPresentes: presentes,
    totalKg,
    limite: CONFIG.LIMITE_INSCRICOES,
  };
}

/**
 * Realiza check-in via POST (app mobile — QR scan).
 */
function checkInViaPOST(body) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(CONFIG.ABA_INSCRITOS);
  if (!aba) return { ok: false, erro: 'Aba não encontrada' };

  const numero = (body.numero || '').trim().toUpperCase();
  const dados  = aba.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim().toUpperCase() === numero) {
      if (dados[i][19]) {
        return { ok: false, jaFeito: true, nome: dados[i][2], numero };
      }
      const agora = new Date().toLocaleString('pt-BR', { timeZone: CONFIG.FUSO_HORARIO });
      aba.getRange(i + 1, 20).setValue(true);
      aba.getRange(i + 1, 21).setValue(agora);
      return { ok: true, nome: dados[i][2], numero, perfil: dados[i][6] };
    }
  }

  return { ok: false, naoEncontrado: true, numero };
}


// ════════════════════════════════════════════════════════════
// BLOCO 5 — VOLUNTÁRIOS (v6)
// ════════════════════════════════════════════════════════════

function garantirAbaVoluntarios() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let aba   = ss.getSheetByName(CONFIG.ABA_VOLUNTARIOS);
  if (!aba) {
    aba = ss.insertSheet(CONFIG.ABA_VOLUNTARIOS);
    const header = ['ID','Timestamp','Nome','Funcao','FuncaoLabel','Turno','HorarioCadastro','Dispositivo','Sincronizado'];
    aba.getRange(1, 1, 1, header.length).setValues([header]);
    aba.getRange(1, 1, 1, header.length)
      .setBackground('#1D9E75').setFontColor('#FFFFFF').setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}

function salvarVoluntarioPOST(body) {
  const aba   = garantirAbaVoluntarios();
  const agora = new Date().toLocaleString('pt-BR', { timeZone: CONFIG.FUSO_HORARIO });

  aba.appendRow([
    body.id           || '',
    agora,
    body.nome         || '',
    body.funcao       || '',
    body.funcaoLabel  || '',
    body.turno        || '',
    body.horario      || agora,
    body.dispositivo  || '',
    true,
  ]);

  return { ok: true, msg: 'Voluntário salvo: ' + body.nome };
}

function exportarVoluntarios() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(CONFIG.ABA_VOLUNTARIOS);
  if (!aba) return { ok: true, voluntarios: [] };

  const dados       = aba.getDataRange().getValues();
  const voluntarios = [];

  for (let i = 1; i < dados.length; i++) {
    voluntarios.push({
      id:          dados[i][0],
      timestamp:   dados[i][1],
      nome:        dados[i][2],
      funcao:      dados[i][3],
      funcaoLabel: dados[i][4],
      turno:       dados[i][5],
      horario:     dados[i][6],
      dispositivo: dados[i][7],
    });
  }

  return { ok: true, voluntarios };
}


// ════════════════════════════════════════════════════════════
// BLOCO 6 — SORTEIO E ALIMENTO (v4/v5)
// ════════════════════════════════════════════════════════════

/**
 * Menu helper — sortear por setor (uso interno na planilha).
 */
function menuSortear() {
  const ui     = SpreadsheetApp.getUi();
  const resp   = ui.prompt('🎲 Sorteio', 'Digite o setor (SM-AT, OT-AT, todos...):', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const setor  = resp.getResponseText().trim().toUpperCase();
  const result = sortearPorSetorInterno(setor);
  ui.alert(result.ok ? '🏆 Ganhador: ' + result.nome + '\n' + result.numero : '❌ ' + result.erro);
}

function sortearPorSetorInterno(setor) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(CONFIG.ABA_INSCRITOS);
  if (!aba) return { ok: false, erro: 'Aba não encontrada' };

  const dados      = aba.getDataRange().getValues();
  const candidatos = [];

  for (let i = 1; i < dados.length; i++) {
    const presente = dados[i][19];
    const perfil   = dados[i][6];
    if (!presente) continue;
    if (setor === 'todos' || perfil === setor) {
      candidatos.push({ nome: dados[i][2], numero: dados[i][0], perfil });
    }
  }

  if (candidatos.length === 0) return { ok: false, erro: 'Nenhum participante presente no setor: ' + setor };
  const sorteado = candidatos[Math.floor(Math.random() * candidatos.length)];
  return { ok: true, ...sorteado };
}

/**
 * Menu helper — check-in manual.
 */
function menuCheckIn() {
  const ui   = SpreadsheetApp.getUi();
  const resp = ui.prompt('✅ Check-in', 'Digite o número de inscrição:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const resultado = checkInViaPOST({ numero: resp.getResponseText().trim() });
  ui.alert(resultado.ok
    ? '✅ Check-in realizado!\n' + resultado.nome + ' — ' + resultado.numero
    : resultado.jaFeito
      ? '⚠️ Já fez check-in: ' + resultado.nome
      : '❌ Número não encontrado: ' + resultado.numero
  );
}

/**
 * Menu helper — registrar alimento.
 */
function menuRegistrarAlimento() {
  const ui      = SpreadsheetApp.getUi();
  const rNum    = ui.prompt('🌾 Alimento', 'Número de inscrição:', ui.ButtonSet.OK_CANCEL);
  if (rNum.getSelectedButton() !== ui.Button.OK) return;
  const rKg     = ui.prompt('🌾 Alimento', 'Quantidade em kg:', ui.ButtonSet.OK_CANCEL);
  if (rKg.getSelectedButton() !== ui.Button.OK) return;

  const numero  = rNum.getResponseText().trim().toUpperCase();
  const kg      = parseFloat(rKg.getResponseText().replace(',', '.')) || 0;
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const aba     = ss.getSheetByName(CONFIG.ABA_INSCRITOS);
  const dados   = aba.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim().toUpperCase() === numero) {
      const kgAtual     = Number(dados[i][15]) || 0;
      const extras      = String(dados[i][16] || '').split(',').filter(Boolean);
      const novoKg      = kgAtual + kg;
      for (let k = extras.length + 1; k <= Math.floor(novoKg); k++) {
        extras.push(numero + '-A' + String(k).padStart(2, '0'));
      }
      aba.getRange(i + 1, 16).setValue(novoKg);
      aba.getRange(i + 1, 17).setValue(extras.join(', '));
      ui.alert('✅ Alimento registrado!\n' + dados[i][2] + ': ' + novoKg + ' kg\nExtras: ' + extras.join(', '));
      return;
    }
  }
  ui.alert('❌ Número não encontrado: ' + numero);
}


// ════════════════════════════════════════════════════════════
// BLOCO 7 — RELATÓRIO PDF (v8 — P18)
// ════════════════════════════════════════════════════════════

/**
 * Menu helper — gerar relatório com confirmação.
 */
function menuGerarRelatorio() {
  const ui   = SpreadsheetApp.getUi();
  const resp = ui.alert(
    '📄 Gerar relatório PDF',
    'Gerar relatório completo do evento e enviar por email para ' + CONFIG.EMAIL_ORGANIZADOR + '?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;
  const resultado = gerarRelatorioPDF(true);
  ui.alert(resultado.ok
    ? '✅ Relatório gerado!\nDoc: ' + resultado.docUrl + '\nPDF: ' + resultado.pdfUrl
    : '❌ Erro: ' + resultado.erro
  );
}

/**
 * Gera relatório PDF completo do evento.
 * @param {boolean} enviarEmail - se true, envia por email ao organizador
 */
function gerarRelatorioPDF(enviarEmail) {
  enviarEmail = enviarEmail !== false;
  try {
    const dados      = coletarDadosRelatorio();
    const sorteio    = coletarDadosSorteio();
    const voluntarios = coletarDadosVoluntarios();
    const docUrl     = montarDocumentoRelatorio(dados, sorteio, voluntarios);
    const pdfUrl     = exportarParaPDF(docUrl);

    if (enviarEmail) {
      montarEmailHTML(dados, sorteio, pdfUrl);
    }

    registrarRelatorio(dados, docUrl, pdfUrl);

    return { ok: true, docUrl, pdfUrl };
  } catch (e) {
    Logger.log('[P18] ERRO gerarRelatorioPDF: ' + e.message);
    return { ok: false, erro: e.message };
  }
}

function coletarDadosRelatorio() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const aba    = ss.getSheetByName(CONFIG.ABA_INSCRITOS);
  if (!aba) return {};

  const dados  = aba.getDataRange().getValues();
  const setores = {};
  let totalKg  = 0;
  let presentes = 0;

  Object.keys(CONFIG.SETORES).forEach(s => {
    setores[s] = { nome: CONFIG.SETORES[s], inscritos: 0, presentes: 0 };
  });

  for (let i = 1; i < dados.length; i++) {
    const perfil = dados[i][6] || 'OUT';
    const pres   = dados[i][19];
    const kg     = Number(dados[i][15]) || 0;
    if (!setores[perfil]) setores[perfil] = { nome: perfil, inscritos: 0, presentes: 0 };
    setores[perfil].inscritos++;
    if (pres) { setores[perfil].presentes++; presentes++; }
    totalKg += kg;
  }

  return {
    totalInscritos: dados.length - 1,
    totalPresentes: presentes,
    totalKg: totalKg.toFixed(1),
    setores,
    dataEvento: '30/05/2026',
    geradoEm: new Date().toLocaleString('pt-BR', { timeZone: CONFIG.FUSO_HORARIO }),
  };
}

function coletarDadosSorteio() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(CONFIG.ABA_SORTEIO);
  if (!aba || aba.getLastRow() < 2) return [];

  const dados     = aba.getDataRange().getValues();
  const sorteios  = [];
  for (let i = 1; i < dados.length; i++) {
    sorteios.push({
      timestamp: dados[i][0],
      nome:      dados[i][1],
      numero:    dados[i][2],
      premio:    dados[i][3],
      setor:     dados[i][4],
      tipo:      dados[i][5],
    });
  }
  return sorteios;
}

function coletarDadosVoluntarios() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(CONFIG.ABA_VOLUNTARIOS);
  if (!aba || aba.getLastRow() < 2) return [];

  const dados = aba.getDataRange().getValues();
  const vols  = [];
  for (let i = 1; i < dados.length; i++) {
    vols.push({ nome: dados[i][2], funcao: dados[i][4], turno: dados[i][5] });
  }
  return vols;
}

function montarDocumentoRelatorio(dados, sorteio, voluntarios) {
  const titulo = 'Relatório CMMPANE/NES — ' + (dados.dataEvento || '');
  const doc    = DocumentApp.create(titulo);
  const body   = doc.getBody();

  body.appendParagraph('RELATÓRIO DO EVENTO').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Mães e Pais Atípicos do Norte do ES — ' + (dados.dataEvento || ''));
  body.appendParagraph('Gerado em: ' + (dados.geradoEm || ''));
  body.appendParagraph('');

  body.appendParagraph('RESUMO GERAL').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Inscritos: ' + (dados.totalInscritos || 0));
  body.appendParagraph('Presentes: ' + (dados.totalPresentes || 0));
  body.appendParagraph('Total de alimentos: ' + (dados.totalKg || 0) + ' kg');
  body.appendParagraph('');

  body.appendParagraph('PRESENÇA POR SETOR').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  Object.entries(dados.setores || {}).forEach(([key, s]) => {
    body.appendParagraph(key + ': ' + s.presentes + '/' + s.inscritos + ' presentes');
  });
  body.appendParagraph('');

  if (sorteio.length > 0) {
    body.appendParagraph('SORTEIOS REALIZADOS').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    sorteio.forEach(s => {
      body.appendParagraph(s.premio + ': ' + s.nome + ' (' + s.numero + ') — ' + s.tipo);
    });
    body.appendParagraph('');
  }

  if (voluntarios.length > 0) {
    body.appendParagraph('VOLUNTÁRIOS').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    voluntarios.forEach(v => {
      body.appendParagraph(v.nome + ' — ' + v.funcao + ' (' + v.turno + ')');
    });
  }

  doc.saveAndClose();
  return doc.getUrl();
}

function exportarParaPDF(docUrl) {
  try {
    const docId  = docUrl.match(/\/d\/(.*?)\//)[1];
    const pdf    = DriveApp.getFileById(docId).getAs('application/pdf');
    const folder = DriveApp.getRootFolder();
    const file   = folder.createFile(pdf);
    file.setName('Relatorio_CMMPANE_NES_' + Utilities.formatDate(new Date(), CONFIG.FUSO_HORARIO, 'yyyyMMdd') + '.pdf');
    return file.getUrl();
  } catch (e) {
    Logger.log('[P18] Erro ao exportar PDF: ' + e.message);
    return '';
  }
}

function montarEmailHTML(dados, sorteio, pdfUrl) {
  try {
    const assunto = '📄 Relatório do Evento — CMMPANE/NES ' + (dados.dataEvento || '');
    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#534AB7;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;">📊 Relatório do Evento</h1>
    <p style="color:#d4d0f8;margin:8px 0 0;font-size:13px;">Mães e Pais Atípicos do Norte do ES — ${dados.dataEvento || ''}</p>
  </div>
  <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;font-weight:bold;">Inscritos</td><td>${dados.totalInscritos || 0}</td></tr>
      <tr><td style="padding:8px 0;font-weight:bold;">Presentes</td><td>${dados.totalPresentes || 0}</td></tr>
      <tr><td style="padding:8px 0;font-weight:bold;">Alimentos</td><td>${dados.totalKg || 0} kg</td></tr>
    </table>
    ${pdfUrl ? '<p><a href="' + pdfUrl + '" style="color:#534AB7;font-weight:bold;">📥 Baixar relatório PDF</a></p>' : ''}
    <p style="font-size:12px;color:#888;margin-top:16px;">Gerado em: ${dados.geradoEm || ''}</p>
  </div>
</div>`;
    GmailApp.sendEmail(CONFIG.EMAIL_ORGANIZADOR, assunto, '', { htmlBody: html, name: 'CMMPANE/NES' });
  } catch (e) {
    Logger.log('[P18] Erro ao enviar email relatório: ' + e.message);
  }
}

function registrarRelatorio(dados, docUrl, pdfUrl) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let aba   = ss.getSheetByName(CONFIG.ABA_RELATORIOS);
  if (!aba) {
    aba = ss.insertSheet(CONFIG.ABA_RELATORIOS);
    aba.getRange(1, 1, 1, 7).setValues([['Timestamp','Titulo','Inscritos','Presentes','KG','DocURL','PDFURL']]);
  }
  aba.appendRow([
    new Date().toLocaleString('pt-BR', { timeZone: CONFIG.FUSO_HORARIO }),
    'Relatório ' + (dados.dataEvento || ''),
    dados.totalInscritos || 0,
    dados.totalPresentes || 0,
    dados.totalKg || 0,
    docUrl,
    pdfUrl,
  ]);
}

function testarRelatorio_SemEmail() {
  const resultado = gerarRelatorioPDF(false);
  SpreadsheetApp.getUi().alert(resultado.ok
    ? '✅ Relatório gerado!\n' + resultado.docUrl
    : '❌ Erro: ' + resultado.erro
  );
}


// ════════════════════════════════════════════════════════════
// BLOCO 8 — P19: SORTEIO AUTOMÁTICO NA ABA _Sorteio (v9)
// ════════════════════════════════════════════════════════════

/**
 * Recebe resultado de sorteio do app mobile e grava na aba _Sorteio.
 * Chamado via POST {acao:'registrarSorteio'} pelo prototipo_v16.html
 *
 * @param {Object} dados - { nome, numero, premio, setor, tipo }
 * @returns {Object} { ok, msg }
 */
function registrarSorteioNaAba(dados) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Garantir que a aba _Sorteio existe
    let aba = ss.getSheetByName(CONFIG.ABA_SORTEIO);
    if (!aba) {
      aba = ss.insertSheet(CONFIG.ABA_SORTEIO);
      const header = aba.getRange(1, 1, 1, 6);
      header.setValues([['Timestamp','Nome','Número','Prêmio','Setor','Tipo']]);
      header.setBackground('#534AB7').setFontColor('#FFFFFF').setFontWeight('bold');
      aba.setFrozenRows(1);
      aba.setColumnWidth(1, 140);
      aba.setColumnWidth(2, 180);
      aba.setColumnWidth(3, 120);
      aba.setColumnWidth(4, 160);
      aba.setColumnWidth(5, 80);
      aba.setColumnWidth(6, 80);
    }

    const agora = new Date().toLocaleString('pt-BR', { timeZone: CONFIG.FUSO_HORARIO });

    aba.appendRow([
      agora,
      dados.nome   || '—',
      dados.numero || '—',
      dados.premio || '—',
      dados.setor  || '—',
      dados.tipo   || 'app',
    ]);

    // Colorir linha por tipo
    const ultimaLinha = aba.getLastRow();
    const cor = dados.tipo === 'exclusivo' ? '#EEEDFE' : '#F8F7FF';
    aba.getRange(ultimaLinha, 1, 1, 6).setBackground(cor);

    Logger.log('[P19] Ganhador registrado: ' + dados.nome + ' — ' + dados.numero);

    return { ok: true, msg: '✅ Sorteio registrado: ' + dados.nome + ' (' + dados.numero + ')' };

  } catch (e) {
    Logger.log('[P19] ERRO: ' + e.message);
    return { ok: false, erro: e.message };
  }
}


// ════════════════════════════════════════════════════════════
// BLOCO 9 — P21: EMAIL DE CONFIRMAÇÃO AO INSCRITO (v9)
// ════════════════════════════════════════════════════════════

/**
 * Envia email HTML de confirmação ao inscrito.
 * Chamado automaticamente por receberInscricaoPublica() se houver email.
 * Falha silenciosa — nunca afeta a inscrição.
 *
 * @param {Object} inscrito - { nome, email, numero, numerosExtras, quizAcertos }
 */
function enviarConfirmacaoEmailInscrito(inscrito) {
  if (!inscrito.email || !inscrito.email.includes('@')) return false;

  try {
    const nome          = inscrito.nome          || 'Participante';
    const numero        = inscrito.numero         || '—';
    const numerosExtras = inscrito.numerosExtras  || [];
    const acertos       = inscrito.quizAcertos    || 0;

    const extrasHTML = numerosExtras.length > 0 ? `
      <div style="margin-top:16px;padding:14px 16px;background:#EEEDFE;border-radius:10px;border-left:3px solid #534AB7;">
        <div style="font-size:11px;font-weight:700;color:#534AB7;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px;">
          🎯 Seus números extras (quiz — ${acertos} acerto${acertos !== 1 ? 's' : ''})
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${numerosExtras.map(n =>
            `<span style="background:#534AB7;color:#fff;padding:4px 10px;border-radius:6px;font-family:monospace;font-size:13px;font-weight:600;">${n}</span>`
          ).join('')}
        </div>
      </div>` : '';

    const assunto = '🎉 Inscrição confirmada — Mães e Pais Atípicos do Norte do ES';

    const htmlBody = `
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0eeff;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#534AB7;border-radius:16px 16px 0 0;padding:32px;text-align:center;">
    <div style="font-size:40px;margin-bottom:12px;">💜</div>
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Mães e Pais Atípicos do Norte do ES</h1>
    <p style="margin:8px 0 0;font-size:13px;color:#d4d0f8;">CMMPANE/NES · Evento 30/05/2026</p>
  </div>
  <div style="background:#ffffff;padding:28px 32px;border-radius:0 0 16px 16px;">
    <h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#1a1828;">🎉 Inscrição confirmada, ${nome.split(' ')[0]}!</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#7a7698;line-height:1.6;">Sua inscrição foi recebida com sucesso. Guarde seu número!</p>
    <div style="background:#f8f7ff;border:2px solid #5BB8F5;border-radius:14px;padding:20px 24px;text-align:center;margin-bottom:8px;">
      <div style="font-size:11px;font-weight:700;color:#7a7698;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;">Seu número de inscrição</div>
      <div style="font-family:'Courier New',monospace;font-size:32px;font-weight:700;color:#5BB8F5;letter-spacing:3px;">${numero}</div>
      <div style="font-size:12px;color:#7a7698;margin-top:6px;">Apresente no evento para check-in</div>
    </div>
    ${extrasHTML}
    <div style="margin-top:16px;padding:14px 16px;background:#E1F5EE;border-radius:10px;border-left:3px solid #1D9E75;">
      <div style="font-size:13px;font-weight:600;color:#1D9E75;margin-bottom:4px;">🌾 Ganhe mais números!</div>
      <div style="font-size:13px;color:#3d3a5c;line-height:1.6;">Traga alimentos não perecíveis no dia do evento.<br><strong>Cada 1 kg = 1 número extra</strong> válido em todos os sorteios!</div>
    </div>
    <div style="margin-top:20px;padding:16px;background:#f8f7ff;border-radius:10px;">
      <div style="font-size:11px;font-weight:700;color:#534AB7;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px;">📅 Detalhes do Evento</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#3d3a5c;">
        <tr><td style="padding:5px 0;font-weight:600;width:90px;">Data</td><td>Sábado, 30 de maio de 2026</td></tr>
        <tr><td style="padding:5px 0;font-weight:600;">Local</td><td>Centro de Vivência Amélia Boroto</td></tr>
        <tr><td style="padding:5px 0;font-weight:600;">Endereço</td><td>Av. João Pinto Bandeira, 74 — Carapina, São Mateus/ES</td></tr>
        <tr><td style="padding:5px 0;font-weight:600;">Prêmios</td><td>Ventilador Arno 40" + Airfryer + surpresas</td></tr>
      </table>
    </div>
    <div style="margin-top:14px;padding:14px 16px;background:#FAEEDA;border-radius:10px;border-left:3px solid #EF9F27;">
      <div style="font-size:13px;font-weight:600;color:#EF9F27;margin-bottom:4px;">📄 Para retirar prêmios</div>
      <div style="font-size:13px;color:#3d3a5c;line-height:1.6;">Documento com foto (mãe/pai) + certidão de nascimento do(a) filho(a) + laudo médico.</div>
    </div>
    <div style="margin-top:24px;text-align:center;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
      <a href="https://chat.whatsapp.com/EDMwzlfTfHkGwwbQCeiFiq" style="display:inline-block;padding:12px 22px;background:#25D366;color:#fff;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;">💬 Entrar na comunidade WhatsApp</a>
      <a href="https://instagram.com/maes_atipicas_do_norte_do_es" style="display:inline-block;padding:12px 22px;background:#E1306C;color:#fff;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;">📸 Seguir no Instagram</a>
    </div>
  </div>
  <p style="text-align:center;font-size:11px;color:#7a7698;margin-top:20px;line-height:1.7;">
    Email enviado automaticamente pelo sistema CMMPANE/NES.<br>
    Dúvidas: <a href="mailto:maesepaisatipicosdonortees@gmail.com" style="color:#534AB7;">maesepaisatipicosdonortees@gmail.com</a>
  </p>
</div>
</body></html>`;

    GmailApp.sendEmail(inscrito.email, assunto, '', {
      htmlBody,
      name:    'Mães e Pais Atípicos do Norte do ES',
      replyTo: 'maesepaisatipicosdonortees@gmail.com',
    });

    Logger.log('[P21] Email enviado para: ' + inscrito.email + ' (' + nome + ')');
    return true;

  } catch (e) {
    Logger.log('[P21] ERRO ao enviar email: ' + e.message);
    return false;
  }
}


// ════════════════════════════════════════════════════════════
// BLOCO 10 — P27: CONTAGEM DE VAGAS + LISTA DE ESPERA
// ════════════════════════════════════════════════════════════

/**
 * Retorna { total, aberto, limite } para o inscricao_v20.html.
 *
 * Lógica de flag (célula A2 da aba _Config):
 *   'aberto'   → inscrições abertas, limite = 1.200
 *   'reaberto' → inscrições abertas, limite = 1.500
 *   qualquer outro valor (ex: 'fechado') → aberto = false
 *
 * Efeito colateral: dispara notificação ao Fábio ao atingir o limite.
 */
function obterContagem_() {
  try {
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const abaInsc = ss.getSheetByName(CONFIG.ABA_INSCRITOS);
    const abaCfg  = ss.getSheetByName(CONFIG.ABA_CONFIG);

    const total = abaInsc ? Math.max(0, abaInsc.getLastRow() - 1) : 0;

    // Ler flag de controle
    let flag = 'aberto';
    if (abaCfg) {
      flag = String(abaCfg.getRange('A2').getValue()).toLowerCase().trim();
    }
    const reaberto = (flag === 'reaberto');
    const aberto   = (flag === 'aberto' || flag === 'reaberto');
    const limite   = reaberto ? CONFIG.LIMITE_REABERTO : CONFIG.LIMITE_NORMAL;

    // Disparar notificação quando bater no limite (janela de 5 inscrições
    // para evitar spam caso o script seja chamado várias vezes seguidas)
    if (total >= limite && total < limite + 5) {
      notificarFabioLimite_(total, limite, reaberto);
    }

    Logger.log('[P27] contagem → total=' + total + ' aberto=' + aberto + ' limite=' + limite);
    return { ok: true, total, aberto, limite };

  } catch (err) {
    Logger.log('[P27] ERRO obterContagem_: ' + err.message);
    // Retorno seguro: nunca bloqueia a inscrição por erro aqui
    return { ok: false, total: 0, aberto: true, limite: CONFIG.LIMITE_NORMAL };
  }
}

/**
 * Grava um cadastro na lista de espera (_ListaEspera).
 * Chamado via POST { acao:'listaEspera', nome, telefone, email }.
 */
function salvarListaEspera_(body) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Garantir que a aba existe (mesmo sem inicializarPlanilha)
    let aba = ss.getSheetByName(CONFIG.ABA_LISTA_ESPERA);
    if (!aba) {
      aba = ss.insertSheet(CONFIG.ABA_LISTA_ESPERA);
      const h = aba.getRange(1, 1, 1, 4);
      h.setValues([['Timestamp','Nome','Telefone','Email']]);
      h.setBackground('#E05252').setFontColor('#FFFFFF').setFontWeight('bold');
      aba.setFrozenRows(1);
    }

    const agora = new Date().toLocaleString('pt-BR', { timeZone: CONFIG.FUSO_HORARIO });
    aba.appendRow([
      agora,
      body.nome      || '',
      body.telefone  || '',
      body.email     || '',
    ]);

    Logger.log('[P27] Lista de espera → ' + body.nome + ' / ' + body.telefone);
    return { ok: true, msg: 'Cadastrado na lista de espera com sucesso.' };

  } catch (err) {
    Logger.log('[P27] ERRO salvarListaEspera_: ' + err.message);
    return { ok: false, erro: err.message };
  }
}

/**
 * Notifica Fábio por email e WhatsApp ao atingir o limite de inscrições.
 * Falha silenciosa — nunca afeta a contagem.
 *
 * @param {number} total    - total atual de inscritos
 * @param {number} limite   - limite que foi atingido
 * @param {boolean} reaberto - true se já estava na fase reaberta
 */
function notificarFabioLimite_(total, limite, reaberto) {
  try {
    // ── Proteção anti-spam: gravar flag na _Config ──────
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    const abaCfg = ss.getSheetByName(CONFIG.ABA_CONFIG);
    if (abaCfg) {
      const jaNotificou = String(abaCfg.getRange('B3').getValue()).toLowerCase().trim();
      const chave = 'notif_' + limite;
      if (jaNotificou === chave) return; // já notificou para este limite
      abaCfg.getRange('B3').setValue(chave);
    }

    const proxAcao = reaberto
      ? '⚠️ Limite de 1.500 atingido. Para fechar definitivamente: mude A2 de _Config para "fechado".'
      : '✅ Para reabrir até 1.500: mude A2 de _Config para "reaberto".';

    // ── Email ────────────────────────────────────────────
    const assunto = '⚠️ CMMPANE/NES — ' + total + ' inscrições! Limite ' + limite + ' atingido';
    const html = `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
  <div style="background:#EF9F27;padding:20px 24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:18px;">⚠️ Limite de inscrições atingido!</h1>
  </div>
  <div style="background:#fff;padding:20px 24px;border-radius:0 0 12px 12px;border:1px solid #eee;">
    <p style="font-size:15px;margin:0 0 12px;">O evento CMMPANE/NES atingiu <strong>${total} inscrições</strong> (limite: ${limite}).</p>
    <p style="font-size:14px;color:#534AB7;font-weight:600;margin:0 0 12px;">${proxAcao}</p>
    <p style="font-size:13px;color:#888;">Como acessar: abra a planilha Google → aba <code>_Config</code> → célula A2.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
    <p style="font-size:12px;color:#aaa;">Mensagem automática do sistema CMMPANE/NES v10</p>
  </div>
</div>`;

    GmailApp.sendEmail(CONFIG.EMAIL_ORGANIZADOR, assunto, '', {
      htmlBody: html,
      name: 'Sistema CMMPANE/NES',
    });

    // ── WhatsApp via CallMeBot ───────────────────────────
    if (CONFIG.CALLMEBOT_APIKEY && CONFIG.CALLMEBOT_APIKEY !== 'SUA_APIKEY_AQUI') {
      const msg = encodeURIComponent(
        '⚠️ *CMMPANE/NES — ' + total + ' inscrições!*\n' +
        'Limite de ' + limite + ' atingido.\n\n' +
        proxAcao + '\n\n' +
        'Abra a planilha → aba _Config → célula A2.'
      );
      const url = 'https://api.callmebot.com/whatsapp.php?phone=' +
                  CONFIG.CALLMEBOT_NUMERO + '&text=' + msg + '&apikey=' + CONFIG.CALLMEBOT_APIKEY;
      UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    }

    Logger.log('[P27] Notificação enviada ao Fábio — total=' + total + ' limite=' + limite);

  } catch (err) {
    Logger.log('[P27] ERRO notificarFabioLimite_: ' + err.message);
  }
}

// ── Helpers de menu (P27) ─────────────────────────────────

/** Menu: mostra contagem atual em tempo real. */
function menuVerContagem() {
  const resultado = obterContagem_();
  const pct = Math.round((resultado.total / resultado.limite) * 100);
  SpreadsheetApp.getUi().alert(
    '📊 Contagem de Vagas\n\n' +
    '• Total inscritos: ' + resultado.total + '\n' +
    '• Limite atual: ' + resultado.limite + '\n' +
    '• Vagas restantes: ' + Math.max(0, resultado.limite - resultado.total) + '\n' +
    '• Percentual: ' + pct + '%\n' +
    '• Status: ' + (resultado.aberto ? '🟢 Aberto' : '🔴 Fechado')
  );
}

/** Menu: guia rápido para reabrir inscrições. */
function menuReabrirInscricoes() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    '🔓 Reabrir Inscrições',
    'Isso vai mudar a célula A2 da aba _Config para "reaberto",\n' +
    'permitindo inscrições até 1.500 participantes.\n\n' +
    'Confirmar?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;
  try {
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    const abaCfg = ss.getSheetByName(CONFIG.ABA_CONFIG);
    if (!abaCfg) { ui.alert('❌ Aba _Config não encontrada. Execute inicializarPlanilha() primeiro.'); return; }
    abaCfg.getRange('A2').setValue('reaberto');
    ui.alert('✅ Inscrições reabertas!\nLimite agora: 1.500\n\nPara fechar definitivamente, mude A2 para "fechado".');
  } catch (e) {
    ui.alert('❌ Erro: ' + e.message);
  }
}


// ════════════════════════════════════════════════════════════
// BLOCO 11 — FUNÇÕES DE TESTE
// ════════════════════════════════════════════════════════════

/**
 * Teste P27 — verifica retorno de contagem.
 */
function testarContagem() {
  const resultado = obterContagem_();
  Logger.log('[TESTE P27] ' + JSON.stringify(resultado));
  SpreadsheetApp.getUi().alert(
    'Teste P27 — Contagem:\n\n' +
    '• Total: ' + resultado.total + '\n' +
    '• Aberto: ' + resultado.aberto + '\n' +
    '• Limite: ' + resultado.limite + '\n\n' +
    (resultado.ok ? '✅ Funcionando!' : '❌ Erro: verifique os Logs')
  );
}

/**
 * Teste P27 — insere uma linha fictícia na lista de espera.
 */
function testarListaEspera() {
  const resultado = salvarListaEspera_({
    nome:     'Teste Silva',
    telefone: '27999990000',
    email:    'teste@teste.com',
  });
  Logger.log('[TESTE P27] Lista de espera: ' + JSON.stringify(resultado));
  SpreadsheetApp.getUi().alert('Teste P27 — Lista de espera: ' + (resultado.ok ? '✅ Verifique a aba _ListaEspera' : '❌ ' + resultado.erro));
}

/**
 * Teste P19 — registra um sorteio fictício na aba _Sorteio.
 * Execute no editor do Apps Script para validar.
 */
function testarRegistroSorteio() {
  const resultado = registrarSorteioNaAba({
    nome:   'Maria Teste da Silva',
    numero: 'SM-AT-0042',
    premio: 'Ventilador Arno 40"',
    setor:  'SM-AT',
    tipo:   'exclusivo',
  });
  Logger.log('[TESTE P19] ' + JSON.stringify(resultado));
  SpreadsheetApp.getUi().alert('Teste P19: ' + (resultado.ok ? '✅ Verifique a aba _Sorteio' : '❌ ' + resultado.erro));
}

/**
 * Teste P21 — envia email de confirmação.
 * SUBSTITUA o email antes de executar!
 */
function testarEmailInscrito() {
  const resultado = enviarConfirmacaoEmailInscrito({
    nome:          'Maria Teste da Silva',
    email:         'seu-email@teste.com', // ← SUBSTITUA AQUI antes de executar
    numero:        'SM-AT-0042',
    numerosExtras: ['SM-AT-0042-Q01', 'SM-AT-0042-Q02'],
    quizAcertos:   2,
    perfil:        'SM-AT',
  });
  Logger.log('[TESTE P21] Enviado: ' + resultado);
  SpreadsheetApp.getUi().alert('Teste P21: ' + (resultado ? '✅ Verifique a caixa de entrada' : '❌ Falhou — veja os Logs'));
}

/**
 * Teste completo de inscrição pública.
 */
function testarInscricaoCompleta() {
  const resultado = receberInscricaoPublica({
    nome:        'Teste Completo Silva',
    telefone:    '27999990000',
    email:       'seu-email@teste.com', // ← SUBSTITUA AQUI
    cidade:      'São Mateus',
    perfil:      'SM-AT',
    ehMae:       'mae',
    filhoNome:   'Filho Teste',
    filhoIdade:  '8',
    condicao:    'autismo',
    quiz:        '2',
    quizAcertos: 2,
    termo1:      'true',
    termo2:      'true',
  });
  Logger.log('[TESTE INSCRICAO] ' + JSON.stringify(resultado));
  SpreadsheetApp.getUi().alert(resultado.ok
    ? '✅ Inscrito! Número: ' + resultado.numero
    : '❌ Erro: ' + resultado.erro
  );
}


// ════════════════════════════════════════════════════════════
// FIM DO ARQUIVO — Apps_Script_UNIFICADO_v10_COMPLETO.js
// ════════════════════════════════════════════════════════════
//
// CHECKLIST APÓS COLAR:
//   [ ] Substituir CALLMEBOT_NUMERO e CALLMEBOT_APIKEY (se usar WhatsApp)
//   [ ] Executar inicializarPlanilha() → autorizar permissões
//   [ ] Confirmar que _Config foi criada com A2 = 'aberto'
//   [ ] Confirmar que _ListaEspera foi criada
//   [ ] Implantar como Web App (nova versão) → copiar URL
//   [ ] Colar URL no app mobile (aba Dados)
//   [ ] Testar P27: abrir [URL]?acao=contagem no browser
//       → deve retornar {"ok":true,"total":0,"aberto":true,"limite":1200}
//   [ ] Testar: testarContagem() → verificar alert
//   [ ] Testar: testarListaEspera() → verificar aba _ListaEspera
//   [ ] Testar: testarRegistroSorteio() → verificar aba _Sorteio
//   [ ] Testar: testarEmailInscrito() → substituir email antes
//   [ ] Testar: testarInscricaoCompleta() → verificar aba Inscritos
// ============================================================
