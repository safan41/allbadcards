import {createSocketMessageClass} from "./SocketMessage";
import {GamePayload} from "../Games/GameManager";

export const GameMessage = createSocketMessageClass<GamePayload>("game");