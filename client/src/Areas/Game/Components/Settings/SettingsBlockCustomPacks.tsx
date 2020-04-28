import {LinearProgress, TextField, Typography} from "@material-ui/core";
import Button from "@material-ui/core/Button";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import React, {useState} from "react";
import {GameDataStore} from "../../../../Global/DataStore/GameDataStore";
import {useDataStore} from "../../../../Global/Utils/HookUtils";
import {SettingsBlockMainPacks} from "./SettingsBlockMainPacks";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import IconButton from "@material-ui/core/IconButton";
import {MdDelete, MdEdit} from "react-icons/all";
import DialogContent from "@material-ui/core/DialogContent";
import Divider from "@material-ui/core/Divider";
import Dialog from "@material-ui/core/Dialog";

export const SettingsBlockCustomPacks: React.FC = () =>
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

	const removeCardCastDeck = (packId: string) =>
	{
		const newDecks = [...gameData.includedCardcastPacks].filter(p => p !== packId);

		GameDataStore.setIncludedCardcastPacks(newDecks);
	};

	return (
		<>
			<div>
				<TextField value={cardCastDeckCode} style={{margin: "0 1rem 1rem 0"}} size={"small"} onChange={e => setCardCastDeckCode(e.target.value)} id="outlined-basic" label="CardCast Deck Code" variant="outlined"/>
				<Button variant={"contained"} color={"primary"} onClick={onAddCardCastDeck} disabled={cardCastDeckCode.length !== 5}>
					Add Deck
				</Button>
			</div>

			{(gameData.includedCardcastPacks?.length ?? 0 > 0) ?
				(
					<List>
						{gameData.includedCardcastPacks?.map((packId, index) =>
						{
							const packDef = gameData.cardcastPackDefs[packId];
							if (!packDef)
							{
								return null;
							}

							return (
								<>
									{index > 0 && (
										<Divider/>
									)}
									<ListItem>
										<ListItemText>{packDef.name}</ListItemText>
										<ListItemSecondaryAction>
											<IconButton color={"primary"} onClick={() => removeCardCastDeck(packId)}>
												<MdDelete/>
											</IconButton>
										</ListItemSecondaryAction>
									</ListItem>
								</>
							);
						})}
					</List>
				)
				:
				null
			}
			{gameData.cardcastPacksLoading && (
				<LinearProgress color="primary"/>
			)}
		</>
	);
};