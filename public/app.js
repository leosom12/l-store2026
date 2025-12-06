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

// ==================== AUTHENTICATION FUNCTIONS ====================
function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function login(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
        .then(res => res.json())
        .then(data => {
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user));
                currentUser = data.user;

                document.getElementById('auth-screen').style.display = 'none';
                document.getElementById('app-screen').style.display = 'flex';

                updateClock();
                setInterval(updateClock, 1000);
                checkServerStatus();
                switchTab('dashboard');

                const userInfo = document.getElementById('user-info');
                if (userInfo) userInfo.textContent = `Olá, ${data.user.username}`;

                if (typeof startOnlineOrdersPolling === 'function') {
                    startOnlineOrdersPolling();
                }
            } else {
                alert('Erro no login: ' + (data.error || 'Credenciais inválidas'));
            }
        })
        .catch(err => {
            console.error('Login error:', err);
            alert('Erro de conexão ao tentar fazer login.');
        });
}

function register(event) {
    event.preventDefault();
    const username = document.getElementById('register-username').value;
    const pin = document.getElementById('register-pin').value;
    const cpf = document.getElementById('register-cpf').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin, cpf, email, password })
    })
        .then(res => res.json())
        .then(data => {
            if (data.token) {
                alert('Cadastro realizado com sucesso!');
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user));
                currentUser = data.user;

                document.getElementById('auth-screen').style.display = 'none';
                document.getElementById('app-screen').style.display = 'flex';

                updateClock();
                setInterval(updateClock, 1000);
                checkServerStatus();
                switchTab('dashboard');

                const userInfo = document.getElementById('user-info');
                if (userInfo) userInfo.textContent = `Olá, ${data.user.username}`;
            } else {
                alert('Erro no cadastro: ' + (data.error || 'Erro desconhecido'));
            }
        })
        .catch(err => {
            console.error('Register error:', err);
            alert('Erro de conexão ao tentar cadastrar.');
        });
}

// ==================== VARIÁVEIS GLOBAIS ====================
let cart = [];
let allProducts = [];
let currentTab = 'dashboard';
let pixTimerInterval = null;
let currentUser = null;

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
    // Somente se houver itens no carrinho e mÃ©todo de pagamento for dinheiro
    const paymentMethod = document.getElementById('payment-method').value;

    if (paid >= total && total > 0 && cart.length > 0 && paymentMethod === 'dinheiro') {
        // Pequeno delay para evitar mÃºltiplas chamadas
        clearTimeout(window.autoFinalizeTimeout);
        window.autoFinalizeTimeout = setTimeout(() => {
            finalizeSale();
        }, 500);
    }
}

// ==================== VERIFICAÃ‡ÃƒO DE SERVIDOR ====================
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

