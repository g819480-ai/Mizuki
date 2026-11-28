'use strict';

module.exports = {
    name: 'ping',
    aliases: ['speed'],
    description: 'Check whether the bot can reply.',
    usage: 'ping',

    async execute({ reply }) {
        await reply(
            '╭━━━〔 🏓 SCANTY MD BOT 〕━━━╮\n' +
            '│\n' +
            '│  ⚡ PONG\n' +
            '│  ├─ Status: Online\n' +
            '│  └─ Response: Ready\n' +
            '│\n' +
            '╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
        );
    }
};
