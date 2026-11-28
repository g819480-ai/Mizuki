'use strict';

function getQuotedMessage(message) {
    const context =
        message?.message?.extendedTextMessage?.contextInfo
        || message?.message?.imageMessage?.contextInfo
        || message?.message?.videoMessage?.contextInfo
        || message?.message?.documentMessage?.contextInfo
        || message?.message?.audioMessage?.contextInfo;

    if (!context?.quotedMessage) return null;

    return {
        key: {
            remoteJid: message.key.remoteJid,
            id: context.stanzaId,
            participant: context.participant
        },
        message: context.quotedMessage
    };
}

function getMediaType(message) {
    const content = message?.message || {};

    if (content.imageMessage) return 'image';
    if (content.videoMessage) return 'video';
    if (content.audioMessage) return 'audio';
    if (content.documentMessage) return 'document';

    return null;
}

function getEmoji(args) {
    const emoji = args.find(arg =>
        /\p{Extended_Pictographic}/u.test(arg)
    );

    return emoji || '💾';
}

module.exports = {
    name: 'save',
    aliases: ['sv'],
    description: 'Save quoted media to your DM',
    ownerOnly: true,

    async execute({ conn, message, args }) {
        const quoted = getQuotedMessage(message);

        if (!quoted) {
            return conn.sendMessage(
                message.key.remoteJid,
                {
                    text: '💾 Reply to a picture, video, audio, or document with .save'
                },
                {
                    quoted: message
                }
            );
        }

        const type = getMediaType(quoted);

        if (!type) {
            return conn.sendMessage(
                message.key.remoteJid,
                {
                    text: '⚠️ The replied message does not contain supported media.'
                },
                {
                    quoted: message
                }
            );
        }

        const emoji = getEmoji(args);
        const myJid = conn.user?.jid;

        if (!myJid) {
            throw new Error('Your WhatsApp JID is not available.');
        }

        const buffer = await conn.downloadMediaMessage(quoted);

        const original =
            quoted.message[type + 'Message'] || {};

        const mimetype =
            original.mimetype ||
            (
                type === 'image'
                    ? 'image/jpeg'
                    : type === 'video'
                        ? 'video/mp4'
                        : type === 'audio'
                            ? 'audio/mpeg'
                            : 'application/octet-stream'
            );

        let payload;

        if (type === 'image') {
            payload = {
                image: buffer,
                mimetype,
                caption: emoji
            };
        }

        else if (type === 'video') {
            payload = {
                video: buffer,
                mimetype,
                caption: emoji
            };
        }

        else if (type === 'audio') {
            payload = {
                audio: buffer,
                mimetype,
                ptt: Boolean(original.ptt)
            };
        }

        else {
            payload = {
                document: buffer,
                mimetype,
                fileName:
                    original.fileName ||
                    `SCANTY-${Date.now()}`
            };
        }

        await conn.sendMessage(
            myJid,
            {
                text: `${emoji} Saved from chat`
            }
        );

        await conn.sendMessage(
            myJid,
            payload
        );
    }
};
