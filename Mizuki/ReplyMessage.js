'use strict';

const Base = require('./Base');
const Message = require('./Message');

class ReplyMessage extends Base {
    constructor(client, data) {
        super(client);
        if (data) this._patch(data);
    }

    _patch(data) {
        this.id = data.stanzaId;
        this.jid = data.remoteJid || data.chatJid || data.participant;
        this.data = data;

        const msg = data.quotedMessage || {};
        const type = Object.keys(msg)[0];
        const content = msg[type] || {};

        this.message =
            msg.conversation ||
            msg.extendedTextMessage?.text ||
            content.caption ||
            '';

        this.text = this.message;
        this.caption = content.caption || '';
        this.image = type === 'imageMessage';
        this.video = type === 'videoMessage';
        this.mimetype = content.mimetype || '';
        this.url = content.url || '';
        this.mediaKey = content.mediaKey || '';

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
        const sent = await this.client.sendMessage(
            this.jid,
            { text: String(text) },
            { quoted: this.data }
        );

        return new Message(this.client, sent);
    }

    async sendMessage(content, options = {}) {
        return this.client.sendMessage(this.jid, content, options);
    }

    async sendTyping() {
        return this.client.sendPresenceUpdate('composing', this.jid);
    }

    async download() {
        if (!this.image && !this.video) return false;

        return this.client.downloadMediaMessage(this.data.quotedMessage);
    }
}

module.exports = ReplyMessage;
