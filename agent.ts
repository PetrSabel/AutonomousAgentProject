import { Intention } from "./intention";
import { Tile, ParcelInfo, Parcel, Direction, Desire, Action } from "./types"

// TODO: declare function for each of agents actions
export class Agent {
    map: Tile[][];  // matrix[x,y] of Tiles
    // map with scores, assign a score per tile
    map_size: [number, number];

    // Current information
    x: number;
    y: number;
    score: number;
    parcels: Map<string, ParcelInfo>; //TODO: split in 2 (real and expected)
    // TODO: store agent to predict moves
    carry: Parcel[];
    carrying_reward: number; // Indicates how much reward can obtain now (if deliver)

    id: string | null;
    name: string; // TODO: add in config possibility to choose between different agents
    socket: any;

    time_to_move: number; // The time needed to execute a move
    time_to_plan: number; // Expected time to plan next move (average)

    // Configuration of the level
    config: any;

    // BDI
    desires: Desire[]

    constructor(name: string, x: number, y: number, socket: any, config: any) {
        // Set empty map
        this.map = new Array;
        this.map_size = [0,0];
        this.x = x;
        this.y = y;
        this.id = null;
        this.name = name;
        this.score = 0;
        this.socket = socket; // TODO: connect to actual socket and declare event listeners
        this.parcels = new Map();
        this.carry = [];
        this.carrying_reward = 0;
        this.config = config;

        this.time_to_move = 1000; // ms
        this.time_to_plan = 1000; // ms

        this.desires = [{description: "explore"}, {description: "deliver"}]
    }

    async pickup() {
        this.socket.emit( 'pickup', (parcels: Parcel[]) => {
            console.log("Picked up", parcels)
            for (let parcel of parcels) {
                this.carry.push(parcel);
            }
        } );
    }

    async putdown() {
        for (const parcel of this.carry) {
            this.parcels.delete(parcel.id)
        }
        await this.socket.emit( 'putdown', (parcel: any) => {
            console.log("Putted", parcel)
            this.carry = [];
        } );
        this.carry = new Array
        
    }

    async move(direction: Direction) {
        return new Promise<void>( (success, reject) => this.socket.emit('move', direction, async (status: boolean) =>  {
            if (status) {
                success();
            } else {
                reject();
            }
        } ) );
    }

    async getOptions(): Promise<Intention[]> {
        this.desires = [{description: "explore"}, {description: "deliver"}]
        for(let parcel of this.parcels.values()) {
            this.desires.push({
                description:"pickup", 
                parcel: parcel
            })
        }

        let res: Array<Intention> = new Array;
        for (let desire of this.desires) {
            let intention = new Intention(this, desire)

            res.push(intention)
        }

        return res;
    }

    filterOptions(options: Intention[]) {
        // TODO: filter options based on some criteria
        return options.filter(option => option.cost >= 0)
    }


    async executePlan(plan: Action[]) {
        for (let action of plan) {
            switch (action) {
                case "pickup":
                    await this.pickup()
                    break;

                case "putdown":
                    await this.putdown()
                    break;
                
                case "wait":
                    // TODO: decide what to do
                    break;
            
                default:
                    await this.move(action)
                    break;
            }
        }
    }

}
// BDI => Beliefs, Desires, Intentions

// Belief = what the agent believes (map, parcel positions, other agents positions and actions, delivery positions)
//     Belief problem: may has data inconsistency => 2 databases (real and expected)
//         Strategies: static (stay there forever), annihilation (exists only if I see it), prediction
// The agent is executing a plan, sees an obstacle => re-plan, wait until changes back => wait until re-plan
// TODO: update belief

// Desires = goals the agent want to achieve (deliver packs, get packs, explore map)

// Intention = what the agent currently is doing (move to get a new pack, deliver packs, explore (no other option), planning, replan)
