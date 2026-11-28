'use strict';

const QRCode = require('qrcode');
 const {
    setDashboardState,
    getPairingRequest,
    updatePairingRequest
} = require('./dashboard-state');

let client = null;
let currentQR = null;
let qrExpiresAt = null;
let pairingCode = null;
let connectionStatus = 'Waiting for WhatsApp...';
let qrExpiryTimer = null;
let qrGeneration = 0;
let pairingInProgress = false;

const QR_LIFETIME = 30000;

async function updateState() {
    try {
        await setDashboardState({
            status: connectionStatus,
            qr: currentQR,
            expiresAt: qrExpiresAt,
            pairingCode
        });
    } catch (error) {
        console.error(
            'Dashboard state update failed:',
            error?.message || error
        );
    }
}

async function clearQR() {
    qrGeneration++;

    if (qrExpiryTimer) {
        clearTimeout(qrExpiryTimer);
        qrExpiryTimer = null;
    }

    currentQR = null;
    qrExpiresAt = null;

    await updateState();
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

        const code =
            await client.requestPairingCode(phone);

        if (!code) {
            throw new Error(
                'WhatsApp did not return a pairing code'
            );
        }

        pairingCode = String(code);

        await updateState();

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
     * The dashboard service is separate from this
     * WhatsApp daemon, so pairing requests are exposed
     * through MongoDB-backed dashboard state.
     */
    updateState();

    client.on('qr', async qr => {
        if (!qr) {
            await clearQR();
            return;
        }

        const generation = ++qrGeneration;

        try {
            const image =
                await QRCode.toDataURL(qr, {
                    width: 400,
                    margin: 2,
                    errorCorrectionLevel: 'H'
                });

            if (generation !== qrGeneration) {
                return;
            }

            if (qrExpiryTimer) {
                clearTimeout(qrExpiryTimer);
            }

            currentQR = image;
            qrExpiresAt =
                Date.now() + QR_LIFETIME;

            connectionStatus =
                'Scan the QR code';

            await updateState();

            console.log(
                'Dashboard QR updated'
            );

            qrExpiryTimer =
                setTimeout(async () => {

                    if (
                        generation !== qrGeneration
                    ) {
                        return;
                    }

                    currentQR = null;
                    qrExpiresAt = null;
                    qrExpiryTimer = null;

                    if (
                        connectionStatus !==
                        'Connected'
                    ) {
                        connectionStatus =
                            'QR expired - waiting for a new QR code';
                    }

                    await updateState();

                    console.log(
                        'QR code expired'
                    );

                }, QR_LIFETIME);

        } catch (error) {
            console.error(
                'QR generation failed:',
                error?.message || error
            );
        }
    });

    client.on('connecting', async () => {
        connectionStatus =
            'Connecting to WhatsApp';

        await updateState();
setInterval(async () => {
    try {
        const request =
            await getPairingRequest();

        if (!request) return;

        if (request.status !== 'pending') {
            return;
        }

        if (!request.phone) {
            await updatePairingRequest(
                request.id,
                {
                    status: 'failed',
                    error: 'Phone number is missing'
                }
            );

            return;
        }

        if (!client || !client.socket) {
            return;
        }

        if (connectionStatus === 'Connected') {
            await updatePairingRequest(
                request.id,
                {
                    status: 'failed',
                    error: 'WhatsApp is already connected'
                }
            );

            return;
        }

        if (
            client.authStorage?.state?.creds?.registered
        ) {
            await updatePairingRequest(
                request.id,
                {
                    status: 'failed',
                    error: 'This WhatsApp session is already registered'
                }
            );

            return;
        }

        console.log(
            'Processing dashboard pairing request...'
        );

        const code =
            await client.requestPairingCode(
                String(request.phone)
            );

        if (!code) {
            throw new Error(
                'WhatsApp did not return a pairing code'
            );
        }

        pairingCode = String(code);

        await updatePairingRequest(
            request.id,
            {
                status: 'completed',
                code: pairingCode
            }
        );

        await updateState();

        console.log(
            'Dashboard pairing code generated successfully'
        );

    } catch (error) {
        console.error(
            'Dashboard pairing request failed:',
            error?.message || error
        );

        try {
            const request =
                await getPairingRequest();

            if (
                request &&
                request.status === 'pending'
            ) {
                await updatePairingRequest(
                    request.id,
                    {
                        status: 'failed',
                        error:
                            error?.message ||
                            'Pairing request failed'
                    }
                );
            }
        } catch (_) {}
    }
}, 2000);
        console.log(
            'SCANTY MD BOT connecting to WhatsApp...'
        );
    });

    client.on('open', async () => {
        await clearQR();

        connectionStatus =
            'Connected';

        pairingCode = null;
        pairingInProgress = false;

        await updateState();

        console.log(
            'WhatsApp connected successfully'
        );
    });

    client.on('close', async () => {
        await clearQR();

        connectionStatus =
            'Disconnected - reconnecting';

        pairingCode = null;
        pairingInProgress = false;

        await updateState();

        console.log(
            'WhatsApp disconnected'
        );
    });

    console.log(
        'SCANTY MD BOT QR dashboard bridge ready'
    );
}

module.exports = {
    startQrServer,
    requestPairingCode
};
