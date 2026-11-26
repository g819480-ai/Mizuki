'use strict';

const Base = require('./Base');
const ReplyMessage = require('./ReplyMessage');

class Message extends Base {
    constructor(client, data) {
        super(client);
        if (data) this._patch(data);
    }

    _patch(data) {
        const msg = data.message || {};
        const type = Object.keys(msg)[0];

        this.id = data.key?.id;
        this.jid = data.key?.remoteJid;
        this.fromMe = data.key?.fromMe;
        this.message = msg.conversation ||
            msg.extendedTextMessage?.text ||
            msg.imageMessage?.caption ||
            msg.videoMessage?.caption || '';
        this.timestamp = Number(data.messageTimestamp || 0);
        this.data = data;

        const context = msg[type]?.contextInfo;
        this.reply_message = context?.quotedMessage
            ? new ReplyMessage(this.client, context)
            : false;

        this.mention = context?.mentionedJid || false;

        return this;
    }

    async delete() {
        return this.client.sendMessage(this.jid, {
            delete: {
                remoteJid: this.jid,
                fromMe: true,
                id: this.id
            }
        });
    }

    async reply(text) {
        return this.client.sendMessage(this.jid, {
            text: String(text)
        }, { quoted: this.data });
    }

    async sendMessage(content, type, options = {}) {
        if (typeof content === 'string') {
            return this.client.sendMessage(this.jid, {
                text: content
            }, options);
        }
        return this.client.sendMessage(this.jid, content, options);
    }

    async sendTyping() {
        return this.client.sendPresenceUpdate('composing', this.jid);
    }

    async sendRead() {
        return this.client.readMessages([this.data.key]);
    }
}

module.exports = Message;
