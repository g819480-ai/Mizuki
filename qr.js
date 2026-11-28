'use strict';

const QRCode = require('qrcode');

const {
    setDashboardState
} = require('./dashboard-state');

let client = null;
let currentQR = null;
let qrExpiresAt = null;
let connectionStatus = 'Waiting for WhatsApp...';
let qrExpiryTimer = null;
let qrGeneration = 0;

const QR_LIFETIME = 60000;

async function updateState() {
    try {
        await setDashboardState({
            status: connectionStatus,
            qr: currentQR,
            expiresAt: qrExpiresAt,
            pairingCode: null
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

function startQrServer(conn) {
    if (client) {
        return;
    }

    client = conn;

    /*
     * Keep dashboard state alive in MongoDB.
     *
     * The dashboard is a separate Vercel service,
     * so it cannot read this process directly.
     */
    updateState();

    setInterval(async () => {
        await updateState();
    }, 5000);

    /*
     * WhatsApp QR event
     */
    client.on('qr', async qr => {

        if (!qr) {
            await clearQR();
            return;
        }

        const generation =
            ++qrGeneration;

        try {

            const image =
                await QRCode.toDataURL(
                    qr,
                    {
                        width: 400,
                        margin: 2,
                        errorCorrectionLevel: 'H'
                    }
                );

            /*
             * Ignore an old QR if a newer one
             * has already been generated.
             */
            if (
                generation !==
                qrGeneration
            ) {
                return;
            }

            if (qrExpiryTimer) {
                clearTimeout(
                    qrExpiryTimer
                );
            }

            currentQR = image;

            qrExpiresAt =
                Date.now() +
                QR_LIFETIME;

            connectionStatus =
                'Scan the QR code';

            await updateState();

            console.log(
                'Dashboard QR updated'
            );

            /*
             * Automatically remove the QR
             * after 60 seconds.
             */
            qrExpiryTimer =
                setTimeout(
                    async () => {

                        if (
                            generation !==
                            qrGeneration
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

                    },
                    QR_LIFETIME
                );

        } catch (error) {

            console.error(
                'QR generation failed:',
                error?.message ||
                error
            );
        }
    });

    /*
     * WhatsApp connecting
     */
    client.on('connecting', async () => {

        connectionStatus =
            'Connecting to WhatsApp';

        await updateState();

        console.log(
            'SCANTY MD BOT connecting to WhatsApp...'
        );
    });

    /*
     * WhatsApp connected
     */
    client.on('open', async () => {

        await clearQR();

        connectionStatus =
            'Connected';

        await updateState();

        console.log(
            'WhatsApp connected successfully'
        );
    });

    /*
     * WhatsApp disconnected
     */
    client.on('close', async () => {

        await clearQR();

        connectionStatus =
            'Disconnected - reconnecting';

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
    startQrServer
};
