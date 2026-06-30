const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'index.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

// Use Plus Jakarta Sans and Inter
cssContent = cssContent.replace(
  "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');",
  "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');"
);
cssContent = cssContent.replace(
  '--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;',
  '--font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;'
);

// Add glassmorphism classes
const customCSS = `
/* Modern Enterprise UI Classes */
.glass-panel {
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}

.glass-panel-light {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
}

.modern-btn {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}
.modern-btn:active {
  transform: scale(0.97);
}

/* Updated Colors for 2026 Enterprise Look (Deeper Navy / Indigo influence) */
:root {
  --slate-950: #020617;
  --slate-900: #0B1120;
  --slate-850: #0F172A;
  --slate-800: #1E293B;
  --slate-700: #334155;
  --slate-600: #475569;
}
html.light {
  --slate-950: #F8FAFC;
  --slate-900: #FFFFFF;
  --slate-850: #F1F5F9;
  --slate-800: #E2E8F0;
}
`;

if (!cssContent.includes('.glass-panel')) {
  cssContent += customCSS;
  fs.writeFileSync(cssPath, cssContent);
}

// Global class replacements
const componentsDir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace standard background panels with glass panels
  content = content.replace(/bg-slate-900\/60 border border-slate-800\/80/g, 'glass-panel rounded-2xl');
  content = content.replace(/bg-slate-900\/65 border border-slate-800\/80/g, 'glass-panel rounded-2xl');
  content = content.replace(/bg-slate-900\/80/g, 'glass-panel');
  content = content.replace(/bg-slate-950\/65/g, 'bg-slate-900/40 backdrop-blur-md');
  
  // Buttons
  content = content.replace(/hover:bg-blue-600/g, 'hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/20 modern-btn');
  
  // Save
  fs.writeFileSync(filePath, content);
});

console.log('UI theme and global classes updated.');
