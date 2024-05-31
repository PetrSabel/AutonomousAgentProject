import { Agent } from "../SingleAgent/agent.js";
import { Tile } from "../types";
import { set_communication_listeners, set_multiagent_listeners } from "./socket.js";

export const GREETING: string = "sdhjg2121jsdngjkdsn99837289njsdnjbkdsjnk";

export class MultiAgent extends Agent {

    friends: string[]

    constructor(name: string, id: string, map: Tile[][], map_size: [number, number], map_config: any, 
            x: number, y: number, socket: any) {
            
        super(name, id, map, map_size, map_config, x, y, socket)
        
        this.friends = []

        set_communication_listeners(this.socket, this);
    }

    // Override listeners to multiagent version
    setListeners() {
        set_multiagent_listeners(this.socket, this);
    }
    

    setup_communication() {
        this.log("MULTI")
        this.socket.emit('shout', GREETING)
    }
}
