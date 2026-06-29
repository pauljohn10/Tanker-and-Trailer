import app from '../server';

const expressApp = (app as any).default || app;
export default expressApp;
