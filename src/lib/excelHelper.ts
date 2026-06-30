import * as XLSX from 'xlsx';
import { TankerRecord } from '../types';

// Robust helper to handle different module formats (ESM/CJS) for XLSX in Node
const xlsxLib = ((XLSX && (XLSX as any).readFile) ? XLSX : ((XLSX as any)?.default || XLSX)) as typeof XLSX;

const exactMappings: Record<string, keyof TankerRecord> = {
  // Serial number
  'sn': 'sn',
  'sno': 'sn',
  'serial': 'sn',
  'serialnumber': 'sn',
  'serialno': 'sn',
  'no': 'sn',
  'seq': 'sn',
  'sequence': 'sn',

  // Aramco Tank Number
  'aramcotankno': 'aramcoTankNumber',
  'aramcono': 'aramcoTankNumber',
  'aramcotanknumber': 'aramcoTankNumber',
  'aramco': 'aramcoTankNumber',
  'aramconumber': 'aramcoTankNumber',
  'aramcotank': 'aramcoTankNumber',

  // New Tank Number
  'newtankno': 'newTankNumber',
  'newtanknumber': 'newTankNumber',
  'tankno': 'newTankNumber',
  'tanknumber': 'newTankNumber',
  'newtank': 'newTankNumber',
  'tankid': 'newTankNumber',
  'newtankid': 'newTankNumber',

  // Classification
  'classification': 'classification',
  'material': 'classification',
  'class': 'classification',
  'structure': 'classification',
  'structural': 'classification',

  // Model
  'model': 'model',
  'year': 'model',
  'modelyear': 'model',

  // Product
  'product': 'product',
  'cargo': 'product',
  'substance': 'product',
  'cargosubstance': 'product',

  // Quantity
  'quantity': 'quantity',
  'volume': 'quantity',
  'capacity': 'quantity',
  'litres': 'quantity',
  'qty': 'quantity',
  'capacitylitres': 'quantity',
  'quantitylitres': 'quantity',

  // Authorized Vehicle
  'authorizedvehicle': 'authorizedVehicle',
  'plate': 'authorizedVehicle',
  'vehicle': 'authorizedVehicle',
  'platenumber': 'authorizedVehicle',
  'vehicleplate': 'authorizedVehicle',

  // Region
  'region': 'region',
  'location': 'region',
  'logisticsregion': 'region',

  // Status
  'status': 'status',
  'condition': 'status',
  'operationalstatus': 'status',
};

// Detect headers and build index map using two-pass strict and fallback logic
export function detectColumns(headers: string[]): Record<keyof TankerRecord, number> {
  const colIndexMap: Record<keyof TankerRecord, number> = {} as any;
  const mappedIndices = new Set<number>();
  
  // Pass 1: Exact matches
  headers.forEach((header, idx) => {
    if (header === null || header === undefined) return;
    const norm = String(header).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!norm) return;
    
    if (exactMappings[norm]) {
      const field = exactMappings[norm];
      if (colIndexMap[field] === undefined) {
        colIndexMap[field] = idx;
        mappedIndices.add(idx);
      }
    }
  });
  
  // Pass 2: Partial matches for unmapped fields
  const fields: (keyof TankerRecord)[] = [
    'sn', 'aramcoTankNumber', 'newTankNumber', 'classification',
    'model', 'product', 'quantity', 'authorizedVehicle', 'region', 'status'
  ];
  
  fields.forEach(field => {
    if (colIndexMap[field] !== undefined) return; // already mapped
    
    // Try to find an index that matches this field's keywords
    for (let idx = 0; idx < headers.length; idx++) {
      if (mappedIndices.has(idx)) continue;
      
      const header = headers[idx];
      if (header === null || header === undefined) continue;
      const norm = String(header).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!norm) continue;
      
      let isMatch = false;
      if (field === 'aramcoTankNumber') {
        isMatch = norm.includes('aramco');
      } else if (field === 'newTankNumber') {
        isMatch = norm.includes('newtank') || (norm.includes('tank') && (norm.includes('no') || norm.includes('num')));
      } else if (field === 'classification') {
        isMatch = norm.includes('class') || norm.includes('material');
      } else if (field === 'model') {
        isMatch = norm.includes('model') || norm.includes('year');
      } else if (field === 'product') {
        isMatch = norm.includes('product') || norm.includes('cargo') || norm.includes('substance');
      } else if (field === 'quantity') {
        isMatch = norm.includes('qty') || norm.includes('quantity') || norm.includes('volume') || norm.includes('capacity') || norm.includes('litre');
      } else if (field === 'authorizedVehicle') {
        isMatch = norm.includes('vehicle') || norm.includes('plate') || norm.includes('auth');
      } else if (field === 'region') {
        isMatch = norm.includes('region') || norm.includes('location');
      } else if (field === 'status') {
        isMatch = norm.includes('status') || norm.includes('condition');
      } else if (field === 'sn') {
        isMatch = norm.includes('sn') || norm.includes('serial');
      }
      
      if (isMatch) {
        colIndexMap[field] = idx;
        mappedIndices.add(idx);
        break;
      }
    }
  });
  
  return colIndexMap;
}

