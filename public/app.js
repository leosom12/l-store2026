// Carregar versão do sistema
async function loadVersion() {
    try {
        const response = await fetch('/api/version');
        const data = await response.json();
        const versionElement = document.getElementById('app-version');
        if (versionElement && data.version) {
            versionElement.innerHTML = `<i class="ph ph-tag"></i> Versão: ${data.version}`;
        }
    } catch (error) {
        console.error('Erro ao carregar versão:', error);
    }
}

// ==================== VARIÁVEIS GLOBAIS ====================
let cart = [];
let allProducts = []; // Store all products for client-side search
let currentTab = 'dashboard';
let pixTimerInterval = null;

// ==================== INICIALIZAÇÃO ====================
// ==================== INICIALIZAÇÃO ====================

function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR');
    const clockElement = document.getElementById('pos-clock');
    if (clockElement) clockElement.textContent = timeString;
}

// ==================== EVENT LISTENERS ====================


function calculateChange() {
    const totalText = document.getElementById('cart-total').textContent.replace('R$', '').replace('.', '').replace(',', '.').trim();
    const total = parseFloat(totalText) || 0;
    const paid = parseFloat(document.getElementById('pos-paid-amount').value) || 0;
    const change = paid - total;

    const changeElement = document.getElementById('pos-change-value');
    if (changeElement) {
        changeElement.textContent = change > 0 ? formatCurrency(change) : 'R$ 0,00';
        changeElement.style.color = change >= 0 ? '#059669' : '#dc2626';
    }

    // Auto-finalizar venda quando valor pago >= total
    // Somente se houver itens no carrinho e método de pagamento for dinheiro
    const paymentMethod = document.getElementById('payment-method').value;

    if (paid >= total && total > 0 && cart.length > 0 && paymentMethod === 'dinheiro') {
        // Pequeno delay para evitar múltiplas chamadas
        clearTimeout(window.autoFinalizeTimeout);
        window.autoFinalizeTimeout = setTimeout(() => {
            finalizeSale();
        }, 500);
    }
}

// ==================== VERIFICAÇÃO DE SERVIDOR ====================
function checkServerStatus() {
    fetch('/api/health')
        .then(response => {
            const statusElement = document.getElementById('server-status');
            const clientStatusElement = document.getElementById('client-server-status');

            if (response.ok) {
                if (statusElement) {
                    statusElement.className = 'server-status online';
                    statusElement.innerHTML = '<span class="status-dot"></span><span class="status-text">Servidor Online</span>';
                }
                if (clientStatusElement) {
                    clientStatusElement.className = 'server-status online';
                    clientStatusElement.innerHTML = '<span class="status-dot"></span><span class="status-text">Servidor Online</span>';
                }
            } else {
                throw new Error('Servidor offline');
            }
        })
        .catch(() => {
            const statusElement = document.getElementById('server-status');
            const clientStatusElement = document.getElementById('client-server-status');

            if (statusElement) {
                statusElement.className = 'server-status offline';
                statusElement.innerHTML = '<span class="status-dot"></span><span class="status-text">Servidor Offline</span>';
            }
            if (clientStatusElement) {
                clientStatusElement.className = 'server-status offline';
                clientStatusElement.innerHTML = '<span class="status-dot"></span><span class="status-text">Servidor Offline</span>';
            }
        });
}

// ==================== NAVEGAÇÃO ====================
// ==================== NAVEGAÇÃO ====================
function switchTab(tabName) {
    currentTab = tabName;

    // Esconder todas as tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remover active de todos os botões de navegação
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active-green');
    });

    // Mostrar tab selecionada
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Adicionar active no botão selecionado
    const selectedBtn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active-green');
    }

    // Atualizar Título da Página
    const titles = {
        'dashboard': 'Visão Geral',
        'caixa': 'Frente de Caixa',
        'products': 'Gerenciar Produtos',
        'sales': 'Histórico de Vendas',
        'reports': 'Relatórios',
        'financial': 'Financeiro',
        'boletos': 'Boletos',
        'debtors': 'Devedores',
        'store': 'Configuração da Loja',
        'subscription': 'Assinatura',
        'accounting': 'Contabilidade',
        'estoque': 'Controle de Estoque'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titles[tabName] || 'L-STORE';

    // Carregar dados específicos da tab
    if (tabName === 'dashboard') loadDashboard();
    if (tabName === 'products') loadProducts();
    if (tabName === 'sales') loadSales();
    if (tabName === 'debtors') loadDebtors();
    if (tabName === 'reports') loadReports();
    if (tabName === 'financial') loadFinancial();
    if (tabName === 'boletos') loadBoletos();
    if (tabName === 'store') loadStoreConfig();
    if (tabName === 'estoque') {
        loadStockMovements();
        loadStockSummary();
    }
}

// ==================== DEVEDORES ====================
function loadDebtors() {
    const token = localStorage.getItem('authToken');

    fetch('/api/debtors', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(debtors => {
            const tbody = document.getElementById('debtors-table-body');
            tbody.innerHTML = '';

            debtors.forEach(debtor => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${debtor.name}</td>
                    <td>${debtor.cpf || '-'}</td>
                    <td>${debtor.phone || '-'}</td>
                    <td style="color: ${debtor.debtAmount > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: bold;">
                        ${formatCurrency(debtor.debtAmount)}
                    </td>
                    <td>
                        <button onclick="openDebtorModal(${debtor.id})" class="btn-icon">✏️</button>
                        <button onclick="openPayDebtModal(${debtor.id}, '${debtor.name}', ${debtor.debtAmount})" class="btn-icon" title="Pagar Dívida">💰</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => console.error('Erro ao carregar devedores:', error));
}

function openDebtorModal(debtorId = null) {
    const modal = document.getElementById('debtor-modal');
    const title = document.getElementById('debtor-modal-title');
    const form = document.getElementById('debtor-form');

    if (debtorId) {
        title.textContent = 'Editar Devedor';
        // Carregar dados (simulado, ideal seria fetch individual ou pegar da lista)
        // Por simplificação, vamos buscar da lista já carregada se possível ou fazer fetch
        // Vamos fazer fetch para garantir
        const token = localStorage.getItem('authToken');
        fetch('/api/debtors', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json())
            .then(debtors => {
                const debtor = debtors.find(d => d.id === debtorId);
                if (debtor) {
                    document.getElementById('debtor-id').value = debtor.id;
                    document.getElementById('debtor-name').value = debtor.name;
                    document.getElementById('debtor-email').value = debtor.email;
                    document.getElementById('debtor-cpf').value = debtor.cpf;
                    document.getElementById('debtor-phone').value = debtor.phone;
                }
            });
    } else {
        title.textContent = 'Novo Devedor';
        form.reset();
        document.getElementById('debtor-id').value = '';
    }
    modal.style.display = 'flex';
}

function closeDebtorModal() {
    document.getElementById('debtor-modal').style.display = 'none';
}

document.getElementById('debtor-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const id = document.getElementById('debtor-id').value;
    const data = {
        name: document.getElementById('debtor-name').value,
        email: document.getElementById('debtor-email').value,
        cpf: document.getElementById('debtor-cpf').value,
        phone: document.getElementById('debtor-phone').value,
        cardInfo: '' // Simplificado
    };

    const token = localStorage.getItem('authToken');
    const url = id ? `/api/debtors/${id}` : '/api/debtors';
    const method = id ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(res => res.json())
        .then(data => {
            if (data.id || data.message) {
                alert(id ? 'Devedor atualizado!' : 'Devedor salvo!');
                closeDebtorModal();
                loadDebtors();
            } else {
                alert('Erro ao salvar: ' + (data.error || 'Desconhecido'));
            }
        })
        .catch(err => {
            console.error('Erro:', err);
            alert('Erro ao salvar devedor');
        });
});

function openPayDebtModal(id, name, currentDebt) {
    if (currentDebt <= 0) {
        alert('Este cliente não possui dívidas.');
        return;
    }
    document.getElementById('pay-debt-id').value = id;
    document.getElementById('pay-debt-customer-name').textContent = `${name} - Dívida: ${formatCurrency(currentDebt)}`;
    document.getElementById('pay-debt-amount').max = currentDebt;
    document.getElementById('pay-debt-amount').value = '';
    document.getElementById('pay-debt-modal').style.display = 'flex';
}

function closePayDebtModal() {
    document.getElementById('pay-debt-modal').style.display = 'none';
}

document.getElementById('pay-debt-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const id = document.getElementById('pay-debt-id').value;
    const amount = parseFloat(document.getElementById('pay-debt-amount').value);

    const token = localStorage.getItem('authToken');
    fetch(`/api/debtors/${id}/pay`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
    })
        .then(res => res.json())
        .then(data => {
            if (data.message) {
                alert('Pagamento registrado!');
                closePayDebtModal();
                loadDebtors();
            } else {
                alert('Erro: ' + data.error);
            }
        })
        .catch(err => console.error('Erro ao pagar dívida:', err));
});

// ==================== LOGOUT ====================
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    currentUser = null;
    cart = [];

    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
}

// ==================== CLIENT PIN REGISTRATION & LOGIN ====================
function showClientLogin() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('client-login-screen').style.display = 'flex';
    // Show login form directly
    document.getElementById('client-login-form').style.display = 'block';
}

