const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'app.js');

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // We look for the editProduct button structure. 
    // Since encoding is tricky, we'll use a regex that matches the function call and the class, ignoring the inner text.

    // Regex for Edit Button
    const editRegex = /<button onclick="editProduct\(\${product\.id}\)" class="btn-icon">.*?<\/button>/;

    // Regex for Delete Button
    const deleteRegex = /<button onclick="deleteProduct\(\${product\.id}\)" class="btn-icon">.*?<\/button>/;

    let newContent = content;

    // Replace Edit Button
    if (editRegex.test(newContent)) {
        console.log('Found Edit Button. Replacing...');
        newContent = newContent.replace(editRegex, `<button onclick="editProduct(\${product.id})" class="btn-icon" title="Editar"><i class="ph ph-pencil-simple"></i></button>`);
    } else {
        console.error('Edit button regex did not match.');
    }

    // Replace Delete Button
    if (deleteRegex.test(newContent)) {
        console.log('Found Delete Button. Replacing...');
        newContent = newContent.replace(deleteRegex, `<button onclick="deleteProduct(\${product.id})" class="btn-icon delete" title="Excluir"><i class="ph ph-trash"></i></button>`);
    } else {
        console.error('Delete button regex did not match.');
    }

    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Successfully updated app.js');
    } else {
        console.log('No changes made to app.js');
    }

} catch (err) {
    console.error('Error fixing buttons:', err);
}
