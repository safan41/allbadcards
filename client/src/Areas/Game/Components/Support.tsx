import {ListItem, ListItemText, Typography} from "@material-ui/core";
import React, {useEffect, useState} from "react";
import Button from "@material-ui/core/Button";
import {Twemoji} from "react-emoji-render";
import {Platform} from "../../../Global/Platform/platform";
import List from "@material-ui/core/List";
import {RiExternalLinkLine} from "react-icons/all";
import {makeStyles} from "@material-ui/styles";

const useStyles = makeStyles({
	link: {
		textDecoration: 'none'
	}
});

export const Support = () =>
{
	const classes = useStyles();
	const [randomThankYou, setRandomThankYou] = useState(0);

	useEffect(() =>
	{
		setRandomThankYou(Math.random());
		Platform.trackEvent("saw-support-message");
	}, []);

	const thankYous = [
		<Button
			variant={"contained"}
			color={"primary"}
			style={{color: "white", textDecoration: "none", marginTop: "1rem", backgroundColor: "#058dc7"}}
			startIcon={<Twemoji text={"☕"}/>}
			onClick={() => Platform.trackEvent("support-link-click", "kofi")}
			href="https://ko-fi.com/A76217J" target="_blank"
		>
			Buy me a coffee
		</Button>,
		<Button
			variant={"contained"}
			color={"primary"}
			style={{color: "white", textDecoration: "none", marginTop: "1rem", backgroundColor: "#058dc7"}}
			startIcon={<Twemoji text={"☕"}/>}
			onClick={() => Platform.trackEvent("support-link-click", "bmac-coffee")}
			href="https://www.buymeacoffee.com/allbadcards" target="_blank"
		>
			Buy me a coffee
		</Button>,
	];

	const which = Math.floor(randomThankYou * thankYous.length);
	const thankYouButton = thankYous[which];

	return (
		<div style={{
			marginTop: "3rem",
			marginBottom: "8rem",
			textAlign: "center"
		}}>
			<Typography variant={"h5"}>Did you enjoy the game? One dude made this site and it runs on donations!</Typography>
			<Typography style={{marginTop: "1rem"}}>
				<List>
					<ListItem>
						<ListItemText style={{textAlign: "center"}} primary={<strong>vennmo</strong>} secondary={<>
							<a className={classes.link} href={"https://venmo.com/allbadcards"} target={"_blank"}>@allbadcards <RiExternalLinkLine/></a>
						</>}/>
					</ListItem>
					<ListItem>
						<ListItemText style={{textAlign: "center"}} primary={<strong>cash app</strong>} secondary={<>
							<a className={classes.link} href={"https://cash.app/$allbadcards"} target={"_blank"}>$allbadcards <RiExternalLinkLine/></a>
						</>}/>
					</ListItem>
				</List>
			</Typography>
			{thankYouButton}
		</div>
	);
};