// Calculate match score for a potential header row to choose the best row index
export function scoreRow(row: any[]): { score: number; colMap: Record<keyof TankerRecord, number> } {
  if (!row || row.length === 0) return { score: 0, colMap: {} as any };
  
  const colMap: Record<keyof TankerRecord, number> = {} as any;
  const mappedIndices = new Set<number>();
  let score = 0;
  
  // Pass 1: Exact Match score
  row.forEach((cell, idx) => {
    if (cell === null || cell === undefined) return;
    const norm = String(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!norm) return;
    
    if (exactMappings[norm]) {
      const field = exactMappings[norm];
      if (colMap[field] === undefined) {
        colMap[field] = idx;
        mappedIndices.add(idx);
        score += 3; // strong score for exact match
      }
    }
  });
  
  // Pass 2: Partial Match score
  const fields: (keyof TankerRecord)[] = [
    'sn', 'aramcoTankNumber', 'newTankNumber', 'classification',
    'model', 'product', 'quantity', 'authorizedVehicle', 'region', 'status'
  ];
  
  fields.forEach(field => {
    if (colMap[field] !== undefined) return;
    
    for (let idx = 0; idx < row.length; idx++) {
      if (mappedIndices.has(idx)) continue;
      
      const cell = row[idx];
      if (cell === null || cell === undefined) continue;
      const norm = String(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!norm) continue;
      
      let isMatch = false;
      if (field === 'aramcoTankNumber') {
        isMatch = norm.includes('aramco');
      } else if (field === 'newTankNumber') {
        isMatch = norm.includes('newtank') || (norm.includes('tank') && (norm.includes('no') || norm.includes('num')));
      } else if (field === 'classification') {
        isMatch = norm.includes('class') || norm.includes('material');
      } else if (field === 'model') {
        isMatch = norm.includes('model') || norm.includes('year');
      } else if (field === 'product') {
        isMatch = norm.includes('product') || norm.includes('cargo') || norm.includes('substance');
      } else if (field === 'quantity') {
        isMatch = norm.includes('qty') || norm.includes('quantity') || norm.includes('volume') || norm.includes('capacity') || norm.includes('litre');
      } else if (field === 'authorizedVehicle') {
        isMatch = norm.includes('vehicle') || norm.includes('plate') || norm.includes('auth');
      } else if (field === 'region') {
        isMatch = norm.includes('region') || norm.includes('location');
      } else if (field === 'status') {
        isMatch = norm.includes('status') || norm.includes('condition');
      } else if (field === 'sn') {
        isMatch = norm.includes('sn') || norm.includes('serial');
      }
      
      if (isMatch) {
        colMap[field] = idx;
        mappedIndices.add(idx);
        score += 1; // partial match score
        break;
      }
    }
  });
  
  return { score, colMap };
}

