import {DataStore} from "./DataStore";
import {GamePayload, IWhiteCard, Platform} from "../Platform/platform";
import {UserDataStore} from "./UserDataStore";
import deepEqual from "deep-equal";
import {ArrayFlatten} from "../Utils/ArrayUtils";
import {CardCastApi, IDeck} from "isomorphic-cardcast-api";
import {CardId, IBlackCardDefinition, ICardPackSummary} from "../Platform/Contract";

export type WhiteCardMap = {
	[packId: string]: {
		[cardIndex: number]: IWhiteCard
	}
};

export interface IGameDataStorePayload
{
	hasConnection: boolean;
	loaded: boolean;
	familyMode: boolean;
	game: GamePayload | null;
	packs: ICardPackSummary[];
	includedPacks: string[];
	includedCardcastPacks: string[];
	cardcastPackDefs: { [key: string]: IDeck };
	cardcastPacksLoading: boolean;
	roundCardDefs: WhiteCardMap;
	playerCardDefs: WhiteCardMap;
	roundsRequired: number;
	password: string | null;
	inviteLink: string | null;
	blackCardDef: IBlackCardDefinition | null;
}

let manualClose = false;
let connectionOpen = false;

class _GameDataStore extends DataStore<IGameDataStorePayload>
{
	private static InitialState: IGameDataStorePayload = {
		loaded: false,
		hasConnection: false,
		familyMode: location.hostname.startsWith("not."),
		game: null,
		packs: [],
		roundCardDefs: {},
		playerCardDefs: {},
		includedPacks: [],
		includedCardcastPacks: [],
		cardcastPackDefs: {},
		cardcastPacksLoading: false,
		roundsRequired: 7,
		password: null,
		blackCardDef: null,
		inviteLink: null
	};

	public static Instance = new _GameDataStore(_GameDataStore.InitialState);

	private ws: WebSocket | null = null;

	public initialize()
	{
		if (this.ws)
		{
			this.ws.close();
			manualClose = true;
		}

		const isLocal = !!location.hostname.match("local");
		const protocol = location.protocol === "http:" ? "ws:" : "wss:";
		const url = isLocal
			? `ws://${location.hostname}:8080`
			: `${protocol}//${location.hostname}`;

		this.ws = new WebSocket(url);

		this.ws.onopen = (e) =>
		{
			manualClose = false;
			connectionOpen = true;
			console.log(e);
			this.ws?.send(JSON.stringify(UserDataStore.state));

			this.update({
				hasConnection: true
			});

			if (this.state.packs.length === 0)
			{
				Platform.getPacks(this.state.familyMode ? "family" : undefined)
					.then(data =>
					{
						const defaultPacks = this.getDefaultPacks(data);

						this.update({
							packs: data,
							includedPacks: defaultPacks
						})
					});
			}
		};

		this.ws.onmessage = (e) =>
		{
			const data = JSON.parse(e.data) as { game: GamePayload };
			if (!this.state.game?.id || data.game.id === this.state.game?.id)
			{
				this.update(data);
			}
		};

		this.ws.onclose = () =>
		{
			connectionOpen = false;
			if (!manualClose)
			{
				this.retry();
			}
		};
	}

	public getDefaultPacks(packs: ICardPackSummary[])
	{
		return packs.filter(a => !a.packId.match(/pax|conversion|gencon|mass_effect|midterm|house_of_cards|jack_white|hawaii|desert_bus|reject/gi)
			&& a.isOfficial
		).map(p => p.packId);
	}

	public clear()
	{
		this.ws?.close();
		this.update(_GameDataStore.InitialState);
	}

	private retry(count = 0)
	{
		this.update({
			hasConnection: false
		});

		console.log("Lost server connection. Retrying...", count);

		this.initialize();

		setTimeout(() =>
		{
			if (!connectionOpen)
			{
				if (count < 5)
				{
					this.retry(count + 1);
				}
				else
				{
					alert("You've lost your connection to the server - please try refreshing! If this continues happening, the server is probably under load. Sorry about that!");
				}
			}
		}, 2000);

	}

	protected update(data: Partial<IGameDataStorePayload>)
	{
		let prev = {...this.state};

		super.update(data);

		console.groupCollapsed("[GameDataStore] Update...");
		console.log("New: ", data);
		console.log("Prev: ", prev);
		console.log("Result:", this.state);
		console.groupEnd();

		const meGuid = UserDataStore.state.playerGuid;

		const prevBuildVersion = prev.game?.buildVersion;
		const newBuildVersion = this.state.game?.buildVersion;
		if (prevBuildVersion && newBuildVersion && prevBuildVersion !== newBuildVersion)
		{
			location.href = location.href + "";
		}

		if (!deepEqual(prev.game?.roundCards, this.state.game?.roundCards))
		{
			this.loadRoundCards();
		}

		if (!deepEqual(prev.game?.players[meGuid], this.state.game?.players[meGuid]))
		{
			this.loadPlayerCards(meGuid);
		}

		if (prev.game?.blackCard !== this.state.game?.blackCard)
		{
			this.loadBlackCard();
		}
	}

	private loadRoundCards()
	{
		const toLoad = this.state.game?.roundCards ?? [];

		const cardIds = ArrayFlatten<number>(Object.values(toLoad));

		return this.loadWhiteCardMap(cardIds)
			.then(roundCardDefs => this.update({
				roundCardDefs
			}));
	}

