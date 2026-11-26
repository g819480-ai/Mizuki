'use strict';

const fs = require('fs');
const path = require('path');

const COMMANDS = new Map();
const COMMAND_DIR = path.join(__dirname, 'commands');

function register(command) {
    if (!command || !command.name || typeof command.execute !== 'function') {
        throw new TypeError('Each command needs a name and execute function.');
    }

    const names = [command.name, ...(command.aliases || [])]
        .map(name => String(name).toLowerCase().trim())
        .filter(Boolean);

    for (const name of names) {
        if (COMMANDS.has(name)) {
            throw new Error('Duplicate command name or alias: ' + name);
        }
        COMMANDS.set(name, command);
    }
}

function loadCommands() {
    if (!fs.existsSync(COMMAND_DIR)) {
        throw new Error('Missing commands directory: ' + COMMAND_DIR);
    }

    const files = fs.readdirSync(COMMAND_DIR)
        .filter(file => file.endsWith('.js'))
        .sort();

    for (const file of files) {
        const command = require(path.join(COMMAND_DIR, file));
        register(command);
        console.log('[SCANTY COMMANDS] Loaded: ' + command.name);
    }

    console.log('[SCANTY COMMANDS] Ready: ' + files.length + ' command modules.');
}

function extractText(message) {
    const content = message?.message;
    if (!content || typeof content !== 'object') return '';

    return content.conversation
        || content.extendedTextMessage?.text
        || content.imageMessage?.caption
        || content.videoMessage?.caption
        || content.documentMessage?.caption
        || content.buttonsResponseMessage?.selectedButtonId
        || content.listResponseMessage?.singleSelectReply?.selectedRowId
        || '';
}

function findPrefix(body, configuredPattern) {
    try {
        const expression = new RegExp(configuredPattern || '^[.!;]');
        const match = String(body).trim().match(expression);
        return match ? match[0] : null;
    } catch (error) {
        console.error('[SCANTY COMMANDS] Invalid HANDLERS pattern:', error.message);
        return null;
    }
}

function normalizeNumber(jid) {
    return String(jid || '')
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

function getSenderJid(message) {
    if (message.key?.fromMe) return message.key.remoteJid;
    return message.key?.participant || message.key?.remoteJid || '';
}

function isSudo(senderJid, config) {
    if (!config.SUDO) return false;

    const allowed = String(config.SUDO)
        .split(',')
        .map(normalizeNumber)
        .filter(Boolean);

    return allowed.includes(normalizeNumber(senderJid));
}

function makeContext(conn, message, config, parsed) {
    const chatId = message.key.remoteJid;
    const senderJid = getSenderJid(message);
    const isGroup = chatId.endsWith('@g.us');
    const isOwner = Boolean(message.key.fromMe)
        || isSudo(senderJid, config)
        || (
            Boolean(conn.user?.jid)
            && normalizeNumber(senderJid) === normalizeNumber(conn.user.jid)
        );

    return {
        conn,
        message,
        config,
        chatId,
        senderJid,
        isGroup,
        isOwner,
        command: parsed.command,
        args: parsed.args,
        text: parsed.args.join(' '),
        prefix: parsed.prefix,
        commands: COMMANDS,
        reply: text => conn.sendMessage(
            chatId,
            { text: String(text) },
            { quoted: message }
        )
    };
}

function isAllowed(command, context) {
    const mode = String(context.config.WORKTYPE || 'public').toLowerCase();

    if (command.ownerOnly && !context.isOwner) return false;
    if (mode === 'private' && !context.isOwner) return false;
    if (command.groupOnly && !context.isGroup) return false;
    if (command.privateOnly && context.isGroup) return false;

    return true;
}

loadCommands();

async function handleMessage(conn, message, config) {
    if (!message?.key?.remoteJid || !message.message) return false;
    if (message.key.remoteJid === 'status@broadcast') return false;

    const body = extractText(message);
    if (!body.trim()) return false;

    const prefix = findPrefix(body, config.HANDLERS);
    if (!prefix) return false;

    const input = body.trim().slice(prefix.length).trim();
    if (!input) return true;

    const parts = input.split(/\s+/);
    const name = parts.shift().toLowerCase();
    const command = COMMANDS.get(name);

    const context = makeContext(conn, message, config, {
        command: name,
        args: parts,
        prefix
    });

    // Prefix commands are handled only by this engine, never by the old
    // Mizuki command dispatchers.
    if (!command) {
        await context.reply(
            '❌ Unknown command: ' + prefix + name
            + '\nUse ' + prefix + 'menu to see available commands.'
        );
        return true;
    }

    if (!isAllowed(command, context)) {
        if (String(config.WORKTYPE || 'public').toLowerCase() !== 'private') {
            await context.reply('⚠️ You do not have permission to use this command.');
        }
        console.log('[SCANTY COMMANDS] Permission denied:', name, 'from', context.senderJid);
        return true;
    }

    try {
        console.log(
            '[SCANTY COMMANDS] Running',
            prefix + name,
            'from',
            context.senderJid,
            'in',
            context.chatId
        );
        await command.execute(context);
    } catch (error) {
        console.error('[SCANTY COMMANDS] Command failed:', name, error?.stack || error);
        try {
            await context.reply('❌ The command failed. Please try again later.');
        } catch (replyError) {
            console.error('[SCANTY COMMANDS] Reply failed:', replyError?.message || replyError);
        }
    }

    return true;
}

module.exports = {
    handleMessage,
    register,
    commands: COMMANDS
};
