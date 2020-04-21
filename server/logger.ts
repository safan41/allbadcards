import * as winston from "winston";
import {Config} from "../config/config";

require('log-timestamp');

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.json(),
	defaultMeta: {service: 'user-service'},
	transports: [
		//
		// - Write all logs with level `error` and below to `error.log`
		// - Write all logs with level `info` and below to `combined.log`
		//
		new winston.transports.File({
			filename: 'error.log', level: 'error',
			format: winston.format.combine(
				winston.format.timestamp({
					format: 'YYYY-MM-DD hh:mm:ss A ZZ'
				}),
				winston.format.json()
			)
		}),
		new winston.transports.File({
			filename: 'combined.log',
			format: winston.format.combine(
				winston.format.timestamp({
					format: 'YYYY-MM-DD hh:mm:ss A ZZ'
				}),
				winston.format.json()
			)
		})
	]
});

if (Config.Environment !== "prod")
{
	logger.add(new winston.transports.Console({
		format: winston.format.simple()
	}));
}

export const logMessage = (...input: any[]) =>
{
	logger.info(input);
};

export const logWarning = (...input: any[]) =>
{
	logger.warn(input);
};

export const logError = (...input: any[]) =>
{
	logger.error(input);
};