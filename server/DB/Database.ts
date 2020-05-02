import {MongoClient} from "mongodb";
import * as fs from "fs";
import * as path from "path";
import {Config} from "../../config/config";
import {format} from "util";
import {logError, logMessage} from "../logger";

class _Database
{
	public static Instance = new _Database();
	private _client: MongoClient;
	private url: string;
	private initialized = false;

	constructor()
	{
		const keysFile = fs.readFileSync(path.resolve(process.cwd(), "./config/keys.json"), "utf8");
		const keys = JSON.parse(keysFile)[0];
		this.url = keys.mongo[Config.Environment];
	}

	private get client()
	{
		if (!this._client)
		{
			throw new Error("Mongo failed to connect");
		}

		return this._client;
	}

	public initialize()
	{
		if (this.initialized)
		{
			return;
		}

		this.initialized = true;

		logMessage("Connecting to mongo");
		MongoClient.connect(this.url, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		}, async (err, client) =>
		{
			logMessage("Mongo connection attempt finished");
			logError(err);
			if (err)
			{
				throw err;
			}

			this._client = client;
			const db = client.db("letsplaywtf");

			await db.createIndex("games", {
				id: 1
			});

			await db.createIndex("cardcast", {
				id: 1,
				["settings.public"]: 1,
				dateCreated: -1,
				dateUpdated: -1
			});
		});
	}

	public get db()
	{
		return this.client.db("letsplaywtf");
	}
}

export const Database = _Database.Instance;