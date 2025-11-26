const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, 'package.json');

try {
    const packageJson = require(packagePath);
    const versionParts = packageJson.version.split('.');

    // Increment patch version
    versionParts[2] = parseInt(versionParts[2]) + 1;

    packageJson.version = versionParts.join('.');

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 4));
    console.log(`Versão atualizada para ${packageJson.version}`);
} catch (error) {
    console.error('Erro ao atualizar versão:', error);
    process.exit(1);
}