// ==================== NAVEGAÃ‡ÃƒO ====================
// ==================== NAVEGAÃ‡ÃƒO ====================
function switchTab(tabName) {
    currentTab = tabName;

    // Esconder todas as tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remover active de todos os botÃµes de navegaÃ§Ã£o
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active-green');
    });

    // Mostrar tab selecionada
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Adicionar active no botÃ£o selecionado
    const selectedBtn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active-green');
    }

    // Atualizar TÃ­tulo da PÃ¡gina
    const titles = {
        'dashboard': 'VisÃ£o Geral',
        'caixa': 'Frente de Caixa',
        'products': 'Gerenciar Produtos',
        'sales': 'HistÃ³rico de Vendas',
        'reports': 'RelatÃ³rios',
        'financial': 'Financeiro',
        'boletos': 'Boletos',
        'debtors': 'Devedores',
        'store': 'ConfiguraÃ§Ã£o da Loja',
        'subscription': 'Assinatura',
        'accounting': 'Contabilidade',
        'estoque': 'Controle de Estoque'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titles[tabName] || 'L-STORE';

    // Carregar dados especÃ­ficos da tab
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
                        <button onclick="openDebtorModal(${debtor.id})" class="btn-icon">âœï¸</button>
                        <button onclick="openPayDebtModal(${debtor.id}, '${debtor.name}', ${debtor.debtAmount})" class="btn-icon" title="Pagar DÃ­vida">ðŸ’°</button>
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
        // Por simplificaÃ§Ã£o, vamos buscar da lista jÃ¡ carregada se possÃ­vel ou fazer fetch
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
        alert('Este cliente nÃ£o possui dÃ­vidas.');
        return;
    }
    document.getElementById('pay-debt-id').value = id;
    document.getElementById('pay-debt-customer-name').textContent = `${name} - DÃ­vida: ${formatCurrency(currentDebt)}`;
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
        .catch(err => console.error('Erro ao pagar dÃ­vida:', err));
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
    const name = document.getElementById('client-login-name').value.trim();
    const pin = document.getElementById('client-login-pin').value.trim();

    if (!name || !pin) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    fetch('/api/client/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin })
    })
        .then(response => response.json())
        .then(data => {
            if (data.token) {
                // Login success
                const clientData = {
                    id: data.client.id,
                    username: data.client.name,
                    role: 'client',
                    storeName: data.storeName,
                    lpBalance: data.client.lpBalance || 0
                };

                localStorage.setItem('clientToken', data.token);
                localStorage.setItem('clientData', JSON.stringify(clientData));

                // Initialize client cart if not exists
                if (!localStorage.getItem('clientCart')) {
                    localStorage.setItem('clientCart', JSON.stringify([]));
                }

                // Redirect to client store
                showClientStore();
            } else {
                alert('âŒ ' + (data.error || 'Erro ao fazer login'));
            }
        })
        .catch(err => {
            console.error('Erro no login:', err);
            alert('âŒ Erro de conexÃ£o com o servidor');
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

    // Update Store Name
    const clientData = JSON.parse(localStorage.getItem('clientData') || '{}');
    if (clientData.storeName) {
        const titleEl = document.getElementById('store-header-title');
        if (titleEl) titleEl.innerHTML = `<i class="ph ph-storefront"></i> ${clientData.storeName}`;
    }

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
            updatePromoBanner(); // Update banner with promos
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
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999; padding: 2rem;">Nenhum produto disponÃ­vel</p>';
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
        const isPromo = product.isPromotion === 1 && product.promotionPrice;

        card.innerHTML = `
            ${product.image ?
                `<img src="${product.image}" alt="${product.name}" class="product-image">` :
                `<div class="product-image" style="display: flex; align-items: center; justify-content: center; font-size: 3rem;">${product.icon || 'ðŸ“¦'}</div>`
            }
            ${product.loyalty_points > 0 ? `<div style="position: absolute; top: 10px; right: 10px; background: var(--accent-orange); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><i class="ph ph-star"></i> +${product.loyalty_points} LP</div>` : ''}
            ${isPromo ? `<div style="position: absolute; top: 10px; left: 10px; background: var(--accent-pink); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><i class="ph ph-tag"></i> PROMO</div>` : ''}
            <div class="store-badge">L-Store</div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price-row" style="flex-direction: column; align-items: flex-start;">
                    ${isPromo ?
                `<div style="display: flex; align-items: center; gap: 8px;">
                            <div class="product-price" style="color: var(--accent-pink);">R$ ${parseFloat(product.promotionPrice).toFixed(2)}</div>
                            <div class="product-old-price" style="text-decoration: line-through; color: #888; font-size: 0.9rem;">R$ ${parseFloat(product.price).toFixed(2)}</div>
                         </div>`
                : `<div class="product-price">R$ ${parseFloat(product.price).toFixed(2)}</div>`
            }
                    <span class="owner-name" style="margin-left: 0;">${product.ownerName || 'Loja'}</span>
                </div>
                <div class="product-actions">
                    <span class="product-stock">${isOutOfStock ? 'Esgotado' : `${product.stock} disponÃ­veis`}</span>
                    <button class="btn-add-cart" onclick="addToClientCart(${product.id})" ${isOutOfStock ? 'disabled' : ''}>
                        <i class="ph ph-shopping-cart-simple"></i> Adicionar
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

function updatePromoBanner() {
    const bannerList = document.getElementById('promo-products-list');
    const bannerSubtitle = document.getElementById('banner-subtitle');
    if (!bannerList) return;

    bannerList.innerHTML = '';

    if (!storeProducts) return;

    const promoProducts = storeProducts.filter(p => p.isPromotion === 1);

    if (promoProducts.length > 0) {
        bannerSubtitle.textContent = 'Aproveite nossas ofertas exclusivas!';

        promoProducts.forEach(product => {
            const item = document.createElement('div');
            item.className = 'promo-banner-item';
            item.style.cssText = 'min-width: 120px; background: rgba(255,255,255,0.1); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.2s;';
            item.onmouseover = () => item.style.transform = 'scale(1.05)';
            item.onmouseout = () => item.style.transform = 'scale(1)';
            item.onclick = () => openProductDetails(product);

            item.innerHTML = `
                ${product.image ?
                    `<img src="${product.image}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-bottom: 5px;">` :
                    `<div style="font-size: 2rem; margin-bottom: 5px;">${product.icon || 'ðŸ“¦'}</div>`
                }
                <div style="font-size: 0.8rem; font-weight: bold; color: white; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${product.name}</div>
                <div style="font-size: 0.9rem; color: var(--accent-green); font-weight: 800;">R$ ${parseFloat(product.promotionPrice).toFixed(2)}</div>
            `;
            bannerList.appendChild(item);
        });
    } else {
        bannerSubtitle.textContent = 'Compre agora e economize!';
    }
}

function filterStorePromotions() {
    if (!storeProducts) return;
    const promoProducts = storeProducts.filter(p => p.isPromotion === 1);
    renderStoreProducts(promoProducts);
}

function openProductDetails(product) {
    const modal = document.getElementById('product-details-modal');
    if (!modal) return;

    document.getElementById('detail-product-name').textContent = product.name;
    document.getElementById('detail-product-price').textContent = `R$ ${parseFloat(product.price).toFixed(2)}`;
    document.getElementById('detail-product-category').textContent = product.category || 'Geral';
    document.getElementById('detail-product-stock').textContent = product.stock <= 0 ? 'Esgotado' : `${product.stock} unidades disponÃ­veis`;

    const img = document.getElementById('detail-product-image');
    const placeholder = document.getElementById('detail-image-placeholder');

    if (product.image) {
        img.src = product.image;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        img.style.display = 'none';
        placeholder.style.display = 'block';
        placeholder.textContent = product.icon || 'ðŸ“¦';
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
        alert('Erro: VocÃª precisa estar logado.');
        return;
    }

    fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(products => {
            const product = products.find(p => p.id === productId);
            if (!product) {
                alert('âŒ Produto nÃ£o encontrado');
                return;
            }

            if (product.stock <= 0) {
                alert('âŒ Produto esgotado');
                return;
            }

            // Check if product already in cart
            const existingItem = clientCart.find(item => item.id === productId);

            if (existingItem) {
                if (existingItem.quantity < product.stock) {
                    existingItem.quantity++;
                } else {
                    alert('âš ï¸ Quantidade mÃ¡xima atingida');
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
            alert(`âœ… ${product.name} adicionado ao carrinho!`);
        })
        .catch(err => {
            console.error('Erro:', err);
            alert('âŒ Erro ao adicionar ao carrinho');
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
                `<div class="cart-item-image" style="display: flex; align-items: center; justify-content: center; font-size: 2rem;">${item.icon || 'ðŸ“¦'}</div>`
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
        alert('âš ï¸ Quantidade mÃ¡xima atingida');
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
        alert('âŒ Carrinho vazio');
        return;
    }

    const clientData = localStorage.getItem('clientData');
    const clientToken = localStorage.getItem('clientToken');
    const paymentMethod = document.getElementById('client-payment-method').value;

    if (!clientData || !clientToken) {
        alert('âŒ Erro: FaÃ§a login novamente');
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
    // Legacy support or direct confirmation if needed
    // But now we redirect to Delivery Modal
    openDeliveryModal();
}

// ==================== DELIVERY & PROOF FLOW ====================
let selectedDeliveryMethod = 'pickup'; // Default

function openDeliveryModal() {
    closeClientPixModal();
    document.getElementById('client-delivery-modal').style.display = 'flex';
}

function closeDeliveryModal() {
    document.getElementById('client-delivery-modal').style.display = 'none';
    showClientPixModal(); // Go back to PIX
}

function selectDeliveryMethod(method) {
    selectedDeliveryMethod = method;
    closeDeliveryModal();
    openProofModal();
}

function openProofModal() {
    document.getElementById('client-proof-modal').style.display = 'flex';
    // Reset form
    document.getElementById('proof-form').reset();
    document.getElementById('proof-preview').style.display = 'none';
    document.getElementById('proof-preview').src = '';
}

function closeProofModal() {
    document.getElementById('client-proof-modal').style.display = 'none';
    openDeliveryModal(); // Go back to Delivery
}

function previewProof(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.getElementById('proof-preview');
            img.src = e.target.result;
            img.style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function submitProof(e) {
    e.preventDefault();
    const fileInput = document.getElementById('proof-file-input');

    if (!fileInput.files || !fileInput.files[0]) {
        alert('âš ï¸ Por favor, envie uma foto do comprovante.');
        return;
    }

    processClientOrder('pix', fileInput.files[0]);
}

function processClientOrder(paymentMethod, proofFile = null) {
    const clientData = localStorage.getItem('clientData');
    const clientToken = localStorage.getItem('clientToken');
    const client = JSON.parse(clientData);
    const total = clientCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const formData = new FormData();
    formData.append('clientId', client.id);
    formData.append('items', JSON.stringify(clientCart));
    formData.append('total', total);
    formData.append('paymentMethod', paymentMethod);
    formData.append('deliveryMethod', selectedDeliveryMethod);
    formData.append('clientName', client.username || client.name);

    if (proofFile) {
        formData.append('proofImage', proofFile);
    }

    // Create order
    fetch('/api/client/checkout', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${clientToken}`
            // Content-Type is set automatically with FormData
        },
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.saleId) {
                let msg = `âœ… Pedido realizado com sucesso!\n\nPedido #${data.saleId}\nTotal: R$ ${total.toFixed(2)}\nPagamento: ${paymentMethod.toUpperCase()}`;

                // Update LP if earned
                if (data.earnedLP && data.earnedLP > 0) {
                    msg += `\n\nâ­ VocÃª ganhou ${data.earnedLP} pontos!`;

                    // Update clientData in localStorage
                    if (clientData) {
                        const updatedClient = JSON.parse(clientData);
                        updatedClient.lpBalance = (updatedClient.lpBalance || 0) + data.earnedLP;
                        localStorage.setItem('clientData', JSON.stringify(updatedClient));

                        // Update in clients list (localStorage)
                        const storedClients = localStorage.getItem('clients');
                        if (storedClients) {
                            const clientsList = JSON.parse(storedClients);
                            const clientIndex = clientsList.findIndex(c => c.id === updatedClient.id);
                            if (clientIndex !== -1) {
                                clientsList[clientIndex].lpBalance = updatedClient.lpBalance;
                                localStorage.setItem('clients', JSON.stringify(clientsList));
                            }
                        }

                        // Update global clients array if it exists
                        if (typeof clients !== 'undefined') {
                            const clientIndex = clients.findIndex(c => c.id === updatedClient.id);
                            if (clientIndex !== -1) {
                                clients[clientIndex].lpBalance = updatedClient.lpBalance;
                            }
                        }
                    }
                }

                alert(msg);

                // Clear cart
                clientCart = [];
                localStorage.setItem('clientCart', JSON.stringify(clientCart));

                // Go to orders screen
                viewClientOrders();
            } else {
                alert('âŒ ' + (data.error || 'Erro ao finalizar pedido'));
            }
        })
        .catch(err => {
            console.error('Erro:', err);
            alert('âŒ Erro ao conectar com o servidor');
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
        document.getElementById('client-profile-name').textContent = client.username || client.name;

        // Display Store Name
        if (client.storeName) {
            document.getElementById('client-profile-store').textContent = `Loja: ${client.storeName}`;
            document.getElementById('client-profile-store').style.display = 'block';
        } else {
            document.getElementById('client-profile-store').style.display = 'none';
        }
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
                headerUsername.textContent = user.username || 'UsuÃ¡rio';
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
    console.log('ðŸš€ loadProducts called');
    const token = localStorage.getItem('authToken');

    fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => {
            if (!response.ok) throw new Error('Erro na resposta do servidor');
            return response.json();
        })
        .then(products => {
            console.log('ðŸ“¦ Products fetched:', products);
            allProducts = products; // Store for search
            renderProductsTable(products);
        })
        .catch(error => {
            console.error('âŒ ERRO ao carregar produtos:', error);
            alert('ERRO ao carregar produtos: ' + error.message);
            const tbody = document.getElementById('products-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger);">Erro ao carregar produtos. Tente recarregar a pÃ¡gina.</td></tr>';
            }
        });
}

function filterProductsList() {
    const query = document.getElementById('product-list-search').value.toLowerCase().trim();

    if (!allProducts) return;

    if (!query) {
        renderProductsTable(allProducts);
        return;
    }

    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.barcode.includes(query) ||
        (p.category && p.category.toLowerCase().includes(query))
    );

    renderProductsTable(filtered);
}

function renderProductsTable(productsToRender) {
    console.log('ðŸŽ¨ renderProductsTable called with:', productsToRender);
    const tbody = document.getElementById('products-table-body');
    if (!tbody) {
        console.error('âŒ tbody products-table-body NOT FOUND');
        return;
    }

    tbody.innerHTML = '';

    if (!Array.isArray(productsToRender) || productsToRender.length === 0) {
        console.warn('âš ï¸ No products to render');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Nenhum produto encontrado.</td></tr>';
        return;
    }

    productsToRender.forEach((product, index) => {
        const tr = document.createElement('tr');
        let imageHtml = `<span style="font-size: 1.5rem;">${product.icon || 'ðŸ“¦'}</span>`;
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
                <button onclick="editProduct(${product.id})" class="btn-icon" style="background-color: #0ea5e9; color: white; padding: 8px 16px; border-radius: 6px; margin-right: 8px; width: auto; height: auto;" title="Editar"><i class="ph ph-pencil-simple" style="font-size: 1.2rem;"></i></button>
                <button onclick="deleteProduct(${product.id})" class="btn-icon delete" style="background-color: #ef4444; color: white; padding: 8px 16px; border-radius: 6px; width: auto; height: auto;" title="Excluir"><i class="ph ph-trash" style="font-size: 1.2rem;"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}



// ==================== PRODUTOS (MODAL) ====================
function openProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('product-form-title');

    if (productId) {
        // Edit Mode
        title.innerHTML = '<i class="ph ph-pencil"></i> Editar Produto';

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
                document.getElementById('product-cost-price').value = product.costPrice || '';
                document.getElementById('product-profit-margin').value = product.profitMargin || '';
                document.getElementById('product-stock').value = product.stock;
                document.getElementById('product-loyalty-points').value = product.loyalty_points || 0;

                // Promotion Fields
                const isPromo = product.isPromotion === 1;
                document.getElementById('product-is-promotion').checked = isPromo;
                document.getElementById('product-promotion-price').value = product.promotionPrice || '';
                togglePromotionField();

                if (product.image) {
                    document.getElementById('image-preview').src = product.image;
                    document.getElementById('image-preview-container').style.display = 'block';
                } else {
                    document.getElementById('image-preview').src = '';
                    document.getElementById('image-preview-container').style.display = 'none';
                }

                modal.style.display = 'flex';
            })
            .catch(err => console.error('Error loading product for edit:', err));
    } else {
        // New Product Mode
        title.innerHTML = '<i class="ph ph-plus-circle"></i> Novo Produto';
        form.reset();
        document.getElementById('product-id').value = '';
        document.getElementById('product-loyalty-points').value = '0';
        document.getElementById('product-is-promotion').checked = false;
        togglePromotionField();
        document.getElementById('image-preview').src = '';
        document.getElementById('image-preview-container').style.display = 'none';
        modal.style.display = 'flex';
    }
}

function togglePromotionField() {
    const isPromotion = document.getElementById('product-is-promotion').checked;
    const promoGroup = document.getElementById('product-promotion-price-group');
    if (promoGroup) {
        promoGroup.style.display = isPromotion ? 'flex' : 'none';
        if (!isPromotion) {
            document.getElementById('product-promotion-price').value = '';
        }
    }
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

function editProduct(productId) {
    openProductModal(productId);
}

function resetProductForm() {
    // Legacy function, redirected to close modal or just reset
    document.getElementById('product-form').reset();
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


// Event Listener for Product Form
document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('product-form');
    if (productForm) {
        console.log('âœ… Form de produtos encontrado! Adicionando listener...');
        productForm.addEventListener('submit', saveProduct);
    } else {
        console.error('âŒ Form de produtos NÃƒO encontrado!');
    }
});

function calculateSellingPrice() {
    const costPrice = parseFloat(document.getElementById('product-cost-price').value) || 0;
    const profitMargin = parseFloat(document.getElementById('product-profit-margin').value) || 0;

    if (costPrice > 0) {
        const sellingPrice = costPrice + (costPrice * (profitMargin / 100));
        document.getElementById('product-price').value = sellingPrice.toFixed(2);
    }
}

function saveProduct(e) {
    e.preventDefault();
    console.log('ðŸ’¾ Tentando salvar produto...');


    const token = localStorage.getItem('authToken');
    const productId = document.getElementById('product-id').value;

    const formData = new FormData();
    formData.append('barcode', document.getElementById('product-barcode').value);
    formData.append('name', document.getElementById('product-name').value);
    formData.append('category', document.getElementById('product-category').value);
    formData.append('price', document.getElementById('product-price').value);
    formData.append('costPrice', document.getElementById('product-cost-price').value);
    formData.append('profitMargin', document.getElementById('product-profit-margin').value);
    formData.append('stock', document.getElementById('product-stock').value);
    formData.append('loyalty_points', document.getElementById('product-loyalty-points').value);
    formData.append('isPromotion', document.getElementById('product-is-promotion').checked ? 1 : 0);
    formData.append('promotionPrice', document.getElementById('product-promotion-price').value);
    formData.append('icon', 'ðŸ“¦');

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
                alert(productId ? 'âœ“ Produto atualizado!' : 'âœ“ Produto cadastrado!');
                closeProductModal(); // Close modal after save
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
                alert('âœ“ Produto excluÃ­do!');
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
                alert('âŒ Produto nÃ£o encontrado!');
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
                <span style="font-size: 1.2rem;">${product.icon || 'ðŸ“¦'}</span>
                <div style="flex: 1;">
                    <span class="search-result-name">${product.name}</span>
                    <p style="font-size: 0.85rem; color: var(--text-secondary);">CÃ³d: ${product.barcode}</p>
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
        alert('âŒ PRODUTO SEM ESTOQUE! Venda bloqueada.');
        return;
    }

    if (product.stock <= 5) {
        alert(`âš ï¸ ALERTA DE ESTOQUE BAIXO!\nRestam apenas ${product.stock} unidades.`);
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
            alert('âš ï¸ Estoque insuficiente!');
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
            : `<span style="font-size: 1.2rem;">${item.icon || 'ðŸ“¦'}</span>`;

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` : `<span style="font-size: 2rem;">${item.icon || '📦'}</span>`}</td>
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>UN</td>
            <td>
                <div class="qty-controls" style="display: flex; align-items: center; gap: 5px;">
                    <button class="btn-qty" onclick="changeQty(${index}, -1)" style="width: 32px; height: 32px; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; padding: 0;">-</button>
                    <input type="number" class="input-qty" value="${item.quantity}" min="1" onchange="updateQty(${index}, this.value)" style="width: 50px; height: 32px; text-align: center; font-size: 1.1rem;">
                    <button class="btn-qty" onclick="changeQty(${index}, 1)" style="width: 32px; height: 32px; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; padding: 0;">+</button>
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
        alert(`âš ï¸ Estoque insuficiente! MÃ¡ximo: ${cart[index].maxStock}`);
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
        alert(`âš ï¸ Estoque insuficiente! MÃ¡ximo: ${cart[index].maxStock}`);
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
    if (event) {
        document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }

    // Redirect to new Modal Flow logic
    // This allows the old sidebar buttons to trigger the new modal
    finalizeSale();

    // Select the specific method in the modal after a short delay
    setTimeout(() => {
        selectModalPayment(method);
    }, 100);
}

// ==================== FUNCIONALIDADE PIX (GERAÃ‡ÃƒO DE QR CODE) ====================

function generatePixQr() {
    try {
        const qrContainer = document.getElementById('pix-qr-container');
        if (!qrContainer) {
            console.error('Container PIX nÃ£o encontrado no DOM');
            return;
        }

        qrContainer.innerHTML = '<p style="color: blue;">Gerando QR Code...</p>';

        let pixKey = '62819358000106'; // Chave Default (Fallback)
        // Tentar pegar do config (window ou localStorage)
        if (window.storeConfig && window.storeConfig.storePixKey) {
            pixKey = window.storeConfig.storePixKey;
        } else {
            const localConfig = localStorage.getItem('storeConfig');
            if (localConfig) {
                try { pixKey = JSON.parse(localConfig).pixKey || pixKey; } catch (e) { }
            }
        }

        const cartTotalEl = document.getElementById('cart-total');
        const total = cartTotalEl
            ? parseFloat(cartTotalEl.textContent.replace('R$', '').replace('.', '').replace(',', '.').trim())
            : 0;

        const payload = generatePixPayload(pixKey, 'L-STORE', 'BRASILIA', total || 0);

        // Limpar e preparar container
        qrContainer.innerHTML = '';
        qrContainer.style.display = 'flex';
        qrContainer.style.flexDirection = 'column';
        qrContainer.style.alignItems = 'center';
        qrContainer.style.justifyContent = 'center';

        const qrWrapper = document.createElement('div');
        qrWrapper.style.background = 'white';
        qrWrapper.style.padding = '10px';
        qrWrapper.style.borderRadius = '8px';
        qrContainer.appendChild(qrWrapper);

        if (typeof QRCode !== 'undefined') {
            new QRCode(qrWrapper, {
                text: payload,
                width: 250,
                height: 250,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });

            const keyInfo = document.createElement('p');
            keyInfo.style.marginTop = '15px';
            keyInfo.style.fontWeight = 'bold';
            keyInfo.style.color = '#333';
            keyInfo.textContent = `Chave: ${pixKey}`;
            qrContainer.appendChild(keyInfo);

            startPixTimer();
            console.log('âœ… QR Code PIX gerado com sucesso');
        } else {
            qrContainer.innerHTML = '<p style="color:red">Erro: Biblioteca QRCode nÃ£o carregada.</p>';
            console.error('QRCode lib missing');
        }

    } catch (e) {
        console.error('Erro ao gerar PIX:', e);
        const qrContainer = document.getElementById('pix-qr-container');
        if (qrContainer) qrContainer.innerHTML = '<p style="color:red">Erro ao gerar QR Code</p>';
    }
}

function startPixTimer() {
    if (pixTimerInterval) clearInterval(pixTimerInterval);
    let seconds = 120; // 2 minutos
    const timerDisplay = document.getElementById('pix-timer');
    if (!timerDisplay) return;

    // AtualizaÃ§Ã£o inicial
    const update = () => {
        const min = Math.floor(seconds / 60).toString().padStart(2, '0');
        const sec = (seconds % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `Atualiza em: ${min}:${sec}`;
    };
    update();

    pixTimerInterval = setInterval(() => {
        seconds--;
        update();

        if (seconds <= 0) {
            generatePixQr(); // Regenera Payload
        }
    }, 1000);
}

function generatePixPayload(key, name, city, amount, txId = '***') {
    const formatField = (id, value) => {
        const len = value.length.toString().padStart(2, '0');
        return `${id}${len}${value}`;
    };

    const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

    const merchantAccount = formatField('00', 'BR.GOV.BCB.PIX') + formatField('01', key);
    const merchantCategory = '0000';
    const transactionCurrency = '986'; // BRL
    const countryCode = 'BR';
    const merchantName = normalize(name).substring(0, 25);
    const merchantCity = normalize(city).substring(0, 15);

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
        'dinheiro': 'ðŸ’µ',
        'cartao': 'ðŸ’³',
        'pix': 'ðŸ“±',
        'misto': 'âš–ï¸'
    };
    return icons[method] || 'ðŸ’°';
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
                <td>${debtor.cardInfo ? '**** ' + debtor.cardInfo.slice(-4) : 'NÃ£o cadastrado'}</td>
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
    // Aqui poderÃ­amos carregar outros widgets se necessÃ¡rio
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
                    balanceEl.textContent = `InÃ­cio: ${formatCurrency(data.openingBalance)}`;
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
        alert('Valor invÃ¡lido');
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
                alert('âœ… Caixa aberto com sucesso!');
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
                alert(`âœ… Caixa fechado!\n\nTotal Vendas: ${formatCurrency(data.totalSales)}\nSaldo Final: ${formatCurrency(data.closingBalance)}`);
                checkCashRegisterStatus();
            }
        })
        .catch(err => {
            console.error(err);
            alert('Erro ao fechar caixa');
        });
}

// ==================== RELATÃ“RIOS ====================
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
        .catch(error => console.error('Erro ao carregar relatÃ³rios:', error));
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
        const action = confirm('O caixa estÃ¡ ABERTO.\n\nClique em OK para ir ao CAIXA.\nClique em CANCELAR para FECHAR O CAIXA.');
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
                alert(`âœ… Caixa fechado com sucesso!\n\nSaldo Inicial: ${formatCurrency(data.openingBalance)}\nVendas: ${formatCurrency(data.totalSales)}\nSaldo Final: ${formatCurrency(data.closingBalance)}`);
                checkCashRegisterStatus();
            } else {
                alert('âŒ ' + (data.error || 'Erro ao fechar caixa'));
            }
        })
        .catch(err => {
            console.error('Erro:', err);
            alert('Erro ao fechar caixa');
        });
}

// ==================== FINALIZAR VENDA (NOVO FLUXO) ====================
function finalizeSale() {
    if (cart.length === 0) {
        alert('Carrinho vazio!');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Open Payment Modal
    const modal = document.getElementById('payment-modal');
    const totalDisplay = document.getElementById('payment-modal-total');

    if (modal && totalDisplay) {
        totalDisplay.textContent = formatCurrency(total);

        // Reset state
        selectModalPayment('dinheiro'); // Default to money
        document.getElementById('modal-amount-paid').value = '';
        document.getElementById('modal-change').textContent = 'R$ 0,00';

        updateClientDropdown(); // Populate clients
        selectedClientId = null; // Reset selection
        handleClientSelection(); // Reset UI

        modal.style.display = 'flex';

        // Focus on amount input if money is selected
        setTimeout(() => {
            document.getElementById('modal-amount-paid').focus();
        }, 100);

        // Add Enter key listener for modal
        const modalElement = document.getElementById('payment-modal');
        modalElement.onkeydown = function (e) {
            if (e.key === 'Enter') {
                // Avoid triggering if focus is on Cancel button
                if (e.target.classList.contains('btn-secondary') || e.target.textContent.trim() === 'Cancelar') {
                    return;
                }
                e.preventDefault();
                confirmPayment();
            }
        };
    }
}

function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
}

function closePixModal() {
    document.getElementById('pix-modal').style.display = 'none';
    document.getElementById('payment-modal').style.display = 'flex';
    if (pixTimerInterval) clearInterval(pixTimerInterval);
    // Reset to money or just clear selection? Let's default to money for safety
    selectModalPayment('dinheiro');
}

function selectModalPayment(method) {
    // Update active button
    document.querySelectorAll('.payment-option-btn').forEach(btn => btn.classList.remove('active'));

    const btnMap = {
        'dinheiro': 'btn-modal-money',
        'cartao': 'btn-modal-card',
        'pix': 'btn-modal-pix',
        'pontos': 'btn-modal-points'
    };

    const btnId = btnMap[method];
    if (btnId) {
        document.getElementById(btnId).classList.add('active');
    }

    // Update hidden input
    document.getElementById('payment-method').value = method;

    const cashArea = document.getElementById('cash-payment-area');
    const optionsGrid = document.querySelector('.payment-options-grid');

    // Reset displays
    cashArea.style.display = 'none';
    optionsGrid.style.display = 'grid'; // Default visible

    if (pixTimerInterval) clearInterval(pixTimerInterval);

    if (method === 'dinheiro') {
        cashArea.style.display = 'block';
        setTimeout(() => document.getElementById('modal-amount-paid').focus(), 50);
    } else if (method === 'pix') {
        console.log('DEBUG: Switching to PIX modal');
        // Close payment modal and open PIX modal
        document.getElementById('payment-modal').style.display = 'none';
        document.getElementById('pix-modal').style.display = 'flex';
        console.log('DEBUG: Calling generatePixQr()');
        generatePixQr();
    } else if (method === 'pontos') {
        if (!selectedClientId) {
            alert('âš ï¸ Selecione um cliente para usar pontos.');
            selectModalPayment('dinheiro');
            return;
        }

        const client = clients.find(c => c.id === selectedClientId);
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const pointsNeeded = Math.ceil(total * 100); // 1 LP = 0.01 BRL

        if ((client.lpBalance || 0) < pointsNeeded) {
            alert(`âš ï¸ Saldo insuficiente!\nNecessÃ¡rio: ${pointsNeeded} LP\nSaldo: ${client.lpBalance || 0} LP`);
            selectModalPayment('dinheiro');
            return;
        }

        // Visual feedback
        document.getElementById('modal-amount-paid').value = total.toFixed(2);
        document.getElementById('modal-change').textContent = 'Pagamento com Pontos';
        document.getElementById('modal-change').style.color = 'var(--accent-purple)';
    }
}

function calculateModalChange() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const paidInput = document.getElementById('modal-amount-paid');
    const changeDisplay = document.getElementById('modal-change');

    const paid = parseFloat(paidInput.value) || 0;
    const change = paid - total;

    if (change >= 0) {
        changeDisplay.textContent = formatCurrency(change);
        changeDisplay.style.color = 'var(--accent-cyan)';
    } else {
        changeDisplay.textContent = 'Faltam ' + formatCurrency(Math.abs(change));
        changeDisplay.style.color = 'var(--accent-red)';
    }
}

function confirmPayment() {
    const method = document.getElementById('payment-method').value;
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let paidAmount = total; // Default for Card/Pix

    if (method === 'dinheiro') {
        const paidInput = parseFloat(document.getElementById('modal-amount-paid').value) || 0;
        if (paidInput < total) {
            alert('Valor pago Ã© insuficiente!');
            return;
        }
        paidAmount = paidInput;
    } else if (method === 'pontos') {
        // Validation already done in selection, but double check
        if (!selectedClientId) return;
        const client = clients.find(c => c.id === selectedClientId);
        const pointsNeeded = Math.ceil(total * 100);
        if ((client.lpBalance || 0) < pointsNeeded) {
            alert('Saldo de pontos insuficiente!');
            return;
        }
    }

    // Proceed with sale
    processSale(method, paidAmount);
}

function processSale(method, paidAmount) {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const change = paidAmount - total;

    const saleData = {
        items: cart,
        total: total,
        paymentMethod: method,
        paidAmount: paidAmount,
        change: change,
        date: new Date().toISOString(),
        clientId: selectedClientId // Save client ID
    };

    // Deduct points if paying with points
    if (method === 'pontos' && selectedClientId) {
        const pointsUsed = Math.ceil(total * 100);
        const clientIndex = clients.findIndex(c => c.id === selectedClientId);
        if (clientIndex !== -1) {
            clients[clientIndex].lpBalance -= pointsUsed;
            saveClients();
        }
    }

    const token = localStorage.getItem('authToken');

    // Show loading state if needed

    fetch('/api/sales', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(saleData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.id || data.message) {
                let msg = `âœ… Venda Finalizada!\nTroco: ${formatCurrency(change)}`;

                // Award Points
                if (selectedClientId) {
                    const points = updateClientPoints(selectedClientId, total);
                    if (points > 0) {
                        msg += `\n\nðŸŽ‰ Cliente ganhou ${points} LP!`;
                    }
                }

                alert(msg);
                closePaymentModal();
                clearCart();
                loadSales();
                loadDashboard();

                // Open cash drawer logic here if needed
            } else {
                alert('Erro ao finalizar venda: ' + (data.error || 'Erro desconhecido'));
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro de conexÃ£o ao finalizar venda.');
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
        alert('Por favor, insira um valor vÃ¡lido.');
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
                alert('âœ… Caixa aberto com sucesso!');
                closeCashRegisterModal();
                checkCashRegisterStatus();
                switchTab('caixa');
            } else {
                alert('âŒ ' + (data.error || 'Erro ao abrir caixa'));
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
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">Nenhuma transaÃ§Ã£o registrada</td></tr>';
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
            'active': 'Ativo âœ“',
            'pending': 'Pendente',
            'verification': 'Em AnÃ¡lise',
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
            expiresEl.textContent = 'Data de expiraÃ§Ã£o nÃ£o definida';
        }
    }
}

function renewSubscription() {
    alert('ðŸ”„ Funcionalidade de renovaÃ§Ã£o em desenvolvimento.\n\nEm breve vocÃª poderÃ¡ renovar sua assinatura via PIX.');
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
        alert('ðŸ“± Para instalar no iOS, toque em "Compartilhar" e depois em "Adicionar Ã  Tela de InÃ­cio"');
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

    // Show loading state if needed
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.textContent : 'Entrar';
    if (btn) {
        btn.textContent = 'Entrando...';
        btn.disabled = true;
    }

    fetch('/api/login', {
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

                // LÃ³gica de redirecionamento
                const user = data.user;
                const authScreen = document.getElementById('auth-screen');
                const appScreen = document.getElementById('app-screen');
                const adminTab = document.getElementById('admin-nav-tab');

                if (authScreen) authScreen.style.display = 'none';
                if (appScreen) appScreen.style.display = 'block';

                if (user.isAdmin) {
                    if (adminTab) adminTab.style.display = 'block';
                    loadAdminUsers();
                } else {
                    if (adminTab) adminTab.style.display = 'none';
                }

                loadDashboard();
                loadProducts();
                loadSales();

                // Atualizar nome do usuÃ¡rio
                const headerUsername = document.getElementById('header-username');
                if (headerUsername) headerUsername.textContent = user.username;

            } else {
                alert(data.error || 'Erro ao fazer login');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao fazer login: ' + error.message);
        })
        .finally(() => {
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
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
        alert('O PIN deve ter exatamente 4 dÃ­gitos.');
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
                alert('âœ“ Conta criada! FaÃ§a login para continuar.');
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
                    statusBadge = '<span class="status-badge active"><i class="ph ph-check-circle"></i> Pago</span>';
                    diasRestantes = '-';
                } else if (diffDays < 0) {
                    statusBadge = '<span class="status-badge inactive" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;"><i class="ph ph-warning-circle"></i> Vencido</span>';
                    diasRestantes = `<span style="color: #ef4444;">${Math.abs(diffDays)} dias atrás</span>`;
                } else if (diffDays <= 7) {
                    statusBadge = '<span class="status-badge warning"><i class="ph ph-warning"></i> Vencendo</span>';
                    diasRestantes = `<span style="color: var(--accent-orange);">${diffDays} dias</span>`;
                } else {
                    statusBadge = '<span class="status-badge"><i class="ph ph-hourglass"></i> Pendente</span>';
                    diasRestantes = `${diffDays} dias`;
                }

                tr.innerHTML = `
                    <td>${boleto.description}</td>
                    <td>${formatCurrency(parseFloat(boleto.value))}</td>
                    <td>${dueDate.toLocaleDateString('pt-BR')}</td>
                    <td>${statusBadge}</td>
                    <td>${diasRestantes}</td>
                    <td>
                        ${boleto.status !== 'pago' ? `<button onclick="markBoletoAsPaid(${boleto.id})" class="btn-sm btn-success" title="Marcar como Pago" style="margin-right: 5px;"><i class="ph ph-check"></i></button>` : ''}
                        <button onclick="editBoleto(${boleto.id})" class="btn-sm btn-secondary" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                        <button onclick="deleteBoleto(${boleto.id})" class="btn-sm btn-danger" title="Excluir"><i class="ph ph-trash"></i></button>
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
                alert(boletoId ? 'âœ“ Boleto atualizado!' : 'âœ“ Boleto cadastrado!');
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
                alert('âœ“ Boleto marcado como pago!');
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
                alert('âœ“ Boleto excluÃ­do!');
                loadBoletos();
                loadDashboard();
            }
        })
        .catch(err => console.error('Erro:', err));
}

// Event listener para botÃ£o de adicionar boleto
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
            const lowEl = document.getElementById('low-stock-products');
            const zeroEl = document.getElementById('out-of-stock-products');

            if (totalEl) totalEl.textContent = totalItems;
            if (lowEl) lowEl.textContent = lowStock;
            if (zeroEl) zeroEl.textContent = zeroStock;
        })
        .catch(err => console.error('Erro ao carregar resumo de estoque:', err));
}

