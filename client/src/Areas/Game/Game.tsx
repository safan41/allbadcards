import GameStart from "./GameStart";
import {RouteComponentProps, withRouter} from "react-router";
import React, {useEffect} from "react";
import GameJoin from "./GameJoin";
import {gamesOwnedLsKey} from "../GameDashboard/GameDashboard";
import {GameDataStore, IGameDataStorePayload} from "../../Global/DataStore/GameDataStore";
import {GamePlayWhite} from "./GamePlayWhite";
import {IUserData, UserDataStore} from "../../Global/DataStore/UserDataStore";
import {GamePlayBlack} from "./GamePlayBlack";
import Helmet from "react-helmet";
import {GamePlaySpectate} from "./GamePlaySpectate";
import {Typography} from "@material-ui/core";
import {ContainerProgress} from "../../UI/ContainerProgress";
import Button from "@material-ui/core/Button";
import {LoadingButton} from "../../UI/LoadingButton";

interface IGameParams
{
	id: string;
}

interface IGameState
{
	gameData: IGameDataStorePayload;
	userData: IUserData;
	restartLoading: boolean;
}

class Game extends React.Component<RouteComponentProps<IGameParams>, IGameState>
{
	constructor(props: RouteComponentProps<IGameParams>)
	{
		super(props);

		this.state = {
			gameData: GameDataStore.state,
			userData: UserDataStore.state,
			restartLoading: false
		};
	}

	public componentDidMount(): void
	{
		GameDataStore.hydrate(this.props.match.params.id);

		GameDataStore.listen(data => this.setState({
			gameData: data
		}));

		UserDataStore.listen(data => this.setState({
			userData: data
		}));
	}

	private restartClick = (playerGuid: string) =>
	{
		this.setState({
			restartLoading: true
		});

		GameDataStore.restart(playerGuid)
			.finally(() => this.setState({
				restartLoading: false
			}));
	};

	public render()
	{
		const {
			id,
		} = this.props.match.params;

		const {
			started,
			chooserGuid,
			ownerGuid,
			spectators,
			players,
			settings
		} = this.state.gameData.game ?? {};

		if (!this.state.gameData.game || !this.state.gameData.loaded)
		{
			return <ContainerProgress/>;
		}

		const {
			playerGuid
		} = this.state.userData;

		const owner = players?.[ownerGuid ?? ""];
		const isOwner = ownerGuid === this.state.userData.playerGuid;
		const isChooser = playerGuid === chooserGuid;
		const amInGame = playerGuid in (players ?? {});
		const amSpectating = playerGuid in (spectators ?? {});
		const title = `${owner?.nickname}'s game`;

		const playerGuids = Object.keys(players ?? {});
		const winnerGuid = playerGuids.find(pg => (players?.[pg].wins ?? 0) >= (settings?.roundsToWin ?? 99));

		const inviteLink = (settings?.inviteLink?.length ?? 0) > 25
			? `${settings?.inviteLink?.substr(0, 25)}...`
			: settings?.inviteLink;

		return (
			<>
				<Helmet>
					<title>{title}</title>
				</Helmet>
				{!winnerGuid && settings?.inviteLink && (
					<Typography variant={"caption"}>
						Chat/Video Invite: <a href={settings.inviteLink} target={"_blank"} rel={"nofollow noreferrer"}>{inviteLink}</a>
					</Typography>
				)}
				{winnerGuid && (
					<div>
						<Typography variant={"h3"} style={{textAlign: "center"}}>Game over! {players?.[winnerGuid].nickname} is the winner.</Typography>
						<div style={{
							marginTop: "3rem",
							textAlign: "center"
						}}>
							<Typography variant={"h5"}>Did you enjoy the game? Please consider supporting the site!</Typography>
							<a href='https://ko-fi.com/A76217J' target='_blank'>
								<img
									height='36'
									style={{border: 0, height: 36, marginTop: "1rem"}}
									src='https://cdn.ko-fi.com/cdn/kofi2.png?v=2'
									alt='Buy Me a Coffee at ko-fi.com'
								/>
							</a>
						</div>
						{playerGuid === ownerGuid && (
							<div style={{
								marginTop: "3rem",
								textAlign: "center"
							}}>
								<LoadingButton loading={this.state.restartLoading} variant={"contained"} color={"primary"} onClick={() => this.restartClick(playerGuid)}>
									Restart this game?
								</LoadingButton>
							</div>
						)}
					</div>
				)}
				{!winnerGuid && (
					<>
						{(!started || !(amInGame || amSpectating)) && (
							<BeforeGame gameId={id} isOwner={isOwner}/>
						)}

						{started && amInGame && !isChooser && (
							<GamePlayWhite/>
						)}

						{started && amInGame && isChooser && (
							<GamePlayBlack/>
						)}

						{started && amSpectating && (
							<GamePlaySpectate/>
						)}
					</>
				)}
			</>
		);
	}
};

interface BeforeGameProps
{
	isOwner: boolean;
	gameId: string;
}

const BeforeGame: React.FC<BeforeGameProps> = (props) =>
{
	return (
		<>
			{props.isOwner && (
				<GameStart id={props.gameId}/>
			)}

			{!props.isOwner && (
				<GameJoin id={props.gameId}/>
			)}
		</>
	);
};

export default withRouter(Game);