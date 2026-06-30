const fs = require('fs');

// 1. Fix server.ts
let serverContent = fs.readFileSync('server.ts', 'utf8');

// Replace stats logic in server.ts
const statsLogicOld = `      // Operational status counting
      const status = (r.status || '').toUpperCase();
      if (status.includes('OPERATIONAL') || status.includes('WORKING') || status === 'ACTIVE') {
        operationalCount++;
      }

      // Capacity categories check`;

const statsLogicNew = `      // Operational status counting
      const status = (r.status || '').toUpperCase();
      if (status.includes('OPERATIONAL') || status.includes('WORKING') || status === 'ACTIVE') {
        operationalCount++;
      }
      if (status.includes('WORKSHOP') || status.includes('DAMAGE') || status.includes('ACCIDENT') || status.includes('MAINTENANCE')) {
        workshopCount++;
      }

      // Capacity categories check`;

// We also need to add `let workshopCount = 0;`
serverContent = serverContent.replace('let operationalCount = 0;', 'let operationalCount = 0;\n  let workshopCount = 0;');
serverContent = serverContent.replace(statsLogicOld, statsLogicNew);
serverContent = serverContent.replace('const workshopCount = records.length - operationalCount;', '// workshopCount already calculated');

fs.writeFileSync('server.ts', serverContent);

// 2. Fix api.ts
let apiContent = fs.readFileSync('src/lib/api.ts', 'utf8');
apiContent = apiContent.replace(
  `classificationDist: Record<'STEEL' | 'ALUMINUM', number>;`,
  `classificationDist: Record<'STEEL' | 'ALUMINUM', number>;\n    operationalCount: number;\n    workshopCount: number;`
);
fs.writeFileSync('src/lib/api.ts', apiContent);

console.log('Fixed dashboard data accuracy.');
