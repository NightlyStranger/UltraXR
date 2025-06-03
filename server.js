const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();

const options = {
  key: fs.readFileSync('myapp.key'),
  cert: fs.readFileSync('myapp.crt')
};

// Serve static files (your Three.js app)
app.use(express.static(__dirname));

const IP = '10.1.0.240'; // ← Your local IP here
const PORT = 8443;

https.createServer(options, app).listen(PORT, IP, () => {
  console.log(`HTTPS server running at https://${IP}:${PORT}`);
});
