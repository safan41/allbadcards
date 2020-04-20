import {Express, Response} from "express";
import {GameManager} from "./GameManager";
import {CardManager} from "./CardManager";
import apicache from "apicache";
import {logError, logMessage} from "../logger";

const cache = apicache.middleware;

const onError = (res: Response, error: Error, ...more: any[]) =>
{
	res.status(500).send({message: error.message, stack: error.stack});
	logError({message: error.message, stack: error.stack}, more);
	throw error;
};

export const RegisterGameEndpoints = (app: Express, clientFolder: string) =>
{
	app.get("/api/game/get", cache("10 seconds"), async (req, res, next) =>
	{
		logMessage(req.url, req.query);

		try
		{
			const game = await GameManager.getGame(req.query.gameId);
			res.send(game);
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
			res.send(game);
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
			const result = await GameManager.joinGame(
				req.body.playerGuid,
				req.body.gameId,
				req.body.nickname,
				JSON.parse(req.body.isSpectating ?? "false"),
				false);

			res.send(result);
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
			const result = await GameManager.kickPlayer(req.body.gameId, req.body.targetGuid, req.body.playerGuid);

			res.send(result);
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
			const result = await GameManager.startGame(
				req.body.gameId,
				req.body.ownerGuid,
				req.body.includedPacks,
				req.body.includedCardcastPacks,
				parseInt(req.body.requiredRounds ?? 10),
				req.body.inviteLink,
				req.body.password);

			res.send(result);
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
			let result = await GameManager.restartGame(req.body.gameId, req.body.playerGuid);
			result = await GameManager.startGame(
				result.id,
				result.ownerGuid,
				result.settings.includedPacks,
				result.settings.includedCardcastPacks,
				result.settings.roundsToWin,
				result.settings.inviteLink,
				result.settings.password
			);

			res.send(result);
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
			const result = await GameManager.playCard(req.body.gameId, req.body.playerGuid, req.body.cardIds);

			res.send(result);
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
			const result = await GameManager.forfeit(req.body.gameId, req.body.playerGuid, req.body.playedCards);

			res.send(result);
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
			const result = await GameManager.revealNext(req.body.gameId, req.body.ownerGuid);

			res.send(result);
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
			const result = await GameManager.skipBlack(req.body.gameId, req.body.ownerGuid);

			res.send(result);
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
			const result = await GameManager.startRound(req.body.gameId, req.body.ownerGuid);

			res.send(result);
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
			const result = await GameManager.addRandomPlayer(req.body.gameId, req.body.ownerGuid);

			res.send(result);
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
			const result = await GameManager.selectWinnerCard(req.body.gameId, req.body.playerGuid, req.body.winningPlayerGuid);

			res.send(result);
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
			const result = await GameManager.nextRound(req.body.gameId, req.body.playerGuid);

			res.send(result);
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