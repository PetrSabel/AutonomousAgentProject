import { Agent } from "./agent";
import { default as config } from "../config"
import { create_socket, map, map_config, map_size, personal_info } from "./socket";

const LOCAL_SERVER: boolean = true;

const AGENT_NAME: string = "Autonomix";
const host = LOCAL_SERVER? config.local.host : config.remote.host;
const token = LOCAL_SERVER? config.local.token : config.remote.token;

console.log("The server at ", host)

const socket = create_socket(host + "?name=" + AGENT_NAME, token)
// set_initial_listeners(socket)

// Creates the agent when possible
export function initialize_agent() {
    console.log("TRYING")
    if (map && map_config && map_size && personal_info) {
        const agent = new Agent(personal_info.name, personal_info.id, map, map_size, map_config, 
            personal_info.x, personal_info.y, socket);

        agent.start()
    } else {
        setTimeout(() => {
            initialize_agent()
        }, 2000)
    }

}

// initialize_agent();



// TODO: decide if use directly client or sockets