	private loadPlayerCards(playerGuid: string)
	{
		const toLoad = this.state.game?.players[playerGuid].whiteCards;
		if (!toLoad)
		{
			return;
		}

		const cardIds = Object.values(toLoad);

		return this.loadWhiteCardMap(cardIds)
			.then(playerCardDefs => this.update({
				playerCardDefs
			}));
	}

	private loadBlackCard()
	{
		const blackCard = this.state.game?.blackCard;
		if ((!blackCard || blackCard.cardIndex === -1) && blackCard?.cardIndex !== 0)
		{
			return Promise.resolve();
		}

		return Platform.getBlackCard(blackCard)
			.then(blackCardDef => this.update({
				blackCardDef
			}));
	}

	private async loadWhiteCardMap(cardIds: CardId[]): Promise<WhiteCardMap>
	{
		const data = await Platform.getWhiteCards(cardIds);

		let map: WhiteCardMap = {};
		data.forEach((cardDef, index) =>
		{
			const cardId = cardIds[index];
			if (!(cardId.packId in map))
			{
				map[cardId.packId] = {};
			}

			map[cardId.packId][cardId.cardIndex] = cardDef;
		});

		console.log(map);

		return map;
	}

	public hydrate(gameId: string)
	{
		console.log("[GameDataStore] Hydrating...", gameId);

		return Platform.getGame(gameId)
			.then(data =>
			{
				this.update({
					loaded: true,
					game: data as GamePayload
				});
			})
			.catch(e =>
			{
				this.update({
					loaded: true,
				});
				console.error(e);
			});
	}

	public playWhiteCards(cardIds: CardId[] | undefined, userGuid: string)
	{
		console.log("[GameDataStore] Played white cards...", cardIds, userGuid);

		if (!this.state.game || !cardIds)
		{
			throw new Error("Invalid card or game!");
		}

		return Platform.playCards(this.state.game.id, userGuid, cardIds)
			.catch(e => console.error(e));
	}

	public chooseWinner(chooserGuid: string, winningPlayerGuid: string)
	{
		if (!this.state.game || !chooserGuid)
		{
			throw new Error("Invalid card or game!");
		}

		return Platform.selectWinnerCard(this.state.game.id, chooserGuid, winningPlayerGuid)
			.catch(e => console.error(e));
	}

	public revealNext(userGuid: string)
	{
		if (!this.state.game)
		{
			throw new Error("Invalid card or game!");
		}

		return Platform.revealNext(this.state.game.id, userGuid)
			.catch(e => console.error(e));
	}

	public skipBlack(userGuid: string)
	{
		if (!this.state.game)
		{
			throw new Error("Invalid card or game!");
		}

		return Platform.skipBlack(this.state.game.id, userGuid)
			.catch(e => console.error(e));
	}

	public startRound(userGuid: string)
	{
		if (!this.state.game)
		{
			throw new Error("Invalid card or game!");
		}

		return Platform.startRound(this.state.game.id, userGuid)
			.catch(e => console.error(e));
	}

	public addRandomPlayer(userGuid: string)
	{
		if (!this.state.game)
		{
			throw new Error("Invalid card or game!");
		}

		return Platform.addRandomPlayer(this.state.game.id, userGuid)
			.catch(e => console.error(e));
	}

	public setIncludedPacks(includedPacks: string[])
	{
		this.update({
			includedPacks
		});
	}

	public setIncludedCardcastPacks(includedCardcastPacks: string[])
	{
		const newPacks = includedCardcastPacks.filter(p => !this.state.includedCardcastPacks.includes(p));

		if(newPacks.length > 0)
		{
			this.update({
				cardcastPacksLoading: true
			});
		}

		let loaded = 0;
		newPacks.forEach(pack =>
		{
			CardCastApi.getDeck(pack)
				.then(packData =>
				{
					this.update({
						cardcastPackDefs: {
							...this.state.cardcastPackDefs,
							[pack]: packData
						}
					});
				})
				.finally(() => {
					loaded++;
					if(loaded === newPacks.length)
					{
						this.update({
							cardcastPacksLoading: false
						});
					}
				});
		});

		this.update({
			includedCardcastPacks
		});
	}

	public setRequiredRounds(rounds: number)
	{
		this.update({
			roundsRequired: rounds
		});
	}

	public setInviteLink(url: string)
	{
		this.update({
			inviteLink: url
		});
	}

	public restart(playerGuid: string)
	{
		this.update({
			loaded: false
		});

		const game = this.state.game;
		if (!game)
		{
			throw new Error("Invalid card or game!");
		}

		return Platform.restart(game.id, playerGuid).then(() =>
		{
			this.update({
				loaded: true
			});
		});
	}

	public forfeit(playerGuid: string, cardsNeeded: number)
	{
		const game = this.state.game;
		if (!game)
		{
			throw new Error("Invalid card or game!");
		}

		const toPlay: CardId[] = [];
		const myCards = game.players[playerGuid].whiteCards;
		while (toPlay.length < cardsNeeded)
		{
			let cardIndex = Math.floor(Math.random() * myCards.length);
			const card = myCards[cardIndex];
			if (!toPlay.find(a => deepEqual(card, a)))
			{
				toPlay.push(card);
			}
		}

		return this.playWhiteCards(toPlay, playerGuid)
			.then(() =>
			{
				Platform.forfeit(game.id, playerGuid, toPlay);
			});
	}
}

export const GameDataStore = _GameDataStore.Instance;