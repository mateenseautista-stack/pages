# Mães e Pais Atípicos do Norte do ES — Sistema de Inscrição

**Versão**: 20 (com correções v21)  
**Data**: 09 de maio de 2026  
**Status**: ✅ Pronto para deploy

---

## 📋 O Que Está Incluído

Este pacote contém um sistema completo de gestão de inscrições para evento com:

- **Frontend**: Formulário de inscrição responsivo (PWA)
- **Backend**: Google Apps Script integrado com Google Sheets
- **Offline**: Service Worker para funcionamento offline
- **Notificações**: Firebase Cloud Messaging para push notifications
- **Painel**: Dashboard para organizadores e sorteios

### Arquivos Incluídos

| Arquivo | Descrição |
|---------|-----------|
| `inscricao_v20.html` | Formulário público de inscrição |
| `prototipo_v16.html` | App dos organizadores (painel + sorteio) |
| `dashboard.html` | Tela para projetor (placar de inscritos) |
| `sw.js` | Service Worker para offline |
| `manifest.json` | Configuração PWA |
| `firebase-messaging-sw.js` | Service Worker para push notifications |
| `Apps_Script_UNIFICADO_v10_COMPLETO.js` | Backend (Google Apps Script) |

---

## 🚀 Como Fazer Deploy

### Etapa 1: Google Apps Script

1. Acesse sua planilha Google Sheets do evento
2. Vá em **Extensões → Apps Script**
3. Selecione tudo (Ctrl+A) e delete
4. Abra `Apps_Script_UNIFICADO_v10_COMPLETO.js`
5. Copie todo o conteúdo e cole no editor
6. Salve (Ctrl+S)

**Configuração Importante**:
- Localize as linhas com `CALLMEBOT_NUMERO` e `CALLMEBOT_APIKEY`
- Substitua pelos valores reais do Fábio do Nascimento
- Se não tiver agora, deixe como está e configure depois

**Executar Inicialização**:
1. Clique em **Executar → inicializarPlanilha**
2. Autorize as permissões quando pedir
3. Aguarde o alerta de confirmação
4. Verifique se a aba `_Config` foi criada

**Implantar como Web App**:
1. Clique em **Implantar → Gerenciar implantações**
2. **Nova implantação → Tipo: App da Web**
3. **Executar como**: Eu
4. **Quem tem acesso**: Qualquer pessoa
5. Clique em **Implantar**
6. **COPIE A URL** gerada (formato: `https://script.google.com/macros/s/XXXX/exec`)

**Teste**:
```
Abra no navegador: [URL_COPIADA]?acao=contagem
Resposta esperada: {"ok":true,"total":0,"aberto":true,"limite":1200}
```

---

### Etapa 2: GitHub Pages

1. **Crie conta em github.com** (se não tiver):
   - Email: `maesepaisatipicosdonortees@gmail.com`
   - Username: `maespais-nes`

2. **Crie repositório**:
   - Nome: `maespais-nes`
   - Visibilidade: **Public**
   - Marque "Add a README file"
   - Clique em **Create repository**

3. **Renomeie os arquivos**:
   - `prototipo_v16.html` → `index.html`
   - `inscricao_v20.html` → `inscricao.html`

4. **Faça upload dos 6 arquivos**:
   - `index.html`
   - `inscricao.html`
   - `dashboard.html`
   - `sw.js`
   - `manifest.json`
   - `firebase-messaging-sw.js`
   - Commit: "Deploy inicial v20 — CMMPANE/NES"

5. **Ative GitHub Pages**:
   - Vá em **Settings → Pages**
   - **Branch**: main / **pasta**: / (root)
   - Clique em **Save**
   - Aguarde 2-3 minutos
   - A URL do site aparecerá: `https://maespais-nes.github.io/maespais-nes/`

---

### Etapa 3: Conectar os Dois