// Carregar movimentaÃ§Ãµes de estoque
function loadStockMovements() {
    const token = localStorage.getItem('authToken');
    const tbody = document.getElementById('stock-movements-table-body');
    const searchTerm = document.getElementById('stock-search')?.value.toLowerCase() || '';

    if (!tbody) return;

    fetch('/api/stock-movements', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(movements => {
            tbody.innerHTML = '';

            const filteredMovements = movements.filter(m =>
                m.productName.toLowerCase().includes(searchTerm)
            );

            if (filteredMovements.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Nenhuma movimentaÃ§Ã£o registrada</td></tr>';
                return;
            }

            filteredMovements.forEach(mov => {
                const tr = document.createElement('tr');
                const date = new Date(mov.createdAt);

                let typeBadge = '';
                if (mov.type === 'entrada') {
                    typeBadge = '<span class="status-badge active">âž• Entrada</span>';
                } else if (mov.type === 'saida') {
                    typeBadge = '<span class="status-badge inactive">âž– SaÃ­da</span>';
                } else {
                    typeBadge = '<span class="status-badge warning">ðŸ”§ Ajuste</span>';
                }

                tr.innerHTML = `
                    <td>${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${mov.productName}</td>
                    <td>${typeBadge}</td>
                    <td><strong>${mov.quantity}</strong></td>
                    <td>${mov.previousStock}</td>
                    <td><strong>${mov.newStock}</strong></td>
                    <td>${mov.reason}</td>
                     <td>
                        <button class="btn-icon danger" onclick="deleteStockMovement(${mov.id})" title="Excluir">
                            <i class="ph ph-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            loadStockSummary();
        })
        .catch(err => console.error('Erro ao carregar movimentaÃ§Ãµes:', err));
}

// Excluir movimentaÃ§Ã£o de estoque
function deleteStockMovement(id) {
    if (!confirm('Tem certeza que deseja excluir esta movimentaÃ§Ã£o? O estoque serÃ¡ revertido.')) return;

    const token = localStorage.getItem('authToken');
    fetch(`/api/stock-movements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert('MovimentaÃ§Ã£o excluÃ­da com sucesso!');
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

// Abrir modal de movimentaÃ§Ã£o
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

// Fechar modal de movimentaÃ§Ã£o
function closeStockMovementModal() {
    const modal = document.getElementById('stock-movement-modal');
    if (modal) modal.style.display = 'none';
}

// Salvar movimentaÃ§Ã£o de estoque
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
                alert('MovimentaÃ§Ã£o registrada com sucesso!');
                closeStockMovementModal();
                loadStockMovements();
                loadStockSummary();
                loadProducts(); // Atualiza lista de produtos
            } else {
                alert('Erro ao registrar movimentaÃ§Ã£o: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao registrar movimentaÃ§Ã£o');
        });
});


// Event listener para botÃ£o de nova movimentaÃ§Ã£o
document.getElementById('add-stock-movement-btn')?.addEventListener('click', openStockMovementModal);

// ==================== CLIENTES / FIDELIDADE ====================
let clients = [];
let selectedClientId = null;

function loadClients() {
    const stored = localStorage.getItem('clients');
    if (stored) {
        clients = JSON.parse(stored);
    } else {
        clients = [];
    }
}

function saveClients() {
    localStorage.setItem('clients', JSON.stringify(clients));
}

function addClient(name, cpf) {
    const newClient = {
        id: Date.now(),
        name,
        cpf,
        lpBalance: 0, // Loyalty Points
        createdAt: new Date().toISOString()
    };
    clients.push(newClient);
    saveClients();
    return newClient;
}

function updateClientPoints(clientId, amountSpent) {
    if (!window.storeConfig?.enableLoyalty) return 0;

    const rate = window.storeConfig.loyaltyCashbackRate || 0;
    if (rate <= 0) return 0;

    const pointsEarned = Math.floor((amountSpent * (rate / 100)) * 100); // 1 LP = 0.01 BRL, so *100 to get integer points? 
    // Wait, user said "cada moeda vale 1 sentavo". 
    // If I buy R$ 100.00 and rate is 5% -> Cashback R$ 5.00.
    // R$ 5.00 = 500 centavos = 500 LP.
    // Calculation: (Amount * Rate/100) * 100 = Amount * Rate.
    // Example: 100 * 5 = 500. Correct.

    const clientIndex = clients.findIndex(c => c.id === clientId);
    if (clientIndex !== -1) {
        clients[clientIndex].lpBalance = (clients[clientIndex].lpBalance || 0) + pointsEarned;
        saveClients();
        return pointsEarned;
    }
    return 0;
}

// ==================== CLIENT UI LOGIC ====================
function updateClientDropdown() {
    const select = document.getElementById('payment-client-select');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">Cliente NÃ£o Identificado</option>';

    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = `${client.name} (LP: ${client.lpBalance || 0})`;
        select.appendChild(option);
    });

    if (currentVal) select.value = currentVal;
}

