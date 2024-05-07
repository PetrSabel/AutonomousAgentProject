import { io } from "socket.io-client"
import { Tile, TileInfo, AgentDesciption, ParcelInfo } from "./types"
import { Agent, FORGET_AFTER } from "./agent";
import { initialize_agent } from "./main";

export { set_agent_listeners, create_socket, set_initial_listeners }

// IDea: use Reinforcement Learning

function create_socket(host: string, token: string) {
    let socket = io( host, {
        extraHeaders: {
            'x-token': token
        },
        // query: {
        //     name: "scripted",
        // }
    });
    
    // Initial listeners (executed only once)
    socket.on("connect", () => {
        console.log( "socket connect", socket.id );
        set_initial_listeners(socket);
        initialize_agent();
    });

    socket.on("disconnect", () => {
        socket.removeAllListeners();
        console.log( "socket disconnect");
    });

    // Not very usefull listeners
    // Obtain singular tile
    socket.on("tile", (x: number, y: number, delivery: boolean, parcelSpawner: boolean) => {
        let data: TileInfo = {x, y, delivery, parcelSpawner}
        console.log("tile", data)
    });

    // Obtain description of unaccessible tiles
    socket.on("not_tile", (x: number, y: number) => {
        console.log("not tile", x, y)
    });

    return socket;
}


let map: Tile[][] | undefined = undefined;
let map_size: [number, number] | undefined = undefined;
let map_config: any | undefined = undefined;
let personal_info: {x: number, y: number, id: string, name: string} | undefined = undefined;
export { map, map_size, map_config, personal_info }

function set_initial_listeners(socket: any) {
    // Obtain all tiles
    socket.on("map", (x: number, y: number, data: TileInfo[]) => {
        console.log("map", data)
        // agent.map = data; // TODO: remap values
        let new_map = new Array();
        for (let i = 0; i < x; i++) {
            new_map.push(new Array(y));
            // for (let j = 0; j < y; j++) {
            //     agent.map[i].push(undefined)
            // }
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
        // TODO: better check if predicted position is same to control plan execution
    
        personal_info = {
            x: me.x,
            y: me.y,
            id: me.id,
            name: me.name,
        }
    });

}


function set_agent_listeners(socket: any, agent: Agent) {
    // Set new event handlers 
    // Obtain my current information
    socket.on("you", (me: AgentDesciption) => {
        // console.log("you", me)
        // Update position
        // TODO: better check if predicted position is same to control plan execution
    
        agent.x = me.x 
        agent.y = me.y 
    });

    // Update events
    // Agent is notified when see some agent
    // TODO: update map information
    // TODO: try to predict moves
    socket.on("agents sensing", (agents: AgentDesciption[]) => {
        // console.log("agents sensing", agents)
        // Removes old beliefs
        const vision_distance: number | "infinite" = agent.config.AGENTS_OBSERVATION_DISTANCE;
        if (vision_distance === "infinite") {
            let to_delete: AgentDesciption[] = []
            for (let agent_desc of agent.agents.values()) {
                // If an agent from beliefs is not seen anymore
                if (agents.findIndex((x) => x.id === agent_desc.id) === -1) {
                    to_delete.push(agent_desc);
                }
            }

            for (let desc of to_delete) {
                agent.delete_agent(desc);
            }
        } else {
            let to_delete: AgentDesciption[] = []
            for (let ag of agent.agents.values()) {
                // If an agent from beliefs is not seen anymore
                if (Math.abs(ag.x - agent.x) + Math.abs(ag.y - agent.y) <= vision_distance) {
                    if (agents.findIndex((x) => x.id === ag.id) === -1) {
                        to_delete.push(ag);
                    }
                }
            }

            for (let ag of to_delete) {
                agent.delete_agent(ag);
            }
        }

        // Updates agents information
        for (let a of agents) {
            // If some other agent
            if (a.id !== agent.id) {
                // TODO: consider 2 cell when moving
                let x = Math.round(a.x)
                let y = Math.round(a.y)

                // Remove old position
                if (agent.agents.has(a.id)) {
                    let intruder: AgentDesciption = agent.agents.get(a.id)!;
                    let old_x = Math.round(intruder.x)
                    let old_y = Math.round(intruder.y) 
                    
                    agent.map[old_x][old_y]!.agentID = null;
                } else {
                    // Save new agent
                    agent.agents.set(a.id, a);
                }

                // Remember the agent in that position for a bit
                agent.map[x][y]!.agentID = a.id;

                setTimeout(() => {
                    agent.forget_agent(x, y, a)
                }, FORGET_AFTER) 
            }
        }
        // TODO: consider if they are moving

        
    });

    // Agent is notified when new parcel appears or reward changes
    // TODO: update information, no override
    socket.on("parcels sensing", (parcels: ParcelInfo[]) => {
        // Remove obsolete parcels from beliefs
        // TODO: consider only parcels that should be present in the agent view
        // Now it removes also parcels outside of the view

        // for (let id of agent.parcels.keys()) {
        //     // TODO: add if the parcel is visible
        //     let parcel = parcels.find(p => p.id === id)
        //     if (parcel != undefined) {
        //         if (parcel.carriedBy) {
        //             agent.remove_parcel(parcel.id)
        //         }
        //     }
        // }

        // Removes old beliefs
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
                agent.parcels.delete(id);
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
                agent.parcels.delete(id);
            }
        }

        // Updates beliefs
        for (let parcel of parcels) {
            if (!parcel.carriedBy) {
                // New parcel => new desire
                if (!agent.parcels.has(parcel.id)) {
                    agent.new_desires.push({
                        description: "pickup",
                        parcel: parcel,
                        tries_number: 0,
                    });
                }

                // Save parcel
                agent.update_parcel(parcel)
            } else {
                agent.remove_parcel(parcel.id)
            }
        }


        // for (let parcel of parcels) {
        //     if (!parcel.carriedBy) {
        //         let tile = agent.map[parcel.x][parcel.y];
        //         if (tile) {
        //             tile.parcel = parcel.id 

        //             // setTimeout(() => {
        //             //     tile!.parcel = null
        //             // }, 1000 * parcel.reward) 
        //             // Assume that a parcel expires after "reward" seconds
        //         }
        //     } else { // If carried
        //         let x = Math.round(parcel.x)
        //         let y = Math.round(parcel.y)
                
        //         try {
        //             let _ = agent.map[x][y]
        //         } catch {
        //             console.log("PARCEL ERROR", parcel)
        //             console.log("CONT", agent.map, agent.map[x])
        //         }

        //         let tile = agent.map[x][y];
        //         if (tile) {
        //             tile.parcel = null;
        //         }

        //         if (parcel.carriedBy === agent.id) {
        //             // agent.carry = true;
        //         }
        //     }
        // }
    });

}


// TODO: attach planning to parcel sense, add variable to indicate whether process is still going
