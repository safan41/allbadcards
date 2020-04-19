import * as winston from "winston";
import {Config} from "./config/config";

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.json(),
	defaultMeta: { service: 'user-service' },
	transports: [
		//
		// - Write all logs with level `error` and below to `error.log`
		// - Write all logs with level `info` and below to `combined.log`
		//
		new winston.transports.File({ filename: 'error.log', level: 'error' }),
		new winston.transports.File({ filename: 'combined.log' })
	]
});

if (Config.Environment !== "prod") {
	logger.add(new winston.transports.Console({
		format: winston.format.simple()
	}));
}

export const logMessage = (...input: any[]) =>
{
	const message = input.map(i => JSON.stringify(i)).join(",");
	logger.log('info', message);
};

export const logWarning = (...input: any[]) =>
{
	const message = input.map(i => JSON.stringify(i)).join(",");
	logger.warn('warning', message);
};

export const logError = (...input: any[]) =>
{
	logger.error(input);
};