const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 1. Replace the normalize middleware with our apiRouter declarations
const middlewareRegex = /\/\/ Normalize Netlify serverless[\s\S]*?next\(\);\r?\n\}\);/;
const routerDeclaration = `const apiRouter = express.Router();
app.use('/api', apiRouter);
app.use('/', apiRouter);
app.use('/.netlify/functions/api', apiRouter);`;
if (!middlewareRegex.test(content)) {
  console.log('Middleware not found!');
  process.exit(1);
}
content = content.replace(middlewareRegex, routerDeclaration);

// 2. Replace all API routes
content = content.replace(/app\.(get|post|put|delete)\('\/api\//g, 'apiRouter.$1(\'/');

// 3. Fix alasql import
content = content.replace(/import alasql from 'alasql';\n/, '');
content = content.replace(/\(alasql as any\)/g, 'alasql');

const sqlEndpointRegex = /apiRouter\.post\('\/sql\/execute', authenticateToken, async \(req: any, res\) => \{/;
const alasqlInjection = `let alasql: any = null;
try {
  alasql = eval("require('alasql')");
} catch(e) {
  console.warn('alasql not loaded', e);
}

apiRouter.post('/sql/execute', authenticateToken, async (req: any, res) => {`;

content = content.replace(sqlEndpointRegex, alasqlInjection);

fs.writeFileSync('server.ts', content);
console.log('Successfully refactored server.ts');
