import Divider from "@material-ui/core/Divider";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Button from "@material-ui/core/Button";
import {ListItemSecondaryAction, Typography} from "@material-ui/core";
import FormGroup from "@material-ui/core/FormGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import React from "react";
import {useDataStore} from "../../../../Global/Utils/HookUtils";
import {GameDataStore} from "../../../../Global/DataStore/GameDataStore";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import makeStyles from "@material-ui/styles/makeStyles/makeStyles";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import List from "@material-ui/core/List";
import Switch from "@material-ui/core/Switch";


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

export const SettingsBlockMainPacks = () =>
{
	const gameData = useDataStore(GameDataStore);

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
		<>
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
			<List>
				{gameData.packs?.map(pack => (
					<>
					<ListItem>
						<ListItemText primary={pack.name} secondary={`${pack.quantity.black} black cards, ${pack.quantity.white} white cards`}/>
						<ListItemSecondaryAction>
							<Switch
								edge="end"
								color={"primary"}
								onChange={onPacksChange}
								name={pack.packId}
								checked={gameData.includedPacks.indexOf(pack.packId) > -1}
							/>
						</ListItemSecondaryAction>
					</ListItem>
					</>
				))}
			</List>
		</>
	);
};