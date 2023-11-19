import winston from 'winston'
import 'winston-daily-rotate-file'

const logger = winston.createLogger({
    level: 'silly',
    transports: [
        new winston.transports.Console({
            level: 'info',
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.padLevels(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({
            level: 'silly',
            dirname: 'logs',
            filename: 'combined.log',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        new winston.transports.DailyRotateFile({
            level: 'silly',
            dirname: 'logs',
            filename: 'log-%DATE%.log',
            zippedArchive: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ]
})

export default logger