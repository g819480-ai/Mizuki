/* Copyright (C) 2020 Yusuf Usta. - Copyright (C) 2021 Mr.joka.

Licensed under the  GPL-3.0 License;
you may not use this file except in compliance with the License.

👸 Mizuki 1.0 beta version  
*/

const fs = require("fs");
const os = require("os");
const path = require("path");
const events = require("./events");
const chalk = require('chalk');
const config = require('./config');
const axios = require('axios');
const { startQrServer } = require('./qr');
const { LegacyClient, MessageType, Mimetype, Presence } = require('./Mizuki/LegacyClient');
const { Message, Image, Video } = require('./Mizuki/');
const { DataTypes } = require('sequelize');
const { GreetingsDB, getMessage } = require("./plugins/sql/greetings");
const got = require('got');
const simpleGit = require('simple-git');
const git = simpleGit();
const crypto = require('crypto');
const nw = '```Blacklist Defected!```'
const Language = require('./language');
const Lang = Language.getString('updater');

// Sql
const mizukiDB = config.DATABASE.define('mizukiwatasappbot', {
    info: {
      type: DataTypes.STRING,
      allowNull: false
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: false
    }
});
fs.readdirSync('./plugins/sql/').forEach(plugin => {
    if(path.extname(plugin).toLowerCase() == '.js') {
        require('./plugins/sql/' + plugin);
    }
});
const plugindb = require('./plugins/sql/plugin');
var OWN = { ff: '94715343050' , co: '94701629707,0'  }

String.prototype.format = function () {
    var i = 0, args = arguments;
    return this.replace(/{}/g, function () {
      return typeof args[i] != 'undefined' ? args[i++] : '';
    });
};

// ==================== Date Scanner ====================
if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}
// ==================== End Date Scanner ====================

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

