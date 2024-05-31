import { MultiAgent } from "../MultiAgent/agent.js";
import { AGENT_NAME, LOCAL_SERVER, default as config } from "../config.js"
import { create_socket, map, map_config, map_size, personal_info } from "../SingleAgent/socket.js";

// TODO: launch planner at the beginning from all tiles to each other and cache the results
//      maybe more possible plans for the same one (in case of block) OR if blocked make a random move OR recompute (but difficult)
//      4 plan for each direction blocked

const host = LOCAL_SERVER? config.local.host : config.remote.host;
const token = LOCAL_SERVER? config.local.token : config.remote.token;

console.log("The server at ", host)

let agents: MultiAgent[] = [];

// Creates the agent when possible
export function initialize_agent(socket: any) {
    console.log("TRYING", socket.id)
    if (map && map_config && map_size && personal_info.has(socket.id)) {
        let person = personal_info.get(socket.id)
        let agent = new MultiAgent(person.name, person.id, map, map_size, map_config, 
            person.x, person.y, socket);
        agents.push(agent)
        
        // Exchange public messages to recognize themselves
        agent.setup_communication()

        agent.start()

    } else {
        setTimeout(() => {
            initialize_agent(socket)
        }, 2000)
    }

}

// Create multiple agents
for (let agent_configuration of config.multi) {
    initialize_agent(create_socket(host + "?name=" + AGENT_NAME, agent_configuration.token))
}
