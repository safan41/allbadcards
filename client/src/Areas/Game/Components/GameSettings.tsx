import React, {ChangeEvent, useState} from "react";
import {DialogActions, DialogTitle, LinearProgress, ListItemSecondaryAction, Slider, TextField, Typography} from "@material-ui/core";
import {useDataStore} from "../../../Global/Utils/HookUtils";
import {GameDataStore} from "../../../Global/DataStore/GameDataStore";
import Checkbox from "@material-ui/core/Checkbox";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormGroup from "@material-ui/core/FormGroup";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Button from "@material-ui/core/Button";
import ExpansionPanel from "@material-ui/core/ExpansionPanel";
import ExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary";
import {ExpandMore} from "@material-ui/icons";
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import Divider from "@material-ui/core/Divider";
import makeStyles from "@material-ui/styles/makeStyles/makeStyles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import {SettingsBlockGame} from "./Settings/SettingsBlockGame";
import {MdEdit} from "react-icons/all";
import {SettingsBlockMainPacks} from "./Settings/SettingsBlockMainPacks";
import IconButton from "@material-ui/core/IconButton";
import {SettingsBlockCustomPacks} from "./Settings/SettingsBlockCustomPacks";

const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

const useStyles = makeStyles({
	whiteBox: {
		height: "1rem",
		border: "1px solid black",
		padding: 5
	},
	blackBox: {
		marginLeft: 20,
		padding: 5,
		height: "1rem",
		background: "black",
		border: "1px solid black",
		color: "white",
	}
});

export const GameSettings = () =>
{
	const [gameSettingsVisible, setGameSettingsVisible] = useState(false);
	const [mainPackSettingsVisible, setMainPackSettingsVisible] = useState(false);
	const [customPackSettingsVisible, setCustomPackSettingsVisible] = useState(false);

	return (
		<div>
			<div style={{marginTop: "1rem"}}>
				<List>
					<ListItem>
						<ListItemText primary={"General"} secondary={"Basic game settings"}/>
						<ListItemSecondaryAction style={{right: 0}}>
							<IconButton color={"primary"} onClick={() => setGameSettingsVisible(true)}>
								<MdEdit/>
							</IconButton>
						</ListItemSecondaryAction>
					</ListItem>
					<ListItem>
						<ListItemText primary={"Main Card Packs"} secondary={"Pick from official and third-party card packs for your game"} />
						<ListItemSecondaryAction style={{right: 0}}>
							<IconButton color={"primary"} onClick={() => setMainPackSettingsVisible(true)}>
								<MdEdit/>
							</IconButton>
						</ListItemSecondaryAction>
					</ListItem>
					<ListItem>
						<ListItemText primary={"Custom Card Packs"} secondary={
							<span>
								Add custom card packs from <a href={"https://www.cardcastgame.com/browse"} target={"_null"}>CardCast's</a> robust custom deck list.
							</span>
						} />
						<ListItemSecondaryAction style={{right: 0}}>
							<IconButton color={"primary"} onClick={() => setCustomPackSettingsVisible(true)}>
								<MdEdit/>
							</IconButton>
						</ListItemSecondaryAction>
					</ListItem>
				</List>
			</div>
			<Dialog open={gameSettingsVisible} onClose={() => setGameSettingsVisible(false)}>
				<DialogTitle>General</DialogTitle>
				<DialogContent>
					<SettingsBlockGame/>
				</DialogContent>
				<Divider />
				<DialogActions>
					<Button onClick={() => setGameSettingsVisible(false)} color="primary">
						Save
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={mainPackSettingsVisible} onClose={() => setMainPackSettingsVisible(false)} maxWidth={"xl"}>
				<DialogTitle>Main Card Packs</DialogTitle>
				<DialogContent>
					<SettingsBlockMainPacks/>
				</DialogContent>
				<Divider />
				<DialogActions>
					<Button onClick={() => setMainPackSettingsVisible(false)} color="primary">
						Save
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={customPackSettingsVisible} onClose={() => setCustomPackSettingsVisible(false)} maxWidth={"xl"}>
				<DialogTitle>Custom Card Packs</DialogTitle>
				<DialogContent>
					<SettingsBlockCustomPacks/>
				</DialogContent>
				<Divider />
				<DialogActions>
					<Button onClick={() => setCustomPackSettingsVisible(false)} color="primary">
						Save
					</Button>
				</DialogActions>
			</Dialog>
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
			<Typography style={{marginBottom: "0.5rem"}}>Chat / Video invite URL</Typography>
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
			<Divider/>
			<Typography>Rounds required to win: {gameData.roundsRequired}</Typography>
			<Slider
				defaultValue={gameData.roundsRequired}
				onChange={onChange}
				aria-labelledby="discrete-slider"
				valueLabelDisplay="auto"
				step={1}
				marks
				min={1}
				max={50}
			/>
		</FormControl>
	);
};