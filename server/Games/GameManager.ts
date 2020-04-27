import {Database} from "../DB/Database";
import shortid from "shortid";
import {hri} from "human-readable-ids";
import {CardManager} from "./CardManager";
import WebSocket from "ws";
import {GameMessage} from "../SocketMessages/GameMessage";
import * as http from "http";
import {Config} from "../../config/config";
import {ArrayUtils} from "../Utils/ArrayUtils";
import {RandomPlayerNicknames} from "./RandomPlayers";
import {logError, logMessage, logWarning} from "../logger";
import {AbortError, createClient, RedisClient, RetryStrategy} from "redis";
import * as fs from "fs";
import * as path from "path";
import {CardId, GameItem, GamePayload, GamePlayer, PlayerMap} from "./Contract";

interface IWSMessage
{
	playerGuid: string;
}

export let GameManager: _GameManager;

class _GameManager
{
	private wss: WebSocket.Server;
	private redisPub: RedisClient;
	private redisSub: RedisClient;
	private redisReconnectInterval: NodeJS.Timeout | null  = null;

	// key = playerGuid, value = WS key
	private wsClientPlayerMap: { [key: string]: string[] } = {};

	constructor(server: http.Server)
	{
		logMessage("Starting WebSocket Server");

		Database.initialize();
		this.initializeWebSockets(server);
		this.initializeRedis();
	}

	public static create(server: http.Server)
	{
		GameManager = new _GameManager(server);
	}

	private static get games()
	{
		return Database.db.collection<GameItem>("games");
	}

	private initializeRedis()
	{
		const keysFile = fs.readFileSync(path.resolve(process.cwd(), "./config/keys.json"), "utf8");
		const keys = JSON.parse(keysFile)[0];
		const redisHost = keys.redisHost[Config.Environment];
		const redisPort = keys.redisPort;

		const retry_strategy: RetryStrategy = options => {
			if (options.error && options.error.code === "ECONNREFUSED") {
				// End reconnecting on a specific error and flush all commands with
				// a individual error
				return new Error("The server refused the connection");
			}
			if (options.total_retry_time > 1000 * 60 * 60) {
				// End reconnecting after a specific timeout and flush all commands
				// with a individual error
				return new Error("Retry time exhausted");
			}
			if (options.attempt > 10) {
				// End reconnecting with built in error
				return new Error("Too many retries");
			}
			// reconnect after
			return Math.min(options.attempt * 100, 3000);
		};

		const onError = (error: any) => {
			if(error instanceof AbortError)
			{
				this.redisReconnectInterval && clearInterval(this.redisReconnectInterval);
				this.redisReconnectInterval = setInterval(() => {
					logWarning("Attempting to reconnect to Redis...");
					this.initializeRedis();
				}, 10000);
			}
			logError(`Error from pub/sub: `, error);
		};

		this.redisPub = createClient({
			host: redisHost,
			port: redisPort,
			auth_pass: keys.redisKey,
			retry_strategy
		});

		this.redisPub.on("error", onError);
		this.redisPub.on("connect", () => this.redisReconnectInterval && clearInterval(this.redisReconnectInterval));

		this.redisSub = createClient({
			host: redisHost,
			port: redisPort,
			auth_pass: keys.redisKey,
			retry_strategy
		});

		this.redisSub.on("error", onError);
		this.redisSub.on("connect", () => this.redisReconnectInterval && clearInterval(this.redisReconnectInterval));
		this.redisSub.on("message", async (channel, gameDataString) =>
		{
			const gameItem = JSON.parse(gameDataString) as GameItem;
			logMessage(`Redis update for game ${gameItem.id}`);

			this.updateSocketGames(gameItem);
		});

		this.redisSub.subscribe(`games`);
	}

	private initializeWebSockets(server: http.Server)
	{
		const port = Config.Environment === "local" ? {port: 8080} : undefined;

		this.wss = new WebSocket.Server({
			server,
			...port
		});

		this.wss.on("connection", (ws, req) =>
		{
			const id = req.headers['sec-websocket-key'] as string | undefined;
			if (id)
			{
				(ws as any)["id"] = id;
				ws.on("message", (message) =>
				{
					const data = JSON.parse(message as string) as IWSMessage;
					const existingConnections = this.wsClientPlayerMap[data.playerGuid] ?? [];
					this.wsClientPlayerMap[data.playerGuid] = [id, ...existingConnections];
				});

				ws.on("close", () =>
				{
					const matchingPlayerGuid = Object.keys(this.wsClientPlayerMap)
						.find(playerGuid => this.wsClientPlayerMap[playerGuid].includes(id));

					if (matchingPlayerGuid)
					{
						const existingConnections = this.wsClientPlayerMap[matchingPlayerGuid];
						this.wsClientPlayerMap[matchingPlayerGuid] = existingConnections.filter(a => a !== id);
					}
				});
			}
		});

	}

