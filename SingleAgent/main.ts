import { Agent } from "./agent.js";
import { AGENT_NAME, DPPL_PLANNING, LOCAL_SERVER, default as config } from "../config.js"
import { create_socket, map, map_config, map_size, personal_info } from "./socket.js";
import { plan_and_coors_astar, plan_and_coors_pddl } from "./auxiliary.js";

const host = LOCAL_SERVER? config.local.host : config.remote.host;
const token = LOCAL_SERVER? config.local.token : config.remote.token;

console.log("The server at ", host)

const socket = create_socket(host + "?name=" + AGENT_NAME, token)

const planner = DPPL_PLANNING ? plan_and_coors_pddl : plan_and_coors_astar;

// Creates the agent once possible
function initialize_agent() {
    console.log("TRYING")
    // Checks whether received mandatory information
    if (map && map_config && map_size && personal_info.has(socket.id)) {
        // Start information of the agent
        let info = personal_info.get(socket.id)

        // Create and launch agent
        const agent = new Agent(info.name, info.id, map, map_size, map_config, 
            info.x, info.y, socket, planner);
        agent.start()
        
    } else {
        // Wait for information
        setTimeout(() => {
            initialize_agent()
        }, 2000)
    }

}

initialize_agent()
