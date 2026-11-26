
'use strict';

const EventEmitter = require('events');
const fs = require('fs');
const pino = require('pino');

const {
    default: makeWASocket,
    downloadMediaMessage,
    Browsers,
    DisconnectReason
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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class LegacyClient extends EventEmitter {
    constructor() {
        super();

        this.socket = null;
        this.user = null;
        this.version = [2, 3000, 0];
        this.logger = { level: 'warn' };
        this.chats = new Map();
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
                this.authStorage = await useMongoDBAuthState();
            }

            this.emit('connecting');
            this.connectionOpen = false;

            const socket = makeWASocket({
                auth: this.authStorage.state,
                browser: Browsers.ubuntu('SCANTY MD BOT'),
                printQRInTerminal: false,
                markOnlineOnConnect: false,
                syncFullHistory: false,
                logger: pino({
                    level: this.logger.level || 'warn'
                })
            });

            this.socket = socket;

            socket.ev.on('creds.update', async () => {
                try {
                    await this.authStorage.saveCreds();
                } catch (error) {
                    console.error(
                        'MongoDB auth save failed:',
                        error.message
                    );
                }
            });

            socket.ev.on('connection.update', update => {
                if (this.socket !== socket) return;

                const {
                    connection,
                    lastDisconnect,
                    qr
                } = update;

                if (qr) {
                    console.log('New WhatsApp QR received');
                    this.emit('qr', qr);
                }

                if (connection === 'connecting') {
                    this.emit('connecting');
                }

                if (connection === 'open') {
                    this.connectionOpen = true;
                    this.reconnectAttempts = 0;

                    if (this.reconnectTimer) {
                        clearTimeout(this.reconnectTimer);
                        this.reconnectTimer = null;
                    }

                    const current = socket.user || {};

                    this.user = {
                        ...current,
                        jid: current.id || current.jid || '',
                        phone: {
                            wa_version: '0.0.0'
                        }
                    };

                    console.log(
                        'SCANTY MD BOT connected to WhatsApp'
                    );

                    this.emit('qr', null);
                    this.emit('open');
                }

                if (connection === 'close') {
                    this.connectionOpen = false;

                    const error = lastDisconnect?.error;
                    const statusCode =
                        error?.output?.statusCode;

                    console.error(
                        'WhatsApp connection closed:',
                        error?.message || 'Connection closed',
                        'Status:',
                        statusCode || 'unknown'
                    );

                    this.emit('qr', null);
                    this.emit('close', error);

                    // A logged-out account needs fresh authentication.
                    if (
                        statusCode === DisconnectReason.loggedOut
                    ) {
                        console.error(
                            'WhatsApp logged out. Fresh linking is required.'
                        );
                        return;
                    }

                    // Automatically recreate the socket after QR expiry
                    // or an unexpected WhatsApp disconnection.
                    this.scheduleReconnect();
                }
            });

            socket.ev.on('messages.upsert', event => {
                if (!event.messages?.length) return;

                for (const message of event.messages) {
    const jid = message.key?.remoteJid;
    if (!jid) continue;

    if (jid === 'status@broadcast') {
        this.emit('status', message);
    }

    this.lastMessages.set(jid, message);
                    if (!this.chats.has(jid)) {
                        this.chats.set(jid, {
                            jid,
                            pin: undefined
                        });
                    }
                }

                this.emit('chat-update', {
                    hasNewMessage: true,
                    count: event.messages.length,
                    messages: {
                        all: () => event.messages
                    }
                });
            });

            return socket;
        })();

        try {
            return await this.connectingPromise;
        } finally {
            this.connectingPromise = null;
        }
    }

    scheduleReconnect() {
        if (!this.shouldReconnect || this.reconnectTimer) {
            return;
        }

        this.reconnectAttempts++;

        const delay = Math.min(
            2000 * Math.pow(1.5, this.reconnectAttempts - 1),
            15000
        );

        console.log(
            `WhatsApp reconnecting in ${Math.ceil(delay / 1000)} seconds. Attempt ${this.reconnectAttempts}`
        );

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;

            if (!this.shouldReconnect) return;

            try {
                await this.connect();
            } catch (error) {
                console.error(
                    'WhatsApp reconnect failed:',
                    error.message
                );

                this.scheduleReconnect();
            }
        }, delay);
    }

    