	private static createPlayer(playerGuid: string, nickname: string, isSpectating: boolean, isRandom: boolean): GamePlayer
	{
		return {
			guid: playerGuid,
			whiteCards: [],
			nickname,
			wins: 0,
			isSpectating,
			isRandom
		};
	}

	public async getGame(gameId: string)
	{
		let existingGame: GameItem | null;
		try
		{
			existingGame = await _GameManager.games.findOne({
				id: gameId
			});
		}
		catch (e)
		{
			throw new Error("Could not find game.");
		}

		if (!existingGame)
		{
			throw new Error("Game not found!");
		}

		return existingGame;
	}

	public async updateGame(newGame: GameItem)
	{
		await Database.db.collection<GameItem>("games").updateOne({
			id: newGame.id
		}, {
			$set: newGame
		});

		this.updateRedis(newGame);

		return newGame;
	}

	private updateRedis(gameItem: GameItem)
	{
		this.redisPub.publish("games", JSON.stringify(gameItem));
	}

	private updateSocketGames(game: GameItem)
	{
		const playerGuids = Object.keys(game.players);
		const spectatorGuids = Object.keys(game.spectators);
		const allGuids = [...playerGuids, ...spectatorGuids];

		// Get every socket that needs updating
		const wsIds = allGuids
			.map(pg => this.wsClientPlayerMap[pg])
			.reduce((acc, val) => acc.concat(val), []);

		const gameWithVersion: GamePayload = {
			...game,
			buildVersion: Config.Version
		};

		this.wss.clients.forEach(ws =>
		{
			if (wsIds.includes((ws as any).id))
			{
				ws.send(GameMessage.send(gameWithVersion));
			}
		});
	}

	public async createGame(ownerGuid: string, nickname: string, roundsToWin = 99, password = ""): Promise<GameItem>
	{
		logMessage(`Creating game for ${ownerGuid}`);

		const gameId = hri.random();

		try
		{
			const initialGameItem: GameItem = {
				id: gameId,
				roundIndex: 0,
				roundStarted: false,
				ownerGuid,
				chooserGuid: null,
				dateCreated: new Date(),
				players: {[ownerGuid]: _GameManager.createPlayer(ownerGuid, nickname, false, false)},
				playerOrder: [],
				spectators: {},
				public: false,
				started: false,
				blackCard: {
					cardIndex: -1,
					packId: ""
				},
				roundCards: {},
				usedBlackCards: {},
				usedWhiteCards: {},
				revealIndex: -1,
				lastWinner: undefined,
				settings: {
					roundsToWin,
					password,
					inviteLink: null,
					includedPacks: [],
					includedCardcastPacks: []
				}
			};

			await _GameManager.games.insertOne(initialGameItem);

			const game = await this.getGame(gameId);

			logMessage(`Created game for ${ownerGuid}: ${game.id}`);

			this.updateSocketGames(game);

			return game;
		}
		catch (e)
		{
			logError(e);

			throw new Error("Could not create game.");
		}
	}

	public async joinGame(playerGuid: string, gameId: string, nickname: string, isSpectating: boolean, isRandom: boolean)
	{
		const existingGame = await this.getGame(gameId);

		if (Object.keys(existingGame.players).length >= 50)
		{
			throw new Error("This game is full.");
		}

		const newGame = {...existingGame};
		newGame.revealIndex = -1;

		const newPlayer = _GameManager.createPlayer(playerGuid, nickname, isSpectating, isRandom);
		if (isSpectating)
		{
			newGame.spectators[playerGuid] = newPlayer;
		}
		else
		{
			newGame.players[playerGuid] = newPlayer;
		}

		// If the game already started, deal in this new person
		if (newGame.started && !isSpectating)
		{
			const newGameWithCards = await CardManager.dealWhiteCards(newGame);
			newGame.players[playerGuid].whiteCards = newGameWithCards.players[playerGuid].whiteCards;
		}

		await this.updateGame(newGame);

		return newGame;
	}

