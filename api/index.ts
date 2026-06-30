import app from '../dist/server.cjs';

const expressApp = (app as any).default || app;
export default expressApp;