function backToMainLogin() {
    document.getElementById('client-login-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
}



function loginClient(e) {
    e.preventDefault();
    const name = document.getElementById('client-login-name').value;
    const pin = document.getElementById('client-login-pin').value;

    // Try to get store email from logged-in user, otherwise use default admin
    let storeEmail = 'djleocv.hotmail.com@gmail.com'; // Default admin email

    const userData = localStorage.getItem('userData');
    if (userData) {
        try {
            storeEmail = JSON.parse(userData).email;
        } catch (err) {
            // Using default store email
        }
    }

    fetch('/api/clients/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin, storeEmail })
    })
        .then(response => response.json())
        .then(data => {
            if (data.token) {
                // Store client token and data
                localStorage.setItem('clientToken', data.token);
                localStorage.setItem('clientData', JSON.stringify(data.client));

                // Initialize client cart
                if (!localStorage.getItem('clientCart')) {
                    localStorage.setItem('clientCart', JSON.stringify([]));
                }

                // Redirect to client store
                showClientStore();
            } else {
                alert('❌ ' + (data.error || 'Nome da Loja ou PIN incorretos'));
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('❌ Erro ao conectar com o servidor');
        });
}

// ==================== CLIENT ONLINE STORE FUNCTIONS ====================

let clientCart = [];

function showClientStore() {
    // Hide all screens
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('client-login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'none';

    // Show client store
    document.getElementById('client-store-screen').style.display = 'flex';

    // Load cart from localStorage
    const savedCart = localStorage.getItem('clientCart');
    if (savedCart) {
        clientCart = JSON.parse(savedCart);
    }

    // Load products and update cart count
    loadStoreProducts();
    updateCartCount();
}

let storeProducts = []; // Cache for client store search

function loadStoreProducts() {
    // Try to get client token first
    let token = localStorage.getItem('clientToken');

    // If no client token, try admin token (for testing/admin view)
    if (!token) {
        token = localStorage.getItem('authToken');
    }

    if (!token) {
        console.error('No token found for store products');
        return;
    }

    fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => {
            if (!response.ok) throw new Error('Erro ao carregar produtos');
            return response.json();
        })
        .then(products => {
            storeProducts = products; // Save for search
            renderStoreProducts(products);
        })
        .catch(err => console.error('Erro ao carregar produtos:', err));
}

function handleStoreSearch(e) {
    const query = e.target.value.toLowerCase().trim();

    if (!query) {
        renderStoreProducts(storeProducts);
        return;
    }

    const filtered = storeProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query))
    );

    renderStoreProducts(filtered);
}

function renderStoreProducts(products) {
    const grid = document.getElementById('store-product-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999; padding: 2rem;">Nenhum produto disponível</p>';
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        // Add click event to open details
        card.onclick = (e) => {
            // Prevent opening if clicking the add button directly
            if (e.target.closest('.btn-add-cart')) return;
            openProductDetails(product);
        };

        const isOutOfStock = product.stock <= 0;

        card.innerHTML = `
            ${product.image ?
                `<img src="${product.image}" alt="${product.name}" class="product-image">` :
                `<div class="product-image" style="display: flex; align-items: center; justify-content: center; font-size: 3rem;">${product.icon || '📦'}</div>`
            }
            <div class="store-badge">L-Store</div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price-row">
                    <div class="product-price">R$ ${parseFloat(product.price).toFixed(2)}</div>
                    <span class="owner-name">${product.ownerName || 'Loja'}</span>
                </div>
                <div class="product-actions">
                    <span class="product-stock">${isOutOfStock ? 'Esgotado' : `${product.stock} disponíveis`}</span>
                    <button class="btn-add-cart" onclick="addToClientCart(${product.id})" ${isOutOfStock ? 'disabled' : ''}>
                        <i class="ph ph-shopping-cart-simple"></i> Adicionar
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

function openProductDetails(product) {
    const modal = document.getElementById('product-details-modal');
    if (!modal) return;

    document.getElementById('detail-product-name').textContent = product.name;
    document.getElementById('detail-product-price').textContent = `R$ ${parseFloat(product.price).toFixed(2)}`;
    document.getElementById('detail-product-category').textContent = product.category || 'Geral';
    document.getElementById('detail-product-stock').textContent = product.stock <= 0 ? 'Esgotado' : `${product.stock} unidades disponíveis`;

    const img = document.getElementById('detail-product-image');
    const placeholder = document.getElementById('detail-image-placeholder');

    if (product.image) {
        img.src = product.image;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        img.style.display = 'none';
        placeholder.style.display = 'block';
        placeholder.textContent = product.icon || '📦';
    }

    // Setup Add Button
    const addBtn = document.getElementById('detail-add-btn');
    addBtn.onclick = () => {
        addToClientCart(product.id);
        closeProductDetailsModal();
    };
    addBtn.disabled = product.stock <= 0;
    addBtn.style.opacity = product.stock <= 0 ? '0.5' : '1';

    modal.style.display = 'flex';
}

function closeProductDetailsModal() {
    const modal = document.getElementById('product-details-modal');
    if (modal) modal.style.display = 'none';
}

function addToClientCart(productId) {
    // Try to get client token first
    let token = localStorage.getItem('clientToken');
    if (!token) token = localStorage.getItem('authToken');

    if (!token) {
        alert('Erro: Você precisa estar logado.');
        return;
    }

    fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(products => {
            const product = products.find(p => p.id === productId);
            if (!product) {
                alert('❌ Produto não encontrado');
                return;
            }

            if (product.stock <= 0) {
                alert('❌ Produto esgotado');
                return;
            }

            // Check if product already in cart
            const existingItem = clientCart.find(item => item.id === productId);

            if (existingItem) {
                if (existingItem.quantity < product.stock) {
                    existingItem.quantity++;
                } else {
                    alert('⚠️ Quantidade máxima atingida');
                    return;
                }
            } else {
                clientCart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    icon: product.icon,
                    quantity: 1,
                    maxStock: product.stock
                });
            }

            // Save cart
            localStorage.setItem('clientCart', JSON.stringify(clientCart));
            updateCartCount();

            // Show feedback
            alert(`✅ ${product.name} adicionado ao carrinho!`);
        })
        .catch(err => {
            console.error('Erro:', err);
            alert('❌ Erro ao adicionar ao carrinho');
        });
}

function updateCartCount() {
    const badge = document.getElementById('cart-count');
    if (badge) {
        const totalItems = clientCart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalItems;
    }
}

function viewClientCart() {
    document.getElementById('client-store-screen').style.display = 'none';
    document.getElementById('client-cart-screen').style.display = 'flex';
    renderClientCart();
}

function renderClientCart() {
    const container = document.getElementById('client-cart-items');
    const totalElement = document.getElementById('client-cart-total');

    if (!container) return;

    if (clientCart.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">Carrinho vazio</p>';
        if (totalElement) totalElement.textContent = 'R$ 0,00';
        return;
    }

    container.innerHTML = '';
    let total = 0;

    clientCart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const card = document.createElement('div');
        card.className = 'cart-item-card';
        card.innerHTML = `
            ${item.image ?
                `<img src="${item.image}" alt="${item.name}" class="cart-item-image">` :
                `<div class="cart-item-image" style="display: flex; align-items: center; justify-content: center; font-size: 2rem;">${item.icon || '📦'}</div>`
            }
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">R$ ${parseFloat(item.price).toFixed(2)}</div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="changeClientCartQty(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="changeClientCartQty(${index}, 1)">+</button>
                </div>
            </div>
            <button class="btn-remove" onclick="removeFromClientCart(${index})">
                <i class="ph ph-trash"></i>
            </button>
        `;
        container.appendChild(card);
    });

    if (totalElement) {
        totalElement.textContent = `R$ ${total.toFixed(2)}`;
    }
}

function changeClientCartQty(index, delta) {
    const item = clientCart[index];
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
        removeFromClientCart(index);
        return;
    }

    if (newQty > item.maxStock) {
        alert('⚠️ Quantidade máxima atingida');
        return;
    }

    item.quantity = newQty;
    localStorage.setItem('clientCart', JSON.stringify(clientCart));
    renderClientCart();
    updateCartCount();
}

function removeFromClientCart(index) {
    clientCart.splice(index, 1);
    localStorage.setItem('clientCart', JSON.stringify(clientCart));
    renderClientCart();
    updateCartCount();
}

function checkoutCart() {
    if (clientCart.length === 0) {
        alert('❌ Carrinho vazio');
        return;
    }

    const clientData = localStorage.getItem('clientData');
    const clientToken = localStorage.getItem('clientToken');
    const paymentMethod = document.getElementById('client-payment-method').value;

    if (!clientData || !clientToken) {
        alert('❌ Erro: Faça login novamente');
        return;
    }

    if (paymentMethod === 'pix') {
        showClientPixModal();
        return;
    }

    processClientOrder(paymentMethod);
}

function showClientPixModal() {
    const modal = document.getElementById('client-pix-modal');
    if (!modal) return;

    // Get store PIX key (or use default)
    let pixKey = '62819358000106'; // Default fallback
    if (window.storeConfig && window.storeConfig.storePixKey) {
        pixKey = window.storeConfig.storePixKey;
    }

    document.getElementById('client-pix-key-display').textContent = pixKey;

    // Generate QR Code
    const total = clientCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Generate Valid PIX Payload with CRC16
    const payload = generatePixPayload(pixKey, 'L-STORE CLIENTE', 'BRASILIA', total);

    const qrContainer = document.getElementById('client-pix-qr');
    qrContainer.innerHTML = `
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payload)}" alt="QR Code PIX">
        <p style="margin-top: 0.5rem; font-weight: bold;">Valor: R$ ${total.toFixed(2)}</p>
    `;

    modal.style.display = 'flex';
}

function closeClientPixModal() {
    document.getElementById('client-pix-modal').style.display = 'none';
}

function confirmClientPixPayment() {
    closeClientPixModal();
    processClientOrder('pix');
}

function processClientOrder(paymentMethod) {
    const clientData = localStorage.getItem('clientData');
    const clientToken = localStorage.getItem('clientToken');
    const client = JSON.parse(clientData);
    const total = clientCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create order
    fetch('/api/client/checkout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${clientToken}`
        },
        body: JSON.stringify({
            clientId: client.id,
            items: clientCart,
            total: total,
            paymentMethod: paymentMethod
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.orderId) {
                alert(`✅ Pedido realizado com sucesso!\n\nPedido #${data.orderId}\nTotal: R$ ${total.toFixed(2)}\nPagamento: ${paymentMethod.toUpperCase()}`);

                // Clear cart
                clientCart = [];
                localStorage.setItem('clientCart', JSON.stringify(clientCart));

                // Go to orders screen
                viewClientOrders();
            } else {
                alert('❌ ' + (data.error || 'Erro ao finalizar pedido'));
            }
        })
        .catch(err => {
            console.error('Erro:', err);
            alert('❌ Erro ao conectar com o servidor');
        });
}

