import { DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import moment from 'moment-timezone';
import chalk from 'chalk';

class EventHandler {
    constructor(bot) {
        this.bot = bot;
        this.config = bot.config;
        this.logger = bot.logger;
        this.db = bot.db;
    }

    async handleConnectionUpdate(update, state, saveCreds) {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            this.handleQRCode(qr);
        }

        if (connection === 'close') {
            await this.handleConnectionClose(lastDisconnect);
        } else if (connection === 'open') {
            await this.handleConnectionOpen();
        }
    }

    handleQRCode(qr) {
        console.clear();
        this.logger.info('🔐 Yeni QR Kodu yaradıldı - 40 saniyə ərzində skan edin');
        this.logger.info('📱 WhatsApp > Əlavələr > Cihazları əlaqələndir');
        
        qrcode.generate(qr, { small: true });

        // QR timeout
        if (this.bot.qrInterval) {
            clearTimeout(this.bot.qrInterval);
        }

        this.bot.qrInterval = setTimeout(() => {
            this.logger.warn('🔄 QR Kodun müddəti bitdi, yeni kod yaradılır...');
            this.bot.startBot();
        }, this.config.settings.qrTimeout * 1000);
    }

    async handleConnectionClose(lastDisconnect) {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        
        this.logger.warn(`🔌 Əlaqə kəsildi: ${statusCode}`);

        switch (statusCode) {
            case DisconnectReason.connectionClosed:
            case DisconnectReason.connectionLost:
                this.logger.info('🔄 Yenidən qoşulur...');
                setTimeout(() => this.bot.startBot(), 3000);
                break;
                
            case DisconnectReason.loggedOut:
                this.logger.error('❌ Çıxış edildi, yenidən QR skan edin.');
                // Session fayllarını sil
                const fs = await import('fs');
                fs.rmSync(this.config.settings.sessionPath, { recursive: true, force: true });
                this.bot.startBot();
                break;
                
            case DisconnectReason.restartRequired:
                this.logger.info('🔄 Yenidən başlatma tələb olunur...');
                this.bot.startBot();
                break;
                
            default:
                this.logger.error('❌ Naməlum səbəb:', lastDisconnect.error);
                this.bot.handleRestart();
                break;
        }
    }

    async handleConnectionOpen() {
        console.clear();
        this.bot.isConnected = true;
        this.bot.retryCount = 0;

        this.logger.info('✅ WhatsApp-a uğurla qoşuldu!');
        this.logger.info('🤖 RACORE Bot indi ONLAYN');
        this.logger.info(`👑 Yaradan: ${this.config.ownerName}`);
        this.logger.info(`🧩 Team: ${this.config.author}`);
        this.logger.info(`⏰ Başlanğıc: ${this.bot.startTime.format('HH:mm:ss')}`);

        // Alive mesajı göndər
        await this.sendStartupMessage();
    }

    async sendStartupMessage() {
        if (this.config.ownerNumber) {
            const ownerJid = this.config.ownerNumber.includes('@') 
                ? this.config.ownerNumber 
                : `${this.config.ownerNumber}@s.whatsapp.net`;

            const startupMessage = `
🚀 *RACORE Bot Aktivləşdi!*

✅ *Status:* Sistem aktiv
⏰ *Vaxt:* ${moment().format('YYYY-MM-DD HH:mm:ss')}
🤖 *Bot Adı:* ${this.config.botName}
👤 *Sahib:* ${this.config.ownerName}
🔧 *Versiya:* 3.0.0 Premium
📡 *Platforma:* Termux

💎 *Xüsusiyyətlər:*
├─ ✅ Avtomatik oxu
├─ ✅ Anti-spam
├─ ✅ Backup sistemi
├─ ✅ Premium əmrlər
└─ ✅ Real-time monitoring

🎯 *Bot uğurla başladıldı və hazırdır!*
            `.trim();

            await this.bot.sendMessage(ownerJid, startupMessage);
        }
    }

    async handleMessagesUpsert(m) {
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
            const isOwner = sender === (this.config.ownerNumber.includes('@') 
                ? this.config.ownerNumber 
                : `${this.config.ownerNumber}@s.whatsapp.net`);

            // Auto-read
            if (this.config.features.isAutoRead) {
                await this.bot.conn.readMessages([msg.key]);
            }

            // Əmr emalı
            if (body.startsWith(this.config.prefix)) {
                const args = body.slice(this.config.prefix.length).trim().split(/ +/);
                const command = args.shift().toLowerCase();
                const text = args.join(' ');

                const context = {
                    from,
                    sender,
                    command,
                    args,
                    body: text,
                    isGroup,
                    isOwner,
                    msg,
                    reply: (text, options = {}) => 
                        this.bot.sendMessage(from, text, { ...options, quoted: msg })
                };

                await this.bot.commands.handleCommand(context);
            }

        } catch (error) {
            this.logger.error('Mesaj emalı xətası:', error);
        }
    }

    async handleGroupParticipantsUpdate(update) {
        try {
            const { id, participants, action } = update;
            
            // Qrup məlumatlarını yenilə
            const groupMetadata = await this.bot.conn.groupMetadata(id);
            await this.db.addGroup(id, groupMetadata.subject);

            // Welcome/Goodbye mesajları
            for (const participant of participants) {
                await this.db.addUser(participant);

                if (action === 'add') {
                    await this.handleWelcomeMessage(id, participant, groupMetadata);
                } else if (action === 'remove') {
                    await this.handleGoodbyeMessage(id, participant, groupMetadata);
                }
            }

        } catch (error) {
            this.logger.error('Qrup yeniləmə xətası:', error);
        }
    }

    async handleWelcomeMessage(groupJid, userJid, groupMetadata) {
        try {
            const group = await this.db.getGroup(groupJid);
            if (group && group.welcome_message) {
                const welcomeMsg = group.welcome_message
                    .replace('{user}', `@${userJid.split('@')[0]}`)
                    .replace('{group}', groupMetadata.subject);
                
                await this.bot.sendMessage(groupJid, welcomeMsg, {
                    mentions: [userJid]
                });
            }
        } catch (error) {
            this.logger.error('Welcome mesajı xətası:', error);
        }
    }

    async handleGoodbyeMessage(groupJid, userJid, groupMetadata) {
        try {
            const group = await this.db.getGroup(groupJid);
            if (group && group.goodbye_message) {
                const goodbyeMsg = group.goodbye_message
                    .replace('{user}', `@${userJid.split('@')[0]}`)
                    .replace('{group}', groupMetadata.subject);
                
                await this.bot.sendMessage(groupJid, goodbyeMsg, {
                    mentions: [userJid]
                });
            }
        } catch (error) {
            this.logger.error('Goodbye mesajı xətası:', error);
        }
    }

    async handleMessageReceiptUpdate(update) {
        // Mesaj çatdırılma statuslarını idarə et
        // Bu hissə inkişaf etdirilə bilər
    }

    getMessageContent(msg) {
        try {
            if (msg.message.conversation) return msg.message.conversation;
            if (msg.message.extendedTextMessage?.text) return msg.message.extendedTextMessage.text;
            if (msg.message.imageMessage?.caption) return msg.message.imageMessage.caption;
            if (msg.message.videoMessage?.caption) return msg.message.videoMessage.caption;
            return null;
        } catch {
            return null;
        }
    }
}

export default EventHandler;
