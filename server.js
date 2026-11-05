const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if present
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

const { GoogleGenerativeAI } = require('@google/generative-ai');
const analyzeHandler = require('./api/analyze');
const chatHandler = require('./api/chat');

const PORT = process.env.PORT || 4100;

function enhanceResponse(res) {
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.json = function (obj) {
    if (!res.headersSent) {
      res.writeHead(res.statusCode || 200, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (urlPath === '/api/analyze' && req.method === 'POST') {
    return analyzeHandler(req, enhanceResponse(res));
  }

  if (urlPath === '/api/chat' && req.method === 'POST') {
    return chatHandler(req, enhanceResponse(res));
  }

  // Static file serving
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };

  let filePath = path.join(__dirname, urlPath === '/' || urlPath === '/app/new' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (urlPath === '/gojo-night-workspace.jpg' || urlPath === '/image_9.png') {
      res.writeHead(302, {
        Location: 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&q=80&w=1600',
      });
      return res.end();
    }
    const reqExt = path.extname(urlPath).toLowerCase();
    if (reqExt && reqExt !== '.html') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    filePath = path.join(__dirname, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mime[ext] || 'text/plain',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(filePath).pipe(res);
});

if (require.main === module || !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`Gojo.nerd live server running on http://localhost:${PORT}`);
  });
}

module.exports = server;