function viewClientOrders() {
    document.getElementById('client-store-screen').style.display = 'none';
    document.getElementById('client-cart-screen').style.display = 'none';
    document.getElementById('client-orders-screen').style.display = 'flex';
    loadClientOrders();
}

function loadClientOrders() {
    const container = document.getElementById('client-orders-list');
    const clientToken = localStorage.getItem('clientToken');

    if (!container || !clientToken) return;

    fetch('/api/client/orders', {
        headers: { 'Authorization': `Bearer ${clientToken}` }
    })
        .then(response => response.json())
        .then(orders => {
            if (orders.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">Nenhum pedido realizado</p>';
                return;
            }

            container.innerHTML = '';
            orders.forEach(order => {
                const card = document.createElement('div');
                card.className = 'order-card';
                card.innerHTML = `
                    <div class="order-header">
                        <span class="order-id">Pedido #${order.id}</span>
                        <span class="order-date">${new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div class="order-items">
                        ${order.itemCount} item(ns)
                    </div>
                    <div class="order-total">
                        <span>Total:</span>
                        <span>R$ ${parseFloat(order.total).toFixed(2)}</span>
                    </div>
                `;
                container.appendChild(card);
            });
        })
        .catch(err => console.error('Erro ao carregar pedidos:', err));
}

function showClientProfile() {
    document.getElementById('client-store-screen').style.display = 'none';
    document.getElementById('client-profile-screen').style.display = 'flex';

    const clientData = localStorage.getItem('clientData');
    if (clientData) {
        const client = JSON.parse(clientData);
        document.getElementById('client-profile-name').textContent = client.name;
    }
}

function showStoreHome() {
    document.getElementById('client-cart-screen').style.display = 'none';
    document.getElementById('client-orders-screen').style.display = 'none';
    document.getElementById('client-profile-screen').style.display = 'none';
    document.getElementById('client-store-screen').style.display = 'flex';

    // Update active nav
    document.querySelectorAll('.store-nav-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.store-nav-item').classList.add('active');
}

function backToStore() {
    showStoreHome();
}

function logoutClient() {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientData');
    localStorage.removeItem('clientCart');
    clientCart = [];

    document.getElementById('client-store-screen').style.display = 'none';
    document.getElementById('client-cart-screen').style.display = 'none';
    document.getElementById('client-orders-screen').style.display = 'none';
    document.getElementById('client-profile-screen').style.display = 'none';
    document.getElementById('client-login-screen').style.display = 'flex';
}



// ==================== DASHBOARD ====================
function loadDashboard() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');

    if (userData) {
        try {
            const user = JSON.parse(userData);
            const headerUsername = document.getElementById('header-username');
            const headerPin = document.getElementById('header-user-pin');

            if (headerUsername) {
                headerUsername.textContent = user.username || 'Usuário';
            }

            if (headerPin && user.pin) {
                headerPin.textContent = `PIN: ${user.pin}`;
                headerPin.style.display = 'inline-block';
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }

    fetch('/api/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById('total-products').textContent = data.totalProducts || 0;
            document.getElementById('low-stock-products').textContent = data.lowStockProducts || 0;
            document.getElementById('out-of-stock-products').textContent = data.outOfStockProducts || 0;
            document.getElementById('total-sales-count').textContent = data.totalSales || 0;
            document.getElementById('total-sales-amount').textContent = formatCurrency(data.totalSalesAmount || 0);
        })
        .catch(error => console.error('Erro ao carregar dashboard:', error));
}