1. No repositório GitHub, clique em `inscricao.html`
2. Clique no lápis (✏️ editar)
3. Use Ctrl+F e busque por: `COLE_AQUI_A_URL_DO_APPS_SCRIPT`
4. Substitua esse texto pela URL real do Apps Script
5. Resultado deve ficar assim:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/XXXX/exec';
   ```
6. Clique em **Commit changes**

---

### Etapa 4: Configurar o App

1. Acesse: `https://maespais-nes.github.io/maespais-nes/`
2. Vá até a aba **Dados** (última aba, ícone de engrenagem)
3. No campo "URL do Apps Script", cole a URL do Apps Script
4. Clique no botão 💾 (salvar)
5. Clique em "🔄 Sincronizar agora"
6. Confirme que aparece: "Conectado — 0 inscritos encontrados"

---

## ✅ Testes

### Teste 1: Verificar Contagem
Acesse: `https://maespais-nes.github.io/maespais-nes/inscricao.html`
- Deve aparecer a barra de progresso de vagas no topo

### Teste 2: Inscrição Completa
1. Preencha o formulário completo (use DDD 27 ou 28)
2. Deve aparecer tela de confirmação com número de inscrição
3. Verifique se a linha apareceu na aba "Inscritos" da planilha

### Teste 3: Sincronizar Painel
1. Acesse: `https://maespais-nes.github.io/maespais-nes/`
2. Sincronize e veja o inscrito do Teste 2 aparecer

---

## 🔧 Melhorias Implementadas

### Correções Críticas
- ✅ Headers CORS adicionados aos fetch requests
- ✅ Timeout em requisições (15s padrão)
- ✅ Validação de status HTTP
- ✅ Validação de parse JSON com try-catch

### Melhorias de Validação
- ✅ Email: Regex mais robusta (TLD com 2+ caracteres)
- ✅ Telefone: Validação de comprimento (10-11 dígitos) e celular
- ✅ Modo demo: Console.warn para debugging

### Melhorias de Performance
- ✅ Service Worker com versionamento de cache
- ✅ Estratégias de cache por tipo de recurso
- ✅ Limpeza automática de caches antigos

### Melhorias de UX
- ✅ Manifest com ícones SVG inline
- ✅ Firebase SW com error handler
- ✅ Logging melhorado em console

---

## 📞 Suporte

### Problemas Comuns

**Problema**: "URL do Apps Script não configurada"
- **Solução**: Verifique se a URL foi corretamente colada em `inscricao.html`

**Problema**: "Erro ao conectar com o servidor"
- **Solução**: Verifique se o Apps Script foi implantado como Web App
- **Teste**: Acesse `[URL_APPS_SCRIPT]?acao=contagem` no navegador

**Problema**: "Inscrição não aparece na planilha"
- **Solução**: Verifique se a aba "Inscritos" existe na planilha
- **Teste**: Execute `testarInscricaoCompleta()` no editor do Apps Script

**Problema**: "PWA não instala"
- **Solução**: Verifique se `manifest.json` está correto
- **Teste**: Abra DevTools (F12) → Application → Manifest

---

## 📝 Checklist Final

- [ ] Google Apps Script implantado
- [ ] URL do Apps Script copiada
- [ ] Repositório GitHub criado
- [ ] Arquivos enviados ao GitHub
- [ ] GitHub Pages ativado
- [ ] URL do Apps Script colada em `inscricao.html`
- [ ] App sincronizado com Apps Script
- [ ] Teste 1 passou (barra de vagas)
- [ ] Teste 2 passou (inscrição completa)
- [ ] Teste 3 passou (sincronização)
- [ ] PWA instalável (opcional)
- [ ] Push notifications configuradas (opcional)

---

## 🎯 Próximos Passos (Opcional)

1. **Configurar Firebase** para push notifications
2. **Customizar ícones** (substitua SVG inline por PNG real)
3. **Configurar domínio customizado** (ex: inscricoes.maesatipicas.com.br)
4. **Adicionar analytics** para rastrear inscrições
5. **Configurar backup** automático da planilha

---

## 📄 Versão

- **Versão**: 20 (com correções de segurança e performance)
- **Data**: 09 de maio de 2026
- **Compatibilidade**: Chrome, Firefox, Safari, Edge (versões recentes)
- **Suporte Offline**: Sim (Service Worker)
- **PWA**: Sim (instalável em dispositivos)

---

**Desenvolvido para**: Mães e Pais Atípicos do Norte do ES — CMMPANE/NES  
**Evento**: 30 de maio de 2026 — São Mateus, ES