function openNewClientModal() {
    document.getElementById('new-client-modal').style.display = 'flex';
    document.getElementById('new-client-name').focus();
}

function closeNewClientModal() {
    document.getElementById('new-client-modal').style.display = 'none';
    document.getElementById('new-client-form').reset();
}

document.getElementById('new-client-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = document.getElementById('new-client-name').value;
    const cpf = document.getElementById('new-client-cpf').value;

    if (!name) return;

    const newClient = addClient(name, cpf);
    alert('âœ… Cliente cadastrado!');
    closeNewClientModal();
    updateClientDropdown();

    // Auto-select new client
    const select = document.getElementById('payment-client-select');
    if (select) {
        select.value = newClient.id;
        handleClientSelection();
    }
});

document.getElementById('payment-client-select')?.addEventListener('change', handleClientSelection);

function handleClientSelection() {
    const select = document.getElementById('payment-client-select');
    const infoEl = document.getElementById('client-loyalty-info');
    const clientId = select.value ? parseInt(select.value) : null;

    selectedClientId = clientId;

    if (clientId) {
        const client = clients.find(c => c.id === clientId);
        if (client && infoEl) {
            infoEl.style.display = 'block';
            infoEl.textContent = `Saldo Atual: ${client.lpBalance || 0} LP`;

            // Calculate potential points for current cart
            if (window.storeConfig?.enableLoyalty) {
                const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const rate = window.storeConfig.loyaltyCashbackRate || 0;
                const potential = Math.floor((total * (rate / 100)) * 100);
                if (potential > 0) {
                    infoEl.textContent += ` (+${potential} LP nesta compra)`;
                }
            }
        }
    } else {
        if (infoEl) infoEl.style.display = 'none';
    }
}