	public async kickPlayer(gameId: string, targetGuid: string, ownerGuid: string)
	{
		const existingGame = await this.getGame(gameId);

		if (existingGame.ownerGuid !== ownerGuid && targetGuid !== ownerGuid)
		{
			throw new Error("You don't have kick permission!",);
		}

		if (existingGame.chooserGuid === targetGuid)
		{
			throw new Error("You can't kick the Card Czar.");
		}

		const newGame = {...existingGame};
		delete newGame.players[targetGuid];
		delete newGame.roundCards[targetGuid];
		newGame.playerOrder = ArrayUtils.shuffle(Object.keys(newGame.players));

		// If the owner deletes themselves, pick a new owner
		if (targetGuid === ownerGuid)
		{
			newGame.ownerGuid = Object.keys(newGame.players)[0];
		}

		await this.updateGame(newGame);

		return newGame;
	}

	public async nextRound(gameId: string, chooserGuid: string)
	{
		const existingGame = await this.getGame(gameId);

		if (existingGame.chooserGuid !== chooserGuid)
		{
			throw new Error("You are not the chooser!");
		}

		let newGame = {...existingGame};

		// Remove last winner
		newGame.lastWinner = undefined;
		// Reset white card reveal
		newGame.revealIndex = -1;

		newGame.roundStarted = false;

		// Iterate the round index
		newGame.roundIndex = existingGame.roundIndex + 1;

		const playerGuids = Object.keys(existingGame.players);
		const nonRandomPlayerGuids = playerGuids.filter(pg => !newGame.players[pg].isRandom);

		// Grab a new chooser
		const chooserIndex = newGame.roundIndex % nonRandomPlayerGuids.length;
		newGame.chooserGuid = nonRandomPlayerGuids[chooserIndex];

		// Remove the played white card from each player's hand
		newGame.players = playerGuids.reduce((acc, playerGuid) =>
		{
			const player = existingGame.players[playerGuid];
			const newPlayer = {...player};
			const usedCards = existingGame.roundCards[playerGuid] ?? [];
			newPlayer.whiteCards = player.whiteCards.filter(wc => !usedCards.includes(wc));
			acc[playerGuid] = newPlayer;

			return acc;
		}, {} as PlayerMap);

		// Reset the played cards for the round
		newGame.roundCards = {};

		// Deal a new hand
		newGame = await CardManager.dealWhiteCards(newGame);

		// Grab the new black card
		newGame = await CardManager.nextBlackCard(newGame);

		await this.updateGame(newGame);

		return newGame;
	}

	public async startGame(
		gameId: string,
		ownerGuid: string,
		includedPacks: string[],
		includedCardcastPacks: string[],
		requiredRounds = 10,
		inviteLink: string | null = null,
		password: string | null = null
	)
	{
		const existingGame = await this.getGame(gameId);

		if (existingGame.ownerGuid !== ownerGuid)
		{
			throw new Error("User cannot start game");
		}

		let newGame = {...existingGame};

		const playerGuids = Object.keys(existingGame.players);
		newGame.chooserGuid = playerGuids[0];
		newGame.started = true;
		newGame.settings.includedPacks = includedPacks;
		newGame.settings.includedCardcastPacks = includedCardcastPacks;
		newGame.settings.password = password;
		newGame.settings.roundsToWin = requiredRounds;
		newGame.settings.inviteLink = inviteLink;

		newGame = await CardManager.nextBlackCard(newGame);
		newGame = await CardManager.dealWhiteCards(newGame);

		await this.updateGame(newGame);

		return newGame;
	}


	public async restartGame(
		gameId: string,
		playerGuid: string
	)
	{
		const existingGame = await this.getGame(gameId);
		const newGame = {...existingGame};

		if (existingGame.ownerGuid !== playerGuid)
		{
			throw new Error("User cannot start game");
		}

		Object.keys(newGame.players).forEach(pg =>
		{
			newGame.players[pg].whiteCards = [];
			newGame.players[pg].wins = 0;
		});

		newGame.roundIndex = 0;
		newGame.usedBlackCards = {};
		newGame.usedWhiteCards = {};
		newGame.revealIndex = -1;
		newGame.roundCards = {};
		newGame.roundStarted = false;
		newGame.started = false;
		newGame.blackCard = {
			cardIndex: -1,
			packId: ""
		};
		newGame.lastWinner = undefined;

		await this.updateGame(newGame);

		return newGame;
	}

