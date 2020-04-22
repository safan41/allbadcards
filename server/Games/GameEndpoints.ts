import {Express, Response} from "express";
import {GameItem, GameManager} from "./GameManager";
import {CardManager} from "./CardManager";
import apicache from "apicache";
import {logError, logMessage} from "../logger";
import {Config} from "../../config/config";

const cache = apicache.middleware;

const onError = (res: Response, error: Error, ...more: any[]) =>
{
	res.status(500).send({message: error.message, stack: error.stack});
	logError({message: error.message, stack: error.stack}, more);
	throw error;
};

const sendWithBuildVersion = (gameItem: GameItem, res: Response) =>
{
	res.send({
		...gameItem,
		buildVersion: Config.Version
	});
};

export const RegisterGameEndpoints = (app: Express, clientFolder: string) =>
{
	app.get("/api/game/get", cache("10 seconds"), async (req, res, next) =>
	{
		logMessage(req.url, req.query);

		try
		{
			const game = await GameManager.getGame(req.query.gameId);
			sendWithBuildVersion(game, res);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.get("/api/game/get-white-card", cache("1 hour"), async (req, res, next) =>
	{
		logMessage(req.url, req.query);
		try
		{
			const card = CardManager.getWhiteCard(parseInt(req.query.cardId));

			res.send({card});
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.get("/api/game/get-packnames", cache("1 hour"), async (req, res, next) =>
	{
		try
		{
			const packIds = CardManager.packOrder;
			const packs = packIds.map(packId =>
			{
				const packDef = CardManager.packs[packId];
				return {
					packId,
					packName: packDef.name,
					blackCount: packDef.black.length,
					whiteCount: packDef.white.length
				}
			});
			res.send(packs);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.get("/api/game/get-black-card", cache("1 hour"), async (req, res, next) =>
	{
		logMessage(req.url, req.query);
		try
		{
			const card = CardManager.getBlackCard(parseInt(req.query.cardId));

			res.send(card);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.post("/api/game/create", async (req, res, next) =>
	{
		logMessage(req.url, req.body);
		try
		{
			const game = await GameManager.createGame(req.body.ownerGuid, req.body.nickname);
			sendWithBuildVersion(game, res);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.post("/api/game/join", async (req, res, next) =>
	{
		logMessage(req.url, req.body);
		try
		{
			const game = await GameManager.joinGame(
				req.body.playerGuid,
				req.body.gameId,
				req.body.nickname,
				JSON.parse(req.body.isSpectating ?? "false"),
				false);

			sendWithBuildVersion(game, res);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.post("/api/game/kick", async (req, res, next) =>
	{
		logMessage(req.url, req.body);
		try
		{
			const game = await GameManager.kickPlayer(req.body.gameId, req.body.targetGuid, req.body.playerGuid);

			sendWithBuildVersion(game, res);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.post("/api/game/start", async (req, res, next) =>
	{
		logMessage(req.url, req.body);
		try
		{
			const game = await GameManager.startGame(
				req.body.gameId,
				req.body.ownerGuid,
				req.body.includedPacks,
				req.body.includedCardcastPacks,
				parseInt(req.body.requiredRounds ?? 10),
				req.body.inviteLink,
				req.body.password);

			sendWithBuildVersion(game, res);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.post("/api/game/restart", async (req, res, next) =>
	{
		logMessage(req.url, req.body);
		try
		{
			let game = await GameManager.restartGame(req.body.gameId, req.body.playerGuid);
			game = await GameManager.startGame(
				game.id,
				game.ownerGuid,
				game.settings.includedPacks,
				game.settings.includedCardcastPacks,
				game.settings.roundsToWin,
				game.settings.inviteLink,
				game.settings.password
			);

			sendWithBuildVersion(game, res);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.post("/api/game/play-cards", async (req, res, next) =>
	{
		logMessage(req.url, req.body);
		try
		{
			const game = await GameManager.playCard(req.body.gameId, req.body.playerGuid, req.body.cardIds);

			sendWithBuildVersion(game, res);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.post("/api/game/forfeit", async (req, res, next) =>
	{
		logMessage(req.url, req.body);
		try
		{
			const game = await GameManager.forfeit(req.body.gameId, req.body.playerGuid, req.body.playedCards);

			sendWithBuildVersion(game, res);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.post("/api/game/reveal-next", async (req, res, next) =>
	{
		logMessage(req.url, req.body);
		try
		{
			const game = await GameManager.revealNext(req.body.gameId, req.body.ownerGuid);

			sendWithBuildVersion(game, res);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.post("/api/game/skip-black", async (req, res, next) =>
	{
		logMessage(req.url, req.body);
		try
		{
			const game = await GameManager.skipBlack(req.body.gameId, req.body.ownerGuid);

			sendWithBuildVersion(game, res);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.post("/api/game/start-round", async (req, res, next) =>
	{
		logMessage(req.url, req.body);
		try
		{
			const game = await GameManager.startRound(req.body.gameId, req.body.ownerGuid);

			sendWithBuildVersion(game, res);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.post("/api/game/add-random-player", async (req, res, next) =>
	{
		logMessage(req.url, req.body);
		try
		{
			const game = await GameManager.addRandomPlayer(req.body.gameId, req.body.ownerGuid);

			sendWithBuildVersion(game, res);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.post("/api/game/select-winner-card", async (req, res, next) =>
	{
		logMessage(req.url, req.body);
		try
		{
			const game = await GameManager.selectWinnerCard(req.body.gameId, req.body.playerGuid, req.body.winningPlayerGuid);

			sendWithBuildVersion(game, res);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.post("/api/game/next-round", async (req, res, next) =>
	{
		logMessage(req.url, req.body);
		try
		{
			const game = await GameManager.nextRound(req.body.gameId, req.body.playerGuid);

			sendWithBuildVersion(game, res);
		}
		catch (error)
		{
			onError(res, error, req.url, req.query, req.body);
		}
	});

	app.get("*", (req, res) =>
	{
		res.sendFile("index.html", {root: clientFolder});
	});
};