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
import {LoadingButton} from "../../UI/LoadingButton";

interface IGameStartProps
{
	id: string;
}

const GameStart: React.FC<IGameStartProps> = (props) =>
{
	const [gameData, setGameData] = useState(GameDataStore.state);
	const [startLoading, setStartLoading] = useState(false);

	useEffect(() =>
	{
		GameDataStore.listen(setGameData);
	}, []);

	const onClickStart = () =>
	{
		setStartLoading(true);

		Platform.startGame(
			UserDataStore.state.playerGuid,
			props.id,
			gameData.includedPacks,
			gameData.includedCardcastPacks,
			gameData.roundsRequired,
			gameData.inviteLink,
			gameData.password)
			.catch(e => console.error(e))
			.finally(() => setStartLoading(false));
	};

	const players = Object.keys(gameData.game?.players ?? {});
	const canStart = players.length > 1;

	return (
		<GamePreview id={props.id}>
			<LoadingButton loading={startLoading} variant={"contained"} color={"primary"} onClick={onClickStart} disabled={!canStart}>
				Start
			</LoadingButton>
			<Divider style={{margin: "3rem 0"}} />
			<Typography variant={"h4"}>Settings</Typography>
			<GameSettings/>
		</GamePreview>
	);
};

export default GameStart;