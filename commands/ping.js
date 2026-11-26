'use strict';

module.exports = {
    name: 'ping',
    aliases: ['speed'],
    description: 'Check whether the bot can reply.',
    usage: 'ping',
    execute: async ({ reply }) => {
        const started = Date.now();
        await reply('🏓 *Pong!*');
        console.log('[SCANTY COMMANDS] Ping response sent in ' + (Date.now() - started) + 'ms');
    }
};