// ==================== PRODUTOS ====================
function loadProducts() {
    const token = localStorage.getItem('authToken');

    fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => {
            if (!response.ok) throw new Error('Erro na resposta do servidor');
            return response.json();
        })
        .then(products => {
            allProducts = products; // Store for search
            const tbody = document.getElementById('products-table-body');

            if (!tbody) {
                return;
            }

            tbody.innerHTML = '';

            if (!Array.isArray(products) || products.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Nenhum produto cadastrado.</td></tr>';
                return;
            }

            products.forEach((product, index) => {
                const tr = document.createElement('tr');
                let imageHtml = `<span style="font-size: 1.5rem;">${product.icon || '📦'}</span>`;
                if (product.image) {
                    imageHtml = `<img src="${product.image}" alt="${product.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">`;
                }

                tr.innerHTML = `
                    <td>${imageHtml}</td>
                    <td>${product.barcode}</td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td class="${product.stock === 0 ? 'stock-zero' : product.stock <= 5 ? 'stock-low' : ''}">${product.stock}</td>
                    <td>
                        <button onclick="editProduct(${product.id})" class="btn-icon">✏️</button>
                        <button onclick="deleteProduct(${product.id})" class="btn-icon">🗑️</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('❌ ERRO ao carregar produtos:', error);
            alert('ERRO ao carregar produtos: ' + error.message);
            const tbody = document.getElementById('products-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger);">Erro ao carregar produtos. Tente recarregar a página.</td></tr>';
            }
        });
}

function editProduct(productId) {
    // Populate the side form
    const token = localStorage.getItem('authToken');
    fetch(`/api/products/${productId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(product => {
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-barcode').value = product.barcode;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-stock').value = product.stock;

            if (product.image) {
                document.getElementById('image-preview').src = product.image;
                document.getElementById('image-preview-container').style.display = 'block';
            } else {
                document.getElementById('image-preview').src = '';
                document.getElementById('image-preview-container').style.display = 'none';
            }

            document.getElementById('product-form-title').innerHTML = '<i class="ph ph-pencil"></i> Editar Produto';
        })
        .catch(err => console.error('Error loading product for edit:', err));
}

function resetProductForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('image-preview').src = '';
    document.getElementById('image-preview-container').style.display = 'none';
    document.getElementById('product-form-title').innerHTML = '<i class="ph ph-plus-circle"></i> Novo Produto';
}


function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('image-preview').src = e.target.result;
            document.getElementById('image-preview-container').style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function saveProduct(e) {
    e.preventDefault();

    const token = localStorage.getItem('authToken');
    const productId = document.getElementById('product-id').value;

    const formData = new FormData();
    formData.append('barcode', document.getElementById('product-barcode').value);
    formData.append('name', document.getElementById('product-name').value);
    formData.append('category', document.getElementById('product-category').value);
    formData.append('price', document.getElementById('product-price').value);
    formData.append('stock', document.getElementById('product-stock').value);
    formData.append('icon', '📦');

    const imageFile = document.getElementById('product-image').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    const url = productId ? `/api/products/${productId}` : '/api/products';
    const method = productId ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`
            // Content-Type header must NOT be set when using FormData, browser sets it automatically with boundary
        },
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.id || data.message) {
                alert(productId ? '✓ Produto atualizado!' : '✓ Produto cadastrado!');
                resetProductForm(); // Clear form after save
                loadProducts();
                loadDashboard();
            } else {
                alert(data.error || 'Erro ao salvar produto');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao salvar produto');
        });
}

function editProduct(productId) {
    openProductModal(productId);
}

function deleteProduct(productId) {
    if (!confirm('Deseja realmente excluir este produto?')) return;

    const token = localStorage.getItem('authToken');
    fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert('✓ Produto excluído!');
                loadProducts();
                loadDashboard();
            } else {
                alert(data.error || 'Erro ao excluir produto');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao excluir produto');
        });
}

// ==================== CAIXA/PDV ====================
function scanProduct() {
    const barcode = document.getElementById('barcode-input').value.trim();
    if (!barcode) return;

    const token = localStorage.getItem('authToken');
    fetch(`/api/products/barcode/${barcode}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(product => {
            if (product.id) {
                // Update Left Panel Displays
                document.getElementById('pos-product-desc').textContent = product.name;
                document.getElementById('pos-unit-price').textContent = formatCurrency(product.price);
                document.getElementById('pos-qty-display').textContent = '1'; // Default to 1 for now

                const imgElement = document.getElementById('pos-product-image');
                const placeholder = document.getElementById('pos-image-placeholder');

                if (product.image) {
                    imgElement.src = product.image;
                    imgElement.style.display = 'block';
                    placeholder.style.display = 'none';
                } else {
                    imgElement.style.display = 'none';
                    placeholder.style.display = 'flex';
                }

                addToCart(product);
                document.getElementById('barcode-input').value = '';
            } else {
                alert('❌ Produto não encontrado!');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao buscar produto');
        });
}

function showAllProductsInSearch() {
    const dropdown = document.getElementById('search-results-dropdown');

    // Toggle dropdown if already open
    if (dropdown.style.display === 'block' && dropdown.innerHTML !== '') {
        dropdown.style.display = 'none';
        return;
    }

    if (allProducts.length === 0) {
        alert('Nenhum produto cadastrado para exibir.');
        return;
    }

    renderSearchResults(allProducts);
    dropdown.style.display = 'block';
}

function handleProductSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const dropdown = document.getElementById('search-results-dropdown');

    if (query.length < 2) {
        dropdown.style.display = 'none';
        return;
    }

    const results = allProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.barcode.includes(query)
    );

    renderSearchResults(results);
}

function renderSearchResults(results) {
    const dropdown = document.getElementById('search-results-dropdown');
    dropdown.innerHTML = '';

    if (results.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    results.forEach(product => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
                <span style="font-size: 1.2rem;">${product.icon || '📦'}</span>
                <div style="flex: 1;">
                    <span class="search-result-name">${product.name}</span>
                    <p style="font-size: 0.85rem; color: var(--text-secondary);">Cód: ${product.barcode}</p>
                </div>
            </div>
            <span class="search-result-price">${formatCurrency(product.price)}</span>
        `;
        div.onclick = () => selectSearchedProduct(product);
        dropdown.appendChild(div);
    });

    dropdown.style.display = 'block';
}

function selectSearchedProduct(product) {
    // Simulate scan behavior
    document.getElementById('pos-product-desc').textContent = product.name;
    document.getElementById('pos-unit-price').textContent = formatCurrency(product.price);
    document.getElementById('pos-qty-display').textContent = '1';

    const imgElement = document.getElementById('pos-product-image');
    const placeholder = document.getElementById('pos-image-placeholder');

    if (product.image) {
        imgElement.src = product.image;
        imgElement.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        imgElement.style.display = 'none';
        placeholder.style.display = 'flex';
    }

    addToCart(product);

    // Clear search
    document.getElementById('product-search-input').value = '';
    document.getElementById('search-results-dropdown').style.display = 'none';
}

function addToCart(product) {
    // Verificar estoque
    if (product.stock <= 0) {
        alert('❌ PRODUTO SEM ESTOQUE! Venda bloqueada.');
        return;
    }

    if (product.stock <= 5) {
        alert(`⚠️ ALERTA DE ESTOQUE BAIXO!\nRestam apenas ${product.stock} unidades.`);
    }

    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
            // Update details in case they changed (e.g. image added)
            existingItem.image = product.image;
            existingItem.price = product.price;
            existingItem.name = product.name;
            existingItem.icon = product.icon;
        } else {
            alert('⚠️ Estoque insuficiente!');
            return;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            icon: product.icon,
            image: product.image,
            quantity: 1,
            maxStock: product.stock
        });
    }


    updateCartDisplay();
}

function updateCartDisplay() {
    const tbody = document.getElementById('cart-items');
    const totalElement = document.getElementById('cart-total');
    const itemCountElement = document.getElementById('pos-item-count');

    if (!tbody) return;

    tbody.innerHTML = '';
    let total = 0;
    let itemCount = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        itemCount += item.quantity;

        const tr = document.createElement('tr');
        const imageHtml = item.image
            ? `<img src="${item.image}" alt="${item.name}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px;">`
            : `<span style="font-size: 1.2rem;">${item.icon || '📦'}</span>`;

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${imageHtml}</td>
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>UN</td>
            <td>
                <div class="qty-controls">
                    <button class="btn-qty" onclick="changeQty(${index}, -1)">-</button>
                    <input type="number" class="input-qty" value="${item.quantity}" min="1" onchange="updateQty(${index}, this.value)">
                    <button class="btn-qty" onclick="changeQty(${index}, 1)">+</button>
                </div>
            </td>
            <td>${formatCurrency(item.price)}</td>
            <td>${formatCurrency(itemTotal)}</td>
            <td>
                <button onclick="removeFromCart(${index})" class="btn-icon" style="color: #ef4444; background: none; border: none; cursor: pointer; font-size: 1.2rem;">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (totalElement) totalElement.textContent = formatCurrency(total);
    if (itemCountElement) itemCountElement.textContent = itemCount;

    // Recalculate change if paid amount is entered
    calculateChange();
}

function changeQty(index, delta) {
    if (!cart[index]) return;

    const newQty = cart[index].quantity + delta;
    if (newQty < 1) return; // Minimum 1

    // Check stock if available
    if (cart[index].maxStock && newQty > cart[index].maxStock) {
        alert(`⚠️ Estoque insuficiente! Máximo: ${cart[index].maxStock}`);
        return;
    }

    cart[index].quantity = newQty;
    updateCartDisplay();
}

function updateQty(index, value) {
    if (!cart[index]) return;

    let newQty = parseInt(value);
    if (isNaN(newQty) || newQty < 1) newQty = 1;

    // Check stock if available
    if (cart[index].maxStock && newQty > cart[index].maxStock) {
        alert(`⚠️ Estoque insuficiente! Máximo: ${cart[index].maxStock}`);
        newQty = cart[index].maxStock;
    }

    cart[index].quantity = newQty;
    updateCartDisplay();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

function clearCart() {
    if (cart.length === 0) return;
    if (!confirm('Deseja limpar o carrinho?')) return;

    cart = [];
    updateCartDisplay();
}

function selectPaymentMethod(method, event) {
    document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));

    // Se foi chamado pelo clique, usa o target, senão procura pelo método
    if (event) {
        event.currentTarget.classList.add('active');
    } else {
        const btn = document.querySelector(`.payment-btn[data-method="${method}"]`);
        if (btn) btn.classList.add('active');
    }

    document.getElementById('payment-method').value = method;

    // Lógica do PIX
    const pixArea = document.getElementById('pix-payment-area');
    if (method === 'pix') {
        pixArea.style.display = 'block';
        generatePixQr();
    } else {
        pixArea.style.display = 'none';
        if (pixTimerInterval) clearInterval(pixTimerInterval);
    }

    // Lógica Misto
    if (method === 'misto') {
        openSplitPaymentModal();
    }
}

// ==================== PAGAMENTO MISTO ====================
let splitPayments = [];

function openSplitPaymentModal() {
    if (cart.length === 0) {
        alert('⚠️ Carrinho vazio!');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('split-total-amount').textContent = formatCurrency(total);

    splitPayments = [];
    updateSplitPaymentDisplay();

    document.getElementById('split-payment-modal').style.display = 'flex';
    document.getElementById('split-payment-amount').focus();
}

function closeSplitPaymentModal() {
    document.getElementById('split-payment-modal').style.display = 'none';
}

function addSplitPayment() {
    const method = document.getElementById('split-payment-method').value;
    const amountInput = document.getElementById('split-payment-amount');
    const amount = parseFloat(amountInput.value);

    if (isNaN(amount) || amount <= 0) {
        alert('Valor inválido');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const currentPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = total - currentPaid;

    // Permitir adicionar mais que o restante apenas se for dinheiro (para troco)
    if (method !== 'dinheiro' && amount > remaining) {
        alert(`Valor excede o restante (${formatCurrency(remaining)})`);
        return;
    }

    splitPayments.push({ method, amount });
    amountInput.value = '';
    updateSplitPaymentDisplay();
}

function updateSplitPaymentDisplay() {
    const list = document.getElementById('split-payments-list');
    list.innerHTML = '';

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let paid = 0;

    splitPayments.forEach((p, index) => {
        paid += p.amount;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.method.toUpperCase()}</td>
            <td>${formatCurrency(p.amount)}</td>
            <td><button class="btn-icon" onclick="removeSplitPayment(${index})" style="color: var(--danger);">🗑️</button></td>
        `;
        list.appendChild(tr);
    });

    const remaining = total - paid;
    const remainingEl = document.getElementById('split-remaining-amount');
    const changeEl = document.getElementById('split-change-display');
    const finalizeBtn = document.getElementById('btn-finalize-split');

    if (remaining > 0) {
        remainingEl.textContent = formatCurrency(remaining);
        remainingEl.style.color = 'var(--danger)';
        changeEl.style.display = 'none';
        finalizeBtn.disabled = true;
    } else {
        remainingEl.textContent = 'R$ 0,00';
        remainingEl.style.color = 'var(--success)';
        finalizeBtn.disabled = false;

        if (remaining < 0) {
            changeEl.style.display = 'flex';
            document.getElementById('split-change-value').textContent = formatCurrency(Math.abs(remaining));
        } else {
            changeEl.style.display = 'none';
        }
    }
}

function removeSplitPayment(index) {
    splitPayments.splice(index, 1);
    updateSplitPaymentDisplay();
}

function finalizeSplitSale() {
    const finalizeBtn = document.getElementById('btn-finalize-split');
    finalizeBtn.textContent = 'Processando...';
    finalizeBtn.disabled = true;

    const token = localStorage.getItem('authToken');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const saleData = {
        items: cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price
        })),
        paymentMethod: 'misto',
        total: total,
        payments: splitPayments // Send split payments array
    };

    fetch('/api/sales', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(saleData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.id) {
                // Calculate total change if any
                const totalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
                const change = totalPaid - total;

                let msg = `✅ Venda Mista Finalizada!\nTotal: ${formatCurrency(total)}`;
                if (change > 0) {
                    msg += `\nTroco: ${formatCurrency(change)}`;
                }

                alert(msg);

                closeSplitPaymentModal();
                cart = [];
                updateCartDisplay();
                loadDashboard();
                loadProducts();

                // Reset to default payment method
                selectPaymentMethod('dinheiro');
            } else {
                alert('Erro: ' + (data.error || 'Falha ao finalizar'));
            }
        })
        .catch(err => {
            console.error(err);
            alert('Erro ao finalizar venda mista');
        })
        .finally(() => {
            finalizeBtn.textContent = 'Finalizar Venda';
            finalizeBtn.disabled = false;
        });
}

function generatePixQr() {
    const qrContainer = document.getElementById('pix-qr-container');

    let pixKey = '62819358000106'; // Default fallback
    if (window.storeConfig && window.storeConfig.storePixKey) {
        pixKey = window.storeConfig.storePixKey;
    }

    // Generate Valid PIX Payload with CRC16
    const total = parseFloat(document.getElementById('cart-total').textContent.replace('R$ ', '').replace('.', '').replace(',', '.'));
    const payload = generatePixPayload(pixKey, 'L-STORE', 'BRASILIA', total || 0);

    qrContainer.innerHTML = `
        <div style="background: white; padding: 10px; border-radius: 8px;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(payload)}" alt="QR Code PIX">
            <p style="margin-top: 10px; font-weight: bold; color: #333;">Chave: ${pixKey}</p>
        </div>
    `;

    startPixTimer();
}

