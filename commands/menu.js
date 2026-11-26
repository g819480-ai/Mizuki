'use strict';

module.exports = {
    name: 'menu',
    aliases: ['help', 'commands'],
    description: 'Show available bot commands',

    async execute({ reply, commands, prefix }) {
        const unique = new Map();

        for (const command of commands.values()) {
            unique.set(command.name, command);
        }

        const list = [...unique.values()]
            .map(command => `│ ${prefix}${command.name} - ${command.description}`)
            .join('\n');

        await reply(
            `╭━━━『 SCANTY MD BOT 』━━━╮\n` +
            `${list}\n` +
            `╰━━━━━━━━━━━━━━━━━━╯`
        );
    }
};
