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

let connectionStatus =
    'Waiting for WhatsApp...';

let qrExpiryTimer = null;
let qrGeneration = 0;
let pairingInProgress = false;

const QR_LIFETIME = 60000;


/*
 * Save current WhatsApp login state
 * into MongoDB so the Vercel dashboard
 * can read it.
 */
async function updateState() {
    try {

        await setDashboardState({
            status:
                connectionStatus,

            qr:
                currentQR,

            expiresAt:
                qrExpiresAt,

            pairingCode:
                pairingCode || null
        });

    } catch (error) {

        console.error(
            'Dashboard state update failed:',
            error?.message ||
            error
        );
    }
}


/*
 * Remove the current QR.
 */
async function clearQR() {

    qrGeneration++;

    if (qrExpiryTimer) {

        clearTimeout(
            qrExpiryTimer
        );

        qrExpiryTimer = null;
    }

    currentQR = null;
    qrExpiresAt = null;

    await updateState();
}


/*
 * Generate pairing code.
 *
 * This is the same Baileys method used
 * by the normal pairing-code login.
 */
async function requestPairingCode(phone) {

    phone =
        String(phone || '')
            .replace(/\D/g, '');

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

        if (
            !client ||
            !client.socket
        ) {

            throw new Error(
                'WhatsApp is starting. Please wait for it to initialize.'
            );
        }

        if (
            connectionStatus ===
            'Connected'
        ) {

            throw new Error(
                'WhatsApp is already connected'
            );
        }

        /*
         * Do not request a pairing code
         * for an already registered session.
         */
        if (
            client.authStorage &&
            client.authStorage.state &&
            client.authStorage.state.creds &&
            client.authStorage.state.creds.registered
        ) {

            throw new Error(
                'This WhatsApp session is already registered'
            );
        }

        const code =
            await client.requestPairingCode(
                phone
            );

        if (!code) {

            throw new Error(
                'WhatsApp did not return a pairing code'
            );
        }

        pairingCode =
            String(code);

        /*
         * Pairing code and QR are
         * alternative login methods.
         */
        currentQR = null;
        qrExpiresAt = null;

        if (qrExpiryTimer) {

            clearTimeout(
                qrExpiryTimer
            );

            qrExpiryTimer =
                null;
        }

        connectionStatus =
            'Pairing code ready';

        await updateState();

        console.log(
            'Pairing code generated successfully'
        );

        return {
            code:
                pairingCode
        };

    } finally {

        pairingInProgress =
            false;
    }
}


/*
 * Start the dashboard bridge.
 *
 * This receives the already-created
 * WhatsApp connection from the bot.
 */
function startQrServer(conn) {

    if (client) {
        return;
    }

    client =
        conn;


    /*
     * Save initial state.
     */
    updateState();


    /*
     * Keep MongoDB state fresh.
     *
     * The dashboard is a separate
     * Vercel service.
     */
    setInterval(
        async () => {

            await updateState();

        },
        5000
    );


    /*
     * ============================
     * QR CODE
     * ============================
     */
    client.on(
        'qr',
        async qr => {

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
                            errorCorrectionLevel:
                                'H'
                        }
                    );

                /*
                 * Ignore an older QR
                 * if another one arrived.
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

                currentQR =
                    image;

                qrExpiresAt =
                    Date.now() +
                    QR_LIFETIME;

                pairingCode =
                    null;

                connectionStatus =
                    'Scan the QR code';

                await updateState();

                console.log(
                    'Dashboard QR updated'
                );


                /*
                 * QR expires after
                 * 60 seconds.
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

                            currentQR =
                                null;

                            qrExpiresAt =
                                null;

                            qrExpiryTimer =
                                null;

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
        }
    );


    /*
     * ============================
     * WHATSAPP CONNECTING
     * ============================
     */
    client.on(
        'connecting',
        async () => {

            connectionStatus =
                'Connecting to WhatsApp';

            await updateState();

            console.log(
                'SCANTY MD BOT connecting to WhatsApp...'
            );
        }
    );


    /*
     * ============================
     * WHATSAPP CONNECTED
     * ============================
     */
    client.on(
        'open',
        async () => {

            await clearQR();

            connectionStatus =
                'Connected';

            pairingCode =
                null;

            pairingInProgress =
                false;

            await updateState();

            console.log(
                'WhatsApp connected successfully'
            );
        }
    );


    /*
     * ============================
     * WHATSAPP DISCONNECTED
     * ============================
     */
    client.on(
        'close',
        async () => {

            await clearQR();

            connectionStatus =
                'Disconnected - reconnecting';

            pairingCode =
                null;

            pairingInProgress =
                false;

            await updateState();

            console.log(
                'WhatsApp disconnected'
            );
        }
    );


    /*
     * ============================
     * DASHBOARD PAIRING REQUEST
     * ============================
     *
     * The Vercel dashboard writes
     * a pending request to MongoDB.
     *
     * This daemon checks for it.
     */
    setInterval(
        async () => {

            try {

                const request =
                    await getPairingRequest();

                if (!request) {
                    return;
                }

                if (
                    request.status !==
                    'pending'
                ) {

                    return;
                }

                if (!request.phone) {

                    await updatePairingRequest(
                        request.id,
                        {
                            status:
                                'failed',

                            error:
                                'Phone number is missing'
                        }
                    );

                    return;
                }

                if (
                    !client ||
                    !client.socket
                ) {

                    return;
                }

                if (
                    connectionStatus ===
                    'Connected'
                ) {

                    await updatePairingRequest(
                        request.id,
                        {
                            status:
                                'failed',

                            error:
                                'WhatsApp is already connected'
                        }
                    );

                    return;
                }

                if (
                    client.authStorage &&
                    client.authStorage.state &&
                    client.authStorage.state.creds &&
                    client.authStorage.state.creds.registered
                ) {

                    await updatePairingRequest(
                        request.id,
                        {
                            status:
                                'failed',

                            error:
                                'This WhatsApp session is already registered'
                        }
                    );

                    return;
                }

                console.log(
                    'Processing dashboard pairing request...'
                );

                const code =
                    await client.requestPairingCode(
                        String(
                            request.phone
                        )
                    );

                if (!code) {

                    throw new Error(
                        'WhatsApp did not return a pairing code'
                    );
                }

                pairingCode =
                    String(code);

                currentQR =
                    null;

                qrExpiresAt =
                    null;

                if (qrExpiryTimer) {

                    clearTimeout(
                        qrExpiryTimer
                    );

                    qrExpiryTimer =
                        null;
                }

                connectionStatus =
                    'Pairing code ready';

                await updatePairingRequest(
                    request.id,
                    {
                        status:
                            'completed',

                        code:
                            pairingCode
                    }
                );

                await updateState();

                console.log(
                    'Dashboard pairing code generated successfully'
                );

            } catch (error) {

                console.error(
                    'Dashboard pairing request failed:',
                    error?.message ||
                    error
                );

                try {

                    const request =
                        await getPairingRequest();

                    if (
                        request &&
                        request.status ===
                        'pending'
                    ) {

                        await updatePairingRequest(
                            request.id,
                            {
                                status:
                                    'failed',

                                error:
                                    error?.message ||
                                    'Pairing request failed'
                            }
                        );
                    }

                } catch (_) {}
            }

        },
        2000
    );


    console.log(
        'SCANTY MD BOT QR + pairing dashboard bridge ready'
    );
}


module.exports = {
    startQrServer,
    requestPairingCode
};