function startPixTimer() {
    if (pixTimerInterval) clearInterval(pixTimerInterval);

    let seconds = 24000; // 400 minutos requested by user
    const timerDisplay = document.getElementById('pix-timer');

    pixTimerInterval = setInterval(() => {
        seconds--;
        const min = Math.floor(seconds / 60).toString().padStart(2, '0');
        const sec = (seconds % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `Atualiza em: ${min}:${sec}`;

        if (seconds <= 0) {
            generatePixQr(); // Regenera
        }
    }, 1000);
}

function finalizeSale() {
    if (cart.length === 0) {
        alert('⚠️ Carrinho vazio!');
        return;
    }

    const paymentMethod = document.getElementById('payment-method').value;
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Lógica de Troco para Dinheiro
    if (paymentMethod === 'dinheiro') {
        let paidAmount = parseFloat(document.getElementById('pos-paid-amount').value) || 0;

        // Se o valor pago for menor que o total, pedir o valor
        if (paidAmount < total) {
            const input = prompt(`Total: ${formatCurrency(total)}\n\nDigite o valor recebido:`);
            if (input === null) return; // Cancelado pelo usuário

            paidAmount = parseFloat(input.replace(',', '.'));
            if (isNaN(paidAmount) || paidAmount < total) {
                alert('❌ Valor inválido ou insuficiente!');
                return;
            }

            // Atualizar input e calcular troco
            document.getElementById('pos-paid-amount').value = paidAmount;
            calculateChange();
        }

        // Mostrar feedback e aguardar 3 segundos
        const change = paidAmount - total;
        const finalizeBtn = document.getElementById('finalize-sale');
        const originalText = finalizeBtn ? finalizeBtn.textContent : 'F7 Finalizar';

        if (finalizeBtn) {
            finalizeBtn.textContent = `Troco: ${formatCurrency(change)} - Finalizando em 3s...`;
            finalizeBtn.disabled = true;
            finalizeBtn.style.backgroundColor = 'var(--warning)';
        }

        // Delay de 3 segundos antes de processar
        setTimeout(() => {
            processSaleFinalization(originalText);
        }, 3000);

    } else {
        // Para outros métodos, finaliza direto (ou com pequeno delay visual se quiser)
        processSaleFinalization();
    }
}

function processSaleFinalization(originalBtnText = 'F7 Finalizar') {
    const finalizeBtn = document.getElementById('finalize-sale');
    if (finalizeBtn) {
        finalizeBtn.textContent = '⏳ Processando...';
        finalizeBtn.disabled = true;
        finalizeBtn.style.backgroundColor = ''; // Reset color
    }

    const paymentMethod = document.getElementById('payment-method').value;
    const token = localStorage.getItem('authToken');

    const saleData = {
        items: cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price
        })),
        paymentMethod: paymentMethod,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };

    fetch('/api/sales', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(saleData)
    })
        .then(response => {
            if (response.status === 403) {
                throw new Error('SESSION_EXPIRED');
            }
            return response.json();
        })
        .then(data => {
            if (data.id || data.orderId) {
                // Sucesso
                const totalFormatted = formatCurrency(data.total);

                // Se foi dinheiro, mostrar troco no alert também
                let msg = `✅ Venda finalizada!\nTotal: ${totalFormatted}`;
                if (paymentMethod === 'dinheiro') {
                    const paid = parseFloat(document.getElementById('pos-paid-amount').value) || 0;
                    const change = paid - data.total;
                    if (change > 0) {
                        msg += `\nTroco: ${formatCurrency(change)}`;
                    }
                }

                alert(msg);

                // Limpar tudo
                cart = [];
                updateCartDisplay();
                loadDashboard();
                loadProducts();

                // Limpar campos de pagamento
                document.getElementById('pos-paid-amount').value = '';
                document.getElementById('pos-change-value').textContent = 'R$ 0,00';

                // Resetar PIX se necessário
                if (paymentMethod === 'pix') {
                    selectPaymentMethod('dinheiro');
                }
            } else {
                alert(data.error || 'Erro ao finalizar venda');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            if (error.message === 'SESSION_EXPIRED') {
                alert('⚠️ Sessão expirada! Por favor, faça login novamente.');
                logout();
            } else {
                alert('Erro ao finalizar venda: ' + error.message);
            }
        })
        .finally(() => {
            if (finalizeBtn) {
                finalizeBtn.textContent = originalBtnText;
                finalizeBtn.disabled = false;
            }
        });
}

// ==================== VENDAS ====================
function loadSales() {
    const token = localStorage.getItem('authToken');

    fetch('/api/sales', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(sales => {
            const tbody = document.getElementById('sales-table-body');
            tbody.innerHTML = '';

            sales.forEach(sale => {
                const tr = document.createElement('tr');
                const date = new Date(sale.createdAt);

                let paymentDisplay = `${getPaymentMethodIcon(sale.paymentMethod)} ${sale.paymentMethod}`;

                // If split payments exist, format them
                if (sale.payments && sale.payments.length > 0) {
                    const details = sale.payments.map(p =>
                        `${getPaymentMethodIcon(p.method)} ${p.method.toUpperCase()}: ${formatCurrency(p.amount)}`
                    ).join('<br>');
                    paymentDisplay = `<div style="font-size: 0.85rem;">${details}</div>`;
                }

                tr.innerHTML = `
                    <td>#${sale.id}</td>
                    <td>${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}</td>
                    <td>${sale.items?.length || '?'} itens</td>
                    <td>${paymentDisplay}</td>
                    <td><strong>${formatCurrency(sale.total)}</strong></td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => console.error('Erro ao carregar vendas:', error));
}

function getPaymentMethodIcon(method) {
    const icons = {
        'dinheiro': '💵',
        'cartao': '💳',
        'pix': '📱',
        'misto': '⚖️'
    };
    return icons[method] || '💰';
}

// ==================== DEVEDORES ====================
function loadDebtors() {
    const token = localStorage.getItem('authToken');

    fetch('/api/debtors', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(debtors => {
            const tbody = document.getElementById('debtors-table-body');
            tbody.innerHTML = '';

            if (debtors.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">Nenhum devedor cadastrado</td></tr>';
                return;
            }

            debtors.forEach(debtor => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                <td>${debtor.name}<br><small>${debtor.email}</small></td>
                <td style="color: var(--danger); font-weight: bold;">${formatCurrency(debtor.debtAmount)}</td>
                <td>${debtor.cardInfo ? '**** ' + debtor.cardInfo.slice(-4) : 'Não cadastrado'}</td>
                <td><span class="status-badge active">Ativo</span></td>
                <td>
                    <button class="btn-sm btn-primary">Cobrar</button>
                </td>
            `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => console.error('Erro ao carregar devedores:', error));
}

// ==================== DASHBOARD & CAIXA ====================
function loadDashboard() {
    checkCashRegisterStatus();
    // Aqui poderíamos carregar outros widgets se necessário
}

function checkCashRegisterStatus() {
    const token = localStorage.getItem('authToken');
    fetch('/api/cash-register/status', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(data => {
            const statusCard = document.getElementById('cash-register-status-card');
            const statusText = document.getElementById('cash-register-status-text');
            const statusIcon = document.getElementById('cash-register-icon');
            const balanceEl = document.getElementById('cash-register-balance');

            if (data.status === 'open') {
                statusCard.style.borderColor = 'var(--success)';
                statusText.textContent = 'CAIXA ABERTO';
                statusText.style.color = 'var(--success)';
                statusIcon.style.color = 'var(--success)';
                statusIcon.innerHTML = '<i class="ph ph-lock-open"></i>';

                if (balanceEl) {
                    balanceEl.style.display = 'block';
                    balanceEl.textContent = `Início: ${formatCurrency(data.openingBalance)}`;
                }
            } else {
                statusCard.style.borderColor = 'var(--danger)';
                statusText.textContent = 'CAIXA FECHADO';
                statusText.style.color = 'var(--danger)';
                statusIcon.style.color = 'var(--danger)';
                statusIcon.innerHTML = '<i class="ph ph-lock-key"></i>';

                if (balanceEl) {
                    balanceEl.style.display = 'none';
                }
            }
        })
        .catch(err => console.error('Erro ao verificar status do caixa:', err));
}

function handleCashRegisterClick() {
    const statusText = document.getElementById('cash-register-status-text').textContent;
    if (statusText === 'CAIXA ABERTO') {
        if (confirm('Deseja fechar o caixa?')) {
            closeCashRegister();
        }
    } else {
        openCashRegister();
    }
}

function openCashRegister() {
    const input = prompt('Digite o valor de abertura do caixa (R$):', '0,00');
    if (input === null) return;

    const openingBalance = parseFloat(input.replace(',', '.'));
    if (isNaN(openingBalance) || openingBalance < 0) {
        alert('Valor inválido');
        return;
    }

    const token = localStorage.getItem('authToken');
    fetch('/api/cash-register/open', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ openingBalance })
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                alert('✅ Caixa aberto com sucesso!');
                checkCashRegisterStatus();
            }
        })
        .catch(err => {
            console.error(err);
            alert('Erro ao abrir caixa');
        });
}

function closeCashRegister() {
    const token = localStorage.getItem('authToken');
    fetch('/api/cash-register/close', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(`✅ Caixa fechado!\n\nTotal Vendas: ${formatCurrency(data.totalSales)}\nSaldo Final: ${formatCurrency(data.closingBalance)}`);
                checkCashRegisterStatus();
            }
        })
        .catch(err => {
            console.error(err);
            alert('Erro ao fechar caixa');
        });
}

