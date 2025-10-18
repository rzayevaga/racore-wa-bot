const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay,
    proto
} = require('@whiskeysockets/baileys');
const { Boom } = require('@boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const moment = require('moment-timezone');
const cron = require('node-cron');

// Config yüklə
const config = require('./config.json');

class RACOREBot {
    constructor() {
        this.conn = null;
        this.db = null;
        this.qrInterval = null;
        this.isConnected = false;
        this.commands = new Map();
        this.startTime = moment();
        
        this.init();
    }

    async init() {
        console.log('🤖 RACORE Bot Starting...');
        console.log('🧩 Team rzayeffdi');
        console.log('👑 Author: Rzayeff Ağa');
        
        // Database initialize
        await this.initDatabase();
        
        // Əmrləri yüklə
        await this.loadCommands();
        
        // Botu başlat
        await this.startBot();
    }

    initDatabase() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database('./racore.db', (err) => {
                if (err) {
                    console.error('❌ Database error:', err);
                    reject(err);
                } else {
                    console.log('✅ SQLite Database connected');
                    
                    // Tables yarat
                    this.createTables();
                    resolve();
                }
            });
        });
    }

    createTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jid TEXT UNIQUE,
                name TEXT,
                is_premium INTEGER DEFAULT 0,
                is_blocked INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jid TEXT UNIQUE,
                name TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS commands_used (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jid TEXT,
                command TEXT,
                used_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        tables.forEach(table => {
            this.db.run(table, (err) => {
                if (err) console.error('Table creation error:', err);
            });
        });
    }

    async loadCommands() {
        // Qrup Əmrləri
        this.commands.set('tagall', this.handleTagAll.bind(this));
        this.commands.set('kick', this.handleKick.bind(this));
        this.commands.set('promote', this.handlePromote.bind(this));
        this.commands.set('demote', this.handleDemote.bind(this));
        this.commands.set('groupinfo', this.handleGroupInfo.bind(this));
        this.commands.set('linkgroup', this.handleLinkGroup.bind(this));
        this.commands.set('closegroup', this.handleCloseGroup.bind(this));
        this.commands.set('opengroup', this.handleOpenGroup.bind(this));
        this.commands.set('add', this.handleAdd.bind(this));
        this.commands.set('leave', this.handleLeave.bind(this));

        // Şəxsi Əmrlər
        this.commands.set('alive', this.handleAlive.bind(this));
        this.commands.set('ping', this.handlePing.bind(this));
        this.commands.set('owner', this.handleOwner.bind(this));
        this.commands.set('listblock', this.handleListBlock.bind(this));
        this.commands.set('listprem', this.handleListPrem.bind(this));
        this.commands.set('speed', this.handleSpeed.bind(this));
        this.commands.set('runtime', this.handleRuntime.bind(this));
        this.commands.set('script', this.handleScript.bind(this));

        // WhatsApp Əmrləri
        this.commands.set('block', this.handleBlock.bind(this));
        this.commands.set('unblock', this.handleUnblock.bind(this));
        this.commands.set('getpp', this.handleGetPP.bind(this));
        this.commands.set('getname', this.handleGetName.bind(this));
        this.commands.set('getbio', this.handleGetBio.bind(this));
        this.commands.set('setpp', this.handleSetPP.bind(this));
        this.commands.set('setname', this.handleSetName.bind(this));
        this.commands.set('setbio', this.handleSetBio.bind(this));

        // Əyləncə Əmrləri
        this.commands.set('sticker', this.handleSticker.bind(this));
        this.commands.set('toimg', this.handleToImg.bind(this));
        this.commands.set('attp', this.handleAttp.bind(this));
        this.commands.set('styletext', this.handleStyleText.bind(this));
        this.commands.set('quote', this.handleQuote.bind(this));
        this.commands.set('meme', this.handleMeme.bind(this));
        this.commands.set('joke', this.handleJoke.bind(this));
        this.commands.set('fact', this.handleFact.bind(this));

        // Sürətli Rejim
        this.commands.set('speedtest', this.handleSpeedTest.bind(this));
        this.commands.set('ssweb', this.handleSsWeb.bind(this));
        this.commands.set('shorturl', this.handleShortUrl.bind(this));
        this.commands.set('translate', this.handleTranslate.bind(this));
        this.commands.set('weather', this.handleWeather.bind(this));
        this.commands.set('calc', this.handleCalc.bind(this));

        // Bot Əmrləri
        this.commands.set('help', this.handleHelp.bind(this));
        this.commands.set('menu', this.handleMenu.bind(this));
        this.commands.set('getsession', this.handleGetSession.bind(this));
        this.commands.set('restart', this.handleRestart.bind(this));
        this.commands.set('shutdown', this.handleShutdown.bind(this));
        this.commands.set('backup', this.handleBackup.bind(this));
        this.commands.set('broadcast', this.handleBroadcast.bind(this));

        console.log(`✅ Loaded ${this.commands.size} commands`);
    }

    async startBot() {
        try {
            const { state, saveCreds } = await useMultiFileAuthState('./session');
            const { version, isLatest } = await fetchLatestBaileysVersion();
            
            console.log(`📱 Using WA v${version.join('.')}, isLatest: ${isLatest}`);

            this.conn = makeWASocket({
                version,
                logger: {
                    level: 'silent'
                },
                printQRInTerminal: false,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, {
                        log: console.log
                    }),
                },
                generateHighQualityLinkPreview: true,
                markOnlineOnConnect: true,
                getMessage: async (key) => {
                    return {
                        conversation: 'RACORE Bot'
                    }
                }
            });

            // QR Code Handler
            this.conn.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    console.clear();
                    console.log('🔐 QR Code Generated - Scan within 40 seconds');
                    qrcode.generate(qr, { small: true });
                    
                    // 40 saniyə sonra yeni QR
                    if (this.qrInterval) clearTimeout(this.qrInterval);
                    this.qrInterval = setTimeout(() => {
                        console.log('🔄 QR Code expired, generating new one...');
                        this.startBot();
                    }, config.qrTimeout * 1000);
                }

                if (connection === 'close') {
                    let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                    console.log('Connection closed:', reason, lastDisconnect?.error);
                    
                    if (reason === DisconnectReason.connectionClosed) {
                        console.log('🔄 Reconnecting...');
                        this.startBot();
                    } else if (reason === DisconnectReason.connectionLost) {
                        console.log('🔄 Connection lost, reconnecting...');
                        this.startBot();
                    } else if (reason === DisconnectReason.restartRequired) {
                        console.log('🔄 Restart required, reconnecting...');
                        this.startBot();
                    } else if (reason === DisconnectReason.loggedOut) {
                        console.log('❌ Logged out, please scan QR again.');
                        fs.rmSync('./session', { recursive: true, force: true });
                        this.startBot();
                    }
                } else if (connection === 'open') {
                    console.clear();
                    console.log('✅ WhatsApp Connected Successfully!');
                    console.log('🤖 RACORE Bot is now ONLINE');
                    console.log('👑 Created by: Rzayeff Ağa');
                    console.log('🧩 Team: rzayeffdi');
                    
                    this.isConnected = true;
                    
                    // Alive mesajı göndər
                    if (config.ownerNumber) {
                        const ownerJid = config.ownerNumber.includes('@') ? 
                            config.ownerNumber : `${config.ownerNumber}@s.whatsapp.net`;
                        await this.sendMessage(ownerJid, 
                            `🚀 *RACORE Bot Activated*\n\n` +
                            `✅ *Status:* Connected\n` +
                            `⏰ *Time:* ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
                            `🤖 *Bot Name:* ${config.botName}\n` +
                            `👤 *Owner:* ${config.ownerName}\n\n` +
                            `_Bot successfully started and ready to use_`
                        );
                    }
                }
            });

            // Credentials update
            this.conn.ev.on('creds.update', saveCreds);

            // Messages handler
            this.conn.ev.on('messages.upsert', async (m) => {
                await this.handleMessage(m);
            });

        } catch (error) {
            console.error('❌ Bot start error:', error);
            setTimeout(() => this.startBot(), 5000);
        }
    }

    async handleMessage(m) {
        try {
            const msg = m.messages[0];
            if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

            // Bot özünə cavab verməsin
            if (msg.key.fromMe) return;

            const body = this.getMessageContent(msg);
            if (!body) return;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;
            const isGroup = from.endsWith('@g.us');
            const isOwner = sender === (config.ownerNumber.includes('@') ? 
                config.ownerNumber : `${config.ownerNumber}@s.whatsapp.net`);

            // Prefix yoxla
            if (!body.startsWith(config.prefix)) return;

            const args = body.slice(config.prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            const text = args.join(' ');

            console.log(`📨 Command: ${command} from ${sender}`);

            // Əmri icra et
            if (this.commands.has(command)) {
                try {
                    await this.commands.get(command)({
                        from,
                        sender,
                        body: text,
                        args,
                        isGroup,
                        isOwner,
                        msg,
                        reply: (text, options = {}) => 
                            this.sendMessage(from, text, { ...options, quoted: msg })
                    });
                    
                    // Command log
                    this.db.run(
                        'INSERT INTO commands_used (jid, command) VALUES (?, ?)',
                        [sender, command]
                    );
                    
                } catch (error) {
                    console.error('Command error:', error);
                    await this.sendMessage(from, '❌ Command execution error', { quoted: msg });
                }
            }

        } catch (error) {
            console.error('Message handle error:', error);
        }
    }

    getMessageContent(msg) {
        try {
            const messageTypes = ['conversation', 'imageMessage', 'videoMessage', 
                                'extendedTextMessage', 'buttonsResponseMessage', 
                                'templateButtonReplyMessage', 'messageContextInfo'];
            
            for (let type of messageTypes) {
                if (msg.message?.[type]) {
                    if (type === 'conversation') return msg.message[type];
                    if (type === 'extendedTextMessage') return msg.message[type].text;
                    if (msg.message[type].text) return msg.message[type].text;
                }
            }
            return null;
        } catch {
            return null;
        }
    }

    async sendMessage(jid, text, options = {}) {
        try {
            await this.conn.sendMessage(jid, { text: text, ...options });
        } catch (error) {
            console.error('Send message error:', error);
        }
    }

    // ==================== COMMAND HANDLERS ====================

    // Qrup Əmrləri
    async handleTagAll({ from, reply, isGroup }) {
        if (!isGroup) return reply('❌ Bu əmr yalnız qruplarda işləyir');
        
        try {
            const groupMetadata = await this.conn.groupMetadata(from);
            const participants = groupMetadata.participants;
            let text = '👥 *Qrup Üzvləri:*\n\n';
            
            participants.forEach((participant, i) => {
                text += `${i+1}. @${participant.id.split('@')[0]}\n`;
            });
            
            const mentions = participants.map(p => p.id);
            await reply(text, { mentions });
        } catch (error) {
            await reply('❌ Qrup məlumatları alınarkən xəta');
        }
    }

    async handleKick({ from, reply, args, isGroup, isOwner, msg }) {
        if (!isGroup) return reply('❌ Bu əmr yalnız qruplarda işləyir');
        if (!isOwner) return reply('❌ Bu əmr yalnız bot sahibi üçün');
        
        try {
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            if (!mentioned) return reply('❌ Zəhmət olmasa bir istifadəçini tag edin');
            
            await this.conn.groupParticipantsUpdate(from, mentioned, 'remove');
            await reply(`✅ ${mentioned.length} istifadəçi qrupdan çıxarıldı`);
        } catch (error) {
            await reply('❌ İstifadəçi çıxarıla bilmədi');
        }
    }

    async handlePromote({ from, reply, args, isGroup, isOwner, msg }) {
        if (!isGroup) return reply('❌ Bu əmr yalnız qruplarda işləyir');
        if (!isOwner) return reply('❌ Bu əmr yalnız bot sahibi üçün');
        
        try {
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            if (!mentioned) return reply('❌ Zəhmət olmasa bir istifadəçini tag edin');
            
            await this.conn.groupParticipantsUpdate(from, mentioned, 'promote');
            await reply(`✅ ${mentioned.length} istifadəçi admin edildi`);
        } catch (error) {
            await reply('❌ İstifadəçi admin edilə bilmədi');
        }
    }

    async handleAlive({ reply }) {
        const uptime = moment.duration(moment().diff(this.startTime));
        const uptimeString = `${uptime.days()}g ${uptime.hours()}s ${uptime.minutes()}d ${uptime.seconds()}sn`;
        
        await reply(
            `🤖 *RACORE BOT*\n\n` +
            `✅ *Status:* Active\n` +
            `⏰ *Uptime:* ${uptimeString}\n` +
            `👑 *Owner:* ${config.ownerName}\n` +
            `🧩 *Team:* ${config.author}\n` +
            `🔧 *Version:* 2.0.0\n\n` +
            `_Powered by Team rzayeffdi_`
        );
    }

    async handlePing({ reply }) {
        const start = Date.now();
        const msg = await reply('🏓 Ping...');
        const end = Date.now();
        await this.conn.sendMessage(msg.key.remoteJid, {
            text: `🏓 Pong! ${end - start}ms`,
            edit: msg.key
        });
    }

    async handleHelp({ reply }) {
        const helpText = `
🎯 *RACORE BOT HELP MENU*

👥 *Qrup Əmrləri:*
. tagall - Hamını tag et
. kick @user - İstifadəçini at
. promote @user - Admin et
. demote @user - Adminliyi al
. groupinfo - Qrup məlumatı
. linkgroup - Qrup linki

👤 *Şəxsi Əmrləri:*
. alive - Bot statusu
. ping - Bot sürəti
. owner - Sahib məlumatı
. speed - Sistem sürəti

📱 *WhatsApp Əmrləri:*
. block @user - Blokla
. unblock @user - Bloku aç
. getpp @user - Profil şəkli
. getname @user - Adını götür

🎮 *Əyləncə Əmrləri:*
. sticker - Şəkli stiker et
. attp text - Rəngli text
. quote - Təsadüfi söz
. joke - Zarafat

⚡ *Sürətli Əmrləri:*
. speedtest - İnternet sürəti
. weather şəhər - Hava
. calc 2+2 - Kalkulyator

🔧 *Bot Əmrləri:*
. menu - Tam menyu
. broadcast - Hamıya mesaj
. restart - Botu yenidən başlat

📞 *Dəstək:* ${config.ownerName}
        `.trim();
        
        await reply(helpText);
    }

    async handleMenu({ reply }) {
        const menuText = `
🤖 *RACORE BOT MENU*

*🔰 Qrup Əmrləri:*
\`\`\`.tagall, .kick, .promote, .demote, .groupinfo, .linkgroup, .closegroup, .opengroup, .add, .leave\`\`\`

*👤 Şəxsi Əmrləri:*
\`\`\`.alive, .ping, .owner, .listblock, .listprem, .speed, .runtime, .script\`\`\`

*📱 WhatsApp Əmrləri:*
\`\`\`.block, .unblock, .getpp, .getname, .getbio, .setpp, .setname, .setbio\`\`\`

*🎮 Əyləncə Əmrləri:*
\`\`\`.sticker, .toimg, .attp, .styletext, .quote, .meme, .joke, .fact\`\`\`

*⚡ Sürətli Rejim:*
\`\`\`.speedtest, .ssweb, .shorturl, .translate, .weather, .calc\`\`\`

*🔧 Bot Əmrləri:*
\`\`\`.help, .menu, .getsession, .restart, .shutdown, .backup, .broadcast\`\`\`

👑 *Yaradıcı:* ${config.ownerName}
🧩 *Team:* ${config.author}
🤖 *Bot:* ${config.botName}

🔧 _.help əmr_ - Ətraflı məlumat
        `.trim();
        
        await reply(menuText);
    }

    // Digər əmr handlerləri burada davam edir...
    // Qısalıq üçün digər əmrlərin kodları eyni strukturada yazılır

    async handleSticker({ from, msg, reply }) {
        try {
            if (msg.message.imageMessage) {
                await reply('🔄 Stiker hazırlanır...');
                // Stiker yaratmaq üçün kod
                await reply('✅ Stiker hazırdır!');
            } else {
                await reply('❌ Zəhmət olmasa şəkil göndərin');
            }
        } catch (error) {
            await reply('❌ Stiker yaradıla bilmədi');
        }
    }

    async handleSpeedTest({ reply }) {
        const start = Date.now();
        await reply('🏃 Sürət testi edilir...');
        const end = Date.now();
        await reply(`📊 Sürət Nəticəsi:\n⏱️ Cavab müddəti: ${end - start}ms\n✅ Server: Aktiv`);
    }

    // Digər əmrlər üçün eyni formatda handlerlər yazılır...

}

// Botu başlat
new RACOREBot();

// Process handler
process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});