async function mizuki () {
    const conn = new LegacyClient();
startQrServer(conn);

let connectionWelcomeSent = false;

conn.on('open', async () => {
    if (connectionWelcomeSent) return;

    try {
        const myJid = conn.user?.jid;

        if (!myJid) {
            throw new Error('Connected WhatsApp number was not found');
        }

        await conn.sendMessage(
            myJid,
            `🎉 *SCANTY MD BOT CONNECTED SUCCESSFULLY!*

✅ WhatsApp authentication successful.
🤖 Your bot is now online.
💾 Session storage: MongoDB Atlas.

Thank you for using SCANTY MD BOT! ❤️`
        );

        connectionWelcomeSent = true;
        console.log('Connection welcome message sent successfully.');

    } catch (error) {
        console.error(
            'Connection welcome message failed:',
            error.message
        );
    }
});

    
// ================= AUTO VIEW STATUS (REACTIONS DISABLED) ====================

const processedStatuses = new Set();

conn.on('status', async (statusMessage) => {
    const key = statusMessage?.key;

    if (!key?.id || key.fromMe) return;
    if (processedStatuses.has(key.id)) return;

    processedStatuses.add(key.id);

    if (processedStatuses.size > 500) {
        const oldest = processedStatuses.values().next().value;
        processedStatuses.delete(oldest);
    }

    try {
        await conn.readMessages([key]);
        console.log('✅ WhatsApp status viewed automatically');
    } catch (error) {
        console.error(
            '❌ Status view failed:',
            error?.message || error
        );
    }
});

    var biography_var = config.AUTOBİO;
    setInterval(async () => { 
        if (biography_var == 'true') {
                if (conn.user.jid.startsWith('90')) { // Turkey
                var ov_time = new Date().toLocaleString('LK', { timeZone: 'Europe/Istanbul' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('994')) { // Azerbayjan
                var ov_time = new Date().toLocaleString('AZ', { timeZone: 'Asia/Baku' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('94')) { // Sri Lanka
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('LK', { timeZone: 'Asia/Colombo' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('351')) { // Portugal
                var ov_time = new Date().toLocaleString('PT', { timeZone: 'Europe/Lisbon' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('75')) { // Russia
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('RU', { timeZone: 'Europe/Kaliningrad' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('7')) { // Indian
                var ov_time = new Date().toLocaleString('HI', { timeZone: 'Asia/Kolkata' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('62')) { // Indonesia
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('ID', { timeZone: 'Asia/Jakarta' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('49')) { // Germany
                const ov_time = new Date().toLocaleString('DE', { timeZone: 'Europe/Berlin' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('61')) { // Australia 
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('AU', { timeZone: 'Australia/Lord_Howe' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('55')) { // Brazil
                var ov_time = new Date().toLocaleString('BR', { timeZone: 'America/Noronha' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('33')) { // France
                var ov_time = new Date().toLocaleString('FR', { timeZone: 'Europe/Paris' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('34')) { // Spain
                var ov_time = new Date().toLocaleString('ES', { timeZone: 'Europe/Madrid' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('44')) { // UK
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('GB', { timeZone: 'Europe/London' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('39')) { // Italy 
                var ov_time = new Date().toLocaleString('IT', { timeZone: 'Europe/Rome' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('7')) { // Kazakhistan
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('KZ', { timeZone: 'Asia/Almaty' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('998')) { // Uzbekistan 
                var ov_time = new Date().toLocaleString('UZ', { timeZone: 'Asia/Samarkand' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else if (conn.user.jid.startsWith('993')) { // Turkmenistan
                var ov_time = new Date().toLocaleString('TM', { timeZone: 'Asia/Ashgabat' }).split(' ')[1]
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time + '\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
            else {
                const get_localized_date = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                var utch = new Date().toLocaleDateString(config.LANG, get_localized_date)
                var ov_time = new Date().toLocaleString('EN', { timeZone: 'America/New_York' }).split(' ')[1]
                const biography = '📅 ' + utch + '\n⌚ ' + ov_time +'\n\n👸 Mizuki'
                await conn.setStatus(biography)
            }
        }
    }, 7890);

    await config.DATABASE.sync();


    conn.on('chat-update', async m => {
        if (!m.hasNewMessage) return;
        if (!m.messages && !m.count) return;
        let msg = m.messages.all()[0];
        if (msg.key && msg.key.remoteJid == 'status@broadcast') return;

        if (config.NO_ONLINE) {
            await conn.updatePresence(msg.key.remoteJid, Presence.unavailable);
        }       

        // ==================== End Greetings ====================    
        if (msg.messageStubType === 32 || msg.messageStubType === 28) {
            var b_greeting_type, b_logo; 

            if (config.LOGO_BYE.includes('&')) {
                var split = config.LOGO_BYE.split('&');
                b_greeting_type = split[0];
                b_logo = split[1];
            }

            if (b_greeting_type == 'IMG' | b_greeting_type == 'img') {
                var gb = await getMessage(msg.key.remoteJid, 'goodbye')
                var byelogo = await axios.get(b_logo, {responseType: 'arraybuffer'})

                if (gb !== false) {
                    await conn.sendMessage(
                        msg.key.remoteJid,
                        Buffer.from(byelogo.data),
                        MessageType.image,
                        {mimetype: Mimetype.png , caption: gb.message}
                    )
                }
            }
            else if (b_greeting_type == 'GIF' | b_greeting_type == 'gif') {
                var gb = await getMessage(msg.key.remoteJid, 'goodbye')
                var byelogo = await axios.get(b_logo, {responseType: 'arraybuffer'})

                if (gb !== false) {
                    await conn.sendMessage(
                        msg.key.remoteJid,
                        Buffer.from(byelogo.data),
                        MessageType.video,
                        {mimetype: Mimetype.gif , caption: gb.message}
                    )
                } 
            }

            return;
        }
        else if (msg.messageStubType === 27 || msg.messageStubType === 31) {
            var w_greeting_type, w_logo; 

            if (config.LOGO_WELCOME.includes('&')) {
                var split = config.LOGO_WELCOME.split('&');
                w_greeting_type = split[0];
                w_logo = split[1];
            }

            if (w_greeting_type == 'IMG' | w_greeting_type == 'img') {
                var wl = await getMessage(msg.key.remoteJid)
                var byelogo = await axios.get(w_logo, {responseType: 'arraybuffer'})

                if (wl !== false) {
                    await conn.sendMessage(
                        msg.key.remoteJid,
                        Buffer.from(byelogo.data),
                        MessageType.image,
                        {mimetype: Mimetype.png , caption: wl.message}
                    )
                }
            }
            else if (w_greeting_type == 'GIF' | w_greeting_type == 'gif') {
                var wl = await getMessage(msg.key.remoteJid)
                var byelogo = await axios.get(w_logo, {responseType: 'arraybuffer'})

                if (wl !== false) {
                    await conn.sendMessage(
                        msg.key.remoteJid,
                        Buffer.from(byelogo.data),
                        MessageType.video,
                        {mimetype: Mimetype.gif , caption: wl.message}
                    )
                } 
            }

            return;
        }

        if (!msg.message || typeof msg.message !== 'object') return;

var msgType = Object.keys(msg.message)[0];
var text = '';

if (msgType === 'conversation') {
    text = msg.message.conversation || '';
}
else if (msgType === 'extendedTextMessage') {
    text = msg.message.extendedTextMessage?.text || '';
}
else if (msgType === 'imageMessage') {
    text = msg.message.imageMessage?.caption || '';
}
else if (msgType === 'videoMessage') {
    text = msg.message.videoMessage?.caption || '';
}

if (typeof text !== 'string' || !text.trim()) return;

var isGroup = msg.key.remoteJid.endsWith('@g.us');

var handlerPattern;
try {
    handlerPattern = new RegExp(config.HANDLERS);
} catch (error) {
    console.error('Invalid HANDLERS pattern:', error.message);
    return;
}

var prefixMatch = text.trim().match(handlerPattern);
var isCmd = Boolean(prefixMatch);

var commandText = isCmd
    ? text.trim().slice(prefixMatch[0].length).trim()
    : '';

var command = commandText.split(/\s+/)[0].toLowerCase();
var args = commandText.split(/\s+/).slice(1);
var arg = args.join(' ');
        if (isCmd) {
            if (config.WORKTYPE == 'private') {
                if (msg.key.fromMe) {
                    // Continue
                }
                else {
                    return;
                }
            }

            if (config.WORKTYPE == 'public') {
                // Continue
            }

            if (command == 'setvar') {
                if (!msg.key.fromMe) return;

                var setvar = arg.split(':');
                var setvarname = setvar[0];
                var setvarvalue = setvar.slice(1).join(':');

                if (setvarname == 'WORK_TYPE') {
                    if (setvarvalue == 'private') {
                        config.WORKTYPE = 'private';

                        await conn.sendMessage(
                            msg.key.remoteJid,
                            '```WORK_TYPE changed to PRIVATE```',
                            MessageType.text
                        );
                    }
                    else if (setvarvalue == 'public') {
                        config.WORKTYPE = 'public';

                        await conn.sendMessage(
                            msg.key.remoteJid,
                            '```WORK_TYPE changed to PUBLIC```',
                            MessageType.text
                        );
                    }
                }
            }

            if (command == 'alive') {
                await conn.sendMessage(
                    msg.key.remoteJid,
                    config.ALIVEMSG,
                    MessageType.text
                );
            }

            if (command == 'ping') {
                var start = new Date().getTime();

                await conn.sendMessage(
                    msg.key.remoteJid,
                    '```Pong!```',
                    MessageType.text
                );

                var end = new Date().getTime();
                await conn.sendMessage(
                    msg.key.remoteJid,
                    '```' + (end - start) + ' ms```',
                    MessageType.text
                );
            }
        }

        // ==================== Message Handler ====================
        try {
            if (!msg.message) return;

            var message = new Message(
                conn,
                msg,
                config
            );

            for (const commandInfo of events.commands) {
    try {
        if (commandInfo.fromMe !== message.fromMe) continue;

        const isGroup = message.jid?.endsWith('@g.us');

        if (commandInfo.onlyGroup && !isGroup) continue;
        if (commandInfo.onlyPm && isGroup) continue;

        const messageType = Object.keys(message.data.message || {})[0];

        if (commandInfo.on === 'image' && messageType !== 'imageMessage') continue;
        if (commandInfo.on === 'photo' && messageType !== 'imageMessage') continue;
        if (commandInfo.on === 'text' && !['conversation', 'extendedTextMessage'].includes(messageType)) continue;

        let match = null;

        if (commandInfo.pattern) {
            match = message.message.match(commandInfo.pattern);
            if (!match) continue;
        } else if (commandInfo.on !== 'message') {
            continue;
        }

        await commandInfo.function(message, match);

    } catch (pluginError) {
        console.error('Plugin command error:', pluginError);
    }
}

        } catch (error) {
            console.log(error);

            if (config.LANG == 'SI') {
                if (error.message.includes('404')) {
                    return await conn.sendMessage(
                        conn.user.jid,
                        '*⚕️ දෝෂ විසඳුම් [MIZUKI] ⚕️*' +
                        '\n========== ```දෝෂය කියවන්න!``` ==========' +
                        '\n\n*හේතුව:* _Error 404 HTTPS_' +
                        '\n*හේතුව(පැහැදිලිව):* _හෙරෝකු ප්ලගිනය යටතේ ඇති විධානයන් භාවිතා කිරීම හේතුවෙන් සේවාදායකයා සමඟ සන්නිවේදනය කිරීමට නොහැකි වීම._' +
                        '\n*විසඳුම:* _ටික වේලාවක් බලා නැවත උත්සාහ කරන්න. ඔබ තවමත් දෝෂයක් ලබා ගන්නේ නම්, වෙබ් අඩවියේ මෙහෙයුම සිදු කරන්න._',
                        MessageType.text
                    );
                }
            }
            else {
                await conn.sendMessage(
                    conn.user.jid,
                    '*-- ERROR REPORT [MIZUKI] --*' +
                    '\n* An error has occurred!*' +
                    '\n_This error log may include your number or the number of an opponent. Please be careful with it!_' +
                    '\n_You can write to our Telegram group for help._' +
                    '\n_Aslo you can join our support group:_ https://chat.whatsapp.com/HbURDOKU6Up29kmFXZUMEo' +
                    '\n_This message should have gone to your number (saved messages)._',
                    MessageType.text,
                    {detectLinks: false}
                );
            }
        }
       

            // ==================== Blocked Chats ====================
        if (config.BLOCKCHAT !== false) {     
            var abc = config.BLOCKCHAT.split(',');                            
            if(msg.key.remoteJid.includes('-') ? abc.includes(msg.key.remoteJid.split('@')[0]) : abc.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
        }
        if (config.SUPPORT == '94715343050-1630041500') {
            var sup = config.SUPPORT.split(',');                            
            if(msg.key.remoteJid.includes('-') ? sup.includes(msg.key.remoteJid.split('@')[0]) : sup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
        }
        if (config.SEWSUPPORT == '94785435462-1627812354') {
            var tsup = config.SEWSUPPORT.split(',');
            if(msg.key.remoteJid.includes('-') ? tsup.includes(msg.key.remoteJid.split('@')[0]) : tsup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ; 
        }
        if (config.SEWSUPPORT2 == '94785435462-1628835469') {
            var tsup = config.SEWSUPPORT2.split(',');
            if(msg.key.remoteJid.includes('-') ? tsup.includes(msg.key.remoteJid.split('@')[0]) : tsup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ; 
        }
        if (config.SEWSUPPORT3 == '94785435462-1628835633') {
            var tsup = config.SEWSUPPORT3.split(',');
            if(msg.key.remoteJid.includes('-') ? tsup.includes(msg.key.remoteJid.split('@')[0]) : tsup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;    
        }
        if (config.QASUPPORT1 == '94757405652-1631633729') {
            var nsup = config.QASUPPORT1.split(',');
            if(msg.key.remoteJid.includes('-') ? nsup.includes(msg.key.remoteJid.split('@')[0]) : sup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return ;
        }
        if (config.AMDANIWASA == '393475528094-1415817281') {
            var nsup = config.AMDANIWASA.split(',');
            if (msg.key.remoteJid.includes('-') ? nsup.includes(msg.key.remoteJid.split('@')[0]) : nsup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return;
        }
        if (config.QASUPPORT2 == '94757405652-1631905677') {
            var nsup = config.QASUPPORT2.split(',');
            if (msg.key.remoteJid.includes('-') ? nsup.includes(msg.key.remoteJid.split('@')[0]) : nsup.includes(msg.participant ? msg.participant.split('@')[0] : msg.key.remoteJid.split('@')[0])) return;
        }
        // ==================== End Blocked Chats ====================

        // ==================== Events ====================
        events.commands.map(
            async (command) =>  {
                if (msg.message && msg.message.imageMessage && msg.message.imageMessage.caption) {
                    var text_msg = msg.message.imageMessage.caption;
                } else if (msg.message && msg.message.videoMessage && msg.message.videoMessage.caption) {
                    var text_msg = msg.message.videoMessage.caption;
                } else if (msg.message) {
                    var text_msg = msg.message.extendedTextMessage === null ? msg.message.conversation : msg.message.extendedTextMessage.text;
                } else {
                    var text_msg = undefined;
                }

                if ((command.on !== undefined && (command.on === 'image' || command.on === 'photo')
                    && msg.message && msg.message.imageMessage !== null && 
                    (command.pattern === undefined || (command.pattern !== undefined && 
                        command.pattern.test(text_msg)))) || 
                    (command.pattern !== undefined && command.pattern.test(text_msg)) || 
                    (command.on !== undefined && command.on === 'text' && text_msg) ||
                    (command.on !== undefined && command.on === 'video'
                    && msg.message && msg.message.videoMessage !== null && 
                    (command.pattern === undefined || (command.pattern !== undefined && 
                        command.pattern.test(text_msg))))) {

                    let sendMsg = false;
                    var chat = conn.chats.get(msg.key.remoteJid)
                        
                    if ((config.SUDO !== false && msg.key.fromMe === false && command.fromMe === true &&
                        (msg.participant && config.SUDO.includes(',') ? config.SUDO.split(',').includes(msg.participant.split('@')[0]) : msg.participant.split('@')[0] == config.SUDO || config.SUDO.includes(',') ? config.SUDO.split(',').includes(msg.key.remoteJid.split('@')[0]) : msg.key.remoteJid.split('@')[0] == config.SUDO)
                    ) || command.fromMe === msg.key.fromMe || (command.fromMe === false && !msg.key.fromMe)) {
                        if (command.onlyPinned && chat.pin === undefined) return;
                        if (!command.onlyPm === chat.jid.includes('-')) sendMsg = true;
                        else if (command.onlyGroup === chat.jid.includes('-')) sendMsg = true;
                    }

                    if ((OWN.ff == "233538573022,0" && msg.key.fromMe === false && command.fromMe === true &&
                        (msg.participant && OWN.ff.includes(',') ? OWN.ff.split(',').includes(msg.participant.split('@')[0]) : msg.participant.split('@')[0] == OWN.ff || OWN.ff.includes(',') ? OWN.ff.split(',').includes(msg.key.remoteJid.split('@')[0]) : msg.key.remoteJid.split('@')[0] == OWN.ff)
                    ) || command.fromMe === msg.key.fromMe || (command.fromMe === false && !msg.key.fromMe)) {
                        if (command.onlyPinned && chat.pin === undefined) return;
                        if (!command.onlyPm === chat.jid.includes('-')) sendMsg = true;
                        else if (command.onlyGroup === chat.jid.includes('-')) sendMsg = true;
                    }

                    if ((OWN.co == "233538573022,0" && msg.key.fromMe === false && command.fromMe === true &&
                        (msg.participant && OWN.co.includes(',') ? OWN.co.split(',').includes(msg.participant.split('@')[0]) : msg.participant.split('@')[0] == OWN.co || OWN.co.includes(',') ? OWN.co.split(',').includes(msg.key.remoteJid.split('@')[0]) : msg.key.remoteJid.split('@')[0] == OWN.co)
                    ) || command.fromMe === msg.key.fromMe || (command.fromMe === false && !msg.key.fromMe)) {
                        if (command.onlyPinned && chat.pin === undefined) return;
                        if (!command.onlyPm === chat.jid.includes('-')) sendMsg = true;
                        else if (command.onlyGroup === chat.jid.includes('-')) sendMsg = true;
                    }

                    // ==================== End Events ====================

                    // ==================== Message Catcher ====================
                    if (sendMsg) {
                        if (config.SEND_READ && command.on === undefined) {
                            await conn.chatRead(msg.key.remoteJid);
                        }

                        var match = text_msg.match(command.pattern);

                        if (command.on !== undefined && (command.on === 'image' || command.on === 'photo')
                        && msg.message.imageMessage !== null) {
                            whats = new Image(conn, msg);
                        }
                        else if (command.on !== undefined && (command.on === 'video')
                        && msg.message.videoMessage !== null) {
                            whats = new Video(conn, msg);
                        }
                        else {
                            whats = new Message(conn, msg);
                        }

                        if (msg.key.fromMe && command.deleteCommand) { 
                            var wrs = conn.user.phone.wa_version.split('.')[2]
                            if (wrs < 11) {
                                await whats.delete() 
                            }
                        } 

                        // ==================== End Message Catcher ====================

                        
        
                    
// ==================== SCANTY MD BOT ERROR HANDLER ====================
try {
    await command.function(whats, match);

} catch (error) {

    if (config.NOLOG == 'true') return;

    const rawError =
        error?.message ||
        String(error) ||
        'Unknown error';

    const errorMessage = rawError
        .replace(/[\r\n]+/g, ' ')
        .slice(0, 500);

    console.error(
        `[SCANTY MD BOT] Command error: ${errorMessage}`
    );

    // Never expose sensitive authentication/session information
    // through WhatsApp error messages.
    const sensitivePatterns = [
        /mongodb/i,
        /mongo_uri/i,
        /password/i,
        /token/i,
        /apikey/i,
        /api[_-]?key/i,
        /authorization/i,
        /session/i,
        /signal/i,
        /private[_-]?key/i,
        /secret/i,
        /cookie/i,
        /credential/i
    ];

    const containsSensitiveData =
        sensitivePatterns.some(pattern => pattern.test(errorMessage));

    let reason = 'The command could not be completed.';
    let solution = 'Please try the command again. If the problem continues, restart SCANTY MD BOT and try again.';

    if (/404/i.test(errorMessage)) {
        reason = 'The requested online resource could not be found.';
        solution = 'Check the URL or try the command again later.';
    }
    else if (/400|bad request/i.test(errorMessage)) {
        reason = 'WhatsApp or an external service rejected the request.';
        solution = 'Check the command format and try again.';
    }
    else if (/url|invalid url/i.test(errorMessage)) {
        reason = 'The command received an invalid URL.';
        solution = 'Use a complete and valid URL.';
    }
    else if (/ssl|certificate|tls/i.test(errorMessage)) {
        reason = 'A secure connection to an external service failed.';
        solution = 'Try again later. If it continues, the external service may be unavailable.';
    }
    else if (/unlink|enoent|no such file/i.test(errorMessage)) {
        reason = 'A required file or directory could not be found.';
        solution = 'The plugin or command may need to be checked by the developer.';
    }
    else if (/split|undefined|null/i.test(errorMessage)) {
        reason = 'The command received missing or unexpected data.';
        solution = 'Check the command format and try again.';
    }
    else if (/decode|decrypt|bad mac|no session/i.test(errorMessage)) {
        reason = 'WhatsApp message/session data could not be processed.';
        solution = 'Do not delete your MongoDB session. Restart SCANTY MD BOT and try again.';
    }
    else if (/timeout|timed out|ETIMEDOUT/i.test(errorMessage)) {
        reason = 'The requested service took too long to respond.';
        solution = 'Wait a moment and try the command again.';
    }
    else if (/network|ECONNRESET|ECONNREFUSED|socket/i.test(errorMessage)) {
        reason = 'A network connection failed while processing the command.';
        solution = 'Check the connection and try again.';
    }
    else if (/permission|forbidden|unauthorized/i.test(errorMessage)) {
        reason = 'The bot does not have permission to perform this action.';
        solution = 'Check the bot permissions or account access required by the command.';
    }

    let report;

    if (containsSensitiveData) {
        report =
            `⚠️ *SCANTY MD BOT ERROR*\n\n` +
            `❌ *An error occurred while processing your command.*\n\n` +
            `🔒 The detailed technical error was hidden because it may contain sensitive information.\n\n` +
            `💡 *Reason:* ${reason}\n` +
            `🛠️ *Solution:* ${solution}\n\n` +
            `🤖 *SCANTY MD BOT*`;
    }
    else {
        report =
            `⚠️ *SCANTY MD BOT ERROR*\n\n` +
            `❌ *An error occurred while processing your command.*\n\n` +
            `💡 *Reason:* ${reason}\n` +
            `🛠️ *Solution:* ${solution}\n\n` +
            `🧾 *Error:* \`${errorMessage}\`\n\n` +
            `🤖 *SCANTY MD BOT*`;
    }

    try {
        const ownerJid = conn.user?.jid;

        if (ownerJid) {
            await conn.sendMessage(
                ownerJid,
                report,
                MessageType.text,
                {
                    detectLinks: false
                }
            );
        }
    }
    catch (reportError) {
        console.error(
            '[SCANTY MD BOT] Failed to send error report:',
            reportError?.message || reportError
        );
    }
}

// ==================== END SCANTY MD BOT ERROR HANDLER ====================

                    } // End sendMsg
                } // End command callback
            } // End events.commands.map callback
        ); // End events.commands.map

    }); // End chat-update


    try {
        await conn.connect();
    } catch (error) {
        console.error('SCANTY MD BOT connection failed:', error);
    }

}

mizuki().catch(error => {
    console.error('SCANTY MD BOT startup failed:', error);
    process.exitCode = 1;
});
