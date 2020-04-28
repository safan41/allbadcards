import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import React, {ChangeEvent, useState} from "react";
import {GameDataStore} from "../../../../Global/DataStore/GameDataStore";
import FormControl from "@material-ui/core/FormControl";
import Divider from "@material-ui/core/Divider";
import {Slider, TextField, Typography} from "@material-ui/core";
import {useDataStore} from "../../../../Global/Utils/HookUtils";

const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

export const SettingsBlockGame: React.FC = () =>
{
	return (
		<div style={{paddingBottom: "1rem"}}>
			<SliderField/>
			<UrlField/>
		</div>
	);
};

let timeout = 0;
const UrlField = () =>
{
	const [url, setUrl] = useState("");
	const [invalid, setInvalid] = useState(false);

	const setOuter = (value: string) =>
	{
		setUrl(value);

		clearTimeout(timeout);
		timeout = window.setTimeout(() =>
		{
			const invalid = value.length > 0 && !value.match(urlRegex);
			setInvalid(invalid);
			if (!invalid)
			{
				GameDataStore.setInviteLink(value);
			}
		}, 500);
	};

	return (
		<FormControl component="fieldset" style={{width: "100%"}}>
			<Divider style={{margin: "1rem 0"}}/>
			<Typography>Chat / Video invite URL</Typography>
			<Typography style={{marginBottom: "0.5rem"}} variant={"caption"}>Allow players to easily join your video chat by adding an invite URL</Typography>
			<TextField value={url} label="URL" variant="outlined" onChange={(e) => setOuter(e.target.value)} error={invalid}/>
		</FormControl>
	);
};

let sliderTimeout = 0;
const SliderField = () =>
{
	const gameData = useDataStore(GameDataStore);

	const onChange = (e: ChangeEvent<{}>, v: number | number[]) =>
	{
		clearTimeout(sliderTimeout);
		sliderTimeout = window.setTimeout(() =>
		{
			GameDataStore.setRequiredRounds(v as number)
		}, 500);
	};

	return (
		<FormControl component="fieldset" style={{width: "100%"}}>
			<Divider style={{margin: "0 0 1rem 0"}}/>
			<Typography>Rounds required to win: {gameData.roundsRequired}</Typography>
			<Typography style={{marginBottom: "0.5rem"}} variant={"caption"}>The game will end if a player wins this many rounds</Typography>
			<Slider
				defaultValue={gameData.roundsRequired}
				onChange={onChange}
				aria-labelledby="discrete-slider"
				valueLabelDisplay="auto"
				step={1}
				marks
				min={1}
				max={25}
			/>
		</FormControl>
	);
};