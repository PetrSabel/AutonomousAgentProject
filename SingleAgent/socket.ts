import { io } from "socket.io-client"
import { Tile, TileInfo, AgentDesciption, ParcelInfo } from "../types"
import { Agent } from "./agent.js";

export { set_agent_listeners, create_socket, set_initial_listeners, 
         map, map_size, map_config, personal_info,
         update_agents_beliefs, update_parcels_beliefs }

// Create a socket for a new agent
function create_socket(host: string, token: string) {
    console.log("Creating socket for", token, "with", host)
    let socket = io( host, {
        extraHeaders: {
            'x-token': token
        }
    });
    
    socket.on("connect", () => {
        console.log( "socket connect", socket.id );
        set_initial_listeners(socket);
    });

    socket.on("disconnect", () => {
        socket.removeAllListeners();
        console.log( "socket disconnect");
    });

    return socket;
}

// Mandatory information for agent
let map: Tile[][] | undefined = undefined;
let map_size: [number, number] | undefined = undefined;
let map_config: any | undefined = undefined;
let personal_info: Map<string, {x: number, y: number, id: string, name: string}> = new Map();

// Initial listeners (executed only once)
function set_initial_listeners(socket: any) {
    // Obtains all tiles
    socket.on("map", (x: number, y: number, data: TileInfo[]) => {
        let new_map = new Array();
        for (let i = 0; i < x; i++) {
            new_map.push(new Array(y));
        }
        
        for (let tile of data) {
            new_map[tile.x][tile.y] = {
                parcel: null,
                spawnable: tile.parcelSpawner,
                agentID: null,
                delivery: tile.delivery,
                x: tile.x,
                y: tile.y,
            };
        }

        map = new_map
        map_size = [x,y] 
    });

    socket.on('config', (data: any) => {
        console.log("Configuration: ", data)
        map_config = data
    })

    // Gets personal information about the agent (but only the first time)
    socket.once("you", (me: AgentDesciption) => {
        console.log("you", me)
        // Update position
        personal_info.set(socket.id, {
            x: me.x,
            y: me.y,
            id: me.id,
            name: me.name,
        })
        console.log("Agent name = ", me.name, me.id);
    });

    socket.once( 'token', (token: string) => {
        console.log( "New token = " + token)
    } );
}

// Agent sensing
function set_agent_listeners(socket: any, agent: Agent) {
    // Obtain my current information
    socket.on("you", (me: AgentDesciption) => {
        agent.x = me.x 
        agent.y = me.y 
    });

    // Update events

    // Agent is notified when see some agent
    socket.on("agents sensing", (agents: AgentDesciption[]) => {
        update_agents_beliefs(agent, agents)
    });

    // Agent is notified when new parcel appears or reward changes
    socket.on("parcels sensing", (parcels: ParcelInfo[]) => update_parcels_beliefs(agent, parcels));

}

function update_agents_beliefs(agent: Agent, agents: AgentDesciption[]) {
    // Removes old beliefs (about agents) inside vision zone 
    const vision_distance: number | "infinite" = agent.config.AGENTS_OBSERVATION_DISTANCE;
    let to_delete: AgentDesciption[] = []
    if (vision_distance === "infinite") {
        for (let agent_desc of agent.agents.values()) {
            // If an agent from beliefs is not seen anymore, then delete it
            if (agents.findIndex((x) => x.id === agent_desc.id) === -1) {
                to_delete.push(agent_desc);
            }
        }
    } else {
        for (let ag of agent.agents.values()) {
            // If an agent from beliefs is not seen anymore, then delete it
            if (Math.abs(ag.x - agent.x) + Math.abs(ag.y - agent.y) <= vision_distance) {
                if (agents.findIndex((x) => x.id === ag.id) === -1) {
                    to_delete.push(ag);
                }
            }
        }   
    }
    for (let ag of to_delete) {
        agent.delete_agent(ag);
    }

    // Updates agents information (not mine)
    for (let a of agents) {
        // If some other agent (not me)
        if (a.id !== agent.id) {
            agent.update_agent(a)
        }
    }
}

function update_parcels_beliefs(agent: Agent, parcels: ParcelInfo[]) {
    // Remove obsolete parcels from beliefs
    const vision_distance: number | "infinite" = agent.config.PARCELS_OBSERVATION_DISTANCE;
    if (vision_distance === "infinite") {
        let to_delete: string[] = []
        for (let parcel_id of agent.parcels.keys()) {
            // If a parcel from beliefs is not seen anymore
            if (parcels.findIndex((p) => p.id === parcel_id) === -1) {
                to_delete.push(parcel_id);
            }
        }

        for (let id of to_delete) {
            agent.remove_parcel(id);
        }
    } else {
        let to_delete: string[] = []
        for (let parcel of agent.parcels.values()) {
            // If a parcel from beliefs is not seen anymore
            if (Math.abs(parcel.x - agent.x) + Math.abs(parcel.y - agent.y) <= vision_distance -1) {
                if (parcels.findIndex((p) => p.id === parcel.id) === -1) {
                    to_delete.push(parcel.id);
                }
            }
        }

        for (let id of to_delete) {
            agent.remove_parcel(id);
        }
    }

    // Updates beliefs
    for (let parcel of parcels) {
        if (!parcel.carriedBy) {
            // New parcel => new desire
            if (!agent.parcels.has(parcel.id)) {
                agent.new_desires.push({
                    description: "pickup",
                    parcel: parcel
                });
            }

            // Save parcel
            agent.update_parcel(parcel)
        } else {
            // Carried by another agent
            agent.remove_parcel(parcel.id)
        }
    }

}
