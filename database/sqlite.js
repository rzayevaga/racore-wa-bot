import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

class Database {
    constructor(config) {
        this.config = config;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.config.settings.databasePath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ SQLite verilənlər bazasına qoşuldu');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jid TEXT UNIQUE NOT NULL,
                name TEXT,
                is_premium BOOLEAN DEFAULT 0,
                is_blocked BOOLEAN DEFAULT 0,
                is_admin BOOLEAN DEFAULT 0,
                command_count INTEGER DEFAULT 0,
                last_active DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jid TEXT UNIQUE NOT NULL,
                name TEXT,
                is_active BOOLEAN DEFAULT 1,
                welcome_message TEXT,
                goodbye_message TEXT,
                antilink BOOLEAN DEFAULT 0,
                max_warnings INTEGER DEFAULT 3,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS commands_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_jid TEXT,
                command TEXT,
                args TEXT,
                success BOOLEAN,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_jid) REFERENCES users (jid)
            )`,

            `CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_jid TEXT,
                group_jid TEXT,
                reason TEXT,
                warned_by TEXT,
                warned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_jid) REFERENCES users (jid),
                FOREIGN KEY (group_jid) REFERENCES groups (jid)
            )`,

            `CREATE TABLE IF NOT EXISTS bot_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                total_commands INTEGER DEFAULT 0,
                total_users INTEGER DEFAULT 0,
                total_groups INTEGER DEFAULT 0,
                uptime_seconds INTEGER DEFAULT 0,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const table of tables) {
            await this.run(table);
        }

        // İlkin statistik məlumatları əlavə et
        await this.run(
            `INSERT OR IGNORE INTO bot_stats (id, total_commands, total_users, total_groups) 
             VALUES (1, 0, 0, 0)`
        );
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // User management
    async addUser(jid, name = '') {
        await this.run(
            `INSERT OR REPLACE INTO users (jid, name, last_active) 
             VALUES (?, ?, CURRENT_TIMESTAMP)`,
            [jid, name]
        );
    }

    async getUser(jid) {
        return await this.get('SELECT * FROM users WHERE jid = ?', [jid]);
    }

    async updateUserCommandCount(jid) {
        await this.run(
            'UPDATE users SET command_count = command_count + 1, last_active = CURRENT_TIMESTAMP WHERE jid = ?',
            [jid]
        );
    }

    // Group management
    async addGroup(jid, name = '') {
        await this.run(
            'INSERT OR REPLACE INTO groups (jid, name) VALUES (?, ?)',
            [jid, name]
        );
    }

    async getGroup(jid) {
        return await this.get('SELECT * FROM groups WHERE jid = ?', [jid]);
    }

    // Statistics
    async updateStats() {
        const userCount = await this.get('SELECT COUNT(*) as count FROM users');
        const groupCount = await this.get('SELECT COUNT(*) as count FROM groups');
        const commandCount = await this.get('SELECT SUM(command_count) as count FROM users');

        await this.run(
            `UPDATE bot_stats SET 
             total_users = ?, 
             total_groups = ?, 
             total_commands = ?,
             last_updated = CURRENT_TIMESTAMP`,
            [userCount.count, groupCount.count, commandCount.count || 0]
        );
    }

    async getStats() {
        return await this.get('SELECT * FROM bot_stats WHERE id = 1');
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

export default Database;
