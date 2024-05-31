import { Agent } from "./agent.js";
import { AGENT_NAME, LOCAL_SERVER, default as config } from "../config.js"
import { create_socket, map, map_config, map_size, personal_info } from "./socket.js";

// TODO: launch planner at the beginning from all tiles to each other and cache the results
//      maybe more possible plans for the same one (in case of block) OR if blocked make a random move OR recompute (but difficult)
//      4 plan for each direction blocked

const host = LOCAL_SERVER? config.local.host : config.remote.host;
const token = LOCAL_SERVER? config.local.token : config.remote.token;

console.log("The server at ", host)

const socket = create_socket(host + "?name=" + AGENT_NAME, token)

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

initialize_agent()
