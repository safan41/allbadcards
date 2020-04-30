import {ErrorDataStore} from "../DataStore/ErrorDataStore";
import ReactGA from "react-ga";
import {CardId, GameItem, IBlackCardDefinition, ICardPackSummary, IGameSettings} from "./Contract";

export interface GamePayload extends GameItem
{
	buildVersion: number;
}

export type IWhiteCard = string;

class _Platform
{
	public static Instance = new _Platform();

	private loadedWhiteCards: { [packId: string]: IWhiteCard[] } = {};

	public trackEvent(action: string, label?: string, value?: number)
	{
		ReactGA.event({
			action,
			category: "Game",
			label,
			value
		});
	}

	private static async doGet<TData>(url: string)
	{
		return await fetch(url)
			.then(async r =>
			{
				if (r.ok)
				{
					return r.json();
				}
				else
				{
					throw await r.json();
				}
			})
			.catch(ErrorDataStore.add) as Promise<TData>;
	}

	private static async doPost<TData>(url: string, data: any)
	{
		return await fetch(url, {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify(data)
		})
			.then(async r =>
			{
				if (r.ok)
				{
					return r.json();
				}
				else
				{
					throw await r.json();
				}
			})
			.catch(ErrorDataStore.add) as Promise<TData>;
	}

	public async getGame(gameId: string)
	{
		return _Platform.doGet<GameItem>(`/api/game/get?gameId=${gameId}`);
	}

	public async createGame(ownerGuid: string, nickname: string)
	{
		this.trackEvent("create");

		return _Platform.doPost<GameItem>("/api/game/create", {
			ownerGuid,
			nickname
		});
	}

	public async joinGame(playerGuid: string, gameId: string, nickname: string, isSpectating = false)
	{
		this.trackEvent("join", gameId);

		return _Platform.doPost<GameItem>("/api/game/join", {
			playerGuid,
			gameId,
			nickname,
			isSpectating
		});
	}

	public async removePlayer(gameId: string, targetGuid: string, playerGuid: string)
	{
		this.trackEvent("remove-player", gameId);

		return _Platform.doPost<GameItem>("/api/game/kick", {
			gameId,
			targetGuid,
			playerGuid
		});
	}

	public async startGame(
		ownerGuid: string,
		gameId: string,
		settings: IGameSettings)
	{
		this.trackEvent("start", gameId);

		return _Platform.doPost<GameItem>("/api/game/start", {
			gameId,
			ownerGuid,
			settings
		});
	}

	public async updateSettings(
		ownerGuid: string,
		gameId: string,
		settings: IGameSettings)
	{
		this.trackEvent("start", gameId);

		return _Platform.doPost<GameItem>("/api/game/update-settings", {
			gameId,
			ownerGuid,
			settings
		});
	}

	public async playCards(gameId: string, playerGuid: string, cardIds: CardId[])
	{
		this.trackEvent("play-cards", gameId);

		return _Platform.doPost<GameItem>("/api/game/play-cards", {
			gameId,
			playerGuid,
			cardIds
		});
	}

	public async forfeit(gameId: string, playerGuid: string, playedCards: CardId[])
	{
		this.trackEvent("my-cards-suck", gameId);

		return _Platform.doPost<GameItem>("/api/game/forfeit", {
			gameId,
			playerGuid,
			playedCards
		});
	}

	public async restart(gameId: string, playerGuid: string)
	{
		this.trackEvent("game-restart", gameId);

		return _Platform.doPost<GameItem>("/api/game/restart", {
			gameId,
			playerGuid,
		});
	}

	public async selectWinnerCard(gameId: string, playerGuid: string, winningPlayerGuid: string)
	{
		this.trackEvent("selected-winner", gameId);

		return _Platform.doPost<GameItem>("/api/game/select-winner-card", {
			gameId,
			playerGuid,
			winningPlayerGuid
		});
	}

	public async revealNext(gameId: string, ownerGuid: string)
	{
		return _Platform.doPost<GameItem>("/api/game/reveal-next", {
			gameId,
			ownerGuid,
		});
	}

	public async startRound(gameId: string, ownerGuid: string)
	{
		this.trackEvent("round-start", gameId);

		return _Platform.doPost<GameItem>("/api/game/start-round", {
			gameId,
			ownerGuid,
		});
	}

	public async addRandomPlayer(gameId: string, ownerGuid: string)
	{
		this.trackEvent("round-start", gameId);

		return _Platform.doPost<GameItem>("/api/game/add-random-player", {
			gameId,
			ownerGuid,
		});
	}

	public async nextRound(gameId: string, playerGuid: string)
	{
		return _Platform.doPost<GameItem>("/api/game/next-round", {
			gameId,
			playerGuid,
		});
	}

	public async skipBlack(gameId: string, ownerGuid: string)
	{
		return _Platform.doPost<GameItem>("/api/game/skip-black", {
			gameId,
			ownerGuid,
		});
	}

	public async getWhiteCard(cardId: CardId)
	{
		const {
			cardIndex,
			packId
		} = cardId;

		return new Promise<IWhiteCard>((resolve, reject) =>
		{
			if (packId in this.loadedWhiteCards && this.loadedWhiteCards[packId].length > cardIndex)
			{
				resolve(this.loadedWhiteCards[packId][cardIndex]);
			}
			else
			{
				_Platform.doGet<{ card: IWhiteCard }>(`/api/game/get-white-card?packId=${packId}&cardIndex=${cardIndex}`)
					.then(data =>
					{
						if(!data)
						{
							reject("Card not found");
						}

						const card = data.card;
						this.loadedWhiteCards[packId] = this.loadedWhiteCards[packId] ?? {};
						this.loadedWhiteCards[packId][cardIndex] = card;
						resolve(card);
					})
					.catch(e => reject(e));
			}
		})
	}

	public async getBlackCard(cardId: CardId)
	{
		return _Platform.doGet<IBlackCardDefinition>(`/api/game/get-black-card?packId=${cardId.packId}&cardIndex=${cardId.cardIndex}`);
	}

	public async getWhiteCards(cards: CardId[])
	{
		const promises = cards.map(cardId => this.getWhiteCard(cardId));

		return Promise.all(promises);
	}

	public async getPacks(type: "all" | "official" | "thirdParty" | "family" = "all")
	{
		return _Platform.doGet<ICardPackSummary[]>("/api/game/get-packnames?type=" + type);
	}
}

export const Platform = _Platform.Instance;