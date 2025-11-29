
// ==================== DEBUG FUNCTION ====================
window.debugProducts = function () {
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('DEBUG: Sem token de autenticação (Não logado?)');
        return;
    }

    alert('DEBUG: Iniciando busca de produtos...');

    fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(async response => {
            alert(`DEBUG: Status da resposta: ${response.status}`);
            const text = await response.text();
            alert(`DEBUG: Conteúdo da resposta (primeiros 100 chars): ${text.substring(0, 100)}`);

            try {
                const data = JSON.parse(text);
                console.log('DEBUG DATA:', data);
                alert(`DEBUG: JSON parseado com sucesso. É array? ${Array.isArray(data)}. Tamanho: ${Array.isArray(data) ? data.length : 'N/A'}`);

                if (Array.isArray(data)) {
                    const tbody = document.getElementById('products-table-body');
                    alert(`DEBUG: Elemento tbody encontrado? ${!!tbody}`);
                    if (tbody) {
                        // Force render
                        tbody.innerHTML = '';
                        data.forEach(p => {
                            tbody.innerHTML += `<tr><td>${p.name}</td><td>${p.price}</td></tr>`;
                        });
                        alert('DEBUG: Tentativa de renderização forçada concluída.');
                    }
                }
            } catch (e) {
                alert(`DEBUG: Erro ao fazer parse do JSON: ${e.message}`);
            }
        })
        .catch(err => {
            alert(`DEBUG: Erro no fetch: ${err.message}`);
        });
};