// ==================== L-STORE LOYALTY MODAL ====================
function openLoyaltyModal() {
    // Check if user is logged in (User Data OR Client Data)
    const userData = localStorage.getItem('userData');
    const clientData = localStorage.getItem('clientData');

    if (!userData && !clientData) {
        alert('Por favor, faÃ§a login para ver seus pontos.');
        window.showLogin();
        return;
    }

    const user = clientData ? JSON.parse(clientData) : JSON.parse(userData);
    let balance = 0;

    // Try to find client record by CPF or Name
    // Note: clients array is loaded from localStorage 'clients'
    // Ensure clients are loaded
    if (clients.length === 0) loadClients();

    const client = clients.find(c =>
        (user.cpf && c.cpf === user.cpf) ||
        (c.name.toLowerCase() === user.username.toLowerCase())
    );

    if (user.lpBalance !== undefined) {
        balance = user.lpBalance;
    } else if (client) {
        balance = client.lpBalance || 0;
    }

    // Update UI
    document.getElementById('loyalty-balance-display').textContent = balance;
    document.getElementById('loyalty-value-display').textContent = formatCurrency(balance / 100);

    document.getElementById('loyalty-modal').style.display = 'flex';
}

function closeLoyaltyModal() {
    document.getElementById('loyalty-modal').style.display = 'none';
}

