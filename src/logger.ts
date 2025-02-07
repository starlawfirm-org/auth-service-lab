import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.simple()
  ),
  transports: [
    new transports.Console(),
    // new transports.File({ filename: 'logs/app.log' })
  ]
});

export default logger; 