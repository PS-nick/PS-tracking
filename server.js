import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Health check endpoint for Cloud Run and monitoring
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  const distIndex = path.join(__dirname, 'dist', 'index.html');
  const buildIndex = path.join(__dirname, 'build', 'index.html');

  if (fs.existsSync(distIndex) || fs.existsSync(buildIndex)) {
    const staticDir = fs.existsSync(distIndex) ? path.join(__dirname, 'dist') : path.join(__dirname, 'build');
    const targetIndex = fs.existsSync(distIndex) ? distIndex : buildIndex;

    app.use(express.static(staticDir));
    app.get('*', (_req, res) => {
      res.sendFile(targetIndex);
    });
  } else {
    // If production build does not exist, mount Vite middlewares dynamically
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`ProTrace application server actively running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
