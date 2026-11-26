'use strict';

const EventEmitter = require('events');
const fs = require('fs');
const pino = require('pino');

const {
    default: makeWASocket,
    downloadMediaMessage,
    DisconnectReason,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const { useMongoDBAuthState } = require('./mongoAuth');


/*
 * ==========================================================
 * SCANTY MD BOT
 * LEGACY CLIENT
 *
 * MongoDB-backed Baileys client.
 *
 * IMPORTANT:
 * - MongoDB remains the persistent auth store.
 * - Existing auth data is NOT deleted here.
 * - Baileys 6.7.24 remains supported.
 * - The existing bot.js chat-update interface is preserved.
 * ==========================================================
 */


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
 * BAILEYS RETRY COUNTER CACHE
 * ==========================================================
 */

const msgRetryCounterCache = new Map();

const retryCache = {

    get(key) {
        return msgRetryCounterCache.get(key);
    },

    set(key, value) {

        msgRetryCounterCache.set(
            key,
            value
        );

        /*
         * Prevent unlimited memory usage.
         */
        if (
            msgRetryCounterCache.size > 5000
        ) {

            const oldestKey =
                msgRetryCounterCache
                    .keys()
                    .next()
                    .value;

            if (
                oldestKey !== undefined
            ) {
                msgRetryCounterCache.delete(
                    oldestKey
                );
            }
        }

        return true;
    },

    del(key) {

        msgRetryCounterCache.delete(
            key
        );

        return true;
    },

    flushAll() {

        msgRetryCounterCache.clear();

        return true;
    }
};


/*
 * ==========================================================
 * ORIGINAL MESSAGE RETRY STORE
 *
 * Baileys may request an original message when
 * WhatsApp asks for a retry.
 *
 * We retain the actual IMessage payload.
 * ==========================================================
 */

const messageRetryStore = new Map();


const makeMessageStoreKey = key => {

    if (
        !key?.remoteJid ||
        !key?.id
    ) {
        return null;
    }

    return `${key.remoteJid}:${key.id}`;
};


const storeMessageForRetry = message => {

    const cacheKey =
        makeMessageStoreKey(
            message?.key
        );

    if (
        !cacheKey ||
        !message?.message
    ) {
        return;
    }

    messageRetryStore.set(
        cacheKey,
        message.message
    );

    /*
     * Prevent unlimited memory growth.
     */
    if (
        messageRetryStore.size > 5000
    ) {

        const oldestKey =
            messageRetryStore
                .keys()
                .next()
                .value;

        if (
            oldestKey !== undefined
        ) {

            messageRetryStore.delete(
                oldestKey
            );
        }
    }
};


const getMessageForRetry = async key => {

    const cacheKey =
        makeMessageStoreKey(
            key
        );

    if (!cacheKey) {
        return undefined;
    }

    return messageRetryStore.get(
        cacheKey
    );
};


/*
 * ==========================================================
 * LEGACY CLIENT
 * ==========================================================
 */

class LegacyClient extends EventEmitter {

    constructor() {

        super();

        this.socket = null;

        this.user = null;

        this.version = [
            2,
            3000,
            0
        ];

        this.logger = {
            level: 'warn'
        };

        this.chats =
            new Map();

        this.lastMessages =
            new Map();

        this.authStorage =
            null;

        this.reconnectTimer =
            null;

        this.reconnectAttempts =
            0;

        this.connectingPromise =
            null;

        this.shouldReconnect =
            true;

        this.connectionOpen =
            false;
    }


    /*
     * ======================================================
     * COMPATIBILITY METHODS
     * ======================================================
     */

    loadAuthInfo() {
        return true;
    }


    base64EncodedAuthInfo() {
        return null;
    }


    /*
     * ======================================================
     * CONNECT
     * ======================================================
     */

    async connect() {

        this.shouldReconnect =
            true;

        /*
         * Prevent multiple simultaneous
         * socket creation attempts.
         */
        if (
            this.connectingPromise
        ) {

            return this.connectingPromise;
        }


        /*
         * Already connected.
         */
        if (
            this.socket &&
            (
                this.socket.ws?.isOpen === true ||
                this.socket.ws?.readyState === 1
            )
        ) {

            return this.socket;
        }


        this.connectingPromise =
            (async () => {

                /*
                 * Create/reuse MongoDB auth state.
                 */
                if (
                    !this.authStorage
                ) {

                    console.log(
                        'Loading SCANTY MD BOT MongoDB authentication...'
                    );

                    this.authStorage =
                        await useMongoDBAuthState();

                    console.log(
                        'SCANTY MD BOT MongoDB authentication loaded'
                    );
                }


                this.connectionOpen =
                    false;

                this.emit(
                    'connecting'
                );


                /*
                 * ==================================================
                 * BAILEYS AUTH STATE
                 * ==================================================
                 *
                 * Do not pass the raw key store directly.
                 *
                 * Baileys recommends a cacheable Signal key store
                 * because Signal sessions and keys are frequently
                 * read/updated while messages are processed.
                 */
                const authState = {

                    creds:
                        this.authStorage
                            .state
                            .creds,

                    keys:
                        makeCacheableSignalKeyStore(
                            this.authStorage
                                .state
                                .keys,

                            pino({
                                level:
                                    this.logger
                                        .level ||
                                    'warn'
                            })
                        )
                };


                /*
                 * ==================================================
                 * CREATE WHATSAPP SOCKET
                 * ==================================================
                 */

                const socket =
                    makeWASocket({

                        auth:
                            authState,


                        /*
                         * WhatsApp linked-device browser label.
                         *
                         * This is intentionally NOT:
                         *
                         * Browsers.ubuntu(...)
                         *
                         * because you requested Chrome/Ubuntu.
                         */
                        browser:
                            [
                                'Ubuntu',
                                'Chrome',
                                '120.0.0'
                            ],


                        printQRInTerminal:
                            false,


                        /*
                         * Do not force WhatsApp
                         * into online mode.
                         */
                        markOnlineOnConnect:
                            false,


                        syncFullHistory:
                            false,


                        /*
                         * Retry handling.
                         */
                        msgRetryCounterCache:
                            retryCache,

                        maxMsgRetryCount:
                            5,

                        retryRequestDelayMs:
                            500,


                        /*
                         * Original message lookup.
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
                                    this.logger
                                        .level ||
                                    'warn'
                            })
                    });


                this.socket =
                    socket;


                /*
                 * ==================================================
                 * CREDENTIAL UPDATES
                 * ==================================================
                 *
                 * Signal keys are updated during normal
                 * message processing, so persistence is essential.
                 */
                socket.ev.on(
                    'creds.update',
                    async () => {

                        try {

                            await this.authStorage
                                .saveCreds();

                        } catch (error) {

                            console.error(
                                'SCANTY MD BOT MongoDB auth save failed:',
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

                        /*
                         * Ignore events from an old socket
                         * after a reconnect.
                         */
                        if (
                            this.socket !==
                            socket
                        ) {

                            return;
                        }


                        const {
                            connection,
                            lastDisconnect,
                            qr
                        } = update;


                        /*
                         * ==========================================
                         * QR
                         * ==========================================
                         */

                        if (
                            qr
                        ) {

                            console.log(
                                'SCANTY MD BOT: new WhatsApp QR received'
                            );

                            this.emit(
                                'qr',
                                qr
                            );
                        }


                        /*
                         * ==========================================
                         * CONNECTING
                         * ==========================================
                         */

                        if (
                            connection ===
                            'connecting'
                        ) {

                            this.connectionOpen =
                                false;

                            this.emit(
                                'connecting'
                            );
                        }


                        /*
                         * ==========================================
                         * OPEN
                         * ==========================================
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


                            const currentUser =
                                socket.user ||
                                {};


                            this.user = {

                                ...currentUser,

                                jid:
                                    currentUser.id ||
                                    currentUser.jid ||
                                    '',

                                phone: {
                                    wa_version:
                                        '0.0.0'
                                }
                            };


                            console.log(
                                '================================================'
                            );

                            console.log(
                                'SCANTY MD BOT connected to WhatsApp'
                            );

                            console.log(
                                `WhatsApp JID: ${this.user.jid || 'unknown'}`
                            );

                            console.log(
                                'Browser: Google Chrome (Ubuntu)'
                            );

                            console.log(
                                'MongoDB auth: active'
                            );

                            console.log(
                                '================================================'
                            );


                            /*
                             * A QR should no longer be displayed
                             * after the socket is genuinely open.
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
                         * ==========================================
                         * CLOSED
                         * ==========================================
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
                                error
                                    ?.output
                                    ?.statusCode;


                            console.error(
                                'SCANTY MD BOT WhatsApp connection closed:',
                                error?.message ||
                                'Connection closed'
                            );

                            console.error(
                                'WhatsApp status code:',
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
                             * A logged-out account must
                             * be linked again.
                             */
                            if (
                                statusCode ===
                                DisconnectReason.loggedOut
                            ) {

                                console.error(
                                    'SCANTY MD BOT: WhatsApp logged out. Fresh linking is required.'
                                );

                                return;
                            }


                            /*
                             * Do not reconnect if the
                             * application deliberately
                             * closed the client.
                             */
                            if (
                                !this.shouldReconnect
                            ) {

                                return;
                            }


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

                        /*
                         * Never assume WhatsApp supplied
                         * a valid message array.
                         */
                        if (
                            !event ||
                            !Array.isArray(
                                event.messages
                            ) ||
                            event.messages.length === 0
                        ) {

                            return;
                        }


                        const usableMessages =
                            [];


                        for (
                            const message
                            of event.messages
                        ) {

                            /*
                             * Malformed message guard.
                             */
                            if (
                                !message ||
                                !message.key
                            ) {

                                continue;
                            }


                            const jid =
                                message
                                    .key
                                    .remoteJid;


                            if (!jid) {

                                continue;
                            }


                            /*
                             * If the message contains an actual
                             * decrypted payload, retain it for
                             * retry purposes.
                             *
                             * Ciphertext-only/stub messages are
                             * intentionally not inserted as fake
                             * plaintext messages.
                             */
                            if (
                                message.message &&
                                typeof message.message ===
                                    'object'
                            ) {

                                storeMessageForRetry(
                                    message
                                );

                                usableMessages.push(
                                    message
                                );

                            } else {

                                /*
                                 * A ciphertext/decryption-failure
                                 * message can still be useful to
                                 * the status layer, but it must not
                                 * be passed to bot.js as if it were
                                 * a normal command message.
                                 */
                                console.warn(
                                    `SCANTY MD BOT: message has no decrypted payload | jid=${jid} | id=${message.key.id || 'unknown'}`
                                );

                                /*
                                 * Keep it out of chat-update.
                                 */
                                continue;
                            }


                            /*
                             * Existing chatRead compatibility.
                             */
                            this.lastMessages.set(
                                jid,
                                message
                            );


                            /*
                             * WhatsApp status.
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


                            /*
                             * Register chat.
                             */
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
                         * CRITICAL:
                         *
                         * Do not emit a fake chat-update
                         * when every message failed decryption.
                         *
                         * This prevents bot.js from trying:
                         *
                         * Object.keys(msg.message)
                         *
                         * against an empty/ciphertext message.
                         */
                        if (
                            usableMessages.length === 0
                        ) {

                            console.warn(
                                'SCANTY MD BOT: no decrypted incoming messages available for command processing'
                            );

                            return;
                        }


                        /*
                         * Preserve the interface expected
                         * by bot.js.
                         */
                        this.emit(
                            'chat-update',
                            {

                                hasNewMessage:
                                    true,

                                count:
                                    usableMessages
                                        .length,

                                messages: {

                                    all:
                                        () =>
                                            usableMessages
                                }
                            }
                        );
                    }
                );


                /*
                 * Return the newly-created socket.
                 */
                return socket;

            })();


        try {

            return await this.connectingPromise;

        } finally {

            this.connectingPromise =
                null;
        }
    }


    /*
     * ==========================================================
     * RECONNECT
     * ==========================================================
     */

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
            `SCANTY MD BOT reconnecting in ${Math.ceil(delay / 1000)} seconds. Attempt ${this.reconnectAttempts}`
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
                            'SCANTY MD BOT reconnect failed:',
                            error?.message ||
                            error
                        );

                        this.scheduleReconnect();
                    }

                },
                delay
            );
    }


    /*
     * ==========================================================
     * PAIRING CODE
     * ==========================================================
     */

    async requestPairingCode(
        phoneNumber
    ) {

        /*
         * Pairing code is only valid
         * before registration.
         */
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
            )
                .replace(
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
                'WhatsApp is still starting. Please wait and try again.'
            );
        }


        if (
            typeof socket
                .waitForSocketOpen !==
            'function'
        ) {

            throw new Error(
                'WhatsApp connection readiness function is unavailable.'
            );
        }


        try {

            /*
             * Wait for the WhatsApp WebSocket
             * before requesting the code.
             */
            await Promise.race([

                socket.waitForSocketOpen(),

                new Promise(
                    (_, reject) => {

                        setTimeout(
                            () => {

                                reject(
                                    new Error(
                                        'WhatsApp connection timed out. Please wait for a fresh QR/code session and try again.'
                                    )
                                );

                            },
                            20000
                        );
                    }
                )
            ]);


            /*
             * Make sure this is still
             * the active socket.
             */
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
                'SCANTY MD BOT WhatsApp pairing code generated successfully'
            );


            return code;

        } catch (error) {

            console.error(
                'SCANTY MD BOT pairing code generation failed:',
                error?.message ||
                error
            );

            throw error;
        }
    }


    /*
     * ==========================================================
     * SEND MESSAGE
     * ==========================================================
     */

    async sendMessage(
        jid,
        content,
        typeOrOptions,
        oldOptions
    ) {

        if (
            !this.socket
        ) {

            throw new Error(
                'WhatsApp is not connected'
            );
        }


        let payload;
        let options = {};


        /*
         * TEXT / URL STRING
         */
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
        }


        /*
         * BUFFER MEDIA
         */
        else if (
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
        }


        /*
         * OBJECT PAYLOAD
         */
        else {

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


    /*
     * ==========================================================
     * STATUS
     * ==========================================================
     */

    async setStatus(
        status
    ) {

        if (
            !this.socket
        ) {

            return false;
        }

        return this.socket.updateProfileStatus(
            String(status)
        );
    }


    /*
     * ==========================================================
     * PRESENCE
     * ==========================================================
     */

    async updatePresence(
        jid,
        presence
    ) {

        if (
            !this.socket
        ) {

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


    /*
     * ==========================================================
     * READ MESSAGES
     * ==========================================================
     */

    async readMessages(
        keys
    ) {

        if (
            !this.socket
        ) {

            return false;
        }

        return this.socket.readMessages(
            keys
        );
    }


    async chatRead(
        jid
    ) {

        if (
            !this.socket
        ) {

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


    /*
     * ==========================================================
     * MEDIA
     * ==========================================================
     */

    async downloadAndSaveMediaMessage(
        message,
        filename
    ) {

        if (
            !this.socket
        ) {

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

        if (
            !this.socket
        ) {

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


    /*
     * ==========================================================
     * CLOSE
     * ==========================================================
     */

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
                'SCANTY MD BOT MongoDB close failed:',
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
