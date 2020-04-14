import * as winston from "winston";
import {Loggly} from "winston-loggly-bulk";

winston.add(new Loggly({
	token: "85106fa9-6f55-492a-a220-cd7eb93e3be9",
	subdomain: "allbadcards",
	tags: ["Winston-NodeJS"],
	json: true
}));

winston.log('info', "Hello World from Node.js!");

export const logMessage = (...input: any[]) =>
{
	const message = input.map(i => JSON.stringify(i)).join(",");
	console.log('info', message);
};

export const logWarning = (...input: any[]) =>
{
	const message = input.map(i => JSON.stringify(i)).join(",");
	console.warn('warning', message);
};

export const logError = (...input: any[]) =>
{
	const message = input.map(i => JSON.stringify(i)).join(",");
	console.error('error', message);
};