// ==================== UTILS ====================
function formatCurrency(value) {
    if (value === null || value === undefined) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ==================== LOJA / CONFIGURAÃ‡Ã•ES ====================

// ==================== EVENT LISTENERS ====================
// ==================== INITIALIZATION ====================
function initApp() {
    console.log('ðŸš€ Inicializando app...');

    // 1. Auto-Login & Initial Data
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');

    if (token && userData) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';

        loadDashboard();
        loadProducts();
        loadSales();
        loadClients(); // Load clients
        checkCashRegisterStatus();
    }

    // 2. System Info & Status
    loadVersion();
    checkServerStatus();
    setInterval(checkServerStatus, 30000);

    // 3. Clock
    updateClock();
    setInterval(updateClock, 1000);

    // NavegaÃ§Ã£o entre tabs
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
    console.log('ðŸ” BotÃ£o Finalizar encontrado?', finalizeBtn ? 'SIM' : 'NÃƒO');
    if (finalizeBtn) {
        finalizeBtn.addEventListener('click', finalizeSale);
        console.log('âœ… Event listener adicionado ao botÃ£o Finalizar');
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
    const loyaltyCheckbox = document.getElementById('enable-loyalty');
    const loyaltyRateInput = document.getElementById('loyalty-cashback-rate');

    const enableLoyalty = loyaltyCheckbox ? loyaltyCheckbox.checked : false;
    const loyaltyCashbackRate = loyaltyRateInput ? (parseFloat(loyaltyRateInput.value) || 0) : 0;

    if (!storePixKey) {
        alert('Por favor, informe a chave PIX.');
        return;
    }

    if (!window.storeConfig) window.storeConfig = {};
    window.storeConfig.storePixKey = storePixKey;
    localStorage.setItem('storeConfig', JSON.stringify(window.storeConfig));
    localStorage.setItem('storePixKey', storePixKey);

    fetch('/api/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            storePixKey,
            enableLoyalty,
            loyaltyCashbackRate
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert('✅ ' + data.message);
                window.storeConfig.storePixKey = storePixKey;
            } else {
                alert('❌ ' + (data.error || 'Erro ao salvar configuração'));
            }
        })
        .catch(err => {
            console.error('Erro:', err);
            alert('✅ Configuração salva (Localmente)!');
        });
}

