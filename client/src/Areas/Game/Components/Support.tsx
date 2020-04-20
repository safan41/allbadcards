import {Typography} from "@material-ui/core";
import React, {useEffect, useState} from "react";
import Button from "@material-ui/core/Button";
import {Twemoji} from "react-emoji-render";
import {Platform} from "../../../Global/Platform/platform";

export const Support = () =>
{
	const [randomThankYou, setRandomThankYou] = useState(0);

	useEffect(() => {
		setRandomThankYou(Math.random());
		Platform.trackEvent("saw-support-message");
	}, []);

	const thankYouButton = randomThankYou > 0.5
		? (
			<a href='https://ko-fi.com/A76217J' target='_blank' onClick={() => Platform.trackEvent("support-link-click", "kofi")}>
				<img
					height='36'
					style={{border: 0, height: 36, marginTop: "1rem"}}
					src='https://cdn.ko-fi.com/cdn/kofi2.png?v=2'
					alt='Buy Me a Coffee at ko-fi.com'
				/>
			</a>
		) : (
			<Button
				variant={"contained"}
				color={"primary"}
				style={{color: "white", textDecoration: "none", marginTop: "1rem"}}
				startIcon={<Twemoji text={"💸"}/>}
				onClick={() => Platform.trackEvent("support-link-click", "bmac")}
				href="https://www.buymeacoffee.com/allbadcards" target="_blank"
			>
				Send a few bucks his way
			</Button>
		);

	return (
		<div style={{
			marginTop: "3rem",
			textAlign: "center"
		}}>
			<Typography variant={"h5"}>Did you enjoy the game? One dude made this site and it runs on donations!</Typography>
			{thankYouButton}
		</div>
	);
};