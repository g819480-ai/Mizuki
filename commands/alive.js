'use strict';

module.exports = {
    name: 'alive',
    aliases: ['online'],
    description: 'Check whether the bot is online',

    async execute({ reply }) {
        await reply(
            '╭━━━〔 🤖 SCANTY MD BOT 〕━━━╮\n' +
            '│\n' +
            '│  🟢 SYSTEM ONLINE\n' +
            '│  ├─ WhatsApp: Connected\n' +
            '│  ├─ Commands: Active\n' +
            '│  └─ MongoDB: Connected\n' +
            '│\n' +
            '╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
        );
    }
};
