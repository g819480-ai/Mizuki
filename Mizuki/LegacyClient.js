'use strict';

const EventEmitter = require('events');
const fs = require('fs');
const pino = require('pino');

const {
    default: makeWASocket,
    downloadMediaMessage,
    Browsers,
    DisconnectReason,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const { useMongoDBAuthState } = require('./mongoAuth');

const MessageType = {
    text: 'text',
    image: 'image',
    video: 'video'
};

const Mimetype = {
    png: 'image/png',
    gif: 'image/gif'
};

const Presence = {
    available: 'available',
    unavailable: 'unavailable',
    composing: 'composing',
    recording: 'recording'
};

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

/*
 * ==========================================================
 * SCANTY MD BOT
 * Baileys retry counter cache
 *
 * Kept outside the socket so retry counts survive
 * socket recreation/reconnects.
 * ==========================================================
 */

const msgRetryCounterCache = new Map();

const retryCache = {
    get(key) {
        return msgRetryCounterCache.get(key);
    },

    set(key, value) {
        msgRetryCounterCache.set(key, value);

        /*
         * Prevent unlimited memory growth.
         */
        if (msgRetryCounterCache.size > 5000) {
            const oldestKey =
                msgRetryCounterCache.keys().next().value;

            if (oldestKey !== undefined) {
                msgRetryCounterCache.delete(oldestKey);
            }
        }

        return true;
    },

    del(key) {
        msgRetryCounterCache.delete(key);
        return true;
    },

    flushAll() {
        msgRetryCounterCache.clear();
    }
};

/*
 * ==========================================================
 * MESSAGE RETRY STORE
 *
 * Baileys needs the ORIGINAL message payload when WhatsApp
 * requests a retry after decryption/encryption failure.
 *
 * Key format:
 *     remoteJid:messageId
 * ==========================================================
 */

const messageRetryStore = new Map();

const makeMessageStoreKey = key => {
    if (!key?.remoteJid || !key?.id) {
        return null;
    }

    return `${key.remoteJid}:${key.id}`;
};

const storeMessageForRetry = message => {
    const key = makeMessageStoreKey(message?.key);

    if (!key || !message?.message) {
        return;
    }

    /*
     * Store only the actual IMessage payload because
     * getMessage() must return proto.IMessage.
     */
    messageRetryStore.set(
        key,
        message.message
    );

    /*
     * Prevent unlimited memory growth.
     */
    if (messageRetryStore.size > 5000) {
        const oldestKey =
            messageRetryStore.keys().next().value;

        if (oldestKey !== undefined) {
            messageRetryStore.delete(oldestKey);
        }
    }
};

const getMessageForRetry = async key => {
    const cacheKey =
        makeMessageStoreKey(key);

    if (!cacheKey) {
        return undefined;
    }

    return messageRetryStore.get(cacheKey);
};

class LegacyClient extends EventEmitter {
    constructor() {
        super();

        this.socket = null;
        this.user = null;
        this.version = [2, 3000, 0];
        this.logger = { level: 'warn' };

        this.chats = new Map();

        /*
         * Last message per chat.
         * Kept for existing chatRead() compatibility.
         */
        this.lastMessages = new Map();

        this.authStorage = null;

        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.connectingPromise = null;
        this.shouldReconnect = true;
        this.connectionOpen = false;
    }

    loadAuthInfo() {
        return true;
    }

    base64EncodedAuthInfo() {
        return null;
    }

    async connect() {
        this.shouldReconnect = true;

        if (this.connectingPromise) {
            return this.connectingPromise;
        }

        if (
            this.socket &&
            (
                this.socket.ws?.isOpen === true ||
                this.socket.ws?.readyState === 1
            )
        ) {
            return this.socket;
        }

        this.connectingPromise = (async () => {

            if (!this.authStorage) {
                this.authStorage =
                    await useMongoDBAuthState();
            }

            this.emit('connecting');
            this.connectionOpen = false;

            /*
             * IMPORTANT:
             *
             * Do NOT pass authStorage.state directly.
             *
             * Baileys expects:
             *
             * auth.creds
             * auth.keys = makeCacheableSignalKeyStore(...)
             *
             * The cache prevents repeated direct MongoDB
             * Signal-key reads and keeps the Signal store
             * consistent during active sessions.
             */
            const authState = {
                creds:
                    this.authStorage.state.creds,

                keys:
                    makeCacheableSignalKeyStore(
                        this.authStorage.state.keys,
                        pino({
                            level:
                                this.logger.level ||
                                'warn'
                        })
                    )
            };

            const socket =
                makeWASocket({

                    auth: authState,

                    browser: ['Ubuntu', 'Chrome', '120.0.0'],

                    printQRInTerminal:
                        false,

                    markOnlineOnConnect:
                        false,

                    syncFullHistory:
                        false,

                    /*
                     * Retry configuration.
                     */
                    msgRetryCounterCache:
                        retryCache,

                    maxMsgRetryCount:
                        5,

                    retryRequestDelayMs:
                        500,

                    /*
                     * CRITICAL:
                     *
                     * Return the original message when
                     * WhatsApp asks Baileys to retry it.
                     */
                    getMessage:
                        async key => {
                            return getMessageForRetry(
                                key
                            );
                        },

                    logger:
                        pino({
                            level:
                                this.logger.level ||
                                'warn'
                        })
                });

            this.socket = socket;

            /*
             * Save credentials and Signal keys whenever
             * Baileys updates them.
             */
            socket.ev.on(
                'creds.update',
                async () => {
                    try {
                        await this.authStorage.saveCreds();
                    } catch (error) {
                        console.error(
                            'MongoDB auth save failed:',
                            error?.message ||
                            error
                        );
                    }
                }
            );

            /*
             * ==================================================
             * CONNECTION UPDATE
             * ==================================================
             */

            socket.ev.on(
                'connection.update',
                update => {

                    if (
                        this.socket !== socket
                    ) {
                        return;
                    }

                    const {
                        connection,
                        lastDisconnect,
                        qr
                    } = update;

                    /*
                     * QR generated by Baileys.
                     */
                    if (qr) {
                        console.log(
                            'New WhatsApp QR received'
                        );

                        this.emit(
                            'qr',
                            qr
                        );
                    }

                    if (
                        connection ===
                        'connecting'
                    ) {
                        this.emit(
                            'connecting'
                        );
                    }

                    /*
                     * ==================================================
                     * WHATSAPP OPEN
                     * ==================================================
                     */

                    if (
                        connection ===
                        'open'
                    ) {

                        this.connectionOpen =
                            true;

                        this.reconnectAttempts =
                            0;

                        if (
                            this.reconnectTimer
                        ) {
                            clearTimeout(
                                this.reconnectTimer
                            );

                            this.reconnectTimer =
                                null;
                        }

                        const current =
                            socket.user ||
                            {};

                        this.user = {
                            ...current,

                            jid:
                                current.id ||
                                current.jid ||
                                '',

                            phone: {
                                wa_version:
                                    '0.0.0'
                            }
                        };

                        console.log(
                            'SCANTY MD BOT connected to WhatsApp'
                        );

                        /*
                         * QR is no longer needed once
                         * WhatsApp is actually open.
                         */
                        this.emit(
                            'qr',
                            null
                        );

                        this.emit(
                            'open'
                        );
                    }

                    /*
                     * ==================================================
                     * WHATSAPP CLOSED
                     * ==================================================
                     */

                    if (
                        connection ===
                        'close'
                    ) {

                        this.connectionOpen =
                            false;

                        const error =
                            lastDisconnect?.error;

                        const statusCode =
                            error?.output
                                ?.statusCode;

                        console.error(
                            'WhatsApp connection closed:',
                            error?.message ||
                            'Connection closed',
                            'Status:',
                            statusCode ||
                            'unknown'
                        );

                        this.emit(
                            'qr',
                            null
                        );

                        this.emit(
                            'close',
                            error
                        );

                        /*
                         * Logged-out accounts require
                         * fresh authentication.
                         */
                        if (
                            statusCode ===
                            DisconnectReason.loggedOut
                        ) {

                            console.error(
                                'WhatsApp logged out. Fresh linking is required.'
                            );

                            return;
                        }

                        /*
                         * Reconnect after unexpected
                         * disconnection / QR expiry.
                         */
                        this.scheduleReconnect();
                    }
                }
            );

            /*
             * ==================================================
             * INCOMING MESSAGES
             * ==================================================
             */

            socket.ev.on(
                'messages.upsert',
                event => {

                    if (
                        !event.messages ||
                        !event.messages.length
                    ) {
                        return;
                    }

                    for (
                        const message
                        of event.messages
                    ) {

                        const jid =
                            message.key
                                ?.remoteJid;

                        if (!jid) {
                            continue;
                        }

                        /*
                         * Store the ORIGINAL message
                         * for Baileys retry handling.
                         *
                         * This is the important part
                         * missing from the previous version.
                         */
                        storeMessageForRetry(
                            message
                        );

                        /*
                         * Keep existing last-message
                         * behaviour for chatRead().
                         */
                        this.lastMessages.set(
                            jid,
                            message
                        );

                        /*
                         * Status handling remains
                         * exactly through the existing
                         * status event.
                         */
                        if (
                            jid ===
                            'status@broadcast'
                        ) {

                            this.emit(
                                'status',
                                message
                            );
                        }

                        if (
                            !this.chats.has(
                                jid
                            )
                        ) {

                            this.chats.set(
                                jid,
                                {
                                    jid,
                                    pin:
                                        undefined
                                }
                            );
                        }
                    }

                    /*
                     * Preserve the existing bot
                     * chat-update interface.
                     */
                    this.emit(
                        'chat-update',
                        {
                            hasNewMessage:
                                true,

                            count:
                                event.messages
                                    .length,

                            messages: {
                                all:
                                    () =>
                                        event.messages
                            }
                        }
                    );
                }
            );

            return socket;

        })();

        try {
            return await this.connectingPromise;

        } finally {
            this.connectingPromise =
                null;
        }
    }

    scheduleReconnect() {

        if (
            !this.shouldReconnect ||
            this.reconnectTimer
        ) {
            return;
        }

        this.reconnectAttempts++;

        const delay =
            Math.min(
                2000 *
                Math.pow(
                    1.5,
                    this.reconnectAttempts -
                    1
                ),
                15000
            );

        console.log(
            `WhatsApp reconnecting in ${Math.ceil(delay / 1000)} seconds. Attempt ${this.reconnectAttempts}`
        );

        this.reconnectTimer =
            setTimeout(
                async () => {

                    this.reconnectTimer =
                        null;

                    if (
                        !this.shouldReconnect
                    ) {
                        return;
                    }

                    try {

                        await this.connect();

                    } catch (error) {

                        console.error(
                            'WhatsApp reconnect failed:',
                            error?.message ||
                            error
                        );

                        this.scheduleReconnect();
                    }

                },
                delay
            );
    }

    async requestPairingCode(
        phoneNumber
    ) {

        if (
            this.authStorage
                ?.state
                ?.creds
                ?.registered
        ) {

            throw new Error(
                'WhatsApp is already registered'
            );
        }

        const number =
            String(
                phoneNumber ||
                ''
            ).replace(
                /\D/g,
                ''
            );

        if (
            !/^\d{8,15}$/.test(
                number
            )
        ) {

            throw new Error(
                'Enter a valid phone number with country code'
            );
        }

        const socket =
            this.socket;

        if (!socket) {
            throw new Error(
                'WhatsApp is starting. Please wait for the QR code.'
            );
        }

        if (
            typeof socket
                .waitForSocketOpen !==
                'function'
        ) {

            throw new Error(
                'WhatsApp connection readiness function is unavailable. Check the Baileys installation.'
            );
        }

        try {

            await Promise.race([

                socket.waitForSocketOpen(),

                new Promise(
                    (_, reject) => {

                        setTimeout(
                            () => {

                                reject(
                                    new Error(
                                        'WhatsApp connection timed out. Wait for a fresh QR code and try again.'
                                    )
                                );

                            },
                            20000
                        );
                    }
                )
            ]);

            if (
                socket !==
                this.socket
            ) {

                throw new Error(
                    'WhatsApp is reconnecting. Please try again.'
                );
            }

            if (
                this.authStorage
                    ?.state
                    ?.creds
                    ?.registered
            ) {

                throw new Error(
                    'WhatsApp is already registered'
                );
            }

            const code =
                await socket.requestPairingCode(
                    number
                );

            if (!code) {

                throw new Error(
                    'WhatsApp did not generate a pairing code.'
                );
            }

            console.log(
                'WhatsApp pairing code generated successfully'
            );

            return code;

        } catch (error) {

            console.error(
                'Pairing code generation error:',
                error?.message ||
                error
            );

            throw error;
        }
    }

    async sendMessage(
        jid,
        content,
        typeOrOptions,
        oldOptions
    ) {

        if (!this.socket) {
            throw new Error(
                'WhatsApp is not connected'
            );
        }

        let payload;
        let options = {};

        if (
            typeof content ===
            'string'
        ) {

            if (
                typeOrOptions ===
                MessageType.image
            ) {

                payload = {
                    image: {
                        url:
                            content
                    },

                    ...(oldOptions ||
                        {})
                };

            } else if (
                typeOrOptions ===
                MessageType.video
            ) {

                payload = {
                    video: {
                        url:
                            content
                    },

                    ...(oldOptions ||
                        {})
                };

            } else {

                payload = {
                    text:
                        content
                };

                options =
                    typeOrOptions ||
                    {};
            }

        } else if (
            Buffer.isBuffer(
                content
            )
        ) {

            const mediaOptions =
                oldOptions ||
                {};

            if (
                typeOrOptions ===
                MessageType.image
            ) {

                payload = {
                    image:
                        content,

                    mimetype:
                        mediaOptions
                            .mimetype ||
                        'image/jpeg',

                    caption:
                        mediaOptions
                            .caption
                };

            } else if (
                typeOrOptions ===
                MessageType.video
            ) {

                payload = {
                    video:
                        content,

                    mimetype:
                        mediaOptions
                            .mimetype ||
                        'video/mp4',

                    caption:
                        mediaOptions
                            .caption,

                    gifPlayback:
                        mediaOptions
                            .mimetype ===
                        Mimetype.gif
                };

            } else {

                payload = {
                    document:
                        content
                };
            }

        } else {

            payload =
                content ||
                {};

            options =
                typeOrOptions ||
                {};
        }

        return this.socket.sendMessage(
            jid,
            payload,
            options
        );
    }

    async setStatus(
        status
    ) {

        if (!this.socket) {
            return false;
        }

        return this.socket.updateProfileStatus(
            String(status)
        );
    }

    async updatePresence(
        jid,
        presence
    ) {

        if (!this.socket) {
            return false;
        }

        return this.socket.sendPresenceUpdate(
            presence,
            jid
        );
    }

    async sendPresenceUpdate(
        presence,
        jid
    ) {

        return this.updatePresence(
            jid,
            presence
        );
    }

    async readMessages(
        keys
    ) {

        if (!this.socket) {
            return false;
        }

        return this.socket.readMessages(
            keys
        );
    }

    async chatRead(
        jid
    ) {

        if (!this.socket) {
            return false;
        }

        const lastMessage =
            this.lastMessages.get(
                jid
            );

        if (
            !lastMessage?.key
        ) {
            return false;
        }

        return this.socket.readMessages(
            [
                lastMessage.key
            ]
        );
    }

    async downloadAndSaveMediaMessage(
        message,
        filename
    ) {

        if (!this.socket) {
            throw new Error(
                'WhatsApp is not connected'
            );
        }

        const buffer =
            await downloadMediaMessage(
                message,
                'buffer',
                {},
                {
                    logger:
                        this.logger,

                    reuploadRequest:
                        this.socket
                            .updateMediaMessage
                }
            );

        const output =
            filename ||
            message.key?.id ||
            `scanty-${Date.now()}`;

        const target =
            output.includes('.')
                ? output
                : `${output}.bin`;

        fs.writeFileSync(
            target,
            buffer
        );

        return target;
    }

    async downloadMediaMessage(
        message
    ) {

        if (!this.socket) {
            throw new Error(
                'WhatsApp is not connected'
            );
        }

        return downloadMediaMessage(
            message,
            'buffer',
            {},
            {
                logger:
                    this.logger,

                reuploadRequest:
                    this.socket
                        .updateMediaMessage
            }
        );
    }

    async close() {

        this.shouldReconnect =
            false;

        this.connectionOpen =
            false;

        if (
            this.reconnectTimer
        ) {

            clearTimeout(
                this.reconnectTimer
            );

            this.reconnectTimer =
                null;
        }

        try {

            this.socket?.end(
                undefined
            );

        } catch (_) {}

        this.socket =
            null;

        try {

            await this.authStorage
                ?.close();

        } catch (error) {

            console.error(
                'MongoDB close failed:',
                error?.message ||
                error
            );
        }

        this.authStorage =
            null;
    }
}

module.exports = {
    LegacyClient,
    MessageType,
    Mimetype,
    Presence
};
