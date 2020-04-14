import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import * as React from "react";
import {useDataStore} from "../../../Global/Utils/HookUtils";
import {GameDataStore} from "../../../Global/DataStore/GameDataStore";
import {WhiteCard} from "../../../UI/WhiteCard";
import {UserDataStore} from "../../../Global/DataStore/UserDataStore";
import sanitize from "sanitize-html";

export interface IPickWinnerProps
{
	children?: undefined;
	canPick: boolean;
	timeToPick: boolean;
	revealMode: boolean;
	hasWinner: boolean;
	onPickWinner?: (winnerGuid: string) => void;
}

export const PickWinner: React.FC<IPickWinnerProps> = (
	{
		onPickWinner,
		canPick,
		timeToPick,
		children,
		hasWinner,
		revealMode
	}
) =>
{

	const gameData = useDataStore(GameDataStore);
	const userData = useDataStore(UserDataStore);

	const me = gameData.game?.players?.[userData.playerGuid] ?? gameData.game?.spectators?.[userData.playerGuid];

	const cardDefsLoaded = Object.values(gameData.game?.roundCards ?? {}).length === 0 || Object.keys(gameData.roundCardDefs).length > 0;

	if (!me || !gameData.game || !cardDefsLoaded)
	{
		return null;
	}

	const {
		roundCards,
	} = gameData.game;

	const roundCardKeys = Object.keys(roundCards ?? {});
	const roundCardValues = roundCardKeys
		.map(playerGuid => roundCards[playerGuid]
			.map(cardId => gameData.roundCardDefs[cardId]));


	return (
		<>
			{timeToPick && !revealMode && !hasWinner && (
				<>
					<Grid container spacing={2}>
						{roundCardKeys.map((playerGuid, i) => (
							<Grid item xs={12} sm={6}>
								<WhiteCard actions={canPick && (
									<Button
										variant={"contained"}
										color={"primary"}
										onClick={() => onPickWinner?.(playerGuid)}
									>
										Pick Winner
									</Button>
								)}>
									{roundCardValues[i].map(card => card && (
										<>
											<div dangerouslySetInnerHTML={{__html: sanitize(card)}} />
											<Divider style={{margin: "1rem 0"}}/>
										</>
									))}
								</WhiteCard>
							</Grid>
						))}
					</Grid>
					<Divider style={{margin: "1rem 0"}}/>
				</>
			)}
		</>
	)
}