// Generate default Excel file if not exists
export function generateDefaultExcel(records: TankerRecord[], filePath: string) {
  // Format today's date as DD-MM-YYYY
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const dateStr = `${dd}-${mm}-${yyyy}`;

  const wsData: any[][] = [
    [], // Row 1: Empty padding
    ["AL NOOR UNITED TRANSPORTATION EST."], // Row 2: Main Company Name
    ["Head Office - 3293 KING FAHD ROAD, NAJRAN 66231, Kingdom of Saudi Arabia"], // Row 3: Physical Address
    [`ARAMCO TANKER NUMBER SERIES OF ${dateStr}`], // Row 4: Tanker Series Dynamic Date
    [], // Row 5: Separator Empty Row
    [
      "Sn",
      "رقم خزان أرامكو\nAramco Tank Number",
      "رقم الخزان الجديد\nNew Tank Number",
      "تصنيف\nClassification",
      "سنة الصنع\nModel",
      "منتج\nProduct",
      "كمية\nQuantity",
      "مركبة مرخصة\nAuthorized Vehicle",
      "المنطقة\nRegion",
      "حالة\nStatus"
    ]
  ];

  // Map database record rows
  records.forEach(r => {
    wsData.push([
      r.sn,
      r.aramcoTankNumber,
      r.newTankNumber,
      r.classification,
      r.model,
      r.product,
      r.quantity,
      r.authorizedVehicle,
      r.region,
      r.status
    ]);
  });

  const ws = xlsxLib.utils.aoa_to_sheet(wsData);

  // Merge the title columns spanning columns A to J (indices 0 to 9)
  ws['!merges'] = [
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // Merge row 2
    { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }, // Merge row 3
    { s: { r: 3, c: 0 }, e: { r: 3, c: 9 } }  // Merge row 4
  ];

  // Define generous, responsive widths for each column to match original design perfectly
  ws['!cols'] = [
    { wch: 6 },  // SN
    { wch: 25 }, // Aramco Tank No
    { wch: 20 }, // New Tank No
    { wch: 15 }, // Classification
    { wch: 12 }, // Model Year
    { wch: 15 }, // Product
    { wch: 15 }, // Quantity
    { wch: 35 }, // Authorized Vehicle
    { wch: 22 }, // Region
    { wch: 35 }  // Status
  ];

  const wb = xlsxLib.utils.book_new();
  xlsxLib.utils.book_append_sheet(wb, ws, "Tankers Master");
  xlsxLib.writeFile(wb, filePath);
}

