import winston from 'winston';
import chalk from 'chalk';
import moment from 'moment-timezone';
import fs from 'fs';

class Logger {
    constructor(config) {
        this.config = config;
        this.setupLogger();
    }

    setupLogger() {
        const logFormat = winston.format.printf(({ level, message, timestamp }) => {
            return `${timestamp} [${level}]: ${message}`;
        });

        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({
                    format: () => moment().tz(this.config.timezone).format('YYYY-MM-DD HH:mm:ss')
                }),
                logFormat
            ),
            transports: [
                new winston.transports.File({ 
                    filename: `${this.config.settings.logPath}/error.log`, 
                    level: 'error' 
                }),
                new winston.transports.File({ 
                    filename: `${this.config.settings.logPath}/combined.log` 
                }),
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });
    }

    info(message, meta = {}) {
        this.logger.info(message, meta);
        this.consoleLog('INFO', message, chalk.blue);
    }

    error(message, error = null) {
        this.logger.error(message, { error: error?.stack || error });
        this.consoleLog('ERROR', message, chalk.red);
        if (error) {
            console.error(chalk.red('Xəta detalları:'), error);
        }
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
        this.consoleLog('WARN', message, chalk.yellow);
    }

    debug(message, meta = {}) {
        this.logger.debug(message, meta);
        this.consoleLog('DEBUG', message, chalk.gray);
    }

    consoleLog(level, message, color) {
        const timestamp = moment().tz(this.config.timezone).format('HH:mm:ss');
        console.log(`${chalk.gray(timestamp)} ${color(`[${level}]`)} ${message}`);
    }
}

export default Logger;
