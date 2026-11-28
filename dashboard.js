'use strict';

const http = require('http');

const PORT = Number(process.env.PORT) || 3000;

let status = 'Waiting for WhatsApp...';
let qr = null;
let expiresAt = null;
let pairingCode = null;

function updateDashboardState(data = {}) {
    if (data.status !== undefined) status = data.status;
    if (data.qr !== undefined) qr = data.qr;
    if (data.expiresAt !== undefined) expiresAt = data.expiresAt;
    if (data.pairingCode !== undefined) pairingCode = data.pairingCode;
}

function getDashboardState() {
    return {
        status,
        qr,
        expiresAt,
        pairingCode
    };
}

const PAGE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>SCANTY MD BOT</title>
    <style>
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            background: #050505;
            color: white;
            font-family: Arial, sans-serif;
        }

        .card {
            width: 100%;
            max-width: 430px;
            padding: 30px 22px;
            text-align: center;
            border: 1px solid #222;
            border-radius: 20px;
            background: #101010;
            box-shadow: 0 15px 50px rgba(0,0,0,.45);
        }

        h1 {
            margin: 0 0 8px;
            font-size: 28px;
        }

        .brand {
            margin-bottom: 22px;
            color: #aaa;
            font-size: 14px;
        }

        #status {
            margin: 15px 0;
            font-size: 15px;
            color: #ddd;
        }

        #qr {
            width: 280px;
            max-width: 100%;
            margin: 15px auto;
            display: none;
            border-radius: 12px;
            background: white;
            padding: 10px;
        }

        .code {
            margin: 20px 0;
            padding: 15px;
            border: 1px dashed #444;
            border-radius: 12px;
            font-size: 26px;
            letter-spacing: 4px;
            display: none;
        }

        input {
            width: 100%;
            padding: 13px;
            margin-top: 10px;
            border: 1px solid #333;
            border-radius: 10px;
            background: #181818;
            color: white;
            outline: none;
        }

        button {
            width: 100%;
            margin-top: 10px;
            padding: 13px;
            border: 0;
            border-radius: 10px;
            background: white;
            color: black;
            font-weight: bold;
            cursor: pointer;
        }

        button:active {
            transform: scale(.98);
        }

        .small {
            margin-top: 18px;
            color: #777;
            font-size: 12px;
        }
    </style>
</head>

<body>
<div class="card">
    <h1>SCANTY MD BOT</h1>
    <div class="brand">WhatsApp Connection Dashboard</div>

    <div id="status">Waiting for WhatsApp...</div>

    <img id="qr" alt="WhatsApp QR Code">

    <div id="code" class="code"></div>

    <input
        id="phone"
        type="text"
        placeholder="Enter WhatsApp number with country code"
    >

    <button onclick="requestPairingCode()">
        Get Pairing Code
    </button>

    <div class="small">
        Scan the QR code or use the pairing code to connect.
    </div>
</div>

<script>
async function refreshStatus() {
    try {
        const response = await fetch('/api/status', {
            cache: 'no-store'
        });

        const data = await response.json();

        document.getElementById('status').textContent =
            data.status || 'Waiting for WhatsApp...';

        const qr = document.getElementById('qr');
        const code = document.getElementById('code');

        if (data.qr) {
            qr.src = data.qr;
            qr.style.display = 'block';
        } else {
            qr.style.display = 'none';
        }

        if (data.pairingCode) {
            code.textContent = data.pairingCode;
            code.style.display = 'block';
        } else {
            code.style.display = 'none';
        }
    } catch (error) {
        document.getElementById('status').textContent =
            'Dashboard connection unavailable';
    }
}

async function requestPairingCode() {
    const phone = document.getElementById('phone').value.trim();

    if (!phone) {
        alert('Enter your WhatsApp number.');
        return;
    }

    try {
        const response = await fetch('/api/pair', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Unable to generate pairing code.');
            return;
        }

        if (data.code) {
            document.getElementById('code').textContent = data.code;
            document.getElementById('code').style.display = 'block';
        }
    } catch (error) {
        alert('Unable to contact the dashboard.');
    }
}

refreshStatus();
setInterval(refreshStatus, 1000);
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
    const url = new URL(
        req.url,
        `http://${req.headers.host || 'localhost'}`
    );

    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'
        });

        res.end(PAGE);
        return;
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });

        res.end(JSON.stringify(getDashboardState()));
        return;
    }

    if (req.method === 'POST' && url.pathname === '/api/pair') {
        let body = '';

        req.on('data', chunk => {
            body += chunk;
        });

        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');

                if (!global.__scantyPairingHandler) {
                    res.writeHead(503, {
                        'Content-Type': 'application/json'
                    });

                    res.end(JSON.stringify({
                        error: 'Pairing service is not ready yet.'
                    }));

                    return;
                }

                const result =
                    await global.__scantyPairingHandler(data.phone);

                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });

                res.end(JSON.stringify(result));
            } catch (error) {
                res.writeHead(400, {
                    'Content-Type': 'application/json'
                });

                res.end(JSON.stringify({
                    error: error?.message || 'Pairing failed.'
                }));
            }
        });

        return;
    }

    res.writeHead(404, {
        'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
        error: 'Not found'
    }));
});

server.listen(PORT, () => {
    console.log(`SCANTY dashboard listening on port ${PORT}`);
});

module.exports = {
    updateDashboardState,
    getDashboardState
};
