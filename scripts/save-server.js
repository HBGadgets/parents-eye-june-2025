const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5001;

const server = http.createServer((req, res) => {
  // Set CORS headers so the client browser can make requests to this sidecar server
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // GET /saved-colors: returns all assigned route colors from the centralized metadata.json
  if (req.method === 'GET' && req.url === '/saved-colors') {
    try {
      const dirPath = path.join(process.cwd(), 'public', 'history-playback-data');
      const metadataPath = path.join(dirPath, 'metadata.json');
      let colorsMap = {};

      if (fs.existsSync(metadataPath)) {
        const content = fs.readFileSync(metadataPath, 'utf8');
        colorsMap = JSON.parse(content);
      } else if (fs.existsSync(dirPath)) {
        // Fallback: scan individual JSON files if metadata.json doesn't exist
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json') && f !== 'metadata.json');
        for (const file of files) {
          try {
            const filePath = path.join(dirPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            if (data && data.routeColor) {
              const deviceId = file.replace('.json', '');
              colorsMap[deviceId] = data.routeColor;
            }
          } catch (e) {}
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, colors: colorsMap }));
    } catch (err) {
      console.error('Error fetching saved colors:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/save-playback') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { uniqueId, data, routeColor } = JSON.parse(body);

        if (!uniqueId || !data) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Missing uniqueId or data' }));
          return;
        }

        const dirPath = path.join(process.cwd(), 'public', 'history-playback-data');
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        // Save coordinate playback details with routeColor property embedded
        const playbackData = {
          ...data,
          routeColor: routeColor || undefined
        };

        const filePath = path.join(dirPath, `${uniqueId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(playbackData, null, 2), 'utf8');

        // Centralized metadata.json tracking for fast frontend boot loading
        if (routeColor) {
          const metadataPath = path.join(dirPath, 'metadata.json');
          let metadata = {};
          if (fs.existsSync(metadataPath)) {
            try {
              metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            } catch (e) {}
          }
          metadata[uniqueId] = routeColor;
          fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `Successfully saved playback data for ${uniqueId}` }));
      } catch (err) {
        console.error('Error saving playback data:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`[ParentsEye Sidecar] Playback save server listening on http://localhost:${PORT}`);
});