// ==================== RELATÓRIOS ====================
function loadReports() {
    const token = localStorage.getItem('authToken');

    // Fetch sales data for reports
    fetch('/api/sales', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(sales => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            // Calculate today's sales
            const salesToday = sales.filter(sale => {
                const saleDate = new Date(sale.createdAt);
                saleDate.setHours(0, 0, 0, 0);
                return saleDate.getTime() === today.getTime();
            });

            const totalToday = salesToday.reduce((sum, sale) => sum + sale.total, 0);

            // Calculate this month's sales
            const salesThisMonth = sales.filter(sale => {
                const saleDate = new Date(sale.createdAt);
                return saleDate >= thisMonth;
            });

            const totalMonth = salesThisMonth.reduce((sum, sale) => sum + sale.total, 0);

            // Update UI
            const todayEl = document.getElementById('report-sales-today');
            const monthEl = document.getElementById('report-sales-month');

            if (todayEl) todayEl.textContent = formatCurrency(totalToday);
            if (monthEl) monthEl.textContent = formatCurrency(totalMonth);
        })
        .catch(error => console.error('Erro ao carregar relatórios:', error));
}

// ==================== FINANCEIRO ====================
function loadFinancial() {
    const token = localStorage.getItem('authToken');

    // Calculate income from sales
    fetch('/api/sales', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(sales => {
            const totalIncome = sales.reduce((sum, sale) => sum + sale.total, 0);

            const incomeEl = document.getElementById('fin-income');
            if (incomeEl) incomeEl.textContent = formatCurrency(totalIncome);
        });

    // Calculate expenses from boletos
    fetch('/api/boletos', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(boletos => {
            const totalExpenses = boletos
                .filter(b => b.status === 'pago')
                .reduce((sum, b) => sum + parseFloat(b.value), 0);

            const expensesEl = document.getElementById('fin-expenses');
            if (expensesEl) expensesEl.textContent = formatCurrency(totalExpenses);

            const balanceEl = document.getElementById('fin-balance');
            // Balance logic would need total income - total expenses
            // For now just showing income as balance placeholder or implement proper logic
            if (balanceEl) {
                // Fetch income again or pass it
                // Simplified:
                const incomeText = document.getElementById('fin-income').textContent;
                const income = parseFloat(incomeText.replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0;
                balanceEl.textContent = formatCurrency(income - totalExpenses);
            }
        });
}

// ==================== CASH REGISTER LOGIC ====================
let isCashRegisterOpen = false;

function checkCashRegisterStatus() {
    const token = localStorage.getItem('authToken');
    fetch('/api/cash-register/status', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(data => {
            const statusCard = document.getElementById('cash-register-status-card');
            const statusText = document.getElementById('cash-register-status-text');
            const statusIcon = document.getElementById('cash-register-icon');
            const balanceText = document.getElementById('cash-register-balance');

            if (data.status === 'open') {
                isCashRegisterOpen = true;
                statusCard.style.borderColor = 'var(--success)';
                statusIcon.style.color = 'var(--success)';
                statusIcon.innerHTML = '<i class="ph ph-lock-key-open"></i>';
                statusText.textContent = 'CAIXA ABERTO';
                statusText.style.color = 'var(--success)';

                balanceText.style.display = 'block';
                balanceText.textContent = `Inicial: ${formatCurrency(data.openingBalance)}`;
            } else {
                isCashRegisterOpen = false;
                statusCard.style.borderColor = 'var(--border-glass)';
                statusIcon.style.color = 'var(--text-secondary)';
                statusIcon.innerHTML = '<i class="ph ph-lock-key"></i>';
                statusText.textContent = 'CAIXA FECHADO';
                statusText.style.color = 'var(--text-secondary)';
                balanceText.style.display = 'none';
            }
        })
        .catch(err => console.error('Error checking cash register status:', err));
}

function handleCashRegisterClick() {
    if (isCashRegisterOpen) {
        // Show options: Go to POS or Close Register
        const action = confirm('O caixa está ABERTO.\n\nClique em OK para ir ao CAIXA.\nClique em CANCELAR para FECHAR O CAIXA.');
        if (action) {
            switchTab('caixa');
        } else {
            if (confirm('Tem certeza que deseja FECHAR o caixa?')) {
                closeCashRegister();
            }
        }
    } else {
        openCashRegisterModal();
    }
}

function closeCashRegister() {
    const token = localStorage.getItem('authToken');
    fetch('/api/cash-register/close', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert(`✅ Caixa fechado com sucesso!\n\nSaldo Inicial: ${formatCurrency(data.openingBalance)}\nVendas: ${formatCurrency(data.totalSales)}\nSaldo Final: ${formatCurrency(data.closingBalance)}`);
                checkCashRegisterStatus();
            } else {
                alert('❌ ' + (data.error || 'Erro ao fechar caixa'));
            }
        })
        .catch(err => {
            console.error('Erro:', err);
            alert('Erro ao fechar caixa');
        });
}

function openCashRegisterModal() {
    document.getElementById('cash-register-modal').style.display = 'flex';
    document.getElementById('cash-register-opening-balance').value = '';
    document.getElementById('cash-register-opening-balance').focus();
}

function closeCashRegisterModal() {
    document.getElementById('cash-register-modal').style.display = 'none';
}

document.getElementById('cash-register-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const openingBalance = parseFloat(document.getElementById('cash-register-opening-balance').value);

    if (isNaN(openingBalance) || openingBalance < 0) {
        alert('Por favor, insira um valor válido.');
        return;
    }

    const token = localStorage.getItem('authToken');
    fetch('/api/cash-register/open', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ openingBalance })
    })
        .then(response => response.json())
        .then(data => {
            if (data.id) {
                alert('✅ Caixa aberto com sucesso!');
                closeCashRegisterModal();
                checkCashRegisterStatus();
                switchTab('caixa');
            } else {
                alert('❌ ' + (data.error || 'Erro ao abrir caixa'));
            }
        })
        .catch(err => {
            console.error('Erro:', err);
            alert('Erro ao abrir caixa');
        });
});



// ==================== CONTABILIDADE ====================
function loadAccounting() {
    const token = localStorage.getItem('authToken');
    const tbody = document.getElementById('accounting-table-body');
    if (!tbody) return;

    // Fetch all transactions (sales and boletos)
    Promise.all([
        fetch('/api/sales', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/boletos', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
    ])
        .then(([sales, boletos]) => {
            const transactions = [];

            // Add sales as income
            sales.forEach(sale => {
                transactions.push({
                    date: new Date(sale.createdAt),
                    description: `Venda #${sale.id}`,
                    type: 'Receita',
                    value: sale.total
                });
            });

            // Add paid boletos as expenses
            boletos.filter(b => b.status === 'pago').forEach(boleto => {
                transactions.push({
                    date: new Date(boleto.createdAt || boleto.dueDate),
                    description: boleto.description,
                    type: 'Despesa',
                    value: parseFloat(boleto.value)
                });
            });

            // Sort by date (newest first)
            transactions.sort((a, b) => b.date - a.date);

            tbody.innerHTML = '';

            if (transactions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">Nenhuma transação registrada</td></tr>';
                return;
            }

            transactions.forEach(trans => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${trans.date.toLocaleDateString('pt-BR')}</td>
                    <td>${trans.description}</td>
                    <td><span class="status-badge ${trans.type === 'Receita' ? 'active' : 'inactive'}">${trans.type}</span></td>
                    <td style="color: ${trans.type === 'Receita' ? 'var(--success)' : 'var(--danger)'}; font-weight: bold;">
                        ${trans.type === 'Receita' ? '+' : '-'} ${formatCurrency(trans.value)}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => console.error('Erro ao carregar contabilidade:', error));
}

// ==================== ASSINATURA ====================
function loadSubscription() {
    const userData = localStorage.getItem('userData');
    if (!userData) return;

    const user = JSON.parse(userData);

    const statusEl = document.getElementById('sub-status');
    const expiresEl = document.getElementById('sub-expires');

    if (statusEl) {
        const statusMap = {
            'active': 'Ativo ✓',
            'pending': 'Pendente',
            'verification': 'Em Análise',
            'expired': 'Expirado'
        };
        statusEl.textContent = statusMap[user.subscriptionStatus] || 'Desconhecido';
        statusEl.style.color = user.subscriptionStatus === 'active' ? 'var(--success)' : 'var(--warning)';
    }

    if (expiresEl) {
        if (user.subscriptionExpiresAt) {
            const expiryDate = new Date(user.subscriptionExpiresAt);
            expiresEl.textContent = `Expira em: ${expiryDate.toLocaleDateString('pt-BR')}`;
        } else {
            expiresEl.textContent = 'Data de expiração não definida';
        }
    }
}

function renewSubscription() {
    alert('🔄 Funcionalidade de renovação em desenvolvimento.\n\nEm breve você poderá renovar sua assinatura via PIX.');
}




// ==================== PWA ====================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('btn-install-pwa').style.display = 'flex';
});

window.installPWA = function () {
    if (!deferredPrompt) {
        alert('📱 Para instalar no iOS, toque em "Compartilhar" e depois em "Adicionar à Tela de Início"');
        return;
    }

    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('PWA instalado');
        }
        deferredPrompt = null;
    });
};

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registrado'))
        .catch(err => console.log('Erro ao registrar Service Worker:', err));
}

// ==================== AUTHENTICATION & NAVIGATION ====================

window.showLogin = function () {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm && registerForm) {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
};

window.showRegister = function () {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm && registerForm) {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
};

window.maskCPF = function (input) {
    let value = input.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    input.value = value;
};

