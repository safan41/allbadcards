import {createSocketMessageClass} from "./SocketMessage";
import {GamePayload} from "../Games/Contract";

export const GameMessage = createSocketMessageClass<GamePayload>("game");