	public async playCard(gameId: string, playerGuid: string, cardIds: CardId[])
	{
		const existingGame = await this.getGame(gameId);

		const newGame = {...existingGame};
		newGame.roundCards[playerGuid] = cardIds;
		newGame.playerOrder = ArrayUtils.shuffle(Object.keys(newGame.players));

		await this.updateGame(newGame);

		return newGame;
	}

	public async forfeit(gameId: string, playerGuid: string, playedCards: CardId[])
	{
		const existingGame = await this.getGame(gameId);

		const newGame = {...existingGame};

		// Get the cards they haven't played
		const unplayedCards = existingGame.players[playerGuid].whiteCards.filter(c => !playedCards.includes(c));

		unplayedCards.forEach(cardId => {
			newGame.usedWhiteCards[cardId.packId] = newGame.usedWhiteCards[cardId.packId] ?? {};
			newGame.usedWhiteCards[cardId.packId][cardId.cardIndex] = cardId;
		});

		// clear out the player's cards
		newGame.players[playerGuid].whiteCards = [];

		await this.updateGame(newGame);

		return newGame;
	}

	public async revealNext(gameId: string, playerGuid: string)
	{
		const existingGame = await this.getGame(gameId);

		if (existingGame.chooserGuid !== playerGuid)
		{
			throw new Error("You are not the chooser!");
		}

		const newGame = {...existingGame};
		newGame.revealIndex = newGame.revealIndex + 1;

		await this.updateGame(newGame);

		return newGame;
	}

	public async skipBlack(gameId: string, playerGuid: string)
	{
		const existingGame = await this.getGame(gameId);

		if (existingGame.chooserGuid !== playerGuid)
		{
			throw new Error("You are not the chooser!");
		}

		const newGame = {...existingGame};
		const newGameWithBlackCard = await CardManager.nextBlackCard(newGame);

		await this.updateGame(newGameWithBlackCard);

		return newGame;
	}

	public async startRound(gameId: string, playerGuid: string)
	{
		const existingGame = await this.getGame(gameId);

		if (existingGame.chooserGuid !== playerGuid)
		{
			throw new Error("You are not the chooser!");
		}

		const newGame = {...existingGame};
		newGame.roundStarted = true;

		await this.updateGame(newGame);

		this.randomPlayersPlayCard(gameId);

		return newGame;
	}

	private randomPlayersPlayCard(gameId: string)
	{
		this.getGame(gameId)
			.then(async existingGame =>
			{
				const newGame = {...existingGame};
				const blackCardDef = await CardManager.getBlackCard(newGame.blackCard);
				const targetPicked = blackCardDef.pick;
				const randomPlayerGuids = Object.keys(newGame.players).filter(pg => newGame.players[pg].isRandom);

				for(let pg of randomPlayerGuids)
				{
					const player = newGame.players[pg];
					let cards: CardId[] = [];
					for (let i = 0; i < targetPicked; i++)
					{
						const [, newCards] = ArrayUtils.getRandomUnused(player.whiteCards, cards);
						cards = newCards;
					}

					await this.playCard(gameId, pg, cards);
				}
			});
	}

	public async addRandomPlayer(gameId: string, playerGuid: string)
	{
		const existingGame = await this.getGame(gameId);

		if (existingGame.ownerGuid !== playerGuid)
		{
			throw new Error("You are not the owner!");
		}

		let newGame = {...existingGame};

		const used = Object.keys(newGame.players).map(pg => newGame.players[pg].nickname);
		const [newNickname] = ArrayUtils.getRandomUnused(RandomPlayerNicknames, used);

		newGame = await this.joinGame(shortid.generate(), gameId, newNickname, false, true);

		return newGame;
	}

	public async selectWinnerCard(gameId: string, playerGuid: string, winnerPlayerGuid: string)
	{
		const existingGame = await this.getGame(gameId);

		if (existingGame.chooserGuid !== playerGuid)
		{
			throw new Error("You are not the chooser!");
		}

		const newGame = {...existingGame};
		const played = existingGame.roundCards[winnerPlayerGuid];
		newGame.players[winnerPlayerGuid].wins = newGame.players[winnerPlayerGuid].wins + 1;
		newGame.lastWinner = {
			playerGuid: winnerPlayerGuid,
			whiteCardIds: played
		};

		await this.updateGame(newGame);

		return newGame;
	}
}

export const CreateGameManager = _GameManager.create;
