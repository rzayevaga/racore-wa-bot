import { Boom } from '@hapi/boom';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import moment from 'moment-timezone';
import Pino from 'pino';

// Utils import
import Logger from './utils/logger.js';
import Database from './database/sqlite.js';
import CommandHandler from './handlers/commands.js';
import MenuHandler from './handlers/menus.js';
import EventHandler from './handlers/events.js';

class RACOREBot {
    constructor() {
        this.config = this.loadConfig();
        this.logger = new Logger(this.config);
        this.db = new Database(this.config);
        this.commands = new CommandHandler(this);
        this.menus = new MenuHandler(this);
        this.events = new EventHandler(this);
        
        this.conn = null;
        this.isConnected = false;
        this.startTime = moment();
        this.qrInterval = null;
        this.retryCount = 0;
        
        this.init();
    }

    loadConfig() {
        try {
            const configPath = './config.json';
            if (!fs.existsSync(configPath)) {
                this.createDefaultConfig();
            }
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (error) {
            console.error('Config yüklənərkən xəta:', error);
            process.exit(1);
        }
    }

    createDefaultConfig() {
        const defaultConfig = {
            sessionName: "racore-premium-session",
            ownerNumber: "994XXXXXXXXX",
            ownerName: "Rzayeff Ağa",
            botName: "RACORE",
            author: "Team rzayeffdi",
            prefix: ".",
            language: "az",
            timezone: "Asia/Baku",
            features: {
                isAutoRead: true,
                isAutoRecord: false,
                isCallBlock: true,
                isSelf: false,
                isPreview: true,
                isSaveSession: true,
                isAntiSpam: true,
                isBackup: true,
                isBroadcast: true
            },
            settings: {
                maxUploadSize: 100,
                qrTimeout: 40,
                maxRetry: 5,
                sessionPath: "./sessions",
                databasePath: "./database/racore.db",
                logPath: "./logs",
                backupPath: "./backups"
            },
            apiKeys: {
                openWeather: "your_api_key",
                tinyUrl: "your_api_key"
            },
            premium: {
                isPremium: true,
                premiumUsers: ["994XXXXXXXXX@s.whatsapp.net"],
                maxCommands: 1000
            },
            menus: {
                mainMenu: true,
                groupMenu: true,
                ownerMenu: true,
                funMenu: true,
                toolMenu: true,
                mediaMenu: true
            }
        };

        fs.writeFileSync('./config.json', JSON.stringify(defaultConfig, null, 2));
        console.log('✅ Default config.json faylı yaradıldı');
    }

    async init() {
        this.showBanner();
        await this.createDirectories();
        await this.db.init();
        await this.startBot();
    }

    showBanner() {
        console.clear();
        console.log(chalk.cyan(`
    ╔══════════════════════════════════════════════╗
    ║              🤖 RACORE BOT v3.0              ║
    ║              🧩 Team rzayeffdi               ║
    ║              👑 Rzayeff Ağa                 ║
    ║           📱 Premium WhatsApp Bot           ║
    ║                                              ║
    ║      🔒 Secure | 🚀 Fast | ⚡ Powerful       ║
    ╚══════════════════════════════════════════════╝
        `));
        
        console.log(chalk.yellow(`⏰ Başlanğıc vaxtı: ${this.startTime.format('YYYY-MM-DD HH:mm:ss')}`));
        console.log(chalk.green(`🌍 Timezone: ${this.config.timezone}`));
        console.log(chalk.blue(`🔧 Prefix: ${this.config.prefix}\n`));
    }

    async createDirectories() {
        const dirs = [
            './sessions',
            './logs',
            './database',
            './backups',
            './assets',
            './assets/menus',
            './handlers',
            './utils'
        ];

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }

    async startBot() {
        const spinner = ora('🤖 RACORE Bot başladılır...').start();

        try {
            const { state, saveCreds } = await useMultiFileAuthState(this.config.settings.sessionPath);
            const { version } = await fetchLatestBaileysVersion();

            spinner.text = '📱 WhatsApp API bağlantısı qurulur...';

            this.conn = makeWASocket({
                version,
                logger: Pino({ level: 'silent' }),
                printQRInTerminal: false,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: 'error' })),
                },
                generateHighQualityLinkPreview: true,
                markOnlineOnConnect: true,
                getMessage: async (key) => {
                    return {
                        conversation: 'RACORE Bot'
                    };
                }
            });

            this.setupEventHandlers(state, saveCreds);
            spinner.succeed('✅ Bot uğurla başladıldı!');

        } catch (error) {
            spinner.fail('❌ Bot başlatma xətası');
            this.logger.error('Bot başlatma xətası:', error);
            await this.handleRestart();
        }
    }

    setupEventHandlers(state, saveCreds) {
        // QR Code Handler
        this.conn.ev.on('connection.update', async (update) => {
            await this.events.handleConnectionUpdate(update, state, saveCreds);
        });

        // Credentials Update
        this.conn.ev.on('creds.update', saveCreds);

        // Messages Handler
        this.conn.ev.on('messages.upsert', async (m) => {
            await this.events.handleMessagesUpsert(m);
        });

        // Group Participants Update
        this.conn.ev.on('group-participants.update', async (update) => {
            await this.events.handleGroupParticipantsUpdate(update);
        });

        // Message Receipts
        this.conn.ev.on('message-receipt.update', async (update) => {
            await this.events.handleMessageReceiptUpdate(update);
        });
    }

    async sendMessage(jid, content, options = {}) {
        try {
            if (typeof content === 'string') {
                await this.conn.sendMessage(jid, { text: content, ...options });
            } else {
                await this.conn.sendMessage(jid, content, options);
            }
            return true;
        } catch (error) {
            this.logger.error('Mesaj göndərmə xətası:', error);
            return false;
        }
    }

    async handleRestart() {
        this.retryCount++;
        
        if (this.retryCount > this.config.settings.maxRetry) {
            this.logger.error('Maksimum yenidən cəhd sayına çatıldı');
            process.exit(1);
        }

        this.logger.warn(`Yenidən cəhd edilir... (${this.retryCount}/${this.config.settings.maxRetry})`);
        setTimeout(() => this.startBot(), 5000);
    }

    getUptime() {
        const duration = moment.duration(moment().diff(this.startTime));
        return {
            days: duration.days(),
            hours: duration.hours(),
            minutes: duration.minutes(),
            seconds: duration.seconds(),
            formatted: `${duration.days()}g ${duration.hours()}s ${duration.minutes()}d ${duration.seconds()}sn`
        };
    }

    async shutdown() {
        this.logger.info('Bot söndürülür...');
        if (this.conn) {
            await this.conn.end();
        }
        process.exit(0);
    }
}

// Əsas proqram
const bot = new RACOREBot();

// Process Signal Handlers
process.on('SIGINT', async () => {
    await bot.shutdown();
});

process.on('SIGTERM', async () => {
    await bot.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    bot.logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    bot.logger.error('Uncaught Exception:', error);
    process.exit(1);
});

export default RACOREBot;
