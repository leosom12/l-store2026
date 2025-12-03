const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

const API_URL = 'http://localhost:3000/api';
let adminToken = '';

async function loginAdmin() {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: 'djleocv.hotmail.com@gmail.com',
            password: '123456'
        });
        adminToken = response.data.token;
        console.log('1. Admin logged in.');
    } catch (error) {
        console.error('Login failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

async function createPromotionProduct() {
    try {
        const productData = {
            barcode: 'PROMO123',
            name: 'Produto Promoção Teste',
            category: 'Geral',
            price: 100.00,
            stock: 10,
            icon: '🎁',
            loyalty_points: 10,
            isPromotion: 1,
            promotionPrice: 80.00
        };

        const response = await axios.post(`${API_URL}/products`, productData, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        console.log('2. Product created:', response.data);
        return response.data.id;
    } catch (error) {
        console.error('Create product failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

async function verifyProduct(productId) {
    try {
        const response = await axios.get(`${API_URL}/products`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        const product = response.data.find(p => p.id === productId);
        if (product && product.isPromotion === 1 && product.promotionPrice === 80) {
            console.log('3. SUCCESS: Product verified with promotion data:', {
                name: product.name,
                price: product.price,
                isPromotion: product.isPromotion,
                promotionPrice: product.promotionPrice
            });
        } else {
            console.error('3. FAILURE: Product data mismatch:', product);
            process.exit(1);
        }
    } catch (error) {
        console.error('Verify product failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

async function runTest() {
    await loginAdmin();
    const productId = await createPromotionProduct();
    await verifyProduct(productId);
}

// Wait for server to start
setTimeout(runTest, 2000);
