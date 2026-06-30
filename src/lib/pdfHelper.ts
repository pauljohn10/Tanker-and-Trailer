/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TankerRecord, User } from '../types';

// Format capacity helper
const formatQuantity = (val: number): string => {
  return new Intl.NumberFormat('en-US').format(val);
};

// Safe Image Loader with timeout and fallback
const loadLogoImage = (url: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timer = setTimeout(() => {
      console.warn("Logo image loading timed out. Using visual fallback.");
      resolve(null);
    }, 4000);

    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timer);
      console.warn("Failed to load logo from URL. Using visual fallback.");
      resolve(null);
    };

    img.src = url;
  });
};

// Asynchronously download and register an Arabic font
const registerArabicFont = async (doc: jsPDF): Promise<boolean> => {
  try {
    // We use a light subset of Amiri-Regular from Google Fonts to render Arabic text properly in jsPDF
    const url = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch Arabic font.');
    const buffer = await response.arrayBuffer();
    
    // Convert ArrayBuffer to binary string for virtual file system
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = window.btoa(binary);
    doc.addFileToVFS('Amiri-Regular.ttf', base64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    return true;
  } catch (err) {
    console.error('Error loading Arabic font Amiri:', err);
    return false;
  }
};

// Translation Helper for values inside tables
const translateValue = (val: string, type: 'classification' | 'product' | 'region' | 'status', isAr: boolean): string => {
  if (!val) return '';
  if (!isAr) return val;
  const v = val.trim().toUpperCase();
  
  if (type === 'classification') {
    if (v === 'STEEL') return 'حديد (STEEL)';
    if (v === 'ALUMINUM') return 'ألومنيوم (ALUMINUM)';
  }
  if (type === 'product') {
    if (v === 'PETROL') return 'بنزين (PETROL)';
    if (v === 'DIESEL') return 'ديزل (DIESEL)';
    if (v === 'WATER') return 'مياه (WATER)';
    if (v === 'MIXED') return 'مختلط (MIXED)';
    if (v === 'FUEL OIL') return 'زيت الوقود (FUEL OIL)';
    if (v === 'NEW TANKER') return 'ناقلة جديدة';
  }
  if (type === 'region') {
    if (v === 'DAMMAM') return 'الدمام (DAMMAM)';
    if (v === 'NAJRAN') return 'نجران (NAJRAN)';
    if (v === 'MAKKAH') return 'مكة (MAKKAH)';
    if (v === 'JEDDAH') return 'جدة (JEDDAH)';
    if (v === 'DAMMAM - WORKSHOP') return 'ورشة الدمام';
    if (v === 'NAJRAN - WORKSHOP') return 'ورشة نجران';
    if (v === 'NEW TANKER') return 'ناقلة جديدة';
  }
  if (type === 'status') {
    if (v === 'OPERATIONAL') return 'تشغيلية (OPERATIONAL)';
    if (v === 'WORKING FOR COMPANY') return 'تعمل للشركة';
    if (v === 'STANDBY DUE SEVERE DAMAGE') return 'احتياط بسبب ضرر جسيم';
    if (v === 'STANDBY USED FOR WATER IN WORKSHOP') return 'احتياط للمياه في الورشة';
    if (v === 'STANDBY AT GUNAN PARKING AREA') return 'احتياط في مواقف قونان';
    if (v === 'STANDBY IN WORKSHOP DISCONNECTED') return 'احتياط في الورشة مفصول';
    if (v === 'UNDER MAINTENANCE (SANAIYAH MAKKAH)') return 'تحت الصيانة بمكة';
    if (v === 'UNDER PROCESS') return 'تحت الإجراء';
    if (v === 'WAITING FOR ARRIVAL') return 'بانتظار الوصول';
    if (v === 'STANDBY') return 'احتياط (STANDBY)';
    if (v === 'STANDBY IN GUNAN DISCONNECTED') return 'احتياط في قونان مفصول';
  }
  return val;
};

export async function exportTankersPDF(
  records: TankerRecord[],
  activeFilters: {
    search?: string;
    classification?: string;
    product?: string;
    region?: string;
    status?: string;
  },
  user: User,
  options?: {
    exceptions?: any[];
    language?: 'en' | 'ar';
  }
) {
  const isAr = options?.language === 'ar';
  const pdfFont = isAr ? 'Amiri' : 'Helvetica';

  // 1. Setup Document: A4 Landscape (width 297mm, height 210mm)
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageW = 297;
  const pageH = 210;
  const margin = 14;
  const contentW = pageW - 2 * margin; // 269mm

  // 2. Load the Company Logo
  const logoUrl = '/logo-transparent.png';
  const logoImg = await loadLogoImage(logoUrl);

  // Load and register Arabic Unicode Font if Arabic is selected
  if (isAr) {
    const fontLoaded = await registerArabicFont(doc);
    if (!fontLoaded) {
      console.warn("Could not register Amiri Arabic font. Continuing with fallback Helvetica...");
    }
  }

  // Keep track of current Y position
  let currentY = 10;

  // 3. Define Colors
  const colors = {
    primary: { r: 15, g: 32, b: 67 },     // Deep Navy/Slate
    accent: { r: 217, g: 119, b: 6 },     // Warm Amber
    slate: { r: 71, g: 85, b: 105 },     // Slate Gray
    lightBg: { r: 248, g: 250, b: 252 },  // Soft off-white (#F8FAFC)
    cardBg: { r: 241, g: 245, b: 249 },   // Soft gray (#F1F5F9)
    border: { r: 226, g: 232, b: 240 },   // Border (#E2E8F0)
    white: { r: 255, g: 255, b: 255 },
  };

  // Helper: Draw standard running header on page 1
  const drawPage1Header = () => {
    // Draw Logo centered at the top
    const logoW = 24;
    const logoH = 24;
    const logoX = (pageW - logoW) / 2;

    if (logoImg) {
      try {
        doc.addImage(logoImg, 'JPEG', logoX, currentY, logoW, logoH);
      } catch (err) {
        drawFallbackLogo(logoX, currentY);
      }
    } else {
      drawFallbackLogo(logoX, currentY);
    }

    currentY += logoH + 4;

    // Company Information (Centered in the middle of page width)
    doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(isAr ? 16 : 18);
    const companyName = isAr ? 'مؤسسة النور المتحدة للنقل' : 'AL NOOR UNITED TRANSPORTATION EST.';
    (doc as any).text(companyName, pageW / 2, currentY, { align: 'center', isRtl: isAr });

    doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(isAr ? 9.5 : 8.5);
    const addressLine = isAr 
      ? 'المكتب الرئيسي - طريق الملك فهد، نجران ٦٦٢٣١، المملكة العربية السعودية' 
      : 'Head Office - 3293 KING FAHD ROAD, NAJRAN 66231, Kingdom of Saudi Arabia';
    (doc as any).text(addressLine, pageW / 2, currentY + 5.5, { align: 'center', isRtl: isAr });

    const descLine = isAr 
      ? 'ناقل وقود معتمد من أرامكو السعودية وخدمات إدارة أساطيل النقل والخدمات اللوجستية' 
      : 'Aramco Authorized Bulk Fuel Carrier & Fleet Management Services';
    (doc as any).text(descLine, pageW / 2, currentY + 10, { align: 'center', isRtl: isAr });

    currentY += 12;

    // Premium Corporate Divider Line
    doc.setDrawColor(colors.primary.r, colors.primary.g, colors.primary.b);
    doc.setLineWidth(0.8);
    doc.line(margin, currentY, pageW - margin, currentY);

    // Sub-divider accent line (Centered symmetrically)
    doc.setDrawColor(colors.accent.r, colors.accent.g, colors.accent.b);
    doc.setLineWidth(1.5);
    doc.line((pageW - 40) / 2, currentY + 0.8, (pageW + 40) / 2, currentY + 0.8);

    currentY += 4;
  };

  // Helper: Fallback vector logo
  const drawFallbackLogo = (x: number, y: number) => {
    // Elegant Orange & Navy visual mark
    doc.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
    doc.rect(x, y, 24, 24, 'F');
    doc.setFillColor(colors.accent.r, colors.accent.g, colors.accent.b);
    doc.circle(x + 12, y + 12, 6, 'F');
    doc.setTextColor(colors.white.r, colors.white.g, colors.white.b);
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(10);
    doc.text('AN', x + 12, y + 13.5, { align: 'center' });
  };

  // 4. Generate the header on page 1
  drawPage1Header();

  // 5. Build Applied Filters section
  const filtersToDisplay: string[] = [];
  if (activeFilters.search) filtersToDisplay.push(`${isAr ? 'البحث' : 'Search'}: "${activeFilters.search}"`);
  if (activeFilters.classification) filtersToDisplay.push(`${isAr ? 'التصنيف' : 'Classification'}: ${translateValue(activeFilters.classification, 'classification', isAr)}`);
  if (activeFilters.product) filtersToDisplay.push(`${isAr ? 'المنتج' : 'Product'}: ${translateValue(activeFilters.product, 'product', isAr)}`);
  if (activeFilters.region) filtersToDisplay.push(`${isAr ? 'المنطقة' : 'Region'}: ${translateValue(activeFilters.region, 'region', isAr)}`);
  if (activeFilters.status) filtersToDisplay.push(`${isAr ? 'الحالة' : 'Status'}: ${translateValue(activeFilters.status, 'status', isAr)}`);

  if (filtersToDisplay.length > 0) {
    doc.setFillColor(colors.lightBg.r, colors.lightBg.g, colors.lightBg.b);
    doc.setDrawColor(colors.border.r, colors.border.g, colors.border.b);
    doc.setLineWidth(0.15);
    doc.roundedRect(margin, currentY, contentW, 7, 1.5, 1.5, 'FD');

    // Text label
    doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(isAr ? 8.5 : 7.5);
    
    if (isAr) {
      (doc as any).text('فلاتر الاستعلام النشطة:', pageW - margin - 3, currentY + 4.5, { align: 'right', isRtl: true });
      doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
      doc.setFont(pdfFont, 'normal');
      (doc as any).text(filtersToDisplay.join('  |  '), pageW - margin - 38, currentY + 4.5, { align: 'right', isRtl: true });
    } else {
      doc.text('ACTIVE QUERY FILTERS:', margin + 3, currentY + 4.5);
      doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
      doc.setFont(pdfFont, 'normal');
      doc.text(filtersToDisplay.join('  |  '), margin + 36, currentY + 4.5);
    }

    currentY += 6;
  } else {
    currentY += 1;
  }

  // 6. Compute Metrics for Executive Summary Cards
  const totalRecords = records.length;
  const totalCapacity = records.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  
  const activeStatuses = ['OPERATIONAL', 'WORKING FOR COMPANY'];
  const activeFleetCount = records.filter(r => 
    activeStatuses.includes(String(r.status).trim().toUpperCase())
  ).length;

  const maintenanceFleetCount = records.filter(r => {
    const s = String(r.status).toUpperCase();
    return s.includes('WORKSHOP') || s.includes('MAINTENANCE') || s.includes('DAMAGE') || s.includes('UNDER PROCESS');
  }).length;

  const standbyFleetCount = totalRecords - activeFleetCount - maintenanceFleetCount;

  // 7. Draw Executive Summary Cards side-by-side
  const cardW = (contentW - 3 * 4) / 4; // Width of each card, separated by 4mm gaps
  const cardH = 15;

  const cardsData = [
    { 
      label: isAr ? 'إجمالي وحدات الأسطول' : 'TOTAL FLEET UNITS', 
      value: isAr ? `${totalRecords} ناقلة` : `${totalRecords} Tankers`, 
      color: colors.primary 
    },
    { 
      label: isAr ? 'إجمالي السعة الاستيعابية' : 'TOTAL CARGO CAPACITY', 
      value: `${formatQuantity(totalCapacity)} ${isAr ? 'لتر' : 'L'}`, 
      color: colors.accent 
    },
    { 
      label: isAr ? 'الأسطول التشغيلي' : 'OPERATIONAL FLEET', 
      value: isAr ? `${activeFleetCount} وحدة (${totalRecords > 0 ? Math.round((activeFleetCount / totalRecords) * 100) : 0}٪)` : `${activeFleetCount} Units (${totalRecords > 0 ? Math.round((activeFleetCount / totalRecords) * 100) : 0}%)`, 
      color: { r: 16, g: 185, b: 129 } 
    }, // Green
    { 
      label: isAr ? 'الصيانة والاحتياط' : 'MAINTENANCE / STANDBY', 
      value: isAr ? `${maintenanceFleetCount} صيانة / ${standbyFleetCount} احتياط` : `${maintenanceFleetCount} Main. / ${standbyFleetCount} Stdb.`, 
      color: colors.slate 
    }
  ];

  cardsData.forEach((card, index) => {
    const cardX = margin + index * (cardW + 4);
    
    // Draw background card
    doc.setFillColor(colors.cardBg.r, colors.cardBg.g, colors.cardBg.b);
    doc.setDrawColor(colors.border.r, colors.border.g, colors.border.b);
    doc.setLineWidth(0.2);
    doc.roundedRect(cardX, currentY, cardW, cardH, 2, 2, 'FD');

    // Left/Right Accent Stripe depending on language
    doc.setFillColor(card.color.r, card.color.g, card.color.b);
    if (isAr) {
      doc.rect(cardX + cardW - 2.5, currentY, 2.5, cardH, 'F');
    } else {
      doc.rect(cardX, currentY, 2.5, cardH, 'F');
    }

    // Label
    doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(isAr ? 7.5 : 6.5);
    if (isAr) {
      (doc as any).text(card.label, cardX + cardW - 5, currentY + 5.5, { align: 'right', isRtl: true });
    } else {
      doc.text(card.label, cardX + 5, currentY + 5);
    }

    // Value
    doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(isAr ? 10 : 10.5);
    if (isAr) {
      (doc as any).text(card.value, cardX + cardW - 5, currentY + 11.5, { align: 'right', isRtl: true });
    } else {
      doc.text(card.value, cardX + 5, currentY + 11.5);
    }
  });

  currentY += cardH + 2;

  // 8. Draw Vector Product Distribution Chart (Dynamic, ERP-Grade)
  const drawProductChart = () => {
    const chartCardH = 22;
    doc.setFillColor(colors.lightBg.r, colors.lightBg.g, colors.lightBg.b);
    doc.setDrawColor(colors.border.r, colors.border.g, colors.border.b);
    doc.setLineWidth(0.15);
    doc.roundedRect(margin, currentY, contentW, chartCardH, 2.5, 2.5, 'FD');

    // Chart Title
    doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(isAr ? 9 : 8);
    const chartTitle = isAr ? 'توزيع الأسطول حسب المادة المشحونة (المنتج)' : 'FLEET DISTRIBUTION BY CARGO (PRODUCT)';
    if (isAr) {
      (doc as any).text(chartTitle, pageW - margin - 4, currentY + 4.5, { align: 'right', isRtl: true });
    } else {
      doc.text(chartTitle, margin + 4, currentY + 4);
    }

    // Calculate product statistics
    const productCounts: Record<string, number> = {};
    records.forEach(r => {
      const prod = r.product ? String(r.product).trim().toUpperCase() : 'UNKNOWN';
      productCounts[prod] = (productCounts[prod] || 0) + 1;
    });

    const sortedProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);
    const maxCount = sortedProducts.length > 0 ? sortedProducts[0][1] : 1;

    // Draw max 5 horizontal product bars side-by-side
    const maxBars = Math.min(sortedProducts.length, 5);
    const barSpacing = 4;
    const barBoxW = (contentW - 8 - (maxBars - 1) * barSpacing) / maxBars;
    const barXStart = margin + 4;
    const barYStart = currentY + 7;

    // Accent palettes for chart bars
    const chartPalette = [
      { r: 37, g: 99, b: 235 },   // Blue (Diesel)
      { r: 245, g: 158, b: 11 },  // Amber/Gold (Petrol)
      { r: 16, g: 185, b: 129 },  // Emerald (Water)
      { r: 239, g: 68, b: 68 },   // Red (Mixed/Fuel Oil)
      { r: 139, g: 92, b: 246 }   // Purple (Other)
    ];

    for (let i = 0; i < maxBars; i++) {
      const [prod, count] = sortedProducts[i];
      const percent = totalRecords > 0 ? (count / totalRecords) * 100 : 0;
      const barX = barXStart + i * (barBoxW + barSpacing);

      // Label & percentage info
      doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(isAr ? 8.5 : 7);
      
      const prodLabel = translateValue(prod, 'product', isAr);
      const unitsLabel = isAr ? `${count} وحدة (٪${Math.round(percent)})` : `${count} units (${Math.round(percent)}%)`;

      if (isAr) {
        (doc as any).text(prodLabel, barX + barBoxW, barYStart + 3, { align: 'right', isRtl: true });
        doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
        doc.setFont(pdfFont, 'normal');
        doc.setFontSize(7.5);
        (doc as any).text(unitsLabel, barX + barBoxW, barYStart + 6, { align: 'right', isRtl: true });
      } else {
        doc.text(prod, barX, barYStart + 3);
        doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
        doc.setFont(pdfFont, 'normal');
        doc.setFontSize(6.5);
        doc.text(unitsLabel, barX, barYStart + 6);
      }

      // Bar container
      doc.setFillColor(226, 232, 240); // Light grey tray
      doc.rect(barX, barYStart + 7.5, barBoxW, 2.5, 'F');

      // Colored filled progress bar
      const fillW = (count / maxCount) * barBoxW;
      const barColor = chartPalette[i % chartPalette.length];
      doc.setFillColor(barColor.r, barColor.g, barColor.b);
      if (isAr) {
        // Draw from right to left inside the box
        doc.rect(barX + barBoxW - fillW, barYStart + 7.5, fillW, 2.5, 'F');
      } else {
        doc.rect(barX, barYStart + 7.5, fillW, 2.5, 'F');
      }
    }

    currentY += chartCardH + 2;
  };

  if (totalRecords > 0) {
    drawProductChart();
  } else {
    currentY += 1;
  }

  // 9. Prepare Table Columns and Data
  const headers = isAr ? [
    'ت',
    'رقم خزان أرامكو',
    'رقم خزان النور',
    'هيكل الخزان',
    'الموديل',
    'المنتج الشحنة',
    'السعة اللترية',
    'لوحة المركبة المصرحة',
    'المنطقة',
    'حالة العمل'
  ] : [
    'Sn',
    'Aramco Tank No',
    'New Tank No',
    'Classification',
    'Model',
    'Product',
    'Quantity',
    'Authorized Vehicle',
    'Region',
    'Status'
  ];

  const bodyData = records.map(r => [
    r.sn || '',
    r.aramcoTankNumber || '****',
    r.newTankNumber || '',
    translateValue(r.classification || '', 'classification', isAr),
    r.model || '****',
    translateValue(r.product || '', 'product', isAr),
    r.quantity ? `${formatQuantity(r.quantity)} ${isAr ? 'لتر' : 'L'}` : `0 ${isAr ? 'لتر' : 'L'}`,
    r.authorizedVehicle || '****',
    translateValue(r.region || '', 'region', isAr),
    translateValue(r.status || 'OPERATIONAL', 'status', isAr)
  ]);

  
  // 10. Generate PDF Table using autotable
  autoTable(doc, {
    showHead: 'firstPage',
    head: [headers],
    body: bodyData,
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 12 },
    theme: 'striped',
    styles: {
      fontSize: isAr ? 7.8 : 7.2,
      font: pdfFont,
      cellPadding: 2,
      overflow: 'linebreak',
      halign: isAr ? 'right' : 'left'
    },
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900 (ERP appearance)
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: isAr ? 'right' : 'left',
      fontSize: isAr ? 8.2 : 7.8,
      cellPadding: 2.8,
    },
    bodyStyles: {
      textColor: [51, 65, 85], // Slate-700
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // soft off-white stripe
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },  // Sn
      1: { halign: isAr ? 'right' : 'left', cellWidth: 32 },    // Aramco Tank No
      2: { halign: isAr ? 'right' : 'left', cellWidth: 22 },    // New Tank No
      3: { halign: isAr ? 'right' : 'left', cellWidth: 22 },    // Classification
      4: { halign: 'center', cellWidth: 14 },  // Model
      5: { halign: isAr ? 'right' : 'left', cellWidth: 20 },    // Cargo Spec / Product
      6: { halign: isAr ? 'left' : 'right', cellWidth: 25 },   // Quantity
      7: { halign: isAr ? 'right' : 'left', cellWidth: 44 },    // Authorized Vehicle
      8: { halign: isAr ? 'right' : 'left', cellWidth: 32 },    // Region
      9: { halign: isAr ? 'right' : 'left', cellWidth: 48 },    // Status
    },
    didDrawPage: () => {}
  });

  // 11. Add Section 1: CORE TANKER SUMMARIES & Section 2: SPECIAL STANDBY / EXCEPTION LEDGER on a brand-new page
  doc.addPage();
  let statsY = 22; // Start below the compact running header (Y=14)

  // Compute Stats for Core Tanker Summaries dynamically
  const productDist: Record<string, number> = {};
  const regionDist: Record<string, number> = {};
  const classificationDist: Record<string, number> = { STEEL: 0, ALUMINUM: 0 };
  let daynaCount = 0;
  let sixCount = 0;
  let tn2Count = 0;

  records.forEach(r => {
    // Product
    const pKey = (r.product || 'UNKNOWN').trim().toUpperCase();
    productDist[pKey] = (productDist[pKey] || 0) + 1;

    // Region
    const rKey = (r.region || 'UNKNOWN').trim().toUpperCase();
    regionDist[rKey] = (regionDist[rKey] || 0) + 1;

    // Classification
    const cKey = (r.classification || '').trim().toUpperCase();
    if (cKey === 'STEEL' || cKey === 'ALUMINUM') {
      classificationDist[cKey]++;
    }

    // Capacity Groupings
    const cap = Number(r.quantity) || 0;
    if (cap >= 5000 && cap <= 12000) {
      daynaCount++;
    } else if (cap >= 14000 && cap <= 22000) {
      sixCount++;
    } else if (cap >= 30000 && cap <= 42000) {
      tn2Count++;
    }
  });

  // Prepare body rows
  const productRows = Object.entries(productDist)
    .sort((a, b) => b[1] - a[1])
    .map(([prod, count]) => [translateValue(prod, 'product', isAr), String(count)]);
  productRows.push([isAr ? 'إجمالي وحدات المواد الشاحنة' : 'Total Cargo Units', String(totalRecords)]);

  const regionRows = Object.entries(regionDist)
    .sort((a, b) => b[1] - a[1])
    .map(([reg, count]) => [translateValue(reg, 'region', isAr), String(count)]);
  regionRows.push([isAr ? 'إجمالي أسطول المناطق اللوجستية' : 'Total Region Fleet', String(totalRecords)]);

  const materialRows = [
    [isAr ? 'حديد (STEEL)' : 'STEEL', String(classificationDist.STEEL)],
    [isAr ? 'ألومنيوم (ALUMINUM)' : 'ALUMINUM', String(classificationDist.ALUMINUM)],
    [isAr ? 'إجمالي الهياكل الإنشائية' : 'Total Materials', String(totalRecords)]
  ];

  const capacityRows = [
    ['DAYNA (5,000L - 12,000L)', String(daynaCount)],
    ['SIX (14,000L - 22,000L)', String(sixCount)],
    ['TN-2 (30,000L - 42,000L)', String(tn2Count)],
    [isAr ? 'إجمالي فئات التصنيفات اللترية' : 'Total Groupings', String(totalRecords)]
  ];

  // Draw Section 1 Heading
  doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
  doc.setFont(pdfFont, 'bold');
  doc.setFontSize(isAr ? 11 : 10.5);
  const sec1Heading = isAr ? '١. ملخصات الناقلات الاستراتيجية المعتمدة' : '1. CORE TANKER SUMMARIES (PDF PAGE 2)';
  
  if (isAr) {
    (doc as any).text(sec1Heading, pageW - margin, statsY + 4, { align: 'right', isRtl: true });
    doc.setDrawColor(colors.accent.r, colors.accent.g, colors.accent.b);
    doc.setLineWidth(0.8);
    doc.line(pageW - margin, statsY + 6, pageW - margin - 65, statsY + 6);
  } else {
    doc.text(sec1Heading, margin, statsY + 4);
    doc.setDrawColor(colors.accent.r, colors.accent.g, colors.accent.b);
    doc.setLineWidth(0.8);
    doc.line(margin, statsY + 6, margin + 65, statsY + 6);
  }

  statsY += 11;

  const summaryTableStyles: any = {
    theme: 'striped',
    styles: {
      fontSize: isAr ? 7.8 : 7.2,
      font: pdfFont,
      cellPadding: 1.8,
      overflow: 'linebreak',
      halign: isAr ? 'right' : 'left'
    },
    headStyles: {
      fillColor: [30, 41, 59], // Dark Slate
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: isAr ? 'right' : 'left',
      fontSize: isAr ? 8 : 7.5,
      cellPadding: 2,
    },
    bodyStyles: {
      textColor: [51, 65, 85],
    },
    didParseCell: (data: any) => {
      // Bold and style the last (total) row
      if (data.row.index === data.table.body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [15, 32, 67]; // Primary
        data.cell.styles.fillColor = [241, 245, 249]; // Soft gray
      }
    },
    didDrawPage: () => {}
  };

  // Switch column order / placement dynamically for RTL symmetry
  const leftTableMargin = isAr ? margin + 130 + 9 : margin;
  const rightTableMargin = isAr ? margin : margin + 130 + 9;

  // Draw Table A: Product Distribution
  autoTable(doc, {
    showHead: 'firstPage',
    ...summaryTableStyles,
    head: [[isAr ? 'ملخص حسب المنتج (الشحنة)' : 'Summary by Product (Cargo)', '']],
    body: productRows,
    startY: statsY,
    margin: { left: leftTableMargin },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 40, halign: isAr ? 'left' : 'right' }
    }
  });

  const tableAFinalY = (doc as any).lastAutoTable.finalY;

  // Draw Table B: Regional Distribution
  autoTable(doc, {
    showHead: 'firstPage',
    ...summaryTableStyles,
    head: [[isAr ? 'ملخص حسب المنطقة اللوجستية' : 'Summary by Logistics Region', '']],
    body: regionRows,
    startY: statsY,
    margin: { left: rightTableMargin },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 40, halign: isAr ? 'left' : 'right' }
    }
  });

  const tableBFinalY = (doc as any).lastAutoTable.finalY;
  
  // Base Y for the second row of tables
  let nextRowY = Math.max(tableAFinalY, tableBFinalY) + 5;

  // Draw Table C: Structural Materials
  autoTable(doc, {
    showHead: 'firstPage',
    ...summaryTableStyles,
    head: [[isAr ? 'هياكل الخزانات الإنشائية' : 'Structural Materials', '']],
    body: materialRows,
    startY: nextRowY,
    margin: { left: leftTableMargin },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 40, halign: isAr ? 'left' : 'right' }
    }
  });

  const tableCFinalY = (doc as any).lastAutoTable.finalY;

  // Draw Table D: Capacity Classification Categories
  autoTable(doc, {
    showHead: 'firstPage',
    ...summaryTableStyles,
    head: [[isAr ? 'تصنيفات السعة اللترية الإجمالية' : 'Capacity Classification Categories', '']],
    body: capacityRows,
    startY: nextRowY,
    margin: { left: rightTableMargin },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 40, halign: isAr ? 'left' : 'right' }
    }
  });

  const tableDFinalY = (doc as any).lastAutoTable.finalY;

  let section2StartY = Math.max(tableCFinalY, tableDFinalY) + 8;

  // Draw Section 2 Heading
  doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
  doc.setFont(pdfFont, 'bold');
  doc.setFontSize(isAr ? 11 : 10.5);
  const sec2Heading = isAr ? '٢. دفتر وحدات الاحتياط واستثناءات التشغيل الخاص' : '2. SPECIAL STANDBY / EXCEPTION LEDGER';
  
  if (isAr) {
    (doc as any).text(sec2Heading, pageW - margin, section2StartY + 4, { align: 'right', isRtl: true });
    doc.setDrawColor(colors.accent.r, colors.accent.g, colors.accent.b);
    doc.setLineWidth(0.8);
    doc.line(pageW - margin, section2StartY + 6, pageW - margin - 75, section2StartY + 6);

    doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(8);
    const sec2Desc = 'سجل استثناءات الناقلات المعتمدة، الوحدات الاحتياطية، مركبات الصيانة ورخص الحفظ الآمن الرسمية.';
    (doc as any).text(sec2Desc, pageW - margin, section2StartY + 10.5, { align: 'right', isRtl: true });
  } else {
    doc.text(sec2Heading, margin, section2StartY + 4);
    doc.setDrawColor(colors.accent.r, colors.accent.g, colors.accent.b);
    doc.setLineWidth(0.8);
    doc.line(margin, section2StartY + 6, margin + 75, section2StartY + 6);

    doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(7.5);
    const sec2Desc = 'Registered exceptions, standbys, workshop units, and Saif Custody licenses (matching PDF Page 2 anomalies list).';
    doc.text(sec2Desc, margin, section2StartY + 10);
  }

  section2StartY += 14;

  const exceptionLedgerHeaders = isAr 
    ? ['رقم الناقلة', 'نوع الشحنة', 'السعة الاستيعابية', 'حالة مستند الاستثناء']
    : ['Tanker No', 'Cargo Spec', 'Capacity', 'Status Label'];

  const exceptionLedgerBody = options?.exceptions
    ? options.exceptions.map(e => [
        e.sn || '',
        translateValue(e.product || '', 'product', isAr),
        `${Number(e.capacity || 0).toLocaleString()} ${isAr ? 'لتر' : 'L'}`,
        isAr ? (e.status === 'NOT USE' ? 'ليست للاستخدام' : e.status === 'SAIF CUSTODY' ? 'حفظ آمن (سيف)' : e.status) : e.status || ''
      ])
    : [
        ['275747', 'PETROL', '36,000 L', 'NOT USE'],
        ['275749', 'PETROL', '36,000 L', 'NOT USE'],
        ['277068', 'DIESEL', '36,000 L', 'NOT USE'],
        ['277038', 'DIESEL', '36,000 L', 'NOT USE'],
        ['277039', 'DIESEL', '36,000 L', 'NOT USE'],
        ['273521', 'PETROL', '36,000 L', 'SAIF CUSTODY'],
        ['276948', 'FUEL OIL', '36,000 L', 'NOT USE'],
        ['156776', 'PETROL', '36,000 L', 'FOR UPDATES'],
        ['269866', 'DIESEL', '36,000 L', 'IN WORKSHOP'],
        ['272549', 'PETROL', '36,000 L', 'IN WORKSHOP']
      ];

  autoTable(doc, {
    showHead: 'firstPage',
    head: [exceptionLedgerHeaders],
    body: exceptionLedgerBody,
    startY: section2StartY,
    margin: { left: margin, right: margin, bottom: 12 },
    theme: 'striped',
    styles: {
      fontSize: isAr ? 7.8 : 7.2,
      font: pdfFont,
      cellPadding: 1.8,
      overflow: 'linebreak',
      halign: isAr ? 'right' : 'left'
    },
    headStyles: {
      fillColor: [30, 41, 59], // Dark Slate
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: isAr ? 'right' : 'left',
      fontSize: isAr ? 8 : 7.5,
      cellPadding: 2,
    },
    bodyStyles: {
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 70 },
      2: { cellWidth: 60, halign: isAr ? 'left' : 'right' },
      3: { cellWidth: 89, halign: 'center' }
    },
    didParseCell: (data: any) => {
      if (data.column.index === 3 && data.section === 'body') {
        const val = data.cell.raw;
        if (val === 'NOT USE' || val === 'ليست للاستخدام') {
          data.cell.styles.textColor = [225, 29, 72]; // Rose-600
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'SAIF CUSTODY' || val === 'حفظ آمن (سيف)') {
          data.cell.styles.textColor = [2, 132, 199]; // Sky-600
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [217, 119, 6]; // Amber-600
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: () => {}
  });


  const section2FinalY = (doc as any).lastAutoTable.finalY;

  // --- APPROVAL & SIGNATURE SECTION ---
  let currentSignY = section2FinalY + 15;
  const signatureSpaceRequired = 130; 
  if (currentSignY + signatureSpaceRequired > pageH - 20) {
    doc.addPage();
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

  const finalDocumentY = currentSignY;


  

  // 12. Post-process PDF: Add Running Footers (Page X of Y)
  const totalPagesCount = doc.getNumberOfPages();
  for (let i = 1; i <= totalPagesCount; i++) {
    doc.setPage(i);

    // Thin elegant top line for footer
    doc.setDrawColor(226, 232, 240); // Light gray footer divider
    doc.setLineWidth(0.2);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);

    doc.setTextColor(colors.slate.r, colors.slate.g, colors.slate.b);
    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(isAr ? 8 : 7.5);

    // Left Footer
    const footerConf = isAr 
      ? 'مؤسسة النور المتحدة للنقل - وثيقة رسمية سرية خاصة بالشركة' 
      : 'AL NOOR UNITED TRANSPORTATION EST. - Confidential Official Document';
    
    // Center Footer
    const footerAudit = isAr 
      ? 'تدقيق عمليات أسطول وقود أرامكو الآلي' 
      : 'Automated ERP Fleet Operations Audit';

    // Right Footer - Accurate "Page X of Y"
    const footerPage = isAr 
      ? `صفحة ${i} من ${totalPagesCount}` 
      : `Page ${i} of ${totalPagesCount}`;

    if (isAr) {
      (doc as any).text(footerConf, pageW - margin, pageH - 8, { align: 'right', isRtl: true });
      (doc as any).text(footerAudit, pageW / 2, pageH - 8, { align: 'center', isRtl: true });
      (doc as any).text(footerPage, margin, pageH - 8, { align: 'left', isRtl: true });
    } else {
      doc.text(footerConf, margin, pageH - 8);
      doc.text(footerAudit, pageW / 2, pageH - 8, { align: 'center' });
      doc.text(footerPage, pageW - margin, pageH - 8, { align: 'right' });
    }
  }

  // 12. Save File using a highly clean and descriptive title
  const dateSuffix = new Date().toISOString().slice(0, 10);
  doc.save(`al_noor_fleet_master_report_${dateSuffix}.pdf`);
  return true;
}
