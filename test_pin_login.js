const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');

const dbPath = path.join(__dirname, 'main.db');
const db = new sqlite3.Database(dbPath);

async function testLogin() {
    console.log('🔍 Buscando um usuário para teste...');

    db.get("SELECT username, pin FROM users LIMIT 1", async (err, user) => {
        if (err) {
            console.error('❌ Erro ao ler banco de dados:', err);
            return;
        }

        if (!user) {
            console.error('❌ Nenhum usuário encontrado no banco de dados para testar.');
            return;
        }

        console.log(`👤 Usuário encontrado: ${user.username} | PIN: ${user.pin}`);

        try {
            console.log('🚀 Tentando login via API...');
            const response = await axios.post('http://localhost:3000/api/clients/login', {
                name: user.username,
                pin: user.pin
            });

            console.log('✅ Login com sucesso!');
            console.log('📦 Resposta:', response.data);
        } catch (error) {
            console.error('❌ Falha no login:');
            if (error.response) {
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Dados:`, error.response.data);
            } else {
                console.error(`   Erro: ${error.message}`);
            }
        } finally {
            db.close();
        }
    });
}

testLogin();
