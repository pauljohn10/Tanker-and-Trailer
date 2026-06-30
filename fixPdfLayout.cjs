const fs = require('fs');
const path = require('path');

const pdfHelperPath = path.join(__dirname, 'src', 'lib', 'pdfHelper.ts');
let content = fs.readFileSync(pdfHelperPath, 'utf8');

// 1. Remove drawCompactRunningHeader completely
content = content.replace(/\/\/ Set up running page headers on page 2\+[\s\S]*?const drawCompactRunningHeader = \(data: any\) => \{[\s\S]*?\};\n/g, '');

// 2. Remove didDrawPage calls that use it
content = content.replace(/didDrawPage: \(data: any\) => \{\s*drawCompactRunningHeader\(data\);\s*\}/g, 'didDrawPage: () => {}');

// 3. Remove "Footer note matching the dashboard"
content = content.replace(/\/\/ Footer note matching the dashboard[\s\S]*?doc\.text\(footerNote, margin, finalDocumentY \+ 8\);\s*\}/g, '');

// 4. Update the footer loop to only show the page number
const oldFooterLogic = `    // Left Footer
    const footerConf = isAr 
      ? 'مؤسسة النور المتحدة للنقل - وثيقة رسمية سرية' 
      : 'AL NOOR UNITED TRANSPORTATION EST. - Confidential Official Document';
    
    // Center Footer
    const footerAudit = isAr 
      ? 'تدقيق عمليات أسطول تخطيط موارد المؤسسات الآلي' 
      : 'Automated ERP Fleet Operations Audit';

    // Right Footer - Accurate "Page X of Y"
    const footerPage = isAr 
      ? \`صفحة \${i} من \${totalPagesCount}\` 
      : \`Page \${i} of \${totalPagesCount}\`;

    if (isAr) {
      (doc as any).text(footerConf, pageW - margin, pageH - 8, { align: 'right', isRtl: true });
      (doc as any).text(footerAudit, pageW / 2, pageH - 8, { align: 'center', isRtl: true });
      (doc as any).text(footerPage, margin, pageH - 8, { align: 'left', isRtl: true });
    } else {
      doc.text(footerConf, margin, pageH - 8);
      doc.text(footerAudit, pageW / 2, pageH - 8, { align: 'center' });
      doc.text(footerPage, pageW - margin, pageH - 8, { align: 'right' });
    }`;

const newFooterLogic = `    // Right Footer - Accurate "Page X of Y"
    const footerPage = isAr 
      ? \`صفحة \${i} من \${totalPagesCount}\` 
      : \`Page \${i} of \${totalPagesCount}\`;

    if (isAr) {
      (doc as any).text(footerPage, margin, pageH - 8, { align: 'left', isRtl: true });
    } else {
      doc.text(footerPage, pageW - margin, pageH - 8, { align: 'right' });
    }`;

content = content.replace(oldFooterLogic, newFooterLogic);

// Ensure the first regex didn't fail
if (content.includes('drawCompactRunningHeader')) {
  // Try alternative regex or string replacement if the exact match failed due to formatting
  content = content.replace(/const drawCompactRunningHeader = \(data: any\) => \{[\s\S]*?\};/g, '');
  content = content.replace(/didDrawPage: \(data: any\) => \{\s*drawCompactRunningHeader\(data\);\s*\}/g, 'didDrawPage: () => {}');
  content = content.replace(/drawCompactRunningHeader\(data\);/g, '');
}

fs.writeFileSync(pdfHelperPath, content);
console.log('Fixed pdfHelper.ts layout and footers.');

const reportsPath = path.join(__dirname, 'src', 'components', 'Reports.tsx');
if (fs.existsSync(reportsPath)) {
  let reportsContent = fs.readFileSync(reportsPath, 'utf8');
  reportsContent = reportsContent.replace(
    /\s*\{isRtl \? '\* تعكس هذه البيانات سجلات التدقيق والسلامة الرسمية المعتمدة من أرامكو السعودية.' : '\* Seeding reflects official Saudi ARAMCO safety audits.'\}/g,
    ''
  );
  fs.writeFileSync(reportsPath, reportsContent);
  console.log('Fixed Reports.tsx note.');
}
