'use strict';

let status = 'Waiting for WhatsApp...';
let qr = null;
let expiresAt = null;
let pairingCode = null;

function getState() {
    return {
        status,
        qr,
        expiresAt,
        pairingCode
    };
}

function updateDashboardState(data = {}) {
    if (data.status !== undefined) {
        status = data.status;
    }

    if (data.qr !== undefined) {
        qr = data.qr;
    }

    if (data.expiresAt !== undefined) {
        expiresAt = data.expiresAt;
    }

    if (data.pairingCode !== undefined) {
        pairingCode = data.pairingCode;
    }
}

async function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', chunk => {
            body += chunk;

            if (body.length > 4096) {
                reject(new Error('Request too large'));
                req.destroy();
            }
        });

        req.on('end', () => {
            try {
                resolve(JSON.parse(body || '{}'));
            } catch {
                reject(new Error('Invalid request data'));
            }
        });

        req.on('error', reject);
    });
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
    padding: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #050505;
    color: white;
    font-family: Arial, sans-serif;
}

.card {
    width: 100%;
    max-width: 440px;
    padding: 30px 22px;
    text-align: center;
    background: #101010;
    border: 1px solid #292929;
    border-radius: 20px;
    box-shadow: 0 15px 50px rgba(0,0,0,.45);
}

h1 {
    margin: 0;
    font-size: 28px;
}

.subtitle {
    margin-top: 8px;
    color: #999;
    font-size: 14px;
}

.status {
    margin: 20px 0;
    color: #ddd;
}

.qr {
    width: 280px;
    max-width: 100%;
    margin: 15px auto;
    padding: 10px;
    background: white;
    border-radius: 12px;
}

.qr img {
    width: 100%;
    display: block;
}

.code {
    margin: 20px 0;
    padding: 15px;
    border: 1px dashed #444;
    border-radius: 12px;
    font-size: 25px;
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

.note {
    margin-top: 18px;
    color: #777;
    font-size: 12px;
}
</style>
</head>

<body>

<div class="card">

<h1>SCANTY MD BOT</h1>

<div class="subtitle">
WhatsApp Connection Dashboard
</div>

<div id="status" class="status">
Waiting for WhatsApp...
</div>

<div id="qrContainer"></div>

<div id="code" class="code"></div>

<input
    id="phone"
    type="tel"
    inputmode="numeric"
    placeholder="Country code + phone number"
>

<button onclick="getPairingCode()">
GET PAIRING CODE
</button>

<div class="note">
Enter your WhatsApp number with country code, without the + sign.
</div>

</div>

<script>

async function refresh() {
    try {
        const response = await fetch('/api/status', {
            cache: 'no-store'
        });

        const data = await response.json();

        document.getElementById('status').textContent =
            data.status || 'Waiting for WhatsApp...';

        const qrContainer =
            document.getElementById('qrContainer');

        if (data.qr) {
            qrContainer.innerHTML =
                '<div class="qr">' +
                '<img src="' + data.qr + '" alt="WhatsApp QR Code">' +
                '</div>';
        } else {
            qrContainer.innerHTML = '';
        }

        const code =
            document.getElementById('code');

        if (data.pairingCode) {
            code.textContent =
                data.pairingCode;

            code.style.display =
                'block';
        }

    } catch (error) {
        document.getElementById('status').textContent =
            'Dashboard reconnecting...';
    }
}

async function getPairingCode() {

    const phone =
        document.getElementById('phone')
        .value
        .trim()
        .replace(/\\D/g, '');

    const code =
        document.getElementById('code');

    if (!/^\\d{8,15}$/.test(phone)) {
        alert(
            'Enter a valid phone number with country code.'
        );
        return;
    }

    try {

        const response =
            await fetch('/api/pair', {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json'
                },
                body: JSON.stringify({
                    phone
                })
            });

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                'Pairing failed'
            );
        }

        code.textContent =
            result.code || '';

        code.style.display =
            'block';

    } catch (error) {

        code.textContent = '';

        alert(
            error.message ||
            'Pairing failed'
        );
    }
}

refresh();

setInterval(refresh, 1000);

</script>

</body>
</html>`;

async function handler(req, res) {

    try {

        const url =
            new URL(
                req.url,
                `https://${req.headers.host || 'localhost'}`
            );

        res.setHeader(
            'Cache-Control',
            'no-store'
        );

        if (
            req.method === 'GET' &&
            url.pathname === '/'
        ) {

            res.statusCode = 200;

            res.setHeader(
                'Content-Type',
                'text/html; charset=utf-8'
            );

            return res.end(PAGE);
        }

        if (
            req.method === 'GET' &&
            url.pathname === '/api/status'
        ) {

            res.statusCode = 200;

            res.setHeader(
                'Content-Type',
                'application/json'
            );

            return res.end(
                JSON.stringify(
                    getState()
                )
            );
        }

        if (req.method === 'POST' && url.pathname === '/api/pair') {
    const {
        createPairingRequest,
        getPairingRequest
    } = require('./dashboard-state');

    try {
        const body = await readBody(req);

        if (!body.phone) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
                error: 'Phone number is required'
            }));
        }

        const requestId = await createPairingRequest(body.phone);

        const startedAt = Date.now();

        while (Date.now() - startedAt < 30000) {
            await new Promise(resolve =>
                setTimeout(resolve, 1000)
            );

            const request = await getPairingRequest();

            if (!request || request.id !== requestId) {
                continue;
            }

            if (request.status === 'completed') {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');

                return res.end(JSON.stringify({
                    code: request.code
                }));
            }

            if (request.status === 'failed') {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');

                return res.end(JSON.stringify({
                    error: request.error ||
                        'Pairing request failed'
                }));
            }
        }

        res.statusCode = 504;
        res.setHeader('Content-Type', 'application/json');

        return res.end(JSON.stringify({
            error: 'Pairing request timed out. Please try again.'
        }));

    } catch (error) {
        console.error(
            'Dashboard pairing request failed:',
            error?.message || error
        );

        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');

        return res.end(JSON.stringify({
            error: error?.message ||
                'Pairing request failed'
        }));
    }
}
        res.statusCode = 404;

        res.setHeader(
            'Content-Type',
            'application/json'
        );

        return res.end(
            JSON.stringify({
                error: 'Not found'
            })
        );

    } catch (error) {

        console.error(
            'Dashboard request failed:',
            error
        );

        res.statusCode = 500;

        res.setHeader(
            'Content-Type',
            'application/json'
        );

        return res.end(
            JSON.stringify({
                error:
                    error?.message ||
                    'Internal server error'
            })
        );
    }
}

module.exports = handler;
module.exports.updateDashboardState =
    updateDashboardState;
module.exports.getDashboardState =
    getState;
