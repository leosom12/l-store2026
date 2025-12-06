// Função para Gerar Relatórios
function generateReport(type) {
    const container = document.getElementById('report-result-container');
    const titleEl = document.getElementById('report-title');
    const contentEl = document.getElementById('report-content');

    if (!container || !contentEl) return;

    container.style.display = 'block';
    contentEl.innerHTML = '<div style="text-align:center; padding: 2rem;"><i class="ph ph-spinner ph-spin" style="font-size: 2rem;"></i> Gerando relatório...</div>';

    let html = '<table class="data-table" style="width:100%"><thead><tr>';
    let title = '';
    let rows = '';

    // Simulate delay for effect or async operations
    setTimeout(() => {
        switch (type) {
            case 'sales-general':
                title = 'Relatório Geral de Vendas';
                html += '<th>ID</th><th>Data</th><th>Itens</th><th>Pagamento</th><th>Total</th></tr></thead><tbody>';

                // Usando a variável global sales se existir, senão array vazio
                const allSales = window.sales || [];
                if (allSales.length === 0) {
                    rows = '<tr><td colspan="5" style="text-align:center;">Nenhuma venda registrada.</td></tr>';
                } else {
                    allSales.forEach(sale => {
                        rows += `
                            <tr>
                                <td>${sale.id}</td>
                                <td>${new Date(sale.date).toLocaleString()}</td>
                                <td>${sale.items.length} itens</td>
                                <td>${sale.paymentMethod.toUpperCase()}</td>
                                <td>${formatCurrency(sale.total)}</td>
                            </tr>
                        `;
                    });
                }
                break;

            case 'sales-cashier':
                title = 'Relatório de Vendas do Caixa (Sessão Atual)';
                html += '<th>Data</th><th>Operador</th><th>Total Vendas</th><th>Dinheiro em Caixa</th></tr></thead><tbody>';
                // Placeholder logic - assumption: current session data
                const currentSession = window.cashRegister || { salesTotal: 0, balance: 0, openingTime: new Date() };
                rows += `
                    <tr>
                        <td>${new Date(currentSession.openingTime).toLocaleString()}</td>
                        <td>${localStorage.getItem('username') || 'Admin'}</td>
                        <td>${formatCurrency(currentSession.salesTotal || 0)}</td>
                        <td>${formatCurrency(currentSession.balance || 0)}</td>
                    </tr>
                `;
                break;

            case 'boletos':
                title = 'Relatório de Boletos';
                html += '<th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>';
                const allBoletos = window.boletos || [];
                if (allBoletos.length === 0) {
                    rows = '<tr><td colspan="4" style="text-align:center;">Nenhum boleto registrado.</td></tr>';
                } else {
                    allBoletos.forEach(boleto => {
                        rows += `
                            <tr>
                                <td>${boleto.description}</td>
                                <td>${new Date(boleto.dueDate).toLocaleDateString()}</td>
                                <td>${formatCurrency(boleto.amount)}</td>
                                <td>${boleto.status === 'paid' ? '<span style="color:green">Pago</span>' : '<span style="color:red">Pendente</span>'}</td>
                            </tr>
                        `;
                    });
                }
                break;

            case 'stock-current':
                title = 'Estoque Atual';
                html += '<th>Produto</th><th>Categoria</th><th>Preço Custo</th><th>Preço Venda</th><th>Qtd</th></tr></thead><tbody>';
                const allProducts = window.products || [];
                if (allProducts.length === 0) {
                    rows = '<tr><td colspan="5" style="text-align:center;">Nenhum produto cadastrado.</td></tr>';
                } else {
                    allProducts.forEach(p => {
                        rows += `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.category}</td>
                                <td>${formatCurrency(p.costPrice || 0)}</td>
                                <td>${formatCurrency(p.price)}</td>
                                <td style="${p.stock <= 5 ? 'color:red; font-weight:bold;' : ''}">${p.stock}</td>
                            </tr>
                        `;
                    });
                }
                break;

            case 'stock-entry':
                title = 'Relatório de Entrada de Mercadoria';
                html += '<th>Data</th><th>Produto</th><th>Qtd Entrada</th><th>Usuário</th></tr></thead><tbody>';
                // Mock data or need a dedicated array for stock movements
                rows = '<tr><td colspan="4" style="text-align:center;">Funcionalidade de histórico de entrada em desenvolvimento.</td></tr>';
                break;

            case 'stock-exit':
                title = 'Relatório de Saída de Mercadoria';
                html += '<th>Data</th><th>Produto</th><th>Qtd Saída</th><th>Motivo</th></tr></thead><tbody>';
                // Mock data
                rows = '<tr><td colspan="4" style="text-align:center;">Funcionalidade de histórico de saída em desenvolvimento.</td></tr>';
                break;

            case 'payments-pix-cash':
                title = 'Relatório PIX vs Dinheiro';
                html += '<th>Método</th><th>Qtd Transações</th><th>Total Recebido</th></tr></thead><tbody>';
                const salesForStats = window.sales || [];
                let pixTotal = 0;
                let cashTotal = 0;
                let pixCount = 0;
                let cashCount = 0;

                salesForStats.forEach(s => {
                    if (s.paymentMethod === 'pix') {
                        pixTotal += s.total;
                        pixCount++;
                    } else if (s.paymentMethod === 'dinheiro') {
                        cashTotal += s.total;
                        cashCount++;
                    }
                });

                rows += `
                    <tr>
                        <td>PIX</td>
                        <td>${pixCount}</td>
                        <td>${formatCurrency(pixTotal)}</td>
                    </tr>
                    <tr>
                        <td>Dinheiro</td>
                        <td>${cashCount}</td>
                        <td>${formatCurrency(cashTotal)}</td>
                    </tr>
                `;
                break;

            case 'debtors':
                title = 'Relatório de Clientes Devedores';
                html += '<th>Nome</th><th>Telefone</th><th>Dívida</th><th>Última Compra</th></tr></thead><tbody>';
                const debtors = window.debtors || []; // Assuming a debtors array exists
                if (debtors.length === 0) {
                    rows = '<tr><td colspan="4" style="text-align:center;">Nenhum cliente devedor.</td></tr>';
                } else {
                    debtors.forEach(d => {
                        rows += `
                            <tr>
                                <td>${d.name}</td>
                                <td>${d.phone || '-'}</td>
                                <td style="color:red;">${formatCurrency(d.debt || 0)}</td>
                                <td>${d.lastPurchaseDate ? new Date(d.lastPurchaseDate).toLocaleDateString() : '-'}</td>
                            </tr>
                        `;
                    });
                }
                break;
        }

        html += rows + '</tbody></table>';

        titleEl.textContent = title;
        contentEl.innerHTML = html;

    }, 500);
}

function printReport() {
    const printContent = document.getElementById('report-result-container').innerHTML;
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = `
        <div style="padding: 2rem;">
            <h1>L-STORE PDV - Relatório</h1>
            <p>Gerado em: ${new Date().toLocaleString()}</p>
            <hr>
            ${printContent}
        </div>
    `;

    window.print();

    document.body.innerHTML = originalContent;
    // Rebind events or reload page might be safer in SPA context, but for simple DOM replace:
    window.location.reload();
}
