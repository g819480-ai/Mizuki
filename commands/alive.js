'use strict';

module.exports = {
    name: 'alive',
    aliases: ['online'],
    description: 'Check whether the bot is online',

    async execute({ reply }) {
        await reply(
            '🤖 *SCANTY MD BOT is alive!*\n\n' +
            '✅ WhatsApp connection active\n' +
            '⚡ Command system running'
        );
    }
};
