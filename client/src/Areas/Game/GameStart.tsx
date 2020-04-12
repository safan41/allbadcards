import React, {useEffect, useState} from "react";
import Button from "@material-ui/core/Button";
import {makeStyles} from "@material-ui/core/styles";
import GamePreview from "./GamePreview";
import {Platform} from "../../Global/Platform/platform";
import {UserDataStore} from "../../Global/DataStore/UserDataStore";
import {GameDataStore} from "../../Global/DataStore/GameDataStore";
import {Container} from "@material-ui/core";
import Typography from "@material-ui/core/Typography";
import {GameSettings} from "./Components/GameSettings";
import {CopyGameLink} from "../../UI/CopyGameLink";
import Divider from "@material-ui/core/Divider";

interface IGameStartProps
{
	id: string;
}

const GameStart: React.FC<IGameStartProps> = (props) =>
{
	const [gameData, setGameData] = useState(GameDataStore.state);

	useEffect(() =>
	{
		GameDataStore.listen(setGameData);
	}, []);

	const onClickStart = () =>
	{
		Platform.startGame(UserDataStore.state.playerGuid, props.id, gameData.includedPacks, gameData.includedCardcastPacks)
			.catch(e => console.error(e));
	};

	const players = Object.keys(gameData.game?.players ?? {});
	const canStart = players.length > 1;

	return (
		<GamePreview id={props.id}>
			<Button variant={"contained"} color={"primary"} onClick={onClickStart} disabled={!canStart}>
				Start
			</Button>
			<Divider style={{margin: "2rem 0"}} />
			<GameSettings/>
		</GamePreview>
	);
};

export default GameStart;