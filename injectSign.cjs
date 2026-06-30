const fs = require('fs');
let content = fs.readFileSync('src/lib/pdfHelper.ts', 'utf8');

const anchor = `  const section2FinalY = (doc as any).lastAutoTable.finalY;`;

const newCode = `
  const section2FinalY = (doc as any).lastAutoTable.finalY;

  // --- APPROVAL & SIGNATURE SECTION ---
  let currentSignY = section2FinalY + 15;
  const signatureSpaceRequired = 110; 
  if (currentSignY + signatureSpaceRequired > pageH - 20) {
    doc.addPage();
    drawCompactRunningHeader({ pageNumber: doc.getNumberOfPages() });
    currentSignY = margin + 15;
  }

  doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
  doc.setFont(pdfFont, 'bold');
  doc.setFontSize(isAr ? 12 : 11);
  const signatureTitle = isAr ? 'قسم الاعتماد والتوقيع' : 'Approval & Signature Section';
  
  if (isAr) {
    (doc as any).text(signatureTitle, pageW - margin, currentSignY, { align: 'right', isRtl: true });
  } else {
    doc.text(signatureTitle, margin, currentSignY);
  }
  
  currentSignY += 8;

  const getSignatureStyles = () => ({
    theme: 'grid' as const,
    margin: { left: margin, right: margin },
    styles: { font: pdfFont, fontSize: isAr ? 8.5 : 8, cellPadding: 3, textColor: [51, 65, 85] as [number, number, number], lineColor: [226, 232, 240] as [number, number, number], lineWidth: 0.1 },
    headStyles: { fillColor: [248, 250, 252] as [number, number, number], textColor: [15, 23, 42] as [number, number, number], fontStyle: 'bold' as const, halign: isAr ? 'right' as const : 'left' as const },
    bodyStyles: { halign: isAr ? 'right' as const : 'left' as const, valign: 'middle' as const },
  });

  const tableAHead = isAr ? [['الاسم', 'المنصب', 'التوقيع', 'الحالة', 'التاريخ']] : [['Name', 'Position', 'Signature', 'Status', 'Date']];
  const tableABody = [
    [isAr ? 'جينو تايوبونج' : 'Gyno Tayobong', isAr ? 'مساعد تنفيذي' : 'Executive Assistant', '____________________', 'PENDING', '__________'],
    [isAr ? 'جميل فرهود' : 'Jamil Farhoud', isAr ? 'مراقب مستودع - المنطقة الشرقية' : 'Warehouse Controller - Eastern Region', '____________________', 'PENDING', '__________']
  ];
  
  doc.setFontSize(isAr ? 9.5 : 9);
  doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
  if (isAr) {
    (doc as any).text('أ. إعداد بواسطة', pageW - margin, currentSignY, { align: 'right', isRtl: true });
  } else {
    doc.text('A. Prepared By', margin, currentSignY);
  }
  currentSignY += 3;

  autoTable(doc, {
    startY: currentSignY,
    head: tableAHead,
    body: tableABody,
    ...getSignatureStyles()
  });
  
  currentSignY = (doc as any).lastAutoTable.finalY + 8;

  const tableBBody = [
    [isAr ? 'محمد الشاذلي' : 'Mohammed Al Shazli', isAr ? 'رئيس قسم الصيانة' : 'Head of Maintenance', '____________________', 'PENDING', '__________'],
    [isAr ? 'م. راكان عدنان' : 'Eng. Rakan Adnan', isAr ? 'مدير الورشة' : 'Workshop Manager', '____________________', 'PENDING', '__________'],
    [isAr ? 'تادرس فرهود' : 'Tadroos Farhoud', isAr ? 'مدير المستودع' : 'Warehouse Manager', '____________________', 'PENDING', '__________'],
    [isAr ? 'أحمد رأفت' : 'Ahmed Rafat', isAr ? 'محاسب' : 'Accountant', '____________________', 'PENDING', '__________']
  ];

  if (isAr) {
    (doc as any).text('ب. إقرار بواسطة', pageW - margin, currentSignY, { align: 'right', isRtl: true });
  } else {
    doc.text('B. Acknowledged By', margin, currentSignY);
  }
  currentSignY += 3;

  autoTable(doc, {
    startY: currentSignY,
    head: tableAHead,
    body: tableBBody,
    ...getSignatureStyles()
  });

  currentSignY = (doc as any).lastAutoTable.finalY + 8;

  const tableCBody = [
    [isAr ? 'أ. حنتش أحمد' : 'Mr. Hantash Ahmed', isAr ? 'المدير الإقليمي - المنطقة الشرقية' : 'Regional Manager - Eastern Region', '____________________', 'PENDING', '__________'],
    [isAr ? 'أ. حسن أحمد' : 'Mr. Hassan Ahmed', isAr ? 'المدير المالي' : 'CFO - Chief Financial Officer', '____________________', 'PENDING', '__________'],
    [isAr ? 'أ. مانع أحمد' : 'Mr. Mana Ahmed', isAr ? 'الرئيس التنفيذي' : 'CEO - Chief Executive Officer', '____________________', 'PENDING', '__________']
  ];

  if (isAr) {
    (doc as any).text('ج. اعتماد الإدارة العليا', pageW - margin, currentSignY, { align: 'right', isRtl: true });
  } else {
    doc.text('C. Higher Management Approval', margin, currentSignY);
  }
  currentSignY += 3;

  autoTable(doc, {
    startY: currentSignY,
    head: tableAHead,
    body: tableCBody,
    ...getSignatureStyles()
  });

  const finalDocumentY = (doc as any).lastAutoTable.finalY;
`;

if (content.includes('APPROVAL & SIGNATURE SECTION')) {
  console.log('Already added');
} else {
  content = content.replace(anchor, newCode);
  
  // also adjust footer to be below finalDocumentY
  content = content.replace(
    /section2FinalY \+ 5\.5/g, 
    'finalDocumentY + 8'
  );
  content = content.replace(
    /section2FinalY \+ 4\.5/g, 
    'finalDocumentY + 8'
  );
  
  fs.writeFileSync('src/lib/pdfHelper.ts', content);
  console.log('Successfully updated pdfHelper.ts');
}
