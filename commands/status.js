'use strict';

module.exports = {
    name: 'status',
    aliases: ['botstatus'],
    description: 'Show bot connection status',

    async execute({ conn, reply }) {
        const connected = Boolean(conn.user);

        await reply(
            `🤖 *SCANTY MD BOT STATUS*\n\n` +
            `WhatsApp: ${connected ? '✅ Connected' : '❌ Disconnected'}\n` +
            `Bot: ${conn.user?.name || 'SCANTY MD BOT'}`
        );
    }
};