// Parse uploaded Excel buffer and return validated records
export function parseExcelBuffer(buffer: Buffer): { records: TankerRecord[]; errors: string[] } {
  const workbook = xlsxLib.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const jsonData = xlsxLib.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
  
  let bestHeaderRowIndex = 0;
  let bestScore = 0;
  let colIndexMap: Record<keyof TankerRecord, number> = {} as any;

  // Scan first 15 rows to find the one with the highest matching header score
  for (let r = 0; r < Math.min(jsonData.length, 15); r++) {
    const row = jsonData[r];
    if (!row || row.length === 0) continue;
    
    const { score, colMap } = scoreRow(row);
    if (score > bestScore) {
      bestScore = score;
      bestHeaderRowIndex = r;
      colIndexMap = colMap;
    }
  }

  const errors: string[] = [];

  // Ensure we found some resemblance of headers, especially newTankNumber
  if (bestScore < 3 || colIndexMap.newTankNumber === undefined) {
    errors.push("Invalid Excel structure: Could not identify 'New Tank No' or 'Tank Number' column header.");
    return { records: [], errors };
  }

  const records: TankerRecord[] = [];
  const seenTankNumbers = new Set<string>();

  for (let r = bestHeaderRowIndex + 1; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!row || row.length === 0 || row.every((c: any) => c === null || c === undefined || c === '')) {
      continue;
    }

    const getValue = (field: keyof TankerRecord) => {
      const idx = colIndexMap[field];
      if (idx !== undefined && row[idx] !== undefined && row[idx] !== null) {
        return row[idx];
      }
      return undefined;
    };

    const rawSn = getValue('sn');
    const sn = rawSn !== undefined ? parseInt(String(rawSn)) : undefined;
    
    const aramcoTankNumber = String(getValue('aramcoTankNumber') ?? '****').trim();
    const newTankNumber = String(getValue('newTankNumber') ?? '').trim();
    
    let classification = String(getValue('classification') ?? 'STEEL').trim().toUpperCase();
    if (classification !== 'STEEL' && classification !== 'ALUMINUM') {
      classification = 'STEEL';
    }

    const model = String(getValue('model') ?? '****').trim();
    const product = String(getValue('product') ?? 'PETROL').trim().toUpperCase();
    const rawQty = getValue('quantity');
    const quantity = rawQty !== undefined ? parseInt(String(rawQty)) : 36000;
    
    const authorizedVehicle = String(getValue('authorizedVehicle') ?? '****').trim();
    const region = String(getValue('region') ?? 'DAMMAM').trim().toUpperCase();
    const status = String(getValue('status') ?? 'OPERATIONAL').trim().toUpperCase();

    // Field-level Validation
    if (!newTankNumber) {
      errors.push(`Row ${r + 1}: Missing Tank Number ("newTankNumber" column)`);
      continue;
    }

    if (seenTankNumbers.has(newTankNumber.toLowerCase())) {
      errors.push(`Row ${r + 1}: Duplicate Tank Number '${newTankNumber}' in file`);
      continue;
    }
    
    seenTankNumbers.add(newTankNumber.toLowerCase());

    records.push({
      sn: sn || (records.length + 1),
      aramcoTankNumber,
      newTankNumber,
      classification: classification as 'STEEL' | 'ALUMINUM',
      model,
      product,
      quantity: isNaN(quantity) ? 36000 : quantity,
      authorizedVehicle,
      region,
      status
    });
  }

  return { records, errors };
}

// Helper to safely write cell values in standard formats
function setCellValue(ws: XLSX.WorkSheet, r: number, c: number, val: any) {
  const addr = xlsxLib.utils.encode_cell({ r, c });
  if (typeof val === 'number') {
    ws[addr] = { t: 'n', v: val };
  } else {
    ws[addr] = { t: 's', v: String(val ?? '') };
  }
}

// Modify cell values in the master spreadsheet directly (preserves style)
export function updateExcelRecord(filePath: string, oldTankNumber: string, updated: TankerRecord) {
  try {
    const workbook = xlsxLib.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = xlsxLib.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    let headerRowIndex = 0;
    let headers: string[] = [];

    for (let r = 0; r < Math.min(jsonData.length, 10); r++) {
      const row = jsonData[r];
      if (!row || row.length === 0) continue;
      const hasKeywords = row.some((cell: any) => {
        if (typeof cell !== 'string') return false;
        return cell.toLowerCase().includes('tank') || cell.toLowerCase().includes('sn');
      });
      if (hasKeywords) {
        headerRowIndex = r;
        headers = row.map((h: any) => String(h || '').trim());
        break;
      }
    }

    if (headers.length === 0 && jsonData.length > 0) {
      headers = jsonData[0].map((h: any) => String(h || '').trim());
    }

    const colIndexMap = detectColumns(headers);
    if (colIndexMap.newTankNumber === undefined) return false;

    // Search for row matching the record
    let targetRowIndex = -1;
    for (let r = headerRowIndex + 1; r < jsonData.length; r++) {
      const row = jsonData[r];
      if (!row || row.length === 0) continue;
      const cellVal = String(row[colIndexMap.newTankNumber] || '').trim();
      if (cellVal.toLowerCase() === oldTankNumber.toLowerCase()) {
        targetRowIndex = r;
        break;
      }
    }

    if (targetRowIndex !== -1) {
      // Edit existing row cells
      const fields: (keyof TankerRecord)[] = [
        'sn', 'aramcoTankNumber', 'newTankNumber', 'classification',
        'model', 'product', 'quantity', 'authorizedVehicle', 'region', 'status'
      ];
      fields.forEach(field => {
        const c = colIndexMap[field];
        if (c !== undefined) {
          setCellValue(worksheet, targetRowIndex, c, updated[field]);
        }
      });
      xlsxLib.writeFile(workbook, filePath);
      return true;
    } else {
      // Record not found in Excel, so let's append it as a new row
      return addExcelRecord(filePath, updated);
    }
  } catch (err) {
    console.error("Failed to update record in Excel:", err);
    return false;
  }
}

