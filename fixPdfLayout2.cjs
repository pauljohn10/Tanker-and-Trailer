const fs = require('fs');
const path = require('path');

const pdfHelperPath = path.join(__dirname, 'src', 'lib', 'pdfHelper.ts');
let content = fs.readFileSync(pdfHelperPath, 'utf8');

// Replace all remaining calls
content = content.replace(/didDrawPage: \(data: any\) => \{\s*drawCompactRunningHeader\(data\);\s*\}/g, 'didDrawPage: () => {}');
content = content.replace(/drawCompactRunningHeader\(data\);/g, '');

fs.writeFileSync(pdfHelperPath, content);
console.log('Fixed remaining drawCompactRunningHeader calls.');
