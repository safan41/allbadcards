import {Database} from "../DB/Database";
import {GameItem} from "./Contract";

class _GameListManager
{
	public static Instance = new _GameListManager();

	constructor()
	{
		Database.initialize();
	}

	private static get games()
	{
		return Database.db.collection<GameItem>("games");
	}

	public async getGames(zeroBasedPage: number)
	{
		const found = await _GameListManager.games
			.find({
				["settings.public"]: true,
				dateUpdated: {
					$gt: (new Date(Date.now() - (15 * 60 * 1000)))
				}
			})
			.sort({dateUpdated: -1})
			.skip(20 * zeroBasedPage)
			.limit(20);

		return found.toArray();
	}
}

export const GameListManager = _GameListManager.Instance;