/**
 * SMMFamy - All-in-One Local Development Server
 * Run this with: node proxy-server.js
 * 
 * Features:
 * 1. Serves static files (HTML, CSS, JS) from port 8080
 * 2. Supports clean URLs (e.g. /services -> serves services.html)
 * 3. Proxies API requests to SMMGen to bypass CORS
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const SMMGEN_API_URL = 'https://smmgen.com/api/v2';
const SMMGEN_API_KEY = 'c4bef138daa72a2bdf56ab47edb55ef5';

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 1. Handle API Proxy
    if (req.method === 'POST' && req.url === '/api/smmgen') {
        handleApiProxy(req, res);
        return;
    }

    // 2. Handle Static Files
    handleStaticFiles(req, res);
});

function handleStaticFiles(req, res) {
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    let extname = path.extname(filePath);

    // Clean URL support: if no extension, try adding .html or check if directory
    if (!extname) {
        if (fs.existsSync(filePath + '.html')) {
            filePath += '.html';
            extname = '.html';
        } else if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
            filePath = path.join(filePath, 'index.html');
            extname = '.html';
        }
    }

    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // 404
                fs.readFile(path.join(__dirname, 'index.html'), (err, indexContent) => {
                    // Fallback to index.html for SPA-like behavior or just 404
                    if (err) {
                        res.writeHead(404);
                        res.end('404 Not Found');
                    } else {
                        // Ideally show a dedicated 404 page, but for now specific error
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end(`<h1>404 Not Found</h1><p>The file ${req.url} does not exist.</p>`);
                    }
                });
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

function handleApiProxy(req, res) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            const { action, ...params } = data;

            // Build form data for SMMGen
            const formData = new URLSearchParams();
            formData.append('key', SMMGEN_API_KEY);
            formData.append('action', action);

            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, value);
                }
            });

            const postData = formData.toString();
            const options = {
                hostname: 'smmgen.com',
                port: 443,
                path: '/api/v2',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const proxyReq = https.request(options, (proxyRes) => {
                let responseData = '';
                proxyRes.on('data', chunk => { responseData += chunk; });
                proxyRes.on('end', () => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(responseData);
                });
            });

            proxyReq.on('error', (error) => {
                console.error('Proxy error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Proxy request failed' }));
            });

            proxyReq.write(postData);
            proxyReq.end();

        } catch (error) {
            console.error('Parse error:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });
}

server.listen(PORT, () => {
    console.log(`\n🚀 SMMFamy Server running at http://localhost:${PORT}`);
    console.log(`✨ Serving static files with clean URLs`);
    console.log(`🔌 API Proxy active at /api/smmgen`);
    console.log(`\nPress Ctrl+C to stop.\n`);
});
