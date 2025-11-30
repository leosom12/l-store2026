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

// Test Case
const key = '12345678900';
const name = 'Fulano de Tal';
const city = 'BRASILIA';
const amount = 100.00;

console.log('Gerando payload PIX...');
const payload = generatePixPayload(key, name, city, amount);
console.log('Payload:', payload);

// Basic Validation
if (payload.startsWith('000201') && payload.length > 20) {
    console.log('✅ Formato básico OK');
} else {
    console.error('❌ Formato inválido');
}

// Check CRC presence (last 4 chars)
const crc = payload.substring(payload.length - 4);
console.log('CRC:', crc);
if (/^[0-9A-F]{4}$/.test(crc)) {
    console.log('✅ CRC formato OK');
} else {
    console.error('❌ CRC formato inválido');
}
