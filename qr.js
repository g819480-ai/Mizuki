'use strict';

const QRCode = require('qrcode');
const { updateDashboardState } = require('./dashboard');

let client = null;
let currentQR = null;
let qrExpiresAt = null;
let pairingCode = null;
let connectionStatus = 'Waiting for WhatsApp...';
let qrExpiryTimer = null;
let qrGeneration = 0;
let pairingInProgress = false;

const QR_LIFETIME = 30000;

function updateState() {
    updateDashboardState({
        status: connectionStatus,
        qr: currentQR,
        expiresAt: qrExpiresAt,
        pairingCode
    });
}

function clearQR() {
    qrGeneration++;

    if (qrExpiryTimer) {
        clearTimeout(qrExpiryTimer);
        qrExpiryTimer = null;
    }

    currentQR = null;
    qrExpiresAt = null;

    updateState();
}

async function requestPairingCode(phone) {
    phone = String(phone || '').replace(/\D/g, '');

    if (!/^\d{8,15}$/.test(phone)) {
        throw new Error(
            'Enter a valid phone number with country code'
        );
    }

    if (pairingInProgress) {
        throw new Error(
            'A pairing request is already processing. Please wait.'
        );
    }

    pairingInProgress = true;

    try {
        if (!client || !client.socket) {
            throw new Error(
                'WhatsApp is starting. Please wait for it to initialize.'
            );
        }

        if (connectionStatus === 'Connected') {
            throw new Error(
                'WhatsApp is already connected'
            );
        }

        if (
            client.authStorage?.state?.creds?.registered
        ) {
            throw new Error(
                'This WhatsApp session is already registered'
            );
        }

        const code = await client.requestPairingCode(phone);

        if (!code) {
            throw new Error(
                'WhatsApp did not return a pairing code'
            );
        }

        pairingCode = String(code);

        updateState();

        console.log(
            'Pairing code generated successfully'
        );

        return {
            code: pairingCode
        };

    } finally {
        pairingInProgress = false;
    }
}

function startQrServer(conn) {
    if (client) return;

    client = conn;

    /*
     * dashboard.js uses this handler for:
     * POST /api/pair
     */
    global.__scantyPairingHandler = requestPairingCode;

    updateState();

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

            /*
             * Ignore an older QR conversion if a newer
             * QR code has already arrived.
             */
            if (generation !== qrGeneration) {
                return;
            }

            if (qrExpiryTimer) {
                clearTimeout(qrExpiryTimer);
            }

            currentQR = image;
            qrExpiresAt = Date.now() + QR_LIFETIME;
            connectionStatus = 'Scan the QR code';

            updateState();

            console.log('Dashboard QR updated');

            qrExpiryTimer = setTimeout(() => {
                if (generation !== qrGeneration) {
                    return;
                }

                currentQR = null;
                qrExpiresAt = null;
                qrExpiryTimer = null;

                if (connectionStatus !== 'Connected') {
                    connectionStatus =
                        'QR expired - waiting for a new QR code';
                }

                updateState();

                console.log('QR code expired');

            }, QR_LIFETIME);

        } catch (error) {
            console.error(
                'QR generation failed:',
                error?.message || error
            );
        }
    });

    client.on('connecting', () => {
        connectionStatus = 'Connecting to WhatsApp';

        updateState();

        console.log(
            'SCANTY MD BOT connecting to WhatsApp...'
        );
    });

    client.on('open', () => {
        clearQR();

        connectionStatus = 'Connected';
        pairingCode = null;
        pairingInProgress = false;

        updateState();

        console.log(
            'WhatsApp connected successfully'
        );
    });

    client.on('close', () => {
        clearQR();

        connectionStatus =
            'Disconnected - reconnecting';

        pairingCode = null;
        pairingInProgress = false;

        updateState();

        console.log(
            'WhatsApp disconnected'
        );
    });

    console.log(
        'SCANTY MD BOT QR dashboard bridge ready'
    );
}

module.exports = {
    startQrServer
};
