const axios = require('axios');

const LOGIN_URL = 'http://localhost:3000/api/auth/login';
const ADMIN_EMAIL = 'djleocv.hotmail.com@gmail.com';
const ADMIN_PASSWORD = '199412';

async function testAdminLogin() {
    try {
        console.log(`Tentando login em ${LOGIN_URL}...`);
        console.log(`Email: ${ADMIN_EMAIL}`);

        const response = await axios.post(LOGIN_URL, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        if (response.status === 200 && response.data.token) {
            console.log('✅ Login bem-sucedido!');
            console.log('Token recebido:', response.data.token.substring(0, 20) + '...');
            console.log('Dados do usuário:', response.data.user);

            if (response.data.user.isAdmin) {
                console.log('✅ Usuário identificado como ADMIN.');
            } else {
                console.error('❌ ERRO: Usuário NÃO é admin.');
            }
        } else {
            console.error('❌ Falha no login. Resposta inesperada:', response.status, response.data);
        }

    } catch (error) {
        if (error.response) {
            console.error('❌ Erro na requisição:', error.response.status, error.response.data);
        } else {
            console.error('❌ Erro de conexão:', error.message);
        }
    }
}

testAdminLogin();
