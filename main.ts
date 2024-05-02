import { Agent } from "./agent";
import { default as config } from "./config"
import { map, map_config, map_size, personal_info, socket } from "./socket";

const LOCAL_SERVER: boolean = true;

export const host = LOCAL_SERVER? config.local.host : config.remote.host;
export const token = LOCAL_SERVER? config.local.token : config.remote.token;

console.log("The server at ", host)

// Creates the agent when possible
function initialize_agent() {
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

initialize_agent();



// TODO: decide if use directly client or sockets