window.login = function (e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user));

                currentUser = data.user; // Update global variable

                // Lógica de redirecionamento
                const user = data.user;
                const authScreen = document.getElementById('auth-screen');
                const appScreen = document.getElementById('app-screen');
                const adminTab = document.getElementById('admin-nav-tab');

                if (user.isAdmin) {
                    // Admin
                    if (authScreen) authScreen.style.display = 'none';
                    if (appScreen) appScreen.style.display = 'block';
                    if (adminTab) adminTab.style.display = 'block';
                    loadDashboard();
                    loadProducts();
                    loadSales();
                    loadAdminUsers();
                } else {
                    // Usuário regular
                    if (authScreen) authScreen.style.display = 'none';
                    if (appScreen) appScreen.style.display = 'block';
                    if (adminTab) adminTab.style.display = 'none';
                    loadDashboard();
                    loadProducts();
                    loadSales();
                }

                // Atualizar nome do usuário
                const headerUsername = document.getElementById('header-username');
                if (headerUsername) headerUsername.textContent = user.username;

            } else {
                alert(data.error || 'Erro ao fazer login');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao fazer login');
        });
};

window.register = function (e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const cpf = document.getElementById('register-cpf').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const pin = document.getElementById('register-pin').value;

    if (!username || !email || !password || !cpf || !pin) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    if (pin.length !== 4) {
        alert('O PIN deve ter exatamente 4 dígitos.');
        return;
    }

    fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, cpf, pin })
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert('✓ Conta criada! Faça login para continuar.');
                window.showLogin();
                document.getElementById('login-email').value = email;
            } else {
                alert(data.error || 'Erro ao criar conta');
            }
        })
        .catch(error => {
            alert('Erro ao criar conta');
        });
};

// ==================== BOLETOS ====================
let currentBoletoId = null;

// Carregar boletos
function loadBoletos() {
    console.log('DEBUG: loadBoletos called');
    const token = localStorage.getItem('authToken');
    const tbody = document.getElementById('boletos-table-body');
    if (!tbody) return;

    fetch('/api/boletos', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(boletos => {
            tbody.innerHTML = '';

            if (boletos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">Nenhum boleto cadastrado</td></tr>';
                return;
            }

            boletos.forEach(boleto => {
                const tr = document.createElement('tr');
                const dueDate = new Date(boleto.dueDate);
                const today = new Date();
                const diffTime = dueDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let statusBadge = '';
                let diasRestantes = '';

                if (boleto.status === 'pago') {
                    statusBadge = '<span class="status-badge active">✓ Pago</span>';
                    diasRestantes = '-';
                } else if (diffDays < 0) {
                    statusBadge = '<span class="status-badge inactive">✗ Vencido</span>';
                    diasRestantes = `<span style="color: var(--accent-red);">${Math.abs(diffDays)} dias atrás</span>`;
                } else if (diffDays <= 7) {
                    statusBadge = '<span class="status-badge warning">⚠ Vencendo</span>';
                    diasRestantes = `<span style="color: var(--accent-orange);">${diffDays} dias</span>`;
                } else {
                    statusBadge = '<span class="status-badge">⏳ Pendente</span>';
                    diasRestantes = `${diffDays} dias`;
                }

                tr.innerHTML = `
                    <td>${boleto.description}</td>
                    <td>R$ ${parseFloat(boleto.value).toFixed(2)}</td>
                    <td>${dueDate.toLocaleDateString('pt-BR')}</td>
                    <td>${statusBadge}</td>
                    <td>${diasRestantes}</td>
                    <td>
                        ${boleto.status !== 'pago' ? `<button onclick="markBoletoAsPaid(${boleto.id})" class="btn-sm btn-success" title="Marcar como Pago">✓ Pagar</button>` : ''}
                        <button onclick="editBoleto(${boleto.id})" class="btn-sm btn-secondary" title="Editar">✎</button>
                        <button onclick="deleteBoleto(${boleto.id})" class="btn-sm btn-danger" title="Excluir">✗</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Atualizar alerta no dashboard
            checkBoletosVencendo(boletos);
        })
        .catch(err => console.error('Erro ao carregar boletos:', err));
}

// Verificar boletos vencendo
function checkBoletosVencendo(boletos) {
    const today = new Date();
    const boletosVencendo = boletos.filter(b => {
        if (b.status === 'pago') return false;
        const dueDate = new Date(b.dueDate);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
    });

    const alertDiv = document.getElementById('boletos-alert');
    const countSpan = document.getElementById('boletos-vencendo-count');

    if (boletosVencendo.length > 0 && alertDiv && countSpan) {
        alertDiv.style.display = 'flex';
        countSpan.textContent = boletosVencendo.length;
    } else if (alertDiv) {
        alertDiv.style.display = 'none';
    }
}

// Abrir modal de boleto
function openBoletoModal() {
    currentBoletoId = null;
    document.getElementById('boleto-modal-title').textContent = 'Novo Boleto';
    document.getElementById('boleto-form').reset();
    document.getElementById('boleto-id').value = '';
    document.getElementById('boleto-modal').style.display = 'flex';
}

// Fechar modal de boleto
function closeBoletoModal() {
    document.getElementById('boleto-modal').style.display = 'none';
    currentBoletoId = null;
}

// Salvar boleto
document.getElementById('boleto-form')?.addEventListener('submit', function (e) {
    e.preventDefault();

    const token = localStorage.getItem('authToken');
    const boletoId = document.getElementById('boleto-id').value;
    const boleto = {
        description: document.getElementById('boleto-description').value,
        value: parseFloat(document.getElementById('boleto-value').value),
        dueDate: document.getElementById('boleto-duedate').value,
        status: document.getElementById('boleto-status').value
    };

    const url = boletoId ? `/api/boletos/${boletoId}` : '/api/boletos';
    const method = boletoId ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(boleto)
    })
        .then(response => response.json())
        .then(data => {
            if (data.message || data.id) {
                alert(boletoId ? '✓ Boleto atualizado!' : '✓ Boleto cadastrado!');
                closeBoletoModal();
                loadBoletos();
                loadDashboard(); // Atualizar alertas
            } else {
                alert(data.error || 'Erro ao salvar boleto');
            }
        })
        .catch(err => {
            console.error('Erro:', err);
            alert('Erro ao salvar boleto');
        });
});

// Editar boleto
function editBoleto(id) {
    const token = localStorage.getItem('authToken');

    fetch(`/api/boletos/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(boleto => {
            currentBoletoId = id;
            document.getElementById('boleto-modal-title').textContent = 'Editar Boleto';
            document.getElementById('boleto-id').value = id;
            document.getElementById('boleto-description').value = boleto.description;
            document.getElementById('boleto-value').value = boleto.value;
            document.getElementById('boleto-duedate').value = boleto.dueDate.split('T')[0];
            document.getElementById('boleto-status').value = boleto.status;
            document.getElementById('boleto-modal').style.display = 'flex';
        })
        .catch(err => console.error('Erro:', err));
}

// Marcar boleto como pago
function markBoletoAsPaid(id) {
    if (!confirm('Marcar este boleto como pago?')) return;

    const token = localStorage.getItem('authToken');

    fetch(`/api/boletos/${id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'pago' })
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert('✓ Boleto marcado como pago!');
                loadBoletos();
                loadDashboard();
            }
        })
        .catch(err => console.error('Erro:', err));
}

// Excluir boleto
function deleteBoleto(id) {
    if (!confirm('Tem certeza que deseja excluir este boleto?')) return;

    const token = localStorage.getItem('authToken');

    fetch(`/api/boletos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert('✓ Boleto excluído!');
                loadBoletos();
                loadDashboard();
            }
        })
        .catch(err => console.error('Erro:', err));
}

// Event listener para botão de adicionar boleto
document.getElementById('add-boleto-btn')?.addEventListener('click', openBoletoModal);



// ==================== CONTROLE DE ESTOQUE ====================
// Carregar resumo de estoque
function loadStockSummary() {
    const token = localStorage.getItem('authToken');

    fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(products => {
            const totalItems = products.reduce((sum, p) => sum + p.stock, 0);
            const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length;
            const zeroStock = products.filter(p => p.stock === 0).length;

            const totalEl = document.getElementById('total-stock-items');
            const lowEl = document.getElementById('low-stock-count');
            const zeroEl = document.getElementById('zero-stock-count');

            if (totalEl) totalEl.textContent = totalItems;
            if (lowEl) lowEl.textContent = lowStock;
            if (zeroEl) zeroEl.textContent = zeroStock;
        })
        .catch(err => console.error('Erro ao carregar resumo de estoque:', err));
}

// Carregar movimentações de estoque
function loadStockMovements() {
    const token = localStorage.getItem('authToken');
    const tbody = document.getElementById('stock-movements-table-body');
    if (!tbody) return;

    fetch('/api/stock-movements', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(movements => {
            tbody.innerHTML = '';

            if (movements.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Nenhuma movimentação registrada</td></tr>';
                return;
            }

            movements.forEach(mov => {
                const tr = document.createElement('tr');
                const date = new Date(mov.createdAt);

                let typeBadge = '';
                if (mov.type === 'entrada') {
                    typeBadge = '<span class="status-badge active">➕ Entrada</span>';
                } else if (mov.type === 'saida') {
                    typeBadge = '<span class="status-badge inactive">➖ Saída</span>';
                } else {
                    typeBadge = '<span class="status-badge warning">🔧 Ajuste</span>';
                }

                tr.innerHTML = `
                    <td>${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${mov.productName}</td>
                    <td>${typeBadge}</td>
                    <td><strong>${mov.quantity}</strong></td>
                    <td>${mov.previousStock}</td>
                    <td><strong>${mov.newStock}</strong></td>
                    <td>${mov.reason}</td>
                `;
                tbody.appendChild(tr);
            });

            loadStockSummary();
        })
        .catch(err => console.error('Erro ao carregar movimentações:', err));
}

// Abrir modal de movimentação
function openStockMovementModal() {
    const token = localStorage.getItem('authToken');

    // Carregar produtos no select
    fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(products => {
            const select = document.getElementById('stock-product-id');
            if (!select) return;

            select.innerHTML = '<option value="">Selecione um produto...</option>';

            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (Estoque atual: ${product.stock})`;
                option.dataset.currentStock = product.stock;
                select.appendChild(option);
            });
        });

    const form = document.getElementById('stock-movement-form');
    if (form) form.reset();

    const modal = document.getElementById('stock-movement-modal');
    if (modal) modal.style.display = 'flex';
}

// Fechar modal de movimentação
function closeStockMovementModal() {
    const modal = document.getElementById('stock-movement-modal');
    if (modal) modal.style.display = 'none';
}

// Salvar movimentação de estoque
document.getElementById('stock-movement-form')?.addEventListener('submit', function (e) {
    e.preventDefault();

    const token = localStorage.getItem('authToken');
    const productId = document.getElementById('stock-product-id').value;
    const type = document.getElementById('stock-movement-type').value;
    const quantity = parseInt(document.getElementById('stock-quantity').value);
    const reason = document.getElementById('stock-reason').value;

    if (!productId) {
        alert('Selecione um produto');
        return;
    }

    const movement = {
        productId: parseInt(productId),
        type: type,
        quantity: quantity,
        reason: reason
    };

    fetch('/api/stock-movements', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(movement)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Movimentação registrada com sucesso!');
                closeStockMovementModal();
                loadStockMovements();
                loadStockSummary();
                loadProducts(); // Atualiza lista de produtos
            } else {
                alert('Erro ao registrar movimentação: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao registrar movimentação');
        });
});

// Carregar movimentações de estoque
function loadStockMovements() {
    const token = localStorage.getItem('authToken');
    const searchTerm = document.getElementById('stock-search')?.value.toLowerCase() || '';

    fetch('/api/stock-movements', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(movements => {
            const tbody = document.getElementById('stock-movements-table-body');
            if (!tbody) return;
            tbody.innerHTML = '';

            const filteredMovements = movements.filter(m =>
                m.product_name.toLowerCase().includes(searchTerm)
            );

            filteredMovements.forEach(movement => {
                const row = document.createElement('tr');
                row.innerHTML = `
                <td>${new Date(movement.created_at).toLocaleString()}</td>
                <td>${movement.product_name}</td>
                <td>
                    <span class="badge ${movement.type === 'entrada' ? 'success' : (movement.type === 'saida' ? 'danger' : 'warning')}">
                        ${movement.type === 'entrada' ? 'Entrada' : (movement.type === 'saida' ? 'Saída' : 'Ajuste')}
                    </span>
                </td>
                <td>${movement.quantity}</td>
                <td>${movement.previous_stock}</td>
                <td>${movement.new_stock}</td>
                <td>${movement.reason}</td>
                <td>
                    <button class="btn-icon danger" onclick="deleteStockMovement(${movement.id})" title="Excluir">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            `;
                tbody.appendChild(row);
            });
        })
        .catch(error => console.error('Erro ao carregar movimentações:', error));
}

// Excluir movimentação de estoque
function deleteStockMovement(id) {
    if (!confirm('Tem certeza que deseja excluir esta movimentação? O estoque será revertido.')) return;

    const token = localStorage.getItem('authToken');
    fetch(`/api/stock-movements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert('Movimentação excluída com sucesso!');
                loadStockMovements();
                loadStockSummary();
                loadProducts();
            } else {
                alert('Erro ao excluir: ' + (data.error || 'Erro desconhecido'));
            }
        })
        .catch(error => console.error('Erro:', error));
}

// Event listener para busca de estoque
document.getElementById('stock-search')?.addEventListener('input', () => {
    loadStockMovements();
});

// Carregar resumo de estoque
function loadStockSummary() {
    const token = localStorage.getItem('authToken');
    fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(products => {
            const totalItems = products.reduce((acc, p) => acc + p.stock, 0);
            const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length;
            const outOfStock = products.filter(p => p.stock === 0).length;

            const totalEl = document.getElementById('total-stock-items');
            const lowEl = document.getElementById('low-stock-products');
            const outEl = document.getElementById('out-of-stock-products');

            if (totalEl) totalEl.textContent = totalItems;
            if (lowEl) lowEl.textContent = lowStock;
            if (outEl) outEl.textContent = outOfStock;
        })
        .catch(error => console.error('Erro ao carregar resumo de estoque:', error));
}
// Event listener para botão de nova movimentação
document.getElementById('add-stock-movement-btn')?.addEventListener('click', openStockMovementModal);

// ==================== UTILS ====================
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ==================== LOJA / CONFIGURAÇÕES ====================
function loadStoreConfig() {
    const pixKey = localStorage.getItem('storePixKey');
    const input = document.getElementById('store-pix-key');
    if (input && pixKey) {
        input.value = pixKey;
    }
}

function saveStoreConfig() {
    const input = document.getElementById('store-pix-key');
    if (input) {
        localStorage.setItem('storePixKey', input.value);
        alert('✅ Configurações salvas com sucesso!');
    }
}
// ==================== EVENT LISTENERS ====================
// ==================== INITIALIZATION ====================
function initApp() {
    console.log('🚀 Inicializando app...');

    // 1. Auto-Login & Initial Data
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');

    if (token && userData) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';

        loadDashboard();
        loadProducts();
        loadSales();
        checkCashRegisterStatus();
    }

    // 2. System Info & Status
    loadVersion();
    checkServerStatus();
    setInterval(checkServerStatus, 30000);

    // 3. Clock
    updateClock();
    setInterval(updateClock, 1000);

    // Navegação entre tabs
    document.querySelectorAll('.nav-item').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Produtos
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => openProductModal(null));
    }

    // Barcode Input Enter Key
    const barcodeInput = document.getElementById('barcode-input');
    if (barcodeInput) {
        barcodeInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                scanProduct();
            }
        });
    }

    // Product Search Input
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleProductSearch);
    }

    // Client Store Search Input
    const storeSearchInput = document.getElementById('store-search-input');
    if (storeSearchInput) {
        storeSearchInput.addEventListener('input', handleStoreSearch);
    }

    // Payment Method Buttons
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const method = btn.dataset.method;
            selectPaymentMethod(method, e);
        });
    });

    // Finalize Sale Button
    const finalizeBtn = document.getElementById('finalize-sale');
    console.log('🔍 Botão Finalizar encontrado?', finalizeBtn ? 'SIM' : 'NÃO');
    if (finalizeBtn) {
        finalizeBtn.addEventListener('click', finalizeSale);
        console.log('✅ Event listener adicionado ao botão Finalizar');
    }

    // Clear Cart Button
    const clearBtn = document.getElementById('clear-cart');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCart);
    }

    // Product Form Submit
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', saveProduct);
    }

    // Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F2') { e.preventDefault(); document.getElementById('barcode-input')?.focus(); }
        if (e.key === 'F7') { e.preventDefault(); finalizeSale(); }
        if (e.key === 'F6') { e.preventDefault(); /* Cancel Item Logic */ }
        if (e.key === 'F11') { e.preventDefault(); clearCart(); }
    });
}

