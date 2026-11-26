
/*

* ==========================================================
* SCANTY MD BOT
* LegacyClient
* WhatsApp client wrapper for Baileys 6.7.x
* MongoDB-backed authentication
* IMPORTANT:
* ●	Do NOT use useMultiFileAuthState()
* ●	Do NOT store WhatsApp credentials on Render disk
* ●	MongoDB remains the persistent auth store
* ●	Existing MongoDB session data is preserved
* ==========================================================
    */

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

const {
    useMongoDBAuthState
} = require('./mongoAuth');

/*

* ==========================================================
* COMPATIBILITY CONSTANTS
* ==========================================================
    */

const MessageType = {
text: ‘text’,
image: ‘image’,
video: ‘video’
};

const Mimetype = {
png: ‘image/png’,
gif: ‘image/gif’
};

const Presence = {
available: ‘available’,
unavailable: ‘unavailable’,
composing: ‘composing’,
recording: ‘recording’
};

/*

* ==========================================================
* UTILITY
* ==========================================================
    */

const sleep = ms =>
new Promise(resolve => setTimeout(resolve, ms));

/*

* ==========================================================
* BAILEYS RETRY COUNTER CACHE
* Kept outside LegacyClient so reconnects do not immediately
* lose the retry counters.
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
    if (
        msgRetryCounterCache.size >
        5000
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
* MESSAGE RETRY STORE
* Baileys can ask for the original message again when a
* retry/decryption operation is required.
* IMPORTANT:
* getMessage() must return the IMessage payload itself,
* not the complete WebMessageInfo object.
* ==========================================================
    */

const messageRetryStore =
new Map();

const makeMessageStoreKey = key => {

if (
    !key ||
    !key.remoteJid ||
    !key.id
) {
    return null;
}
return (
    `${key.remoteJid}:${key.id}`
);

};

