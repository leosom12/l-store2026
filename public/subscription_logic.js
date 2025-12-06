
// ==================== ASSINATURA / SUBSCRIPTION LOGIC ====================

// Local Helpers to ensure independence
function sub_generateCRC16(payload) {
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

function sub_generatePixPayload(key, name, city, amount, txId = '***') {
    const formatField = (id, value) => {
        const len = value.length.toString().padStart(2, '0');
        return `${id}${len}${value}`;
    };

    const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

    const merchantAccount = formatField('00', 'BR.GOV.BCB.PIX') + formatField('01', key);
    const merchantCategory = '0000';
    const transactionCurrency = '986';
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

    const crc = sub_generateCRC16(payload);
    return payload + crc;
}

// Generate and Display Subscription PIX QR
function generateSubscriptionPIX() {
    const container = document.getElementById('sub-qr-code');
    if (!container) return;

    // Always regenerate to ensure it's visible (switching tabs might require re-render if using canvas, but IMG is safe)
    // using API to prevent hidden canvas issues

    const pixKey = '62819358000106';
    const amount = 50.00;
    const name = 'L-PDV TECNOLOGIA';
    const city = 'BRASILIA';

    try {
        const payload = sub_generatePixPayload(pixKey, name, city, amount, 'SUB-RENEW');
        console.log('Generated Subscription Payload:', payload);

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}" 
                     alt="QR Code PIX" 
                     style="width: 250px; height: 250px; border-radius: 8px;">
                     
                <p style="margin-top: 1rem; font-weight: bold; font-size: 1.2rem;">Valor: R$ ${amount.toFixed(2)}</p>
                <div style="text-align: center; margin-bottom: 1rem; color: var(--text-secondary);">
                    <p style="margin: 0; font-size: 0.9rem;">Destinatário: ${name}</p>
                    <p style="margin: 0; font-size: 0.95rem; font-weight: bold; color: var(--accent-green);">Chave CNPJ: 62.819.358/0001-06</p>
                </div>
                
                <div style="margin-top: 0.5rem; width: 100%;">
                    <input type="text" value="${payload}" readonly 
                        style="width: 100%; font-size: 0.8rem; padding: 5px; background: #eee; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 5px; color: #333;">
                    <button class="btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${payload}'); alert('Código Copiado!')" style="width: 100%;">
                        <i class="ph ph-copy"></i> Copiar Código PIX
                    </button>
                </div>
            </div>
        `;

    } catch (e) {
        console.error('Erro ao gerar QR Code Assinatura:', e);
        container.innerHTML = '<p style="color:red">Erro ao gerar QR Code. Tente recarregar.</p>';
    }
}

// Upload Proof
function uploadSubscriptionProof() {
    const fileInput = document.getElementById('sub-proof-file');
    if (!fileInput || !fileInput.files[0]) {
        alert('Por favor, selecione uma foto do comprovante.');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const proofImage = e.target.result;

        let sellerName = 'Vendedor Desconhecido';
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData.username) {
                sellerName = userData.username; // Razão Social stored as username
            }
        } catch (e) {
            console.error('Erro ao ler dados do usuário:', e);
        }

        // Create Request Object
        const request = {
            id: Date.now(),
            type: 'subscription_renewal',
            sellerName: sellerName,
            proof: proofImage,
            date: new Date().toISOString(),
            status: 'pending'
        };

        const requests = JSON.parse(localStorage.getItem('subscription_requests') || '[]');
        requests.push(request);
        localStorage.setItem('subscription_requests', JSON.stringify(requests));

        alert('✅ Comprovante enviado com sucesso!\nO administrador analisará sua solicitação.');
        fileInput.value = ''; // Reset
    };

    reader.readAsDataURL(file);
}

// Global Admin Hook
window.openSubscriptionRequests = function () {
    const requests = JSON.parse(localStorage.getItem('subscription_requests') || '[]');
    const pending = requests.filter(r => r.status === 'pending');

    if (pending.length === 0) {
        alert('Nenhuma solicitação pendente.');
        return;
    }

    renderSubscriptionRequest(pending[0]);
};

function renderSubscriptionRequest(req) {
    // Remove if existing
    const existing = document.getElementById('sub-request-modal');
    if (existing) existing.remove();

    const overlayHtml = `
        <div id="sub-request-modal" class="modal-overlay" style="display:flex; z-index: 3000;">
            <div class="modal-content" style="max-width:500px;">
                <div class="modal-header">
                    <h3><i class="ph ph-crown"></i> Solicitação de Renovação</h3>
                    <button onclick="document.getElementById('sub-request-modal').remove()" class="close-modal">&times;</button>
                </div>
                <div class="modal-body" style="text-align:center;">
                    <p><strong>Vendedor:</strong> ${req.sellerName}</p>
                    <p class="text-secondary">${new Date(req.date).toLocaleString()}</p>
                    
                    <div style="margin: 1rem 0; background: #eee; padding: 10px; border-radius: 8px;">
                        <img src="${req.proof}" style="max-width: 100%; max-height: 300px; border-radius: 4px; object-fit: contain;">
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn-danger" onclick="handleSubRequest(${req.id}, 'reject')">Excluir/Rejeitar</button>
                        <button class="btn-success" onclick="handleSubRequest(${req.id}, 'approve')">Confirmar Renovação</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = overlayHtml;
    document.body.appendChild(div.firstElementChild);
}

window.handleSubRequest = function (id, action) {
    let requests = JSON.parse(localStorage.getItem('subscription_requests') || '[]');
    const index = requests.findIndex(r => r.id === id);
    if (index === -1) return;

    if (action === 'approve') {
        requests[index].status = 'approved';
        alert('Assinatura renovada com sucesso!');
    } else {
        requests[index].status = 'rejected';
        alert('Solicitação rejeitada/excluída.');
    }

    localStorage.setItem('subscription_requests', JSON.stringify(requests));
    document.getElementById('sub-request-modal').remove();

    // Check for more
    const pending = requests.filter(r => r.status === 'pending');
    if (pending.length > 0) {
        renderSubscriptionRequest(pending[0]);
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Attempt generate immediately AND on click
    generateSubscriptionPIX();

    // Hook into implicit tab clicks if possible, otherwise interval check for visibility
    setInterval(() => {
        const container = document.getElementById('sub-qr-code');
        // If container is visible and empty/error, retry
        if (container && container.offsetParent !== null && container.innerHTML.trim() === '') {
            generateSubscriptionPIX();
        }
    }, 2000);
});
