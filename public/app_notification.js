
// ==================== ORDER NOTIFICATION SYSTEM ====================

let pendingOrder = null;
let notificationAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Sound effect

function startOnlineOrdersPolling() {
    // Check every 10 seconds
    setInterval(checkNewOrders, 10000);
    checkNewOrders(); // Initial check
}

function checkNewOrders() {
    // Only check if we are in POS mode (Logged in as Store/Admin)
    const token = localStorage.getItem('authToken');
    if (!token) return;

    fetch('/api/pos/online-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(orders => {
            if (orders && orders.length > 0) {
                // Found pending orders!
                // Show notification for the OLDEST pending order first
                const oldestOrder = orders[0];

                // Only notify if we are not already showing this order
                if (!pendingOrder || pendingOrder.id !== oldestOrder.id) {
                    pendingOrder = oldestOrder;
                    showOrderNotification();
                }
            } else {
                // No pending orders
                hideOrderNotification();
                pendingOrder = null;
            }
        })
        .catch(err => console.error('Error polling orders:', err));
}

function showOrderNotification() {
    const notif = document.getElementById('new-order-notification');
    if (notif) {
        notif.style.display = 'block';
        try {
            notificationAudio.play().catch(e => console.log('Audio play failed (user interaction needed first)'));
        } catch (e) { }
    }
}

function hideOrderNotification() {
    const notif = document.getElementById('new-order-notification');
    if (notif) notif.style.display = 'none';
}

function openOrderApprovalModal() {
    if (!pendingOrder) return;

    hideOrderNotification(); // Hide notification while viewing

    const modal = document.getElementById('order-approval-modal');
    const proofImg = document.getElementById('approval-proof-image');
    const noProof = document.getElementById('approval-no-proof');
    const clientName = document.getElementById('approval-client-name');
    const total = document.getElementById('approval-order-total');
    const itemsList = document.getElementById('approval-items-list');

    // Populate data
    clientName.textContent = pendingOrder.clientName || 'Cliente';
    total.textContent = formatCurrency(pendingOrder.total);

    // Proof Image
    if (pendingOrder.proofImage) {
        proofImg.src = pendingOrder.proofImage;
        proofImg.style.display = 'block';
        noProof.style.display = 'none';
    } else {
        proofImg.style.display = 'none';
        noProof.style.display = 'block';
    }

    // Items
    itemsList.innerHTML = '';
    if (pendingOrder.items) {
        pendingOrder.items.forEach(item => {
            const li = document.createElement('li');
            li.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            li.style.padding = '10px 0';
            li.innerHTML = `
                <div style="display: flex; justify-content: space-between;">
                    <span>${item.quantity}x ${item.name}</span>
                    <span style="font-weight: bold;">${formatCurrency(item.price * item.quantity)}</span>
                </div>
            `;
            itemsList.appendChild(li);
        });
    }

    modal.style.display = 'flex';
}

function closeOrderApprovalModal() {
    document.getElementById('order-approval-modal').style.display = 'none';
    // Re-show notification if order still pending? 
    // Or assume user wants to ignore it for a bit
    setTimeout(showOrderNotification, 5000); // Remind in 5s if still pending
}

function confirmCurrentOrder() {
    if (!pendingOrder) return;

    if (!confirm('Confirmar pagamento e finalizar pedido?')) return;

    const token = localStorage.getItem('authToken');
    fetch(`/api/pos/online-orders/${pendingOrder.id}/confirm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            alert('✅ Pedido Aprovado!');
            document.getElementById('order-approval-modal').style.display = 'none';
            pendingOrder = null; // Clear current
            checkNewOrders(); // Check for next one
            if (typeof loadSales === 'function') loadSales(); // Refresh sales list if visible
        })
        .catch(err => alert('Erro ao confirmar pedido'));
}

function rejectCurrentOrder() {
    if (!pendingOrder) return;

    if (!confirm('Recusar este pedido? O cliente será notificado (futuramente).')) return;

    const token = localStorage.getItem('authToken');
    fetch(`/api/pos/online-orders/${pendingOrder.id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            alert('Pedido rejeitado.');
            document.getElementById('order-approval-modal').style.display = 'none';
            pendingOrder = null;
            checkNewOrders();
        })
        .catch(err => alert('Erro ao recusar pedido'));
}
