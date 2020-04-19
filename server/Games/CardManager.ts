import {GameItem, GameManager} from "./GameManager";
import fs from "fs";
import * as path from "path";

interface BlackCard
{
	text: string;
	pick: number;
}

type WhiteCard = string;

interface ICardPack
{
	name: string;
	black: number[];
	white: number[];
}

export class CardManager
{
	public static blackCards: BlackCard[];
	public static whiteCards: WhiteCard[];
	public static packs: { [key: string]: ICardPack } = {};
	public static packOrder: string[];

	public static initialize()
	{
		const allCardsPath = path.resolve(process.cwd(), "./server/data/all_cards.json");
		const allCardsFile = fs.readFileSync(allCardsPath, "utf8");

		const allCards = JSON.parse(allCardsFile);
		const packsKeys = Object.keys(allCards).filter(k =>
			k !== "blackCards"
			&& k !== "whiteCards"
			&& k !== "order");

		packsKeys.forEach(k =>
		{
			this.packs[k] = allCards[k];
		});

		this.packOrder = allCards.order;
		this.blackCards = allCards.blackCards;
		this.whiteCards = allCards.whiteCards;
	}

	private static getAllowedCard(cards: number[], usedCards: number[]): number
	{
		const allowedCards = cards.filter(a => usedCards.indexOf(a) < 0);
		const index = Math.floor(Math.random() * allowedCards.length);
		const newCardId = allowedCards[index];

		return newCardId;
	}

	public static nextBlackCard(gameItem: GameItem)
	{
		const allowedIds = gameItem.settings.includedPacks.reduce((acc, packName) =>
		{
			const pack = this.packs[packName];
			acc.push(...pack.black);
			return acc;
		}, [] as number[]);

		const newCard = this.getAllowedCard(allowedIds, gameItem.usedBlackCards);

		const newGame = {...gameItem};
		newGame.blackCard = newCard;
		newGame.usedBlackCards.push(newCard);

		return newGame;
	}

	public static dealWhiteCards(gameItem: GameItem): GameItem
	{
		const newGame = {...gameItem};

		let usedWhiteCards = [...gameItem.usedWhiteCards];

		const playerKeys = Object.keys(gameItem.players);

		const allWhiteCards = gameItem.settings.includedPacks.reduce((acc, packId) =>
		{
			const packCount = this.packs[packId].white.length;
			acc += packCount;
			return acc;
		}, 0);

		const availableCardRemainingCount = allWhiteCards - usedWhiteCards.length;

		// If we run out of white cards, reset them
		if (availableCardRemainingCount < playerKeys.length)
		{
			usedWhiteCards = [];
		}

		const foundBlackCard = this.blackCards[gameItem.blackCard];

		const targetHandSize = foundBlackCard?.pick === 3
			? 12
			: 10;

		const allowedIds = gameItem.settings.includedPacks.reduce((acc, packName) =>
		{
			const pack = this.packs[packName];
			acc.push(...pack.white);
			return acc;
		}, [] as number[]);

		playerKeys.forEach(playerGuid =>
		{
			const cards = [...gameItem.players[playerGuid].whiteCards];

			while (cards.length < targetHandSize)
			{
				const newCard = this.getAllowedCard(allowedIds, usedWhiteCards);
				usedWhiteCards.push(newCard);

				cards.push(newCard);
			}

			newGame.players[playerGuid].whiteCards = cards;
		});

		newGame.usedWhiteCards = usedWhiteCards;

		return newGame;
	}

	public static getWhiteCard(cardId: number)
	{
		return this.whiteCards[cardId];
	}

	public static getBlackCard(cardId: number)
	{
		return this.blackCards[cardId];
	}
}