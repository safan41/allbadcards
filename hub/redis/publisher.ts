import {createClient, RedisClient} from "redis";
import * as fs from "fs";
import * as path from "path";

export class _Publisher
{
	public static Instance = new _Publisher();
	private readonly redisPub: RedisClient;

	constructor()
	{
		const keysFile = fs.readFileSync(path.resolve(process.cwd(), "../config/keys.json"), "utf8");
		const keys = JSON.parse(keysFile)[0];
		const redisPort = keys.redisPort;

		this.redisPub = createClient({
			port: redisPort
		});
		this.redisPub.subscribe(`games`, () => {
			console.log("Subscribed");
		});
	}

}

export const Publisher = _Publisher.Instance;