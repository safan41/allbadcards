import {Database} from "../DB/Database";
import shortid from "shortid";
import {hri} from "human-readable-ids";
import {CardManager} from "./CardManager";
import WebSocket from "ws";
import {GameMessage} from "../SocketMessages/GameMessage";
import * as http from "http";
import {Config} from "../config/config";
import {ArrayUtils} from "../Utils/ArrayUtils";
import {RandomPlayerNicknames} from "./RandomPlayers";

type PlayerMap = { [key: string]: GamePlayer };

interface IWSMessage
{
	playerGuid: string;
}

export interface GamePlayer
{
	guid: string;
	nickname: string;
	wins: number;
	whiteCards: number[];
	isSpectating: boolean;
	isRandom: boolean;
}

export interface GameItem
{
	id: string;
	roundIndex: number;
	roundStarted: boolean;
	ownerGuid: string;
	chooserGuid: string | null;
	started: boolean;
	dateCreated: Date;
	public: boolean;
	players: PlayerMap;
	spectators: PlayerMap;
	blackCard: number;
	// key = player guid, value = white card ID
	roundCards: { [key: string]: number[] };
	playerOrder: string[];
	usedBlackCards: number[];
	usedWhiteCards: number[];
	revealIndex: number;
	lastWinner: {
		playerGuid: string;
		whiteCardIds: number[];
	} | undefined;
	settings: {
		password: string | null;
		roundsToWin: number;
		inviteLink: string | null;
		includedPacks: string[];
		includedCardcastPacks: string[];
	}
}

interface ICard
{
	id: number;
}

interface IBlackCard extends ICard
{
	prompt: string;
	special: string;
}

interface IWhiteCard extends ICard
{
	response: string;
}

export let GameManager: _GameManager;

class _GameManager
{
	private wss: WebSocket.Server;

	// key = playerGuid, value = WS key
	private wsClientPlayerMap: { [key: string]: string[] } = {};

	constructor(server: http.Server)
	{
		console.log("Starting WebSocket Server");

		Database.initialize();

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

	public static create(server: http.Server)
	{
		GameManager = new _GameManager(server);
	}

	private get games()
	{
		return Database.db.collection<GameItem>("games");
	}

	private createPlayer(playerGuid: string, nickname: string, isSpectating: boolean, isRandom: boolean): GamePlayer
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
			existingGame = await this.games.findOne({
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

		this.updateSocketGames(newGame);

		return newGame;
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

		this.wss.clients.forEach(ws =>
		{
			if (wsIds.includes((ws as any).id))
			{
				ws.send(GameMessage.send(game));
			}
		});
	}

	public async createGame(ownerGuid: string, nickname: string, roundsToWin = 99, password = ""): Promise<GameItem>
	{
		console.log(`Creating game for ${ownerGuid}`);

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
				players: {[ownerGuid]: this.createPlayer(ownerGuid, nickname, false, false)},
				playerOrder: [],
				spectators: {},
				public: false,
				started: false,
				blackCard: -1,
				roundCards: {},
				usedBlackCards: [],
				usedWhiteCards: [],
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

			await this.games.insertOne(initialGameItem);

			const game = await this.getGame(gameId);

			console.log(`Created game for ${ownerGuid}: ${game.id}`);

			this.updateSocketGames(game);

			return game;
		}
		catch (e)
		{
			console.error(e);

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

		const newPlayer = this.createPlayer(playerGuid, nickname, isSpectating, isRandom);
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

		if(existingGame.chooserGuid === targetGuid)
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
			throw new Error("You are not the cchooser!");
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
		const chooser = nonRandomPlayerGuids[chooserIndex];
		newGame.chooserGuid = chooser;

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
		newGame = CardManager.nextBlackCard(newGame);

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
		newGame = CardManager.nextBlackCard(newGame);
		newGame = CardManager.dealWhiteCards(newGame);

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

		Object.keys(newGame.players).forEach(pg => {
			newGame.players[pg].whiteCards = [];
			newGame.players[pg].wins = 0;
		});

		newGame.roundIndex = 0;
		newGame.usedBlackCards = [];
		newGame.usedWhiteCards = [];
		newGame.revealIndex = -1;
		newGame.roundCards = {};
		newGame.roundStarted = false;
		newGame.started = false;
		newGame.blackCard = -1;
		newGame.lastWinner = undefined;

		await this.updateGame(newGame);

		return newGame;
	}

	public async playCard(gameId: string, playerGuid: string, cardIds: number[])
	{
		const existingGame = await this.getGame(gameId);

		const newGame = {...existingGame};
		newGame.roundCards[playerGuid] = cardIds;
		newGame.playerOrder = ArrayUtils.shuffle(Object.keys(newGame.players));

		await this.updateGame(newGame);

		return newGame;
	}

	public async forfeit(gameId: string, playerGuid: string, playedCards: number[])
	{
		const existingGame = await this.getGame(gameId);

		const newGame = {...existingGame};

		// Get the cards they haven't played
		const unplayedCards = existingGame.players[playerGuid].whiteCards.filter(c => !playedCards.includes(c));

		// Remove the unplayed cards from the used cards list. i.e. put them back in the pool
		newGame.usedWhiteCards.push(...unplayedCards);

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
		const newGameWithBlackCard = CardManager.nextBlackCard(newGame);

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
			.then(async existingGame => {
				const newGame = {...existingGame};
				const blackCardDef = CardManager.blackCards[newGame.blackCard];
				const targetPicked = blackCardDef.pick;

				const randomPlayerGuids = Object.keys(newGame.players).filter(pg => newGame.players[pg].isRandom);

				randomPlayerGuids.forEach(pg => {
					const player = newGame.players[pg];
					let cards: number[] = [];
					for(let i = 0; i < targetPicked; i++)
					{
						const [pickedCard, newCards] = ArrayUtils.getRandomUnused(player.whiteCards, cards);
						cards = newCards;
					}

					setTimeout(() => {
						this.playCard(gameId, pg, cards);
					}, Math.floor(Math.random() * 5000));
				});
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