// ==================== PIX HELPER FUNCTIONS ====================
function generateCRC16(payload) {
    const polynomial = 0x1021;
    let crc = 0xFFFF;

    for (let i = 0; i < payload.length; i++) {
        crc ^= (payload.charCodeAt(i) << 8);
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc = (crc << 1);
            }
        }
    }

    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function generatePixPayload(key, name, city, amount, txId = '***') {
    const formatField = (id, value) => {
        const len = value.length.toString().padStart(2, '0');
        return `${id}${len}${value}`;
    };

    const merchantAccount = formatField('00', 'BR.GOV.BCB.PIX') + formatField('01', key);
    const merchantCategory = '0000'; // Not strictly required for static
    const transactionCurrency = '986'; // BRL
    const countryCode = 'BR';
    const merchantName = name.substring(0, 25);
    const merchantCity = city.substring(0, 15);

    let payload =
        '000201' +
        formatField('26', merchantAccount) +
        formatField('52', merchantCategory) +
        formatField('53', transactionCurrency);

    if (amount) {
        payload += formatField('54', amount.toFixed(2));
    }

    payload +=
        formatField('58', countryCode) +
        formatField('59', merchantName) +
        formatField('60', merchantCity) +
        formatField('62', formatField('05', txId)) +
        '6304';

    const crc = generateCRC16(payload);
    return payload + crc;
}

// ==================== STORE CONFIG ====================
function saveStoreConfig() {
    const token = localStorage.getItem('authToken');
    const storePixKey = document.getElementById('store-pix-key').value;

    if (!storePixKey) {
        alert('Por favor, informe a chave PIX.');
        return;
    }

    fetch('/api/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ storePixKey })
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert('✅ ' + data.message);
                // Update global config if needed
                if (!window.storeConfig) window.storeConfig = {};
                window.storeConfig.storePixKey = storePixKey;
            } else {
                alert('❌ ' + (data.error || 'Erro ao salvar configuração'));
            }
        })
        .catch(err => {
            console.error('Erro:', err);
            alert('Erro ao salvar configuração');
        });
}

function loadStoreConfig() {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    fetch('/api/config', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(config => {
            if (config.storePixKey) {
                const input = document.getElementById('store-pix-key');
                if (input) input.value = config.storePixKey;

                // Store globally for easy access
                window.storeConfig = config;
            }
        })
        .catch(err => console.error('Erro ao carregar configurações:', err));
}

// Call loadStoreConfig on startup
document.addEventListener('DOMContentLoaded', () => {
    loadStoreConfig();
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
