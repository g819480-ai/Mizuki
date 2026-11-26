
'use strict';

const http = require('http');
const QRCode = require('qrcode');

let client = null;
let currentQR = null;
let qrExpiresAt = null;
let pairingCode = null;
let connectionStatus = 'Waiting for WhatsApp...';
let server = null;
let qrExpiryTimer = null;
let qrGeneration = 0;
let pairingInProgress = false;

const QR_LIFETIME = 30000;

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
 <p class="note">Scan using WhatsApp → Linked Devices.</p>

 <div class="section">
  <h3>PAIR WITH PHONE NUMBER</h3>
  <input id="phone" type="tel" inputmode="numeric"
   placeholder="Country code + phone number">
  <button id="pairButton" onclick="getPairingCode()">
   GET PAIRING CODE
  </button>
  <div class="code" id="code"></div>
  <p class="note">Enter your number with country code, without the + sign.</p>
 </div>
</div>

<script>
let lastQr = null;
let expiresAt = null;
let refreshRunning = false;

async function refresh() {
 if (refreshRunning) return;
 refreshRunning = true;

 try {
  const response = await fetch('/api/status', {
   cache: 'no-store'
  });

  if (!response.ok) throw new Error('Status unavailable');

  const data = await response.json();

  document.getElementById('status').textContent =
   'Status: ' + data.status;

  const box = document.getElementById('qrbox');
  const timer = document.getElementById('timer');

  if (data.status === 'Connected') {
   box.innerHTML =
    '<div class="placeholder">WhatsApp Connected ✓</div>';
   timer.textContent = 'Connected';
   lastQr = null;
   expiresAt = null;
  } else if (data.qr) {
   expiresAt = data.expiresAt;

   if (data.qr !== lastQr) {
    lastQr = data.qr;

    const image = document.createElement('img');
    image.alt = 'WhatsApp QR Code';
    image.src = data.qr;

    box.replaceChildren(image);
   }
  } else {
   lastQr = null;
   expiresAt = null;

   box.innerHTML =
    '<div class="placeholder">Waiting for a fresh QR code...</div>';

   if (data.status !== 'Connected') {
    timer.textContent = 'Waiting for QR code';
   }
  }

  if (data.pairingCode) {
   document.getElementById('code').textContent =
    data.pairingCode;
  }

 } catch (error) {
  document.getElementById('status').textContent =
   'Dashboard reconnecting...';
 } finally {
  refreshRunning = false;
 }
}

function updateTimer() {
 const timer = document.getElementById('timer');

 if (!expiresAt) return;

 const remaining = Math.max(
  0, Math.ceil((expiresAt - Date.now()) / 1000)
 );

 if (remaining > 0) {
  timer.textContent = 'QR expires in ' + remaining + ' seconds';
 } else {
  timer.textContent = 'QR expired - waiting for a new QR...';
 }
}

async function getPairingCode() {
 const phone = document.getElementById('phone').value
  .trim().replace(/\\D/g, '');

 const button = document.getElementById('pairButton');
 const code = document.getElementById('code');

 if (!/^\\d{8,15}$/.test(phone)) {
  alert('Enter a valid phone number with country code.');
  return;
 }

 button.disabled = true;
 button.textContent = 'REQUESTING...';
 code.textContent = 'Requesting pairing code...';

 try {
  const response = await fetch('/api/pair', {
   method: 'POST',
   headers: {'Content-Type':'application/json'},
   body: JSON.stringify({phone})
  });

  const result = await response.json();

  if (!response.ok) {
   throw new Error(result.error || 'Pairing failed');
  }

  if (!result.code) {
   throw new Error('WhatsApp did not return a pairing code.');
  }

  code.textContent = result.code;

 } catch (error) {
  code.textContent = '';
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
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*'
    });

    res.end(JSON.stringify(data));
}

function clearQR() {
    qrGeneration++;

    if (qrExpiryTimer) {
        clearTimeout(qrExpiryTimer);
        qrExpiryTimer = null;
    }

    currentQR = null;
    qrExpiresAt = null;
}

function startQrServer(conn) {
    if (server) return server;

    client = conn;

    client.on('qr', async qr => {
        if (!qr) {
            clearQR();
            return;
        }

        const generation = ++qrGeneration;

        try {
            const image = await QRCode.toDataURL(qr, {
                width: 400,
                margin: 2,
                errorCorrectionLevel: 'H'
            });

            // Ignore an old QR conversion if a newer QR arrived.
            if (generation !== qrGeneration) return;

            if (qrExpiryTimer) {
                clearTimeout(qrExpiryTimer);
            }

            currentQR = image;
            qrExpiresAt = Date.now() + QR_LIFETIME;
            connectionStatus = 'Scan the QR code';

            qrExpiryTimer = setTimeout(() => {
                if (generation !== qrGeneration) return;

                currentQR = null;
                qrExpiresAt = null;
                qrExpiryTimer = null;

                if (connectionStatus !== 'Connected') {
                    connectionStatus =
                        'QR expired - waiting for a new QR code';
                }

                console.log('QR code expired');
            }, QR_LIFETIME);

            console.log('Dashboard QR updated');

        } catch (error) {
            console.error('QR generation failed:', error.message);
        }
    });

    client.on('connecting', () => {
        connectionStatus = 'Connecting to WhatsApp';
    });

    client.on('open', () => {
        clearQR();

        connectionStatus = 'Connected';
        pairingCode = null;
        pairingInProgress = false;

        console.log('WhatsApp connected successfully');
    });

    client.on('close', () => {
        clearQR();

        connectionStatus = 'Disconnected - reconnecting';
        pairingCode = null;
        pairingInProgress = false;

        console.log('WhatsApp disconnected');
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
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store'
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
            if (pairingInProgress) {
                return sendJSON(res, 429, {
                    error: 'A pairing request is already processing. Please wait.'
                });
            }

            pairingInProgress = true;

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

                let data;

                try {
                    data = JSON.parse(body || '{}');
                } catch (_) {
                    return sendJSON(res, 400, {
                        error: 'Invalid request data'
                    });
                }

                                const phone = String(data.phone || '')
                    .replace(/\D/g, '');

                if (!/^\d{8,15}$/.test(phone)) {
                 
                if (!client || !client.socket) {
                    return sendJSON(res, 503, {
                        error: 'WhatsApp is starting. Please wait for it to initialize.'
                    });
                }

                if (connectionStatus === 'Connected') {
                    return sendJSON(res, 409, {
                        error: 'WhatsApp is already connected'
                    });
                }

                if (
                    client.authStorage?.state?.creds?.registered
                ) {
                    return sendJSON(res, 409, {
                        error: 'This WhatsApp session is already registered'
                    });
                }

                const code = await client.requestPairingCode(phone);

                if (!code) {
                    throw new Error(
                        'WhatsApp did not return a pairing code'
                    );
                }

                pairingCode = String(code);

                console.log('Pairing code generated successfully');

                return sendJSON(res, 200, {
                    code: pairingCode
                });

            } catch (error) {
                console.error(
                    'Pairing request failed:',
                    error.message
                );

                return sendJSON(res, 500, {
                    error: error.message || 'Pairing request failed'
                });

            } finally {
                pairingInProgress = false;
            }
        }

        return sendJSON(res, 404, {
            error: 'Not found'
        });
    });

    const port = Number(process.env.PORT) || 3000;

    server.listen(port, '0.0.0.0', () => {
        console.log(
            'SCANTY MD BOT dashboard listening on port ' + port
        );
    });

    return server;
}

module.exports = { startQrServer };