const storeMessageForRetry = message => {

const storeKey =
    makeMessageStoreKey(
        message?.key
    );
if (
    !storeKey ||
    !message?.message ||
    typeof message.message !== 'object'
) {
    return;
}
messageRetryStore.set(
    storeKey,
    message.message
);
/*
 * Prevent unlimited memory growth.
 */
if (
    messageRetryStore.size >
    5000
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

const getMessageForRetry =
async key => {

    const storeKey =
        makeMessageStoreKey(
            key
        );
    if (!storeKey) {
        return undefined;
    }
    return messageRetryStore.get(
        storeKey
    );
};

/*

* ==========================================================
* SAFE MESSAGE CHECK
* ==========================================================
* WhatsApp can deliver protocol/system messages that do not
* contain a normal message payload.
* Never allow those to reach code such as:
* Object.keys(msg.message)
* when msg.message is undefined.
* ==========================================================
    */

const hasUsableMessagePayload =
message => {

    return !!(
        message &&
        message.message &&
        typeof message.message ===
            'object' &&
        Object.keys(
            message.message
        ).length > 0
    );
};

/*

* ==========================================================
* JID HELPERS
* ==========================================================
    */

const isLidJid = jid => {

return (
    typeof jid === 'string' &&
    jid.endsWith('@lid')
);

};

const isUserJid = jid => {

return (
    typeof jid === 'string' &&
    jid.endsWith(
        '@s.whatsapp.net'
    )
);

};

const getRemoteJid = message => {

return (
    message?.key?.remoteJid ||
    message?.key?.participant ||
    message?.key?.participantPn ||
    null
);

};

const getMessageParticipant =
message => {

    return (
        message?.key?.participantPn ||
        message?.key?.participant ||
        message?.key?.remoteJid ||
        null
    );
};

/*

* ==========================================================
* LEGACY CLIENT
* ==========================================================
    */

class LegacyClient
extends EventEmitter {

constructor() {
    super();
    this.socket =
        null;
    this.user =
        null;
    this.version =
        [2, 3000, 0];
    this.logger =
        {
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
    /*
     * Prevent duplicate close/reconnect handling.
     */
    this.lastCloseHandled =
        false;
}
/*
 * ======================================================
 * LEGACY COMPATIBILITY
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
     * Do not create multiple simultaneous
     * Mongo/Baileys connections.
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
             * ==================================================
             * LOAD MONGODB AUTH STATE
             * ==================================================
             */
            if (
                !this.authStorage
            ) {
                this.authStorage =
                    await useMongoDBAuthState();
            }
            this.emit(
                'connecting'
            );
            this.connectionOpen =
                false;
            this.lastCloseHandled =
                false;
            /*
             * ==================================================
             * BAILEYS AUTH STATE
             * ==================================================
             *
             * IMPORTANT:
             *
             * Do not pass authStorage.state.keys directly.
             *
             * Baileys works better with the cacheable
             * Signal key store.
             * ==================================================
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
             * CREATE BAILEYS SOCKET
             * ==================================================
             */
            const socket =
                makeWASocket({
                    auth:
                        authState,
                    /*
                     * Use a stable browser identity.
                     */
                    browser:
                        Browsers.ubuntu(
                            'SCANTY MD BOT'
                        ),
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
                     * Return the original message
                     * when Baileys requests it.
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
             * MongoDB must receive every credential/key
             * update.
             * ==================================================
             */
            socket.ev.on(
                'creds.update',
                async () => {
                    try {
                        await this
                            .authStorage
                            .saveCreds();
                    } catch (
                        error
                    ) {
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
                     * Ignore events belonging to an
                     * obsolete socket after reconnect.
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
                     * ==================================================
                     * QR RECEIVED
                     * ==================================================
                     */
                    if (
                        qr
                    ) {
                        console.log(
                            'SCANTY MD BOT: New WhatsApp QR received'
                        );
                        this.emit(
                            'qr',
                            qr
                        );
                    }
                    /*
                     * ==================================================
                     * CONNECTING
                     * ==================================================
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
                     * ==================================================
                     * OPEN
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
                        this.lastCloseHandled =
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
                            'MongoDB authentication: active'
                        );
                        console.log(
                            '================================================'
                        );
                        /*
                         * QR is no longer required
                         * after a real open.
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
                     * CLOSED
                     * ==================================================
                     */
                    if (
                        connection ===
                        'close'
                    ) {
                        this.connectionOpen =
                            false;
                        const error =
                            lastDisconnect
                                ?.error;
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
                            `Disconnect status: ${statusCode || 'unknown'}`
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
                         * Prevent duplicate reconnect
                         * scheduling from repeated events.
                         */
                        if (
                            this.lastCloseHandled
                        ) {
                            return;
                        }
                        this.lastCloseHandled =
                            true;
                        /*
                         * ==================================================
                         * LOGGED OUT
                         * ==================================================
                         *
                         * Do NOT automatically delete MongoDB data.
                         *
                         * The user must intentionally link again.
                         * ==================================================
                         */
                        if (
                            statusCode ===
                            DisconnectReason
                                .loggedOut
                        ) {
                            console.error(
                                'SCANTY MD BOT: WhatsApp logged out.'
                            );
                            console.error(
                                'A fresh WhatsApp linking process is required.'
                            );
                            return;
                        }
                        /*
                         * Other disconnects are reconnectable.
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
                        !event ||
                        !Array.isArray(
                            event.messages
                        ) ||
                        event.messages.length ===
                            0
                    ) {
                        return;
                    }
                    const validMessages =
                        [];
                    for (
                        const message
                        of event.messages
                    ) {
                        /*
                         * Ignore completely invalid
                         * message objects.
                         */
                        if (
                            !message ||
                            !message.key
                        ) {
                            continue;
                        }
                        const jid =
                            getRemoteJid(
                                message
                            );
                        if (
                            !jid
                        ) {
                            continue;
                        }
                        /*
                         * ==================================================
                         * IMPORTANT FOR RETRIES
                         * ==================================================
                         *
                         * Only store messages which actually
                         * contain a usable message payload.
                         */
                        if (
                            hasUsableMessagePayload(
                                message
                            )
                        ) {
                            storeMessageForRetry(
                                message
                            );
                        }
                        /*
                         * Keep the latest message for
                         * chatRead() compatibility.
                         */
                        this.lastMessages.set(
                            jid,
                            message
                        );
                        /*
                         * ==================================================
                         * STATUS
                         * ==================================================
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
                         * ==================================================
                         * CHAT CACHE
                         * ==================================================
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
                        /*
                         * ==================================================
                         * SAFE MESSAGE FILTER
                         * ==================================================
                         *
                         * Protocol messages, receipts,
                         * reactions, sender-key events and
                         * other non-standard events may not have
                         * message.message.
                         *
                         * Do not forward those into the legacy
                         * bot command parser.
                         */
                        if (
                            !hasUsableMessagePayload(
                                message
                            )
                        ) {
                            continue;
                        }
                        /*
                         * Keep only messages with a real
                         * message payload for bot.js.
                         */
                        validMessages.push(
                            message
                        );
                    }
                    /*
                     * Nothing usable for the bot.
                     */
                    if (
                        validMessages.length ===
                        0
                    ) {
                        return;
                    }
                    /*
                     * ==================================================
                     * LEGACY CHAT-UPDATE INTERFACE
                     * ==================================================
                     *
                     * bot.js already expects:
                     *
                     * m.messages.all()[0]
                     *
                     * Keep that API unchanged.
                     */
                    this.emit(
                        'chat-update',
                        {
                            hasNewMessage:
                                true,
                            count:
                                validMessages.length,
                            messages: {
                                all:
                                    () =>
                                        validMessages
                            }
                        }
                    );
                }
            );
            /*
             * ==================================================
             * RETURN SOCKET
             * ==================================================
             */
            return socket;
        })();
    try {
        return await
            this.connectingPromise;
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
                this.lastCloseHandled =
                    false;
                if (
                    !this.shouldReconnect
                ) {
                    return;
                }
                try {
                    await this.connect();
                } catch (
                    error
                ) {
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
     * Do not generate another pairing
     * code for an already registered account.
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
    /*
     * Make sure a socket exists.
     */
    if (
        !this.socket
    ) {
        await this.connect();
    }
    const socket =
        this.socket;
    if (
        !socket
    ) {
        throw new Error(
            'WhatsApp is starting. Please wait and try again.'
        );
    }
    /*
     * Baileys must have an open WebSocket
     * before pairing code generation.
     */
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
        /*
         * Socket may have been replaced
         * during reconnect.
         */
        if (
            socket !==
            this.socket
        ) {
            throw new Error(
                'WhatsApp is reconnecting. Please wait and try again.'
            );
        }
        /*
         * Account may have become registered
         * while we were waiting.
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
        const code =
            await socket
                .requestPairingCode(
                    number
                );
        if (
            !code
        ) {
            throw new Error(
                'WhatsApp did not generate a pairing code.'
            );
        }
        console.log(
            'SCANTY MD BOT pairing code generated successfully'
        );
        return code;
    } catch (
        error
    ) {
        console.error(
            'SCANTY MD BOT pairing code generation error:',
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
     * ======================================================
     * STRING CONTENT
     * ======================================================
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
     * ======================================================
     * BUFFER CONTENT
     * ======================================================
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
     * ======================================================
     * OBJECT CONTENT
     * ======================================================
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
    return this.socket
        .updateProfileStatus(
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
    return this.socket
        .sendPresenceUpdate(
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
    return this.socket
        .readMessages(
            keys
        );
}
/*
 * ==========================================================
 * CHAT READ
 * ==========================================================
 */
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
    return this.socket
        .readMessages([
            lastMessage.key
        ]);
}
/*
 * ==========================================================
 * DOWNLOAD MEDIA TO FILE
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
        message
            ?.key
            ?.id ||
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
/*
 * ==========================================================
 * DOWNLOAD MEDIA TO BUFFER
 * ==========================================================
 */
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
    } catch (
        _
    ) {}
    this.socket =
        null;
    try {
        await this.authStorage
            ?.close();
    } catch (
        error
    ) {
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

/*

* ==========================================================
* EXPORT
* ==========================================================
    */

module.exports = {
LegacyClient,
MessageType,
Mimetype,
Presence
};