async requestPairingCode(phoneNumber) {
    if (this.authStorage?.state?.creds?.registered) {
        throw new Error('WhatsApp is already registered');
    }

    const number = String(phoneNumber || '').replace(/\D/g, '');

    if (!/^\d{8,15}$/.test(number)) {
        throw new Error(
            'Enter a valid phone number with country code'
        );
    }

    const socket = this.socket;

    if (!socket) {
        throw new Error(
            'WhatsApp is starting. Please wait for the QR code.'
        );
    }

    if (typeof socket.waitForSocketOpen !== 'function') {
        throw new Error(
            'WhatsApp connection readiness function is unavailable. Check the Baileys installation.'
        );
    }

    try {
        await Promise.race([
            socket.waitForSocketOpen(),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(
                        'WhatsApp connection timed out. Wait for a fresh QR code and try again.'
                    ));
                }, 20000);
            })
        ]);

        if (socket !== this.socket) {
            throw new Error(
                'WhatsApp is reconnecting. Please try again.'
            );
        }

        if (this.authStorage?.state?.creds?.registered) {
            throw new Error('WhatsApp is already registered');
        }

        const code = await socket.requestPairingCode(number);

        if (!code) {
            throw new Error(
                'WhatsApp did not generate a pairing code.'
            );
        }

        console.log('WhatsApp pairing code generated successfully');

        return code;

    } catch (error) {
        console.error(
            'Pairing code generation error:',
            error.message
        );

        throw error;
    }
}

    async sendMessage(jid, content, typeOrOptions, oldOptions) {
        if (!this.socket) {
            throw new Error('WhatsApp is not connected');
        }

        let payload;
        let options = {};

        if (typeof content === 'string') {
            if (typeOrOptions === MessageType.image) {
                payload = {
                    image: { url: content },
                    ...(oldOptions || {})
                };
            } else if (typeOrOptions === MessageType.video) {
                payload = {
                    video: { url: content },
                    ...(oldOptions || {})
                };
            } else {
                payload = { text: content };
                options = typeOrOptions || {};
            }
        } else if (Buffer.isBuffer(content)) {
            const mediaOptions = oldOptions || {};

            if (typeOrOptions === MessageType.image) {
                payload = {
                    image: content,
                    mimetype: mediaOptions.mimetype || 'image/jpeg',
                    caption: mediaOptions.caption
                };
            } else if (typeOrOptions === MessageType.video) {
                payload = {
                    video: content,
                    mimetype: mediaOptions.mimetype || 'video/mp4',
                    caption: mediaOptions.caption,
                    gifPlayback: mediaOptions.mimetype === Mimetype.gif
                };
            } else {
                payload = { document: content };
            }
        } else {
            payload = content || {};
            options = typeOrOptions || {};
        }

        return this.socket.sendMessage(jid, payload, options);
    }

    async setStatus(status) {
        if (!this.socket) return false;
        return this.socket.updateProfileStatus(String(status));
    }

    async updatePresence(jid, presence) {
        if (!this.socket) return false;
        return this.socket.sendPresenceUpdate(presence, jid);
    }

    async sendPresenceUpdate(presence, jid) {
        return this.updatePresence(jid, presence);
    }

    async readMessages(keys) {
        if (!this.socket) return false;
        return this.socket.readMessages(keys);
    }

    async chatRead(jid) {
        if (!this.socket) return false;

        const lastMessage = this.lastMessages.get(jid);
        if (!lastMessage?.key) return false;

        return this.socket.readMessages([lastMessage.key]);
    }

    async downloadAndSaveMediaMessage(message, filename) {
        if (!this.socket) {
            throw new Error('WhatsApp is not connected');
        }

        const buffer = await downloadMediaMessage(
            message,
            'buffer',
            {},
            {
                logger: this.logger,
                reuploadRequest: this.socket.updateMediaMessage
            }
        );

        const output =
            filename || message.key?.id || `scanty-${Date.now()}`;

        const target = output.includes('.')
            ? output
            : `${output}.bin`;

        fs.writeFileSync(target, buffer);
        return target;
    }

    async downloadMediaMessage(message) {
        if (!this.socket) {
            throw new Error('WhatsApp is not connected');
        }

        return downloadMediaMessage(
            message,
            'buffer',
            {},
            {
                logger: this.logger,
                reuploadRequest: this.socket.updateMediaMessage
            }
        );
    }

    async close() {
        this.shouldReconnect = false;
        this.connectionOpen = false;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        try {
            this.socket?.end(undefined);
        } catch (_) {}

        this.socket = null;

        try {
            await this.authStorage?.close();
        } catch (error) {
            console.error(
                'MongoDB close failed:',
                error.message
            );
        }

        this.authStorage = null;
    }
}

module.exports = {
    LegacyClient,
    MessageType,
    Mimetype,
    Presence
};
