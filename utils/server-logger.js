const winston = require("winston");
const DailyRotateFile = require('winston-daily-rotate-file');


const transport = new DailyRotateFile(
    { 
        frequency : `1d`,
        filename: 'logs/rest-server-logs-%DATE%.log', 
        datePattern: 'YYYY - MM - DD - HH', 
        zippedArchive: true, 
        maxSize: '20m', 
        maxFiles: '31d',
        level : 'warn'
    }
);

const logger = winston.createLogger({
    level: "debug",
    transports: [
        transport,
        new winston.transports.Console({
        level: 'info'
    })],
    format: winston.format.combine(
        winston.format.timestamp({ format: 'MMM-DD-YYYY HH:mm:ss' }),
        winston.format.align(),
        winston.format.printf(info => `${info.level}: ${[info.timestamp]}: ${info.message}`),
    )
});

module.exports = logger;