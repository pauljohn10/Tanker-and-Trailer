const fs = require('fs');
let content = fs.readFileSync('src/lib/pdfHelper.ts', 'utf8');

// We will replace everything from `// --- APPROVAL & SIGNATURE SECTION ---` to `const finalDocumentY = ...`

const startMarker = `// --- APPROVAL & SIGNATURE SECTION ---`;
const endMarker = `const finalDocumentY =`;

let startIndex = content.indexOf(startMarker);
let endIndex = content.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find markers!");
  process.exit(1);
}

// Find the line that actually contains `const finalDocumentY`
const endOfEndMarker = content.indexOf(';', endIndex) + 1;

const newSection = `// --- APPROVAL & SIGNATURE SECTION ---
  let currentSignY = section2FinalY + 15;
  const signatureSpaceRequired = 130; 
  if (currentSignY + signatureSpaceRequired > pageH - 20) {
    doc.addPage();
    drawCompactRunningHeader({ pageNumber: doc.getNumberOfPages() });
    currentSignY = margin + 15;
  }

  // Draw Section Title
  doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
  doc.setFont(pdfFont, 'bold');
  doc.setFontSize(isAr ? 14 : 13);
  const signatureTitle = isAr ? 'قسم الاعتماد والتوقيع' : 'Approval & Signature Section';
  
  if (isAr) {
    (doc as any).text(signatureTitle, pageW - margin, currentSignY, { align: 'right', isRtl: true });
  } else {
    doc.text(signatureTitle, margin, currentSignY);
  }
  
  currentSignY += 4;
  doc.setDrawColor(colors.primary.r, colors.primary.g, colors.primary.b);
  doc.setLineWidth(0.4);
  doc.line(margin, currentSignY, pageW - margin, currentSignY);
  currentSignY += 8;

  // Helper to draw a signature block
  const drawSignBlock = (x, y, name, position, isAr, scale = 1) => {
    const blockW = 60 * scale;
    const lineSpace = 6 * scale;
    
    doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
    doc.setFont(pdfFont, 'normal');
    doc.setFontSize((isAr ? 8.5 : 8) * scale);
    
    const signLabel = isAr ? 'التوقيع:' : 'Signature:';
    const dateLabel = isAr ? 'التاريخ:' : 'Date:';
    const nameLabel = isAr ? 'الاسم:' : 'Name:';
    const posLabel = isAr ? 'المنصب:' : 'Position:';
    const lineStr = '_____________________';

    if (isAr) {
      (doc as any).text(signLabel, x + blockW, y, { align: 'right', isRtl: true });
      (doc as any).text(lineStr, x + blockW - 15 * scale, y, { align: 'right', isRtl: true });
      
      (doc as any).text(nameLabel, x + blockW, y + lineSpace, { align: 'right', isRtl: true });
      doc.setFont(pdfFont, 'bold');
      (doc as any).text(name, x + blockW - 15 * scale, y + lineSpace, { align: 'right', isRtl: true });
      doc.setFont(pdfFont, 'normal');
      
      (doc as any).text(posLabel, x + blockW, y + 2 * lineSpace, { align: 'right', isRtl: true });
      (doc as any).text(position, x + blockW - 15 * scale, y + 2 * lineSpace, { align: 'right', isRtl: true });
      
      (doc as any).text(dateLabel, x + blockW, y + 3 * lineSpace, { align: 'right', isRtl: true });
      (doc as any).text(lineStr, x + blockW - 15 * scale, y + 3 * lineSpace, { align: 'right', isRtl: true });
    } else {
      doc.text(signLabel, x, y);
      doc.text(lineStr, x + 18 * scale, y);
      
      doc.text(nameLabel, x, y + lineSpace);
      doc.setFont(pdfFont, 'bold');
      doc.text(name, x + 18 * scale, y + lineSpace);
      doc.setFont(pdfFont, 'normal');
      
      doc.text(posLabel, x, y + 2 * lineSpace);
      doc.text(position, x + 18 * scale, y + 2 * lineSpace);
      
      doc.text(dateLabel, x, y + 3 * lineSpace);
      doc.text(lineStr, x + 18 * scale, y + 3 * lineSpace);
    }
  };

  const drawGroupTitle = (title, y) => {
    doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(isAr ? 11 : 10.5);
    if (isAr) {
      (doc as any).text(title, pageW - margin, y, { align: 'right', isRtl: true });
    } else {
      doc.text(title, margin, y);
    }
  };

  // Group A: Prepared By
  drawGroupTitle(isAr ? 'أ. إعداد بواسطة' : 'A. Prepared By', currentSignY);
  currentSignY += 6;
  
  let blockX = margin;
  if (isAr) blockX = pageW - margin - 60;
  
  drawSignBlock(blockX, currentSignY, isAr ? 'جينو تايوبونج' : 'Gyno Tayobong', isAr ? 'مساعد تنفيذي' : 'Executive Assistant', isAr);
  
  let secondBlockX = margin + 80;
  if (isAr) secondBlockX = pageW - margin - 60 - 80;
  
  drawSignBlock(secondBlockX, currentSignY, isAr ? 'جميل فرهود' : 'Jamil Farhoud', isAr ? 'مراقب مستودع - المنطقة الشرقية' : 'Warehouse Controller - Eastern Region', isAr);
  
  currentSignY += 30; // Move down for next group

  // Group B: Acknowledged By
  drawGroupTitle(isAr ? 'ب. إقرار بواسطة' : 'B. Acknowledged By', currentSignY);
  currentSignY += 6;
  
  // 4 blocks, we do 2x2 grid
  const bSpacingX = 80;
  const bSpacingY = 28;
  
  const bTeam = [
    { n: isAr ? 'محمد الشاذلي' : 'Mohammed Al Shazli', p: isAr ? 'رئيس قسم الصيانة' : 'Head of Maintenance' },
    { n: isAr ? 'م. راكان عدنان' : 'Eng. Rakan Adnan', p: isAr ? 'مدير الورشة' : 'Workshop Manager' },
    { n: isAr ? 'تادرس فرهود' : 'Tadroos Farhoud', p: isAr ? 'مدير المستودع' : 'Warehouse Manager' },
    { n: isAr ? 'أحمد رأفت' : 'Ahmed Rafat', p: isAr ? 'محاسب' : 'Accountant' }
  ];

  bTeam.forEach((person, idx) => {
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    let bX = margin + col * bSpacingX;
    if (isAr) {
      bX = pageW - margin - 60 - (col * bSpacingX);
    }
    drawSignBlock(bX, currentSignY + row * bSpacingY, person.n, person.p, isAr);
  });
  
  currentSignY += (2 * bSpacingY) + 6;

  // Group C: Higher Management Approval (Centered and Larger)
  // Check space before drawing Management
  if (currentSignY + 45 > pageH - 20) {
    doc.addPage();
    drawCompactRunningHeader({ pageNumber: doc.getNumberOfPages() });
    currentSignY = margin + 15;
  }
  
  drawGroupTitle(isAr ? 'ج. اعتماد الإدارة العليا' : 'C. Higher Management Approval', currentSignY);
  currentSignY += 8; // Extra spacing for executives

  const execTeam = [
    { n: isAr ? 'أ. حنتش أحمد' : 'Mr. Hantash Ahmed', p: isAr ? 'المدير الإقليمي - المنطقة الشرقية' : 'Regional Manager - Eastern Region' },
    { n: isAr ? 'أ. حسن أحمد' : 'Mr. Hassan Ahmed', p: isAr ? 'المدير المالي' : 'CFO - Chief Financial Officer' },
    { n: isAr ? 'أ. مانع أحمد' : 'Mr. Mana Ahmed', p: isAr ? 'الرئيس التنفيذي' : 'CEO - Chief Executive Officer' }
  ];

  // Distribute 3 blocks evenly across the page width
  // Total width available = pageW - 2 * margin
  // We want to center them. Width of each block roughly 60 * 1.15 = 69.
  // We place one on the left, one center, one right.
  const blockW = 70;
  const cSpacingX = (pageW - 2 * margin - blockW) / 2;
  
  execTeam.forEach((person, idx) => {
    let cX = margin + idx * cSpacingX;
    if (isAr) {
      cX = pageW - margin - blockW - (idx * cSpacingX);
    }
    // Make them slightly larger (scale = 1.15)
    drawSignBlock(cX, currentSignY, person.n, person.p, isAr, 1.15);
  });
  
  currentSignY += 35;

  const finalDocumentY = currentSignY;`;

content = content.slice(0, startIndex) + newSection + content.slice(endOfEndMarker);

// Now let's fix the pagination spacing by replacing margins and additions
content = content.replace(/currentY \+= 15;/g, 'currentY += 12;');
content = content.replace(/currentY \+= 10;/g, 'currentY += 6;');
content = content.replace(/currentY \+= cardH \+ 4;/g, 'currentY += cardH + 2;');
content = content.replace(/currentY \+= chartCardH \+ 4;/g, 'currentY += chartCardH + 2;');
content = content.replace(/margin: \{ left: margin, right: margin, bottom: 20 \}/g, 'margin: { left: margin, right: margin, bottom: 12 }');

fs.writeFileSync('src/lib/pdfHelper.ts', content);
console.log('Successfully applied signatures block and pagination fix.');
