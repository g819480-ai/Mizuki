'use strict';

const EventEmitter = require('events');
const fs = require('fs');
const pino = require('pino');

const {
    default: makeWASocket,
    downloadMediaMessage,
    Browsers
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
    }

    loadAuthInfo() {
        return true;
    }

    base64EncodedAuthInfo() {
        return null;
    }

    async connect() {
        this.emit('connecting');

        this.authStorage = await useMongoDBAuthState();

        this.socket = makeWASocket({
            auth: this.authStorage.state,
            browser: Browsers.ubuntu('SCANTY MD BOT'),
            printQRInTerminal: false,
            markOnlineOnConnect: false,
            syncFullHistory: false,
            logger: pino({
                level: this.logger.level || 'warn'
            })
        });

        this.socket.ev.on('creds.update', async () => {
            try {
                await this.authStorage.saveCreds();
            } catch (error) {
                console.error(
                    'MongoDB auth save failed:',
                    error.message
                );
            }
        });


        this.socket.ev.on('connection.update', update => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                const current = this.socket.user || {};

                this.user = {
                    ...current,
                    jid: current.id || current.jid || '',
                    phone: {
                        wa_version: '0.0.0'
                    }
                };

                console.log('SCANTY MD BOT connected to WhatsApp');
                this.emit('open');
            }

            if (connection === 'close') {
                const error = lastDisconnect?.error;

                console.error(
                    'WhatsApp connection closed:',
                    error?.message || 'Connection closed'
                );

                this.emit('close', error);
            }
        });

        this.socket.ev.on('messages.upsert', event => {
            if (!event.messages?.length) return;

            for (const message of event.messages) {
                const jid = message.key?.remoteJid;
                if (!jid) continue;

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

        return this.socket;
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

        const target = output.includes('.') ? output : `${output}.bin`;

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
        try {
            this.socket?.end(undefined);
        } catch (_) {}

        try {
            await this.authStorage?.close();
        } catch (error) {
            console.error('MongoDB close failed:', error.message);
        }
    }
}

module.exports = {
    LegacyClient,
    MessageType,
    Mimetype,
    Presence
};


    
