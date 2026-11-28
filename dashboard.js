'use strict';

const {
    getDashboardState,
    createPairingRequest,
    getPairingRequest
} = require('./dashboard-state');

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

button:disabled {
    opacity: .6;
    cursor: not-allowed;
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

<button id="pairButton" onclick="getPairingCode()">
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

        if (!response.ok) {
            throw new Error('Status request failed');
        }

        const data = await response.json();

        document.getElementById('status').textContent =
            data.status || 'Waiting for WhatsApp...';

        const qrContainer =
            document.getElementById('qrContainer');

        if (data.qr) {
            qrContainer.innerHTML =
                '<div class="qr">' +
                '<img src="' +
                data.qr +
                '" alt="WhatsApp QR Code">' +
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
        } else {
            code.textContent = '';
            code.style.display = 'none';
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
        .replace(/\D/g, '');

    const code =
        document.getElementById('code');

    const button =
        document.getElementById('pairButton');

    if (!/^\d{8,15}$/.test(phone)) {
        alert(
            'Enter a valid phone number with country code.'
        );
        return;
    }

    button.disabled = true;
    button.textContent = 'REQUESTING CODE...';

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

        if (!result.code) {
            throw new Error(
                'Pairing code was not returned'
            );
        }

        code.textContent =
            result.code;

        code.style.display =
            'block';

        document.getElementById('status').textContent =
            'Pairing code ready';

    } catch (error) {

        code.textContent = '';
        code.style.display = 'none';

        alert(
            error.message ||
            'Pairing failed'
        );

    } finally {

        button.disabled = false;
        button.textContent =
            'GET PAIRING CODE';

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

        /*
         * DASHBOARD PAGE
         */
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

        /*
         * DASHBOARD STATUS
         *
         * IMPORTANT:
         * The dashboard is a separate Vercel service
         * from the WhatsApp daemon.
         *
         * Therefore the status must be read from
         * MongoDB instead of local variables.
         */
        if (
            req.method === 'GET' &&
            url.pathname === '/api/status'
        ) {

            const state =
                await getDashboardState();

            res.statusCode = 200;

            res.setHeader(
                'Content-Type',
                'application/json'
            );

            return res.end(
                JSON.stringify(state)
            );
        }

        /*
         * PAIRING REQUEST
         */
        if (
            req.method === 'POST' &&
            url.pathname === '/api/pair'
        ) {

            try {

                const body =
                    await readBody(req);

                if (!body.phone) {

                    res.statusCode = 400;

                    res.setHeader(
                        'Content-Type',
                        'application/json'
                    );

                    return res.end(
                        JSON.stringify({
                            error:
                                'Phone number is required'
                        })
                    );
                }

                const phone =
                    String(body.phone)
                    .replace(/\D/g, '');

                if (!/^\d{8,15}$/.test(phone)) {

                    res.statusCode = 400;

                    res.setHeader(
                        'Content-Type',
                        'application/json'
                    );

                    return res.end(
                        JSON.stringify({
                            error:
                                'Enter a valid phone number with country code'
                        })
                    );
                }

                /*
                 * Store the request in MongoDB.
                 *
                 * The WhatsApp daemon in qr.js
                 * watches for this request.
                 */
                const requestId =
                    await createPairingRequest(
                        phone
                    );

                const startedAt =
                    Date.now();

                /*
                 * Wait for qr.js to process
                 * the request.
                 */
                while (
                    Date.now() -
                    startedAt <
                    30000
                ) {

                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                1000
                            )
                    );

                    const request =
                        await getPairingRequest();

                    if (
                        !request ||
                        request.id !==
                        requestId
                    ) {
                        continue;
                    }

                    if (
                        request.status ===
                        'completed'
                    ) {

                        res.statusCode =
                            200;

                        res.setHeader(
                            'Content-Type',
                            'application/json'
                        );

                        return res.end(
                            JSON.stringify({
                                code:
                                    request.code
                            })
                        );
                    }

                    if (
                        request.status ===
                        'failed'
                    ) {

                        res.statusCode =
                            400;

                        res.setHeader(
                            'Content-Type',
                            'application/json'
                        );

                        return res.end(
                            JSON.stringify({
                                error:
                                    request.error ||
                                    'Pairing request failed'
                            })
                        );
                    }
                }

                res.statusCode =
                    504;

                res.setHeader(
                    'Content-Type',
                    'application/json'
                );

                return res.end(
                    JSON.stringify({
                        error:
                            'Pairing request timed out. Please try again.'
                    })
                );

            } catch (error) {

                console.error(
                    'Dashboard pairing request failed:',
                    error?.message ||
                    error
                );

                res.statusCode =
                    500;

                res.setHeader(
                    'Content-Type',
                    'application/json'
                );

                return res.end(
                    JSON.stringify({
                        error:
                            error?.message ||
                            'Pairing request failed'
                    })
                );
            }
        }

        /*
         * NOT FOUND
         */
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
            error?.message ||
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
