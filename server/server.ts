import express from "express";
import * as path from "path";
import compression from "compression";
import cookieParser from "cookie-parser";
import serveStatic from "serve-static";
import bodyParser from "body-parser";
import {RegisterGameEndpoints} from "./Games/GameEndpoints";
import {Config} from "./config/config";
import {CardManager} from "./Games/CardManager";
import {CreateGameManager} from "./Games/GameManager";
import * as Sentry from "@sentry/node";
import * as https from "https";
import * as fs from "fs";
import {logError, logWarning} from "./logger";

// Create the app
const app = express();
const port = Config.Port || 5000;
const clientFolder = path.join(process.cwd(), 'client');

app.use(Sentry.Handlers.requestHandler() as any);

if (Config.Environment !== "local")
{
	Sentry.init({dsn: 'https://055714bf94b544a79ce023c1bc076ac5@o377988.ingest.sentry.io/5200777'});
}

// Set up basic settings
app.use(express.static(clientFolder, {
	cacheControl: true
}));
app.use(compression() as any);
app.use(cookieParser() as any);
app.use(bodyParser.json({
	type: ['application/json', 'text/plain']
}) as any);
app.use(bodyParser.urlencoded({extended: true}) as any);

app.get("/service-worker.js", (req, res) =>
{
	// Don't cache service worker is a best practice (otherwise clients wont get emergency bug fix)
	res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
	res.set("Content-Type", "application/javascript");
	serveStatic("/service-worker.js");
});

CardManager.initialize();
RegisterGameEndpoints(app, clientFolder);

app.use(Sentry.Handlers.errorHandler() as any);

const resolveKey = (keypath: string) =>
{
	return path.resolve(process.cwd(), path.join("../../keys", keypath));
};

// Start the server


if (Config.Environment !== "local")
{
	const server = https.createServer({
		key: fs.readFileSync(resolveKey('./allbad.cards-key.pem')),
		cert: fs.readFileSync(resolveKey('./allbad.cards-crt.pem')),
		ca: fs.readFileSync(resolveKey('./allbad.cards-chain.pem')),
	}, app).listen(443, () => console.log(`Listening on port ${port}, environment: ${Config.Environment}`))
		.setTimeout(10000);

	CreateGameManager(server);
}
else
{
	const server = app.listen(port, () => console.log(`Listening on port ${port}, environment: ${Config.Environment}`))
		.setTimeout(10000);

	CreateGameManager(server);
}