// Append a new record to the master spreadsheet directly
export function addExcelRecord(filePath: string, record: TankerRecord) {
  try {
    const workbook = xlsxLib.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = xlsxLib.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    let headerRowIndex = 0;
    let headers: string[] = [];

    for (let r = 0; r < Math.min(jsonData.length, 10); r++) {
      const row = jsonData[r];
      if (!row || row.length === 0) continue;
      const hasKeywords = row.some((cell: any) => {
        if (typeof cell !== 'string') return false;
        return cell.toLowerCase().includes('tank') || cell.toLowerCase().includes('sn');
      });
      if (hasKeywords) {
        headerRowIndex = r;
        headers = row.map((h: any) => String(h || '').trim());
        break;
      }
    }

    if (headers.length === 0 && jsonData.length > 0) {
      headers = jsonData[0].map((h: any) => String(h || '').trim());
    }

    const colIndexMap = detectColumns(headers);
    
    const range = xlsxLib.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const newRowIdx = range.e.r + 1;
    
    // Write cells
    const fields: (keyof TankerRecord)[] = [
      'sn', 'aramcoTankNumber', 'newTankNumber', 'classification',
      'model', 'product', 'quantity', 'authorizedVehicle', 'region', 'status'
    ];
    fields.forEach(field => {
      const c = colIndexMap[field];
      if (c !== undefined) {
        setCellValue(worksheet, newRowIdx, c, record[field]);
      }
    });

    // Update reference bounds
    range.e.r = newRowIdx;
    worksheet['!ref'] = xlsxLib.utils.encode_range(range);
    
    xlsxLib.writeFile(workbook, filePath);
    return true;
  } catch (err) {
    console.error("Failed to append record to Excel:", err);
    return false;
  }
}