function loadStoreConfig() {
    console.log('🔄 Carregando configurações da loja...');
    const token = localStorage.getItem('authToken');

    const localStoreConfigStr = localStorage.getItem('storeConfig');
    if (localStoreConfigStr) {
        try { window.storeConfig = JSON.parse(localStoreConfigStr); } catch (e) { }
    }
    if (!window.storeConfig) window.storeConfig = {};

    const fillUI = (config) => {
        const input = document.getElementById('store-pix-key');
        if (input && config.storePixKey) input.value = config.storePixKey;

        const loyaltyCheckbox = document.getElementById('enable-loyalty');
        const loyaltyRateInput = document.getElementById('loyalty-cashback-rate');
        const loyaltyGroup = document.getElementById('loyalty-rate-group');

        if (loyaltyCheckbox) {
            loyaltyCheckbox.checked = config.enableLoyalty || false;
            if (loyaltyGroup) {
                loyaltyGroup.style.display = config.enableLoyalty ? 'flex' : 'none';
                loyaltyCheckbox.addEventListener('change', () => {
                    loyaltyGroup.style.display = loyaltyCheckbox.checked ? 'flex' : 'none';
                });
            }
        }
        if (loyaltyRateInput) loyaltyRateInput.value = config.loyaltyCashbackRate || '';

        window.storeConfig = config;
    };

    fillUI(window.storeConfig);

    if (token) {
        fetch('/api/config', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(response => response.json())
            .then(config => fillUI(config))
            .catch(err => console.error('Erro ao carregar configurações (API):', err));
    }
}

function updateSellerPin() {
    const pin = document.getElementById('store-seller-pin').value.trim();
    if (!pin) {
        alert('Por favor, digite um PIN.');
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) return;

    fetch('/api/settings/pin', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pin })
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            alert('✅ PIN atualizado com sucesso!');
        })
        .catch(err => {
            console.error('Erro ao atualizar PIN:', err);
            alert('❌ ' + err.message);
        });
}

// ==================== ONLINE ORDERS SYSTEM (PANEL & NOTIFICATION) ====================

let pendingOrder = null;
let notificationAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
let onlineOrdersInterval = null;

function toggleOnlineOrdersPanel() {
    const panel = document.getElementById('online-orders-panel');
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'flex';
        checkNewOrders(); // Immediate check
    } else {
        panel.style.display = 'none';
    }
}

function startOnlineOrdersPolling() {
    if (onlineOrdersInterval) clearInterval(onlineOrdersInterval);
    checkNewOrders(); // Initial check
    onlineOrdersInterval = setInterval(checkNewOrders, 10000); // Check every 10s
}

function checkNewOrders() {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    fetch('/api/pos/online-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(orders => {
            // MERGE SUBSCRIPTION REQUESTS
            const subReqs = JSON.parse(localStorage.getItem('subscription_requests') || '[]');
            const pendingSubs = subReqs.filter(r => r.status === 'pending').map(r => ({ ...r, isSubscription: true }));

            const allItems = [...pendingSubs, ...orders];

            updateOnlineOrdersBadge(allItems.length);
            const panel = document.getElementById('online-orders-panel');
            if (panel && panel.style.display !== 'none') {
                renderOnlineOrders(allItems);
            }

            if (allItems.length > 0) {
                const topItem = allItems[0];
                if (!pendingOrder || pendingOrder.id !== topItem.id) {
                    pendingOrder = topItem;
                    showOrderNotification();
                }
            } else {
                hideOrderNotification();
                pendingOrder = null;
            }
        })
        .catch(err => console.error('Error polling orders:', err));
}

