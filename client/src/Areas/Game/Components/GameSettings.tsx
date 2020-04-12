import React, {useEffect} from "react";
import {Typography} from "@material-ui/core";
import {useDataStore, usePrevious} from "../../../Global/Utils/HookUtils";
import {GameDataStore} from "../../../Global/DataStore/GameDataStore";
import MenuItem from "@material-ui/core/MenuItem";
import Checkbox from "@material-ui/core/Checkbox";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormGroup from "@material-ui/core/FormGroup";
import FormLabel from "@material-ui/core/FormLabel";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Button from "@material-ui/core/Button";
import ExpansionPanel from "@material-ui/core/ExpansionPanel";
import ExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary";
import {ExpandMore} from "@material-ui/icons";
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";

export const GameSettings = () =>
{
	const gameData = useDataStore(GameDataStore);

	const onPacksChange = (event: React.ChangeEvent<HTMLInputElement>) =>
	{
		console.log(event.target);
		const newPacks = event.target.checked
			? [...gameData.includedPacks, event.target.name]
			: gameData.includedPacks.filter(a => a !== event.target.name);
		GameDataStore.setIncludedPacks(newPacks);
	};

	const selectDefault = () =>
	{
		GameDataStore.setIncludedPacks(gameData.packs?.slice(0, 19).map(p => p.packId));
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
		GameDataStore.setIncludedPacks(gameData.packs?.slice(0, 30).map(p => p.packId));
	};

	const selectThirdParty = () =>
	{
		GameDataStore.setIncludedPacks(gameData.packs?.slice(31).map(p => p.packId));
	};


	return (
		<div>
			<Typography variant={"h3"}>Game Settings</Typography>

			<div style={{marginTop: "1rem"}}>
				<ExpansionPanel>
					<ExpansionPanelSummary
						expandIcon={<ExpandMore/>}
					>
						<Typography>Card Packs</Typography>
					</ExpansionPanelSummary>
					<ExpansionPanelDetails>
						<FormControl component="fieldset">
							<div>
								<ButtonGroup>
									<Button onClick={selectDefault}>Default</Button>
									<Button onClick={selectAll}>All</Button>
									<Button onClick={selectNone}>None</Button>
									<Button onClick={selectOfficial}>Official Only</Button>
									<Button onClick={selectThirdParty}>Third-Party Only</Button>
								</ButtonGroup>
								<Typography style={{padding: "1rem 0"}}>
									<strong>{gameData.includedPacks?.length ?? 0}</strong> packs selected
								</Typography>
							</div>
							{gameData.packs?.map(pack => (
								<FormGroup>
									<FormControlLabel
										control={
											<Checkbox
												color={"primary"}
												checked={gameData.includedPacks.indexOf(pack.packId) > -1}
												onChange={onPacksChange}
												name={pack.packId}/>
										}
										label={pack.packName}
									/>
								</FormGroup>
							))}
						</FormControl>
					</ExpansionPanelDetails>
				</ExpansionPanel>
			</div>
		</div>
	);
};