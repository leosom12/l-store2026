# 🚀 Deploy no Render - Guia Completo

## 📋 Pré-requisitos
- ✅ Conta no GitHub (já tem)
- ✅ Repositório Git configurado (já tem)
- ✅ Conta no Render.com (vamos criar)

---

## 🎯 Passo 1: Preparar o Repositório

### 1.1 Verificar se está tudo commitado
```bash
git status
```

### 1.2 Adicionar e commitar as mudanças
```bash
git add .
git commit -m "Configuração para deploy no Render"
git push origin main
```

---

## 🌐 Passo 2: Criar Conta no Render

1. Acesse: **https://render.com**
2. Clique em **"Get Started for Free"**
3. Escolha **"Sign up with GitHub"** (recomendado)
4. Autorize o Render a acessar seus repositórios

---

## 🔧 Passo 3: Criar o Web Service

### 3.1 No Dashboard do Render:
1. Clique em **"New +"** (canto superior direito)
2. Selecione **"Web Service"**

### 3.2 Conectar o Repositório:
1. Procure por **"supermarket-pos"** na lista
2. Clique em **"Connect"**

### 3.3 Configurar o Service:
- **Name**: `supermarket-pos` (ou outro nome)
- **Region**: `Oregon (US West)` (mais rápido para Brasil)
- **Branch**: `main`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Plan**: **Free** ✅

### 3.4 Variáveis de Ambiente:
Clique em **"Advanced"** e adicione:

```
NODE_ENV = production
PORT = 10000
```

**IMPORTANTE**: Se você usa variáveis do arquivo `.env`, adicione elas aqui também:
- `NGROK_AUTHTOKEN` (se necessário)
- `TELEGRAM_BOT_TOKEN` (se usar)
- Outras variáveis do seu `.env`

### 3.5 Disco Persistente (para SQLite):
1. Role até **"Disks"**
2. Clique em **"Add Disk"**
3. Configure:
   - **Name**: `data`
   - **Mount Path**: `/opt/render/project/src`
   - **Size**: `1 GB` (grátis)

### 3.6 Criar o Service:
- Clique em **"Create Web Service"**
- Aguarde o deploy (3-5 minutos)

---

## 🎉 Passo 4: Acessar seu App

Após o deploy:
1. Você verá uma URL tipo: `https://supermarket-pos.onrender.com`
2. Clique na URL para acessar seu app!

---

## 🔄 Deploy Automático

### Como funciona:
- Toda vez que você fizer `git push`, o Render faz deploy automático!
- Não precisa fazer nada manual

### Workflow:
```bash
# 1. Fazer alterações no código
# 2. Commitar
git add .
git commit -m "Descrição da mudança"

# 3. Push (deploy automático!)
git push origin main
```

---

## 📊 Monitoramento

### Ver Logs em Tempo Real:
1. Acesse o Dashboard do Render
2. Clique no seu service
3. Vá em **"Logs"**

### Ver Status:
- **Live**: App funcionando ✅
- **Building**: Fazendo deploy 🔨
- **Failed**: Erro no deploy ❌

---

## ⚠️ Limitações do Plano Grátis

1. **Sleep após inatividade**:
   - App "dorme" após 15 minutos sem uso
   - Primeiro acesso demora ~30 segundos para "acordar"
   - Acessos seguintes são instantâneos

2. **Horas mensais**:
   - 750 horas/mês grátis
   - Suficiente para uso normal

3. **Recursos**:
   - 512 MB RAM
   - CPU compartilhada
   - 1 GB disco grátis

---

## 🔧 Solução de Problemas

### Deploy falhou?
1. Verifique os logs no Render
2. Certifique-se que `package.json` está correto
3. Verifique se todas as dependências estão instaladas

### App não abre?
1. Verifique se a porta está configurada como `process.env.PORT || 3000`
2. Veja os logs para erros
3. Certifique-se que o banco de dados está sendo criado

### Banco de dados não persiste?
1. Verifique se o disco foi configurado corretamente
2. Certifique-se que o caminho do SQLite aponta para o disco montado

---

## 🎯 Próximos Passos

Após o deploy:
1. ✅ Teste todas as funcionalidades
2. ✅ Configure domínio personalizado (opcional)
3. ✅ Configure SSL (já vem grátis!)
4. ✅ Monitore os logs

---

## 📞 Suporte

- **Documentação Render**: https://render.com/docs
- **Status do Render**: https://status.render.com
- **Comunidade**: https://community.render.com

---

## 🎊 Pronto!

Seu app agora está:
- ✅ Hospedado na nuvem
- ✅ Com HTTPS grátis
- ✅ Deploy automático do GitHub
- ✅ Disponível 24/7 (com sleep no plano grátis)

**URL do seu app**: `https://[seu-nome].onrender.com`

Aproveite! 🚀
