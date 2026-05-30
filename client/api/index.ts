/**
 * Vercel Serverless: toàn bộ `/api/*` → Express backend (thư mục `server`).
 * Cần cài dependency server khi build (xem installCommand trong vercel.json).
 */
import serverless from 'serverless-http';
import app from '../../server/src/app';

const handler = serverless(app, {
  binary: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream',
  ],
});

export default handler;