// Delete a record from the master spreadsheet and shift rows up to preserve layout
export function deleteExcelRecord(filePath: string, tankNumber: string) {
  try {
    const workbook = xlsxLib.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = xlsxLib.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    let headerRowIndex = 0;
    let headers: string[] = [];

    for (let r = 0; r < Math.min(jsonData.length, 10); r++) {
      const row = jsonData[r];
      if (!row || row.length === 0) continue;
      const hasKeywords = row.some((cell: any) => {
        if (typeof cell !== 'string') return false;
        return cell.toLowerCase().includes('tank') || cell.toLowerCase().includes('sn');
      });
      if (hasKeywords) {
        headerRowIndex = r;
        headers = row.map((h: any) => String(h || '').trim());
        break;
      }
    }

    if (headers.length === 0 && jsonData.length > 0) {
      headers = jsonData[0].map((h: any) => String(h || '').trim());
    }

    const colIndexMap = detectColumns(headers);
    if (colIndexMap.newTankNumber === undefined) return false;

    // Search for row matching the record
    let targetRowIndex = -1;
    for (let r = headerRowIndex + 1; r < jsonData.length; r++) {
      const row = jsonData[r];
      if (!row || row.length === 0) continue;
      const cellVal = String(row[colIndexMap.newTankNumber] || '').trim();
      if (cellVal.toLowerCase() === tankNumber.toLowerCase()) {
        targetRowIndex = r;
        break;
      }
    }

    if (targetRowIndex !== -1) {
      const range = xlsxLib.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      
      // Shift all rows below the target row up by 1
      for (let r = targetRowIndex; r < range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const nextCellAddr = xlsxLib.utils.encode_cell({ r: r + 1, c });
          const currCellAddr = xlsxLib.utils.encode_cell({ r, c });
          if (worksheet[nextCellAddr]) {
            worksheet[currCellAddr] = { ...worksheet[nextCellAddr] };
          } else {
            delete worksheet[currCellAddr];
          }
        }
      }
      
      // Clear cells of the last row
      for (let c = range.s.c; c <= range.e.c; c++) {
        const lastCellAddr = xlsxLib.utils.encode_cell({ r: range.e.r, c });
        delete worksheet[lastCellAddr];
      }
      
      // Shrink range by 1
      range.e.r--;
      worksheet['!ref'] = xlsxLib.utils.encode_range(range);
      
      xlsxLib.writeFile(workbook, filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to delete record from Excel:", err);
    return false;
  }
}

// Delete multiple records from the master spreadsheet and shift rows up to preserve layout
export function deleteExcelRecords(filePath: string, tankNumbers: string[]) {
  try {
    const workbook = xlsxLib.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = xlsxLib.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    let headerRowIndex = 0;
    let headers: string[] = [];

    for (let r = 0; r < Math.min(jsonData.length, 10); r++) {
      const row = jsonData[r];
      if (!row || row.length === 0) continue;
      const hasKeywords = row.some((cell: any) => {
        if (typeof cell !== 'string') return false;
        return cell.toLowerCase().includes('tank') || cell.toLowerCase().includes('sn');
      });
      if (hasKeywords) {
        headerRowIndex = r;
        headers = row.map((h: any) => String(h || '').trim());
        break;
      }
    }

    if (headers.length === 0 && jsonData.length > 0) {
      headers = jsonData[0].map((h: any) => String(h || '').trim());
    }

    const colIndexMap = detectColumns(headers);
    if (colIndexMap.newTankNumber === undefined) return false;

    const lowerTankNumbers = tankNumbers.map(tn => String(tn).trim().toLowerCase());
    let deletedCount = 0;
    const range = xlsxLib.utils.decode_range(worksheet['!ref'] || 'A1:A1');

    // Go backward from last row down to first data row
    for (let r = range.e.r; r > headerRowIndex; r--) {
      const row = jsonData[r];
      if (!row || row.length === 0) continue;
      const cellVal = String(row[colIndexMap.newTankNumber] || '').trim().toLowerCase();
      if (lowerTankNumbers.includes(cellVal)) {
        // Shift all rows below this row up by 1
        for (let rShift = r; rShift < range.e.r; rShift++) {
          for (let c = range.s.c; c <= range.e.c; c++) {
            const nextCellAddr = xlsxLib.utils.encode_cell({ r: rShift + 1, c });
            const currCellAddr = xlsxLib.utils.encode_cell({ r: rShift, c });
            if (worksheet[nextCellAddr]) {
              worksheet[currCellAddr] = { ...worksheet[nextCellAddr] };
            } else {
              delete worksheet[currCellAddr];
            }
          }
        }
        // Clear cells of the last row
        for (let c = range.s.c; c <= range.e.c; c++) {
          const lastCellAddr = xlsxLib.utils.encode_cell({ r: range.e.r, c });
          delete worksheet[lastCellAddr];
        }
        range.e.r--;
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      worksheet['!ref'] = xlsxLib.utils.encode_range(range);
      xlsxLib.writeFile(workbook, filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to bulk delete records from Excel:", err);
    return false;
  }
}
