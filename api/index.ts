import app from '../server.js';

const expressApp = (app as any).default || app;
export default expressApp;
