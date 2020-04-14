import * as React from "react";
import {FaPlus, MdArrowForward} from "react-icons/all";
import Button from "@material-ui/core/Button";
import {RouteComponentProps, withRouter} from "react-router";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import {GameItem, Platform} from "../../Global/Platform/platform";
import {IUserData, UserDataStore} from "../../Global/DataStore/UserDataStore";
import {NicknameDialog} from "../../UI/NicknameDialog";
import Container from "@material-ui/core/Container";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import {SponsorList} from "./SponsorList";
import {GameDataStore} from "../../Global/DataStore/GameDataStore";
import useMediaQuery from "@material-ui/core/useMediaQuery";

interface IGameDashboardProps extends RouteComponentProps
{
}

interface DefaultProps
{
}

type Props = IGameDashboardProps & DefaultProps;
type State = ICreationState;

interface ICreationState
{
	userData: IUserData;
	nicknameDialogOpen: boolean;
}

export const gamesOwnedLsKey = "games-owned";

class GameDashboard extends React.Component<Props, State>
{
	constructor(props: Props)
	{
		super(props);

		this.state = {
			userData: UserDataStore.state,
			nicknameDialogOpen: false
		};
	}

	public componentDidMount(): void
	{
		UserDataStore.listen(data => this.setState({
			userData: data
		}));
	}

	private createGame = async () =>
	{
		this.setState({
			nicknameDialogOpen: true
		});
	};

	private onNicknameClose = () =>
	{
		this.setState({
			nicknameDialogOpen: false
		});
	};

	private onNicknameConfirm = async (nickname: string) =>
	{
		const game = await Platform.createGame(this.state.userData.playerGuid, nickname);
		this.storeOwnedGames(game);
		this.props.history.push(`/game/${game.id}`)
	};

	private storeOwnedGames(game: GameItem)
	{
		const gamesOwnedString = localStorage.getItem(gamesOwnedLsKey) ?? "[]";
		const gamesOwned = JSON.parse(gamesOwnedString) as string[];
		gamesOwned.push(game.id);
		localStorage.setItem(gamesOwnedLsKey, JSON.stringify(gamesOwned));
	}

	public render()
	{
		return (
			<Container style={{textAlign: "center"}}>
				<Typography>the best cards against humanity clone</Typography>

				{GameDataStore.state.familyMode && (
					<Typography variant={"h4"} style={{marginTop: "1rem"}}>Family-friendly edition!</Typography>
				)}
				<img style={{width: "50%", margin: "2rem auto", maxWidth: "13rem"}} src={"/logo-large.png"}/>

				<Typography variant={"h4"}>Click "New Game" to start playing now!</Typography>

				{!GameDataStore.state.familyMode && (
					<ButtonGroup style={{width: "100%", justifyContent: "center", marginTop: "1rem"}}>
						<Button component={p => <a {...p} href={"https://not.allbad.cards"}/>}>
							Family Edition &nbsp; <MdArrowForward/>
						</Button>
					</ButtonGroup>
				)}
				<ButtonGroup style={{width: "100%", justifyContent: "center", marginTop: "2rem"}}>
					<Button
						variant="contained"
						color="primary"
						size="large"
						style={{
							fontSize: "1.5rem"
						}}
						onClick={this.createGame}
						startIcon={<FaPlus/>}
					>
						New Game
					</Button>
				</ButtonGroup>
				<Paper style={{padding: "1rem", margin: "3rem 0 1rem", textAlign: "left"}}>
					<Typography>
						<strong>Updates - 4/13</strong>
						<li>
							<a href={"https://not.allbad.cards"}>Family Edition!</a> At a separate domain so kids don't try to play with the other cards.
						</li>
						<li>Bug fixes</li>
						<br/>
						<strong>Updates - 4/12</strong>
						<li>Card pack selection!</li>
						<li>Card Czar can skip black cards if they want.</li>
						<li>Added spectating</li>
						<li>Improved UI for picking a winner</li>
						<li>Many bug fixes</li>
					</Typography>
				</Paper>
				<NicknameDialog
					open={this.state.nicknameDialogOpen}
					onClose={this.onNicknameClose}
					onConfirm={this.onNicknameConfirm}
					title={"Please enter your nickname:"}
				/>
				<div>
					<SponsorList/>
				</div>
				<Paper style={{padding: "1rem", marginTop: "3rem"}} elevation={5}>
					<Typography variant={"caption"}>
						Cards Against Humanity by Cards Against Humanity LLC is licensed under CC BY-NC-SA 2.0.
					</Typography>
				</Paper>
			</Container>
		);
	}
}

export default withRouter(GameDashboard);