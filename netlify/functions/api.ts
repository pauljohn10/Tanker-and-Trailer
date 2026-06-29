import serverless from 'serverless-http';
import app from '../../server';

const expressApp = (app as any).default || app;
export const handler = serverless(expressApp);
