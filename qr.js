
'use strict';

const http = require('http');
const QRCode = require('qrcode');

let client = null;
let currentQR = null;
let qrExpiresAt = null;
let pairingCode = null;
let connectionStatus = 'Waiting for WhatsApp...';
let server = null;

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SCANTY MD BOT</title>
<style>
*{box-sizing:border-box}
body{
 margin:0;min-height:100vh;padding:25px 15px;
 display:flex;align-items:center;justify-content:center;
 background:radial-gradient(circle at top,#421010,#090909 65%);
 color:#fff;font-family:Arial,sans-serif
}
.container{
 width:100%;max-width:440px;text-align:center;
 background:#151515;border:1px solid #6d1717;
 border-radius:22px;padding:28px 20px;
 box-shadow:0 0 35px #8b111144
}
h1{color:#ff3333;margin:0;font-size:27px}
.subtitle{color:#aaa;margin:10px 0 25px}
.status{color:#ff7777;margin:15px 0;font-size:14px}
.qrbox{
 background:#fff;width:260px;height:260px;
 margin:20px auto;padding:10px;border-radius:12px;
 display:flex;align-items:center;justify-content:center
}
.qrbox img{width:100%;height:100%;object-fit:contain}
.placeholder{color:#333;font-size:14px}
.timer{color:#ff5555;font-weight:bold;margin:12px}
input{
 width:100%;padding:15px;border-radius:9px;
 border:1px solid #555;background:#090909;
 color:white;font-size:16px;margin:12px 0
}
button{
 width:100%;padding:15px;border:0;border-radius:9px;
 background:#c41414;color:white;font-weight:bold;
 font-size:16px;cursor:pointer
}
button:disabled{opacity:.5}
.code{
 font-size:25px;letter-spacing:4px;color:#ff5555;
 font-weight:bold;margin:18px 0;word-break:break-word
}
.section{border-top:1px solid #333;margin-top:25px;padding-top:20px}
.note{font-size:12px;color:#888;line-height:1.6}
</style>
</head>
<body>
<div class="container">
 <h1>SCANTY MD BOT</h1>
 <div class="subtitle">WhatsApp Connection Dashboard</div>

 <div class="status" id="status">Waiting for WhatsApp...</div>

 <h3>SCAN QR CODE</h3>
 <div class="qrbox" id="qrbox">
  <div class="placeholder">Waiting for QR code...</div>
 </div>
 <div class="timer" id="timer">Waiting for QR code</div>
 <p class="note">Scan this QR code using WhatsApp → Linked Devices.</p>

 <div class="section">
  <h3>PAIR WITH PHONE NUMBER</h3>
  <input id="phone" type="tel" placeholder="Country code + phone number">
  <button id="pairButton" onclick="getPairingCode()">GET PAIRING CODE</button>
  <div class="code" id="code"></div>
  <p class="note">Enter your number with country code, without the + sign.</p>
 </div>
</div>

<script>
let lastQr = null;
let expiresAt = null;

async function refresh() {
 try {
  const response = await fetch('/api/status');
  const data = await response.json();

  document.getElementById('status').textContent =
   'Status: ' + data.status;

  if (data.qr && data.qr !== lastQr) {
   lastQr = data.qr;
   expiresAt = data.expiresAt;

   const image = document.createElement('img');
   image.src = data.qr;
   const box = document.getElementById('qrbox');
   box.replaceChildren(image);
  }

  if (!data.qr && data.status === 'Connected') {
   document.getElementById('qrbox').innerHTML =
    '<div class="placeholder">WhatsApp Connected ✓</div>';
   document.getElementById('timer').textContent = 'Connected';
   lastQr = null;
   expiresAt = null;
  }

  if (!data.qr && data.status !== 'Connected' && !lastQr) {
   document.getElementById('qrbox').innerHTML =
    '<div class="placeholder">Waiting for QR code...</div>';
  }

  if (data.pairingCode) {
   document.getElementById('code').textContent =
    data.pairingCode;
  }
 } catch (error) {
  document.getElementById('status').textContent =
   'Dashboard reconnecting...';
 }
}

function updateTimer() {
 const timer = document.getElementById('timer');

 if (!expiresAt) return;

 const remaining = Math.max(
  0, Math.ceil((expiresAt - Date.now()) / 1000)
 );

 timer.textContent = remaining > 0
  ? 'QR expires in ' + remaining + ' seconds'
  : 'QR expired - waiting for a new QR...';
}

async function getPairingCode() {
 const phone = document.getElementById('phone').value.trim();
 const button = document.getElementById('pairButton');
 const code = document.getElementById('code');

 if (!phone) {
  alert('Enter your phone number with country code.');
  return;
 }

 button.disabled = true;
 button.textContent = 'REQUESTING...';
 code.textContent = '';

 try {
  const response = await fetch('/api/pair', {
   method: 'POST',
   headers: {'Content-Type':'application/json'},
   body: JSON.stringify({phone})
  });

  const result = await response.json();

  if (!response.ok) throw new Error(result.error || 'Pairing failed');

  code.textContent = result.code;
 } catch (error) {
  alert(error.message);
 } finally {
  button.disabled = false;
  button.textContent = 'GET PAIRING CODE';
 }
}

setInterval(refresh, 1000);
setInterval(updateTimer, 250);
refresh();
</script>
</body>
</html>`;

function sendJSON(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
}

function startQrServer(conn) {
    if (server) return server;

    client = conn;

    client.on('qr', async qr => {
        if (!qr) {
            currentQR = null;
            qrExpiresAt = null;
            return;
        }

        try {
            currentQR = await QRCode.toDataURL(qr, {
                width: 400,
                margin: 2,
                errorCorrectionLevel: 'H'
            });

            qrExpiresAt = Date.now() + 30000;
            connectionStatus = 'Scan the QR code';
            console.log('Dashboard QR updated');
        } catch (error) {
            console.error('QR generation failed:', error.message);
        }
    });

    client.on('connecting', () => {
        connectionStatus = 'Connecting to WhatsApp';
    });

    client.on('open', () => {
        connectionStatus = 'Connected';
        currentQR = null;
        qrExpiresAt = null;
        pairingCode = null;
    });

    client.on('close', () => {
        connectionStatus = 'Disconnected - reconnecting required';
        currentQR = null;
        qrExpiresAt = null;
    });

    server = http.createServer(async (req, res) => {
        const url = new URL(req.url, 'http://localhost');

        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            return res.end();
        }

        if (req.method === 'GET' && url.pathname === '/') {
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });
            return res.end(PAGE);
        }

        if (req.method === 'GET' && url.pathname === '/api/status') {
            return sendJSON(res, 200, {
                status: connectionStatus,
                qr: currentQR,
                expiresAt: qrExpiresAt,
                pairingCode
            });
        }

        if (req.method === 'POST' && url.pathname === '/api/pair') {
            try {
                let body = '';

                for await (const chunk of req) {
                    body += chunk;
                    if (body.length > 4096) {
                        return sendJSON(res, 413, {
                            error: 'Request too large'
                        });
                    }
                }

                const data = JSON.parse(body || '{}');
                const phone = String(data.phone || '').replace(/\D/g, '');

                if (!phone) {
                    return sendJSON(res, 400, {
                        error: 'Enter a valid phone number'
                    });
                }

                if (!client?.socket) {
                    return sendJSON(res, 503, {
                        error: 'WhatsApp is not ready yet'
                    });
                }

                if (connectionStatus === 'Connected') {
                    return sendJSON(res, 409, {
                        error: 'WhatsApp is already connected'
                    });
                }

                const code = await client.requestPairingCode(phone);
                pairingCode = code;

                return sendJSON(res, 200, { code });
            } catch (error) {
                console.error('Pairing request failed:', error.message);
                return sendJSON(res, 500, {
                    error: error.message || 'Pairing request failed'
                });
            }
        }

        return sendJSON(res, 404, {
            error: 'Not found'
        });
    });

    const port = Number(process.env.PORT) || 3000;

    server.listen(port, '0.0.0.0', () => {
        console.log('SCANTY MD BOT dashboard listening on port ' + port);
    });

    return server;
}

module.exports = { startQrServer };
