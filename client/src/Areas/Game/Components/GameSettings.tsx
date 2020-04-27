import React, {ChangeEvent, useState} from "react";
import {LinearProgress, Slider, TextField, Typography} from "@material-ui/core";
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
	const gameData = useDataStore(GameDataStore);
	const [cardCastDeckCode, setCardCastDeckCode] = useState("");

	const onPacksChange = (event: React.ChangeEvent<HTMLInputElement>) =>
	{
		const newPacks = event.target.checked
			? [...gameData.includedPacks, event.target.name]
			: gameData.includedPacks.filter(a => a !== event.target.name);
		GameDataStore.setIncludedPacks(newPacks);
	};

	const selectDefault = () =>
	{
		GameDataStore.setIncludedPacks(Array.from(new Set([...gameData.includedPacks, ...GameDataStore.getDefaultPacks(gameData.packs)])));
	};

	const selectAll = () =>
	{
		GameDataStore.setIncludedPacks(gameData.packs?.map(p => p.packId));
	};

	const selectNone = () =>
	{
		GameDataStore.setIncludedPacks([]);
	};

	const selectOfficial = () =>
	{
		const packs = gameData.packs
			?.filter(pack => pack.isOfficial)
			?.map(pack => pack.packId);

		GameDataStore.setIncludedPacks(Array.from(new Set([...gameData.includedPacks, ...packs])));
	};

	const onAddCardCastDeck = () =>
	{
		if (cardCastDeckCode.length !== 5)
		{
			return;
		}

		if (!gameData.includedCardcastPacks?.includes(cardCastDeckCode))
		{
			GameDataStore.setIncludedCardcastPacks([...gameData.includedCardcastPacks, cardCastDeckCode]);
		}

		setCardCastDeckCode("");
	};

	const selectThirdParty = () =>
	{
		const packs = gameData.packs
			?.filter(pack => !pack.isOfficial)
			?.map(pack => pack.packId);

		GameDataStore.setIncludedPacks(Array.from(new Set([...gameData.includedPacks, ...packs])));
	};

	const classes = useStyles();

	const mobile = useMediaQuery('(max-width:600px)');

	return (
		<div>
			<div style={{marginTop: "1rem"}}>
				<ExpansionPanel>
					<ExpansionPanelSummary
						expandIcon={<ExpandMore/>}
					>
						<Typography>Game</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails style={{display: "block"}}>
						<SliderField/>
						<UrlField/>
					</ExpansionPanelDetails>
				</ExpansionPanel>
				{!gameData.familyMode && (
					<ExpansionPanel>
						<ExpansionPanelSummary
							expandIcon={<ExpandMore/>}
						>
							<Typography>Base Card Packs</Typography>
						</ExpansionPanelSummary>
						<ExpansionPanelDetails>
							<FormControl component="fieldset">
								<Divider style={{marginBottom: "1rem"}}/>
								<div>
									<ButtonGroup orientation={mobile ? "vertical" : "horizontal"}>
										<Button onClick={selectAll}>All</Button>
										<Button onClick={selectNone}>None</Button>
										<Button onClick={selectDefault}>+ Suggested</Button>
										<Button onClick={selectOfficial}>+ Official Packs</Button>
										<Button onClick={selectThirdParty}>+ Third-Party Packs</Button>
									</ButtonGroup>
									<Typography style={{padding: "1rem 0"}}>
										<strong>{gameData.includedPacks?.length ?? 0}</strong> packs selected
									</Typography>
								</div>
								{gameData.packs?.map(pack => (
									<FormGroup key={pack.packId}>
										<FormControlLabel
											control={
												<Checkbox
													color={"primary"}
													checked={gameData.includedPacks.indexOf(pack.packId) > -1}
													onChange={onPacksChange}
													name={pack.packId}/>
											}
											label={
												<div>
													<span>
														{!pack.isOfficial && <small style={{fontSize: "0.75em", verticalAlign: "middle"}}>[Third-Party] </small>}
														{pack.name}
													</span>
													<span className={classes.blackBox}>{pack.quantity.black}</span>
													<span className={classes.whiteBox}>{pack.quantity.white}</span>
												</div>
											}
										/>
									</FormGroup>
								))}
							</FormControl>
						</ExpansionPanelDetails>
					</ExpansionPanel>
				)}
				<ExpansionPanel>
					<ExpansionPanelSummary
						expandIcon={<ExpandMore/>}
					>
						<Typography>Custom Card Packs</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails style={{display: "block"}}>
						<Typography variant={"caption"}>
							Custom packs come from <a href={"https://www.cardcastgame.com/browse"} target={"_blank"}>CardCast</a>'s massive card database
						</Typography>
						<div style={{marginTop: "2rem"}}>
							<TextField value={cardCastDeckCode} size={"small"} onChange={e => setCardCastDeckCode(e.target.value)} id="outlined-basic" label="CardCast Deck Code" variant="outlined"/>
							<Button onClick={onAddCardCastDeck} disabled={cardCastDeckCode.length !== 5}>Add Deck</Button>
						</div>

						<List>
							{gameData.includedCardcastPacks?.map(packId =>
							{
								const packDef = gameData.cardcastPackDefs[packId];
								if (!packDef)
								{
									return null;
								}

								return (
									<ListItem>
										<ListItemText>{packDef.name}</ListItemText>
									</ListItem>
								);
							})}
						</List>
						{gameData.cardcastPacksLoading && (
							<LinearProgress color="primary" />
						)}
					</ExpansionPanelDetails>
				</ExpansionPanel>
			</div>
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
			<Divider style={{margin: "1rem 0"}}/>
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