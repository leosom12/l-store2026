const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'main.db');
const db = new sqlite3.Database(dbPath);

async function testConfig() {
    console.log('🔍 Iniciando teste da API de Configuração...');

    // 1. Get Admin User
    const user = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE username = 'Admin'", (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

    if (!user) {
        console.error('❌ Usuário Admin não encontrado.');
        return;
    }

    // 2. Login to get token
    console.log('🔑 Logando como Admin...');
    let token;
    try {
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            email: user.email,
            password: 'admin123' // Assuming default password
        });
        token = loginRes.data.token;
        console.log('✅ Login realizado.');
    } catch (err) {
        console.error('❌ Falha no login:', err.message);
        return;
    }

    // 3. Save Config
    console.log('💾 Salvando chave PIX de teste...');
    const testKey = 'teste@pix.com.br';
    try {
        await axios.post('http://localhost:3000/api/config', {
            storePixKey: testKey
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Configuração salva.');
    } catch (err) {
        console.error('❌ Falha ao salvar config:', err.message);
        return;
    }

    // 4. Get Config
    console.log('📥 Recuperando configuração...');
    try {
        const res = await axios.get('http://localhost:3000/api/config', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.data.storePixKey === testKey) {
            console.log(`✅ Sucesso! Chave recuperada: ${res.data.storePixKey}`);
        } else {
            console.error(`❌ Falha! Chave esperada: ${testKey}, Recebida: ${res.data.storePixKey}`);
        }
    } catch (err) {
        console.error('❌ Falha ao ler config:', err.message);
    } finally {
        db.close();
    }
}

testConfig();
