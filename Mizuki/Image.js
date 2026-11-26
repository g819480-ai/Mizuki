'use strict';

const Base = require('./Base');
const Message = require('./Message');
const ReplyMessage = require('./ReplyMessage');

class Image extends Base {
    constructor(client, data) {
        super(client);
        if (data) this._patch(data);
    }

    _patch(data) {
        const msg = data.message?.imageMessage || {};

        this.id = data.key?.id;
        this.jid = data.key?.remoteJid;
        this.fromMe = data.key?.fromMe;
        this.caption = msg.caption || '';
        this.url = msg.url || '';
        this.timestamp = Number(data.messageTimestamp || 0);
        this.mimetype = msg.mimetype || '';
        this.height = msg.height;
        this.width = msg.width;
        this.mediaKey = msg.mediaKey;
        this.data = data;

        const context = msg.contextInfo;
        this.reply_message = context?.quotedMessage
            ? new ReplyMessage(this.client, {
                ...context,
                remoteJid: this.jid
            })
            : false;

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

    async sendRead() {
        return this.client.readMessages([this.data.key]);
    }

    async download(location = this.id) {
        return this.client.downloadAndSaveMediaMessage(this.data, location);
    }
}

module.exports = Image;
