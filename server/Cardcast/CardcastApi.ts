import fetch from "node-fetch";

export class CardcastApi
{
	public static doGet<T>(url: string)
	{
		return fetch(url)
			.then(r => r.json()) as Promise<T>;
	}

	private static buildUrl(path: string)
	{
		return `https://api.cardcastgame.com${path}`;
	}

	public static getDeck(deckId: string)
	{
		const url = this.buildUrl(`/decks/${deckId}`);

		return this.doGet(url);
	}

	public static getDeckCards(deckId: string)
	{
		const url = this.buildUrl(`/decks/${deckId}/cards`);

		return this.doGet(url);
	}

	public static getDeckCalls(deckId: string)
	{
		const url = this.buildUrl(`/decks/${deckId}/calls`);

		return this.doGet(url);
	}

	public static getDeckResponses(deckId: string)
	{
		const url = this.buildUrl(`/decks/${deckId}/responses`);

		return this.doGet(url);
	}
}