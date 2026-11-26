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

        var msgType = Object.keys(msg.message)[0];

        if (msgType === 'conversation') {
            var text = msg.message.conversation;
        }
        else if (msgType === 'extendedTextMessage') {
            var text = msg.message.extendedTextMessage.text;
        }
        else if (msgType === 'imageMessage') {
            var text = msg.message.imageMessage.caption;
        }
        else if (msgType === 'videoMessage') {
            var text = msg.message.videoMessage.caption;
        }
        else {
            var text = '';
        }

        if (text == undefined) return;

        var isGroup = msg.key.remoteJid.endsWith('@g.us');
        var isCmd = text.startsWith(config.HANDLERS);
        var command = text.split(' ')[0].slice(config.HANDLERS.length);
        var args = text.trim().split(' ').slice(1);
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

            await events.emit('message', message);

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

                        // ==================== Error Message ====================
                        try {
                            await command.function(whats, match);
                        }
                        catch (error) {
                            if (config.NOLOG == 'true') return;

                            if (config.LANG == 'SI' || config.LANG == 'EN') {
                                await conn.sendMessage(
                                    conn.user.jid,
                                    '*-- දෝෂ වාර්තාව [👸 Mizuki] --*' +
                                    '\n*Mizuki bot හි දෝෂයක් සිදු වී ඇත!*'+
                                    '\n_මෙම දෝශ සටහනෙහි ඔබේ අංකය හෝ SUDO අංකයක් ඇතුළත් විය හැකිය. කරුණාකර එය සමග සැලකිලිමත් වන්න!_' +
                                    '\n_උදව් සඳහා ඔබට අපගේ වට්ස්ඇප් සමූහයට පණිවුඩ දැමිය හැකිය._' +
                                    '\n_මෙම පණිවිඩය ඔබගේ log අංකයට යා යුතුව තිබුණි (සුරැකි පණිවිඩ)._' +
                                    '\n_ඔබට මෙම සමූහයට :- https://chat.whatsapp.com/HbURDOKU6Up29kmFXZUMEo දෝෂය වාර්තා කළ හැකිය._\n\n' +
                                    '*සිදුවුණු දෝෂය:* ```' + error + '```\n\n',
                                    MessageType.text,
                                    {detectLinks: false}
                                );

                                if (error.message.includes('URL')) {
                                    return await conn.sendMessage(
                                        conn.user.jid,
                                        '*⚕️  දෝෂ විසඳුම් [MIZUKI] ⚕️*' +
                                        '\n========== ```දෝෂය කියවන්න!``` ==========' +
                                        '\n\n*හේතුව:* _සහය දක්වන්නේ සත්‍ය URL වලට පමණි._' +
                                        '\n*හේතුව(පැහැදිලිව):* _Log අංකය තුළ මාධ්‍ය මෙවලම් (xmedia, sticker ..) භාවිතය._' +
                                        '\n*විසඳුම:* _විධානය Log අංකය හැර වෙනත් ඕනෑම කතාබහක භාවිතා කළ හැකිය._',
                                        MessageType.text
                                    );
                                }
                                else if (error.message.includes('SSL')) {
                                    return await conn.sendMessage(
                                        conn.user.jid,
                                        '*⚕️ දෝෂ විසඳුම් [MIZUKI] ⚕️*' +
                                        '\n========== ```දෝෂය කියවන්න!``` ==========' +
                                        '\n\n*හේතුව:* _SQL Database Error_' +
                                        '\n*හේතුව(පැහැදිලිව):* _Database\'in bozulması._ ' +
                                        '\n*විසඳුම:* _දන්නා විසඳුමක් නැත.ඔබට නැවත ස්ථාපනය කිරීම උත්සාහ කළ හැකිය._',
                                        MessageType.text
                                    );
                                }
                                else if (error.message.includes('split')) {
                                    return await conn.sendMessage(
                                        conn.user.jid,
                                        '*⚕️ දෝෂ විසඳුම් [MIZUKI] ⚕️*' +
                                        '\n========== ```දෝෂය කියවන්න!``` ==========' +
                                        '\n\n*හේතුව:* _Split of Undefined_' +
                                        '\n*හේතුව(පැහැදිලිව):* _කණ්ඩායම් පරිපාලකයින්ට භාවිතා කළ හැකි විධානයන් වරින් වර බෙදීමේ ක්‍රියාවලිය නොදකියි._ ' +
                                        '\n*විසඳුම:* _රීස්ටාර්ට් කිරීමෙන් මෙය විසඳා ගත හැක._',
                                        MessageType.text
                                    );
                                }
                                else if (error.message.includes('Ookla')) {
                                    return await conn.sendMessage(
                                        conn.user.jid,
                                        '*⚕️ දෝෂ විසඳුම් [MIZUKI] ⚕️*' +
                                        '\n========== ```දෝෂය කියවන්න!``` ==========' +
                                        '\n\n*හේතුව:* _Ookla Server Connection_' +
                                        '\n*හේතුව(පැහැදිලිව):* _Speedtest එකට දත්ත සම්ප්‍රේෂණය කිරීමට නොහැකි වීම._' +
                                        '\n*විසඳුම:* _ඔබ එම විධානය නැවත වරක් භාවිතා කළහොත් ගැටළුව විසඳනු ඇත._',
                                        MessageType.text
                                    );
                                }
                                else if (error.message.includes('params')) {
                                    return await conn.sendMessage(
                                        conn.user.jid,
                                        '*⚕️ දෝෂ විසඳුම් [MIZUKI] ⚕️*' +
                                        '\n========== ```දෝෂය කියවන්න!``` ==========' +
                                        '\n\n*හේතුව:* _Requested Audio Params_' +
                                        '\n*හේතුව(පැහැදිලිව):* _ලතින් නොවන අක්ෂර වලින් ටීටීඑස් විධානය භාවිතා කරන්න._' +
                                        '\n*විසඳුම:* _ඔබ ලතින් අකුරින් විධානය භාවිතා කළහොත් ගැටළුව විසඳෙනු ඇත._',
                                        MessageType.text
                                    );
                                }
                                else if (error.message.includes('unlink')) {
                                    return await conn.sendMessage(
                                        conn.user.jid,
                                        '*⚕️ දෝෂ විසඳුම් [MIZUKI] ⚕️*' +
                                        '\n========== ```දෝෂය කියවන්න!``` ==========' +
                                        '\n\n*හේතුව* _එවැනි ගොනුවක් හෝ ඩිරෙක්ටරියක් නැත_' +
                                        '\n*හේතුව(පැහැදිලිව):* _ප්ලගිනය වැරදි ලෙස කෝඩ් කර ඇත._' +
                                        '\n*විසඳුම:* _කරුණාකර ප්ලගිනයේ කේත පරීක්ෂා කරන්න._',
                                        MessageType.text
                                    );
                                }
                                else if (error.message.includes('404')) {
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
                                else if (error.message.includes('reply.delete')) {
                                    return await conn.sendMessage(
                                        conn.user.jid,
                                        '*⚕️ දෝෂ විසඳුම් [MIZUKI] ⚕️*' +
                                        '\n========== ```දෝෂය කියවන්න!``` ==========' +
                                        '\n\n*හේතුව:* _Reply Delete Function_' +
                                        '\n*හේතුව(පැහැදිලිව):* _img හෝ wiki විධානයන් භාවිතා කිරීම._' +
                                        '\n*විසඳුම:* _මෙම දෝෂයට විසඳුමක් නොමැත. එය ලොකු දෝෂයක් නොවේ._',
                                        MessageType.text
                                    );
                                }
                                else if (error.message.includes('load.delete')) {
                                    return await conn.sendMessage(
                                        conn.user.jid,
                                        '*⚕️ දෝෂ විසඳුම් [MIZUKI] ⚕️*' +
                                        '\n========== ```දෝෂය කියවන්න!``` ==========' +
                                        '\n\n*හේතුව:* _Reply Delete Function_' +
                                        '\n*හේතුව(පැහැදිලිව):* _img හෝ wiki විධානයන් භාවිතා කිරීම._' +
                                        '\n*විසඳුම* _මෙම දෝෂයට විසඳුමක් නොමැත. එය ලොකු දෝෂයක් නොවේ.__',
                                        MessageType.text
                                    );
                                }
                                else if (error.message.includes('400')) {
                                    return await conn.sendMessage(
                                        conn.user.jid,
                                        '*⚕️ දෝෂ විසඳුම් [MIZUKI] ⚕️*' +
                                        '\n========== ```දෝෂය කියවන්න!``` ==========' +
                                        '\n\n*හේතුව:* _Bailyes Action Error_ ' +
                                        '\n*හේතුව(පැහැදිලිව)* _නිශ්චිත හේතුව නොදනී. විකල්ප කිහිපයක්ම මෙම දෝෂය ඇති කිරීමට හේතු වන්නට ඇත._' +
                                        '\n*විසඳුම:* _ඔබ එය තවත් වරක් භාවිතා කළහොත් එය නිවැරදි කළ හැකිය. දෝෂය පවතින්නේ නම්, ඔබට නැවත ආරම්භ කිරීම උත්සාහ කළ හැකිය._',
                                        MessageType.text
                                    );
                                }
                                else if (error.message.includes('decode')) {
                                    return await conn.sendMessage(
                                        conn.user.jid,
                                        '*⚕️ දෝෂ විසඳුම් [MIZUKI] ⚕️*' +
                                        '\n========== ```දෝෂය කියවන්න!``` ==========' +
                                        '\n\n*හේතුව:* _Cannot Decode Text or Media_' +
                                        '\n*හේතුව(පැහැදිලිව):* _ප්ලගිනය වැරදි ලෙස භාවිතා කිරීම._' +
                                        '\n*විසඳුම:* _ප්ලගිනය විස්තරයේ ලියා ඇති පරිදි කරුණාකර විධානයන් භාවිතා කරන්න._',
                                        MessageType.text
                                    );
                                }
                                else if (error.message.includes('unescaped')) {
                                    return await conn.sendMessage(
                                        conn.user.jid,
                                        '*⚕️ දෝෂ විසඳුම් [MIZUKI] ⚕️*' +
                                        '\n========== ```දෝෂය කියවන්න!``` ==========' +
                                        '\n\n*හේතුව:* _Word Character Usage_' +
                                        '\n*හේතුව(පැහැදිලිව):* _ඉංග්‍රීසි හෝ ලතින් හෝඩියෙන් පිටත TTP, ATTP වැනි විධානයන් භාවිතා කිරීම._' +
                                        '\n*විසඳුම:* _ඉංග්‍රීසි භාෂාව හෝ ලතින් භාෂාව භාවිත කරන්න.._',
                                        MessageType.text
                                    );
                                }
                                else if (error.message.includes('conversation')) {
                                    return await conn.sendMessage(
                                        conn.user.jid,
                                        '*⚕️ දෝෂ විසඳුම් [MIZUKI] ⚕️*' +
                                        '\n========== ```දෝෂය කියවන්න!``` ==========' +
                                        '\n\n*හේතුව:* _Deleting Plugin_' +
                                        '\n*හේතුව(පැහැදිලිව):* _ප්ල්ගීනයක් ඉවත් කිරීමේදී නම වැරදි ලෙස ඇතුළත් කිරීම._' +
                                        '\n*විසඳුම:* _ඔබට මැකීමට අවශ්‍ය ප්ලගිනයට _ * __ * _ එකතු නොකර කරුණාකර උත්සාහ කරන්න. ඔබ තවමත් දෝෂයක් ලබා ගන්නේ නම්, නම අවසානයේ ""? (.*) / $ "" වැනි සම්පූර්ණ ප්‍රකාශන පුරවන්න._',
                                        MessageType.text
                                    );
                                }
                                else {
                                    return await conn.sendMessage(
                                        conn.user.jid,
                                        '*🙇🏻 කණගාටුයි මට මෙම දෝෂය කියවීමට නොහැකි වුනා!! 🙇🏻*' +
                                        '\n_වැඩිදුර උදව් සඳහා ඔබට අපගේ Support group :- https://chat.whatsapp.com/HbURDOKU6Up29kmFXZUMEo එකට පැමිණිය හැකිය._',
                                        MessageType.text
                                    );
                                }
                            }


                                                        else {
                                await conn.sendMessage(conn.user.jid, '*-- ERROR REPORT [MIZUKI] --*' +
                                    '\n* An error has occurred!*'+
                                    '\n_This error log may include your number or the number of an opponent. Please be careful with it!_' +
                                    '\n_You can write to our Telegram group for help._' +
                                    '\n_Aslo you can join our support group:_ https://chat.whatsapp.com/HbURDOKU6Up29kmFXZUMEo' +
                                    '\n_This message should have gone to your number (saved messages)._\n\n' +
                                    '*Error:* ```' + error + '```\n\n'
                                    , MessageType.text, {detectLinks: false}
                                );
                                if (error.message.includes('URL')) {
                                    return await conn.sendMessage(conn.user.jid, '*⚕️ ERROR ANALYSIS [MIZUKI] ⚕️*' +
                                        '\n========== ```Error Resolved!``` ==========' +
                                        '\n\n*Main Error:* _Only Absolutely URLs Supported_' +
                                        '\n*Reason:* _The usage of media tools (xmedia, sticker..) in the LOG number._' +
                                        '\n*Solution:* _You can use commands in any chat, except the LOG number._'
                                        , MessageType.text
                                    );
                                }
                                else if (error.message.includes('conversation')) {
                                    return await conn.sendMessage(conn.user.jid, '*⚕️ ERROR ANALYSIS [MIZUKI] ⚕️*' +
                                        '\n========== ```Error Resolved!``` ==========' +
                                        '\n\n*Main Error:* _Deleting Plugin_' +
                                        '\n*Reason:* _Entering incorrectly the name of the plugin wanted to be deleted._' +
                                        '\n*Solution:* _Please try without adding_ *__* _to the plugin you want to delete. If you still get an error, try to add like_ ```?(.*) / $``` _to the end of the name._ '
                                        , MessageType.text
                                    );
                                }
                                else if (error.message.includes('split')) {
                                    return await conn.sendMessage(conn.user.jid, '*⚕️ ERROR ANALYSIS [MIZUKI] ⚕️*' +
                                        '\n========== ```Error Resolved!``` ==========' +
                                        '\n\n*Main Error:* _Split of Undefined_' +
                                        '\n*Reason:* _Commands that can be used by group admins occasionally dont see the split function._ ' +
                                        '\n*Solution:* _Restarting will be enough._'
                                        , MessageType.text
                                    );
                                }
                                else if (error.message.includes('SSL')) {
                                    return await conn.sendMessage(conn.user.jid, '*⚕️ ERROR ANALYSIS [MIZUKI] ⚕️*' +
                                        '\n========== ```Error Resolved!``` ==========' +
                                        '\n\n*Main Error:* _SQL Database Error_' +
                                        '\n*Reason:* _Database corruption._ ' +
                                        '\n*Solution:* _There is no known solution. You can try reinstalling it._'
                                        , MessageType.text
                                    );
                                }
                                else if (error.message.includes('Ookla')) {
                                    return await conn.sendMessage(conn.user.jid, '*⚕️ ERROR ANALYSIS [MIZUKI] ⚕️*' +
                                        '\n========== ```Error Resolved!``` ==========' +
                                        '\n\n*Main Error:* _Ookla Server Connection_' +
                                        '\n*Reason:* _Speedtest data cannot be transmitted to the server._' +
                                        '\n*Solution:* _If you use it one more time the problem will be solved._'
                                        , MessageType.text
                                    );
                                }
                                else if (error.message.includes('params')) {
                                    return await conn.sendMessage(conn.user.jid, '*⚕️ ERROR ANALYSIS [MIZUKI] ⚕️*' +
                                        '\n========== ```Error Resolved!``` ==========' +
                                        '\n\n*Main Error:* _Requested Audio Params_' +
                                        '\n*Reason:* _Using the TTS command outside the Latin alphabet._' +
                                        '\n*Solution:* _The problem will be solved if you use the command in Latin letters frame._'
                                        , MessageType.text
                                    );
                                }
                                else if (error.message.includes('unlink')) {
                                    return await conn.sendMessage(conn.user.jid, '*⚕️ ERROR ANALYSIS [MIZUKI] ⚕️*' +
                                        '\n========== ```Error Resolved``` ==========' +
                                        '\n\n*Main Error:* _No Such File or Directory_' +
                                        '\n*Reason:* _Incorrect coding of the plugin._' +
                                        '\n*Solution:* _Please check the your plugin codes._'
                                        , MessageType.text
                                    );
                                }
                                else if (error.message.includes('404')) {
                                    return await conn.sendMessage(conn.user.jid, '*⚕️ ERROR ANALYSIS [MIZUKI] ⚕️*' +
                                        '\n========== ```Error Resolved!``` ==========' +
                                        '\n\n*Main Error:* _Error 404 HTTPS_' +
                                        '\n*Reason:* _Failure to communicate with the server as a result of using the commands under the Heroku plugin._' +
                                        '\n*Solution:* _Wait a while and try again. If you still get the error, perform the transaction on the website.._'
                                        , MessageType.text
                                    );
                                }
                                else if (error.message.includes('reply.delete')) {
                                    return await conn.sendMessage(conn.user.jid, '*⚕️ ERROR ANALYSIS [MIZUKI] ⚕️*' +
                                        '\n========== ```Error Resolved!``` ==========' +
                                        '\n\n*Main Error:* _Reply Delete Function_' +
                                        '\n*Reason:* _Using IMG or Wiki commands._' +
                                        '\n*Solution:* _There is no solution for this error. It is not a fatal error._'
                                        , MessageType.text
                                    );
                                }
                                else if (error.message.includes('load.delete')) {
                                    return await conn.sendMessage(conn.user.jid, '*⚕️ ERROR ANALYSIS [MIZUKI] ⚕️*' +
                                        '\n========== ```Error Resolved!``` ==========' +
                                        '\n\n*Main Error:* _Reply Delete Function_' +
                                        '\n*Reason:* _Using IMG or Wiki commands._' +
                                        '\n*Solution:* _There is no solution for this error. It is not a fatal error._'
                                        , MessageType.text
                                    );
                                }
                                else if (error.message.includes('400')) {
                                    return await conn.sendMessage(conn.user.jid, '*⚕️ ERROR ANALYSIS [MIZUKI] ⚕️*' +
                                        '\n========== ```Error Resolved!``` ==========' +
                                        '\n\n*Main Error:* _Bailyes Action Error_ ' +
                                        '\n*Reason:* _The exact reason is unknown. More than one option may have triggered this error._' +
                                        '\n*Solution:* _If you use it again, it may improve. If the error continues, you can try to restart._'
                                        , MessageType.text
                                    );
                                }
                                else if (error.message.includes('decode')) {
                                    return await conn.sendMessage(conn.user.jid, '*⚕️ ERROR ANALYSIS [MIZUKI] ⚕️*' +
                                        '\n========== ```Error Resolved!``` ==========' +
                                        '\n\n*Main Error:* _Cannot Decode Text or Media_' +
                                        '\n*Reason:* _Incorrect use of the plug._' +
                                        '\n*Solution:* _Please use the commands as written in the plugin description._'
                                        , MessageType.text
                                    );
                                }
                                else if (error.message.includes('unescaped')) {
                                    return await conn.sendMessage(conn.user.jid, '*⚕️ ERROR ANALYSIS [MIZUKI] ⚕️*' +
                                        '\n========== ```Error Resolved!``` ==========' +
                                        '\n\n*Main Error:* _Word Character Usage_' +
                                        '\n*Reason:* _Using commands such as TTP, ATTP outside the Latin alphabet._' +
                                        '\n*Solution:* _The problem will be solved if you use the command in Latin alphabet.._'
                                        , MessageType.text
                                    );
                                }
                                else {
                                    return await conn.sendMessage(conn.user.jid, '*🙇🏻 Sorry, I Couldnt Read This Error! 🙇🏻*' +
                                        '\n_You can write to our Support group :- https://chat.whatsapp.com/HbURDOKU6Up29kmFXZUMEo for more help._'
                                        , MessageType.text
                                    );
                                }    
                            }                      
                        }
                    }
                }
            }
        
        );

    });

    // ==================== End Error Message ====================

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
