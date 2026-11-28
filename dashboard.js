'use strict';

const {
    getDashboardState
} = require('./dashboard-state');

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
Reconnecting to WhatsApp...
</div>

<div id="qrContainer"></div>

<div class="note">
Scan the QR code with WhatsApp to connect SCANTY MD BOT.
</div>

</div>

<script>

async function refresh() {
    try {
        const response =
            await fetch('/api/status', {
                cache: 'no-store'
            });

        if (!response.ok) {
            throw new Error('Status request failed');
        }

        const data =
            await response.json();

        document.getElementById('status')
            .textContent =
            data.status ||
            'Reconnecting to WhatsApp...';

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

    } catch (error) {

        document.getElementById('status')
            .textContent =
            'Reconnecting to dashboard...';

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