function updateOnlineOrdersBadge(count) {
    const badge = document.getElementById('online-orders-badge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

function renderOnlineOrders(items) {
    const container = document.getElementById('online-orders-list');
    if (!container) return;
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; margin-top: 2rem;">Nenhuma solicitação pendente</div>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'online-order-card';
        card.style.cssText = 'background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 2px 5px rgba(0,0,0,0.05);';

        if (item.isSubscription) {
            // RENDER SUBSCRIPTION CARD
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">
                    <span style="color: var(--accent-purple); font-weight: bold;"><i class="ph ph-crown"></i> Renovação</span>
                    <span style="color: #666; font-size: 0.85rem;">${new Date(item.date).toLocaleTimeString()}</span>
                </div>
                <div style="margin-bottom: 0.5rem;">
                    <strong>Vendedor:</strong> ${item.sellerName}<br>
                    <span style="font-size: 0.9rem; color: #666;">Solicitou renovação de assinatura.</span>
                </div>
                <div style="margin-bottom: 1rem; text-align: center; background: #f8f8f8; padding: 0.5rem; border-radius: 4px;">
                    <img src="${item.proof}" style="max-height: 100px; max-width: 100%; border: 1px solid #ddd; cursor: zoom-in;" onclick="openImageModal('${item.proof}')">
                    <div style="font-size: 0.8rem; color: #888;">Clique para ampliar</div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="handleSubRequest(${item.id}, 'reject')" style="flex: 1; background: #fee2e2; color: #ef4444; border: none; padding: 0.6rem; border-radius: 6px; font-weight: bold; cursor: pointer;">
                        <i class="ph ph-x"></i> Recusar
                    </button>
                    <button onclick="handleSubRequest(${item.id}, 'approve')" style="flex: 1; background: var(--accent-green); color: white; border: none; padding: 0.6rem; border-radius: 6px; font-weight: bold; cursor: pointer;">
                        <i class="ph ph-check"></i> Aprovar
                    </button>
                </div>
            `;
        } else {
            // RENDER NORMAL ORDER CARD
            const itemsList = item.items.map(p =>
                `<div>${p.quantity}x ${p.name} - R$ ${(p.price * p.quantity).toFixed(2)}</div>`
            ).join('');

            const proofLink = item.proofImage ? `<button onclick="openImageModal('${item.proofImage}')" class="btn-sm btn-secondary" style="margin-top:5px; width: 100%;"><i class="ph ph-image"></i> Ver Comprovante</button>` : '';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-weight: bold; color: var(--text-primary);">
                    <span>${item.clientName || 'Cliente'} (#${item.id})</span>
                    <span class="status-badge active" style="font-size: 0.8rem;">${item.deliveryMethod === 'delivery' ? 'Entrega' : 'Retirada'}</span>
                </div>
                <div style="margin-bottom: 0.5rem; background: #f9f9f9; padding: 0.8rem; border-radius: 8px; font-size: 0.95rem;">${itemsList}</div>
                <div style="font-weight: bold; margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
                    <span>Total:</span>
                    <span>R$ ${parseFloat(item.total).toFixed(2)}</span>
                </div>
                <div style="margin-bottom:0.5rem;">${proofLink}</div>
                <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                    <button onclick="rejectOrder(${item.id})" style="flex: 1; background: #fee2e2; color: #ef4444; border: 1px solid transparent; padding: 0.6rem; border-radius: 6px; cursor: pointer; transition: 0.2s;">Recusar</button>
                    <button onclick="confirmOrder(${item.id})" style="flex: 1; background: var(--success); color: white; border: 1px solid transparent; padding: 0.6rem; border-radius: 6px; cursor: pointer; transition: 0.2s;">Confirmar</button>
                </div>
            `;
        }

        container.appendChild(card);
    });
}

function showOrderNotification() {
    const notif = document.getElementById('new-order-notification');
    if (notif) {
        notif.style.display = 'block';
        try { notificationAudio.play().catch(e => { }); } catch (e) { }
    }
}

function hideOrderNotification() {
    const notif = document.getElementById('new-order-notification');
    if (notif) notif.style.display = 'none';
}

function openOrderApprovalModal() {
    if (!pendingOrder) return;
    hideOrderNotification();
    const modal = document.getElementById('order-approval-modal');
    document.getElementById('approval-client-name').textContent = pendingOrder.clientName || 'Cliente';
    document.getElementById('approval-order-total').textContent = formatCurrency(pendingOrder.total);
    const proofImg = document.getElementById('approval-proof-image');
    if (pendingOrder.proofImage) { proofImg.src = pendingOrder.proofImage; proofImg.style.display = 'block'; document.getElementById('approval-no-proof').style.display = 'none'; }
    else { proofImg.style.display = 'none'; document.getElementById('approval-no-proof').style.display = 'block'; }

    // Items
    const list = document.getElementById('approval-items-list');
    list.innerHTML = '';
    pendingOrder.items.forEach(item => {
        list.innerHTML += `<li>${item.quantity}x ${item.name} - ${formatCurrency(item.price * item.quantity)}</li>`;
    });
    modal.style.display = 'flex';
}

function closeOrderApprovalModal() {
    document.getElementById('order-approval-modal').style.display = 'none';
    setTimeout(showOrderNotification, 5000);
}

function confirmOrder(orderId) {
    if (!confirm('Confirmar pedido?')) return;
    processOrderAction(orderId, 'confirm');
}

function rejectOrder(orderId) {
    if (!confirm('Recusar pedido?')) return;
    processOrderAction(orderId, 'reject');
}

function confirmCurrentOrder() {
    if (!pendingOrder) return;
    if (!confirm('Confirmar pagamento?')) return;
    processOrderAction(pendingOrder.id, 'confirm').then(() => { closeOrderApprovalModal(); hideOrderNotification(); pendingOrder = null; checkNewOrders(); });
}

function rejectCurrentOrder() {
    if (!pendingOrder) return;
    if (!confirm('Recusar?')) return;
    processOrderAction(pendingOrder.id, 'reject').then(() => { closeOrderApprovalModal(); hideOrderNotification(); pendingOrder = null; checkNewOrders(); });
}

function processOrderAction(orderId, action) {
    const token = localStorage.getItem('authToken');
    return fetch(`/api/pos/online-orders/${orderId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            alert(action === 'confirm' ? '✅ Aprovado!' : 'Recusado.');
            checkNewOrders();
            if (typeof loadSales === 'function') loadSales();
        })
        .catch(err => alert('Erro ao processar'));
}

// ==================== BACKUP & RESTORE ====================
function downloadBackup() {
    const token = localStorage.getItem('authToken');
    if (!token) return alert('Você precisa estar logado.');

    const btn = event.currentTarget; // Assuming calling from button onclick
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando Backup...';
    btn.disabled = true;

    fetch('/api/backup', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (response.ok) return response.blob();
            // Tenta ler o JSON de erro, se falhar usa o status text
            return response.json()
                .then(err => { throw new Error(err.error || response.statusText) })
                .catch(() => { throw new Error(`Erro ${response.status}: ${response.statusText || 'Falha na requisição'}`) });
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_loja_${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            alert('✅ Backup baixado com sucesso!');
        })
        .catch(err => {
            console.error(err);
            alert('Erro ao fazer backup: ' + err.message);
        })
        .finally(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
}

function restoreBackup() {
    const input = document.getElementById('backup-file-input');
    if (!input.files || !input.files[0]) {
        return alert('Por favor, selecione um arquivo de backup (.zip).');
    }

    if (!confirm('⚠️ ATENÇÃO: Isso irá substituir TODOS os dados atuais pelos do backup (Produtos, Fotos, Clientes, Vendas).\n\nTem certeza que deseja continuar?')) {
        return;
    }

    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('backup', input.files[0]);

    const btn = document.getElementById('btn-restore-backup');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Restaurando...';
    btn.disabled = true;

    fetch('/api/restore', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            alert('✅ ' + data.message);
            window.location.reload();
        })
        .catch(err => {
            console.error(err);
            alert('Erro ao restaurar: ' + err.message);
        })
        .finally(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
}

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;

    let icon = 'ph-info';
    if (type === 'success') icon = 'ph-check-circle';
    if (type === 'error') icon = 'ph-warning-circle';
    if (type === 'warning') icon = 'ph-warning';

    toast.innerHTML = `
        <i class="ph ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Trigger reflow
    toast.offsetHeight;

    // Show
    toast.classList.add('show');

    // Hide after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// ==================== IMAGE MODAL HELPER ====================
function openImageModal(src) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; cursor:pointer;';
    modal.onclick = () => modal.remove();

    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:90%; max-height:90%; border-radius:8px; box-shadow:0 0 20px rgba(0,0,0,0.5); transform:scale(0.9); transition:transform 0.2s;';

    // Simple animation
    setTimeout(() => img.style.transform = 'scale(1)', 10);

    modal.appendChild(img);
    document.body.appendChild(modal);
}

// ==================== APP INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    if (typeof checkServerStatus === 'function') checkServerStatus();
    if (typeof loadStoreConfig === 'function') loadStoreConfig();
    if (typeof startOnlineOrdersPolling === 'function') startOnlineOrdersPolling();
    if (typeof updateClock === 'function') { updateClock(); setInterval(updateClock, 1000); }
    if (typeof loadVersion === 'function') loadVersion();
});
