import { PriorityQueue } from "@datastructures-js/priority-queue";
import { Intention } from "./intention";
import { Tile, ParcelInfo, Parcel, Direction, Desire, Action, AgentDesciption } from "./types"
import { EXPLORE_COST, Point, compute_dense_tiles, detect_agents } from "./auxiliary";
import { set_agent_listeners } from "./socket";


// TODO: declare function for each of agents actions (communication lacks)
export class Agent {
    map: Tile[][];  // matrix[x,y] of Tiles
    map_size: [number, number];

    // Current information
    x: number;
    y: number;
    score: number;
    parcels: Map<string, ParcelInfo>; // TODO: split in 2 (real and expected)
    agents: Map<string, AgentDesciption>;
    // TODO: store agents to predict moves
    carry: Parcel[];
    carrying_reward: number; // Indicates how much reward can obtain now (if deliver)

    id: string;
    name: string; // TODO: add in config possibility to choose between different agents
    socket: any;

    time_to_move: number; // The time needed to execute a move
    time_to_plan: number; // Expected time to plan next move (average)

    current_intention?: Intention 
    blocked: boolean

    // Configuration of the level
    config: any;

    dense_tiles: Array<Point>
    dense_visited: number

    // BDI
    desires: Desire[]
    new_desires: Desire[]

    constructor(name: string, id: string, map: Tile[][], map_size: [number, number], map_config: any, 
            x: number, y: number, socket: any) {
        // Sets minimal required information
        this.map = map;
        this.map_size = map_size;
        this.x = x;
        this.y = y;
        this.id = id;
        this.name = name;
        this.config = map_config;

        this.socket = socket; // TODO: connect to actual socket and declare event listeners

        // Initialize new run (supposing the agent does not know nothing)
        this.parcels = new Map();
        this.carry = [];
        this.carrying_reward = 0;
        this.score = 0;
        this.agents = new Map();
        // this.current_optimal_cost = 0.0; // The optimal cost executing an intention 

        // TODO: try to estimate them OR extract from map.config
        this.time_to_move = 1000; // ms
        this.time_to_plan = 1000; // ms

        this.desires = [{description: "explore"}, {description: "deliver"}]
        this.new_desires = []

        this.current_intention= undefined;
        this.blocked = false;

        set_agent_listeners(this.socket, this);

        console.log("Agent created!")

        this.dense_tiles = compute_dense_tiles(this.map);
        this.dense_visited = 0
        
        const parcel_decay_time: string = this.config.PARCEL_DECADING_INTERVAL

        // TODO: set decay time from configuration
        if (parcel_decay_time !== 'infinite') {
            // let decay_time = 1000 * parcel_decay_time.match("[0-9]*s");
            let decay_time = 1000;
            // Updates known parcels
            setInterval(() => {
                // Decreases parcels' rewards
                for (let parcel of this.parcels.values()) {
                    parcel.reward -= 1;
                }
                // Removes expired parcels
                this.parcels = new Map(
                    [...this.parcels].filter(([k, v]) => v.reward > 0)
                );
            }, decay_time)
        }
    }

    start() {
        console.log("Launching agent!")
        this.#loop()
    }

    createIntention(desire: Desire) {
        let intention = new Intention(this, desire)
        return intention;
    }

    changeIntention(new_intention: Intention) {
        if (this.current_intention) {
            if (this.current_intention.estimateProfit() < new_intention.estimateProfit()) {
                this.executeIntention(new_intention)
            }
        } else {
            this.executeIntention(new_intention)             
        }
    }

    async pickup() {
        this.socket.emit( 'pickup', (parcels: Parcel[]) => {
            console.log("Picked up", this.map[this.x][this.y])
            console.log("HERE BUG", this.parcels)
            for (let parcel of parcels) {
                this.carry.push(parcel);
                this.remove_parcel(parcel.id)
                // console.log("PARCEL PICKED", parcel)
            }
        } );
    }

    async putdown() {
        await this.socket.emit( 'putdown', (parcel: any) => {
            // console.log("Putted", parcel)
            this.carry = [];
        } );

        for (const parcel of this.carry) {
            this.remove_parcel(parcel.id)
        }
        this.carry = new Array(0)

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

    // Main loop
    async #loop() {
        while (true) {
            // console.log("------------------------------------------")
            // console.error("New iteration")

            try {
                let options = this.getOptions()
                let queue = this.filterOptions(options)

                // TODO: move this lines inside the agent "execute" 
                let first = queue.pop()
                await this.executeIntention(first)

                await new Promise(res => setTimeout(res, 5));
            } catch(e) {
                console.error("Some error", e)
                await new Promise(res => setTimeout(res, 100));
            }
        }
    }

    // TODO: try to estimate the intention cost to ignore uninteresting ones
    getOptions(): Intention[] {
        this.desires = [{description: "explore"}, {description: "deliver"}]
        for(let parcel of this.parcels.values()) {
            this.desires.push({
                description:"pickup",
                parcel: parcel
            })
        }

        let optimal_cost: number = EXPLORE_COST;
        let res: Array<Intention> = new Array;
        for (let desire of this.desires) {
            let intention = this.createIntention(desire);

            res.push(intention)
        }

        return res;
    }

    get_new_options(): Intention[] {
        let res: Array<Intention> = new Array;
        for (let desire of this.new_desires) {
            let intention = this.createIntention(desire);

            res.push(intention)
        }
        this.new_desires = []
        this.new_desires.length = 0

        return res;
    }

    // Return ordered list of options
    filterOptions(options: Intention[]) {
        // TODO: filter options based on some criteria
        options = options.filter(option => option.cost >= 0.0)
        let queue = new PriorityQueue((a: Intention, b: Intention) => a.cost > b.cost ? -1 : 1)
        
        // console.log("\n\nFiltered are")
        // for (let opt of options) {
        //     console.log(opt)
        // }

        for (let option of options) {
            queue.push(option)
            if (option.desire.description == "deliver") {
                // console.log("DELIVER COST = ", option.cost)
            }
            // TODO: consider to combine deliver with some pickup (if aligned)
        }

        return queue;
    }

    async executeIntention(intention: Intention) {
        this.blocked = false 
        this.current_intention = intention;
        console.log("EXECUTING", intention.desire.description, intention.x, intention.y)
        // console.log("PLAN=", intention.currentPlan)

        do {

            await this.reactive_behavior()

            if (this.new_desires.length > 0) {
                // console.log("NEW DESIRES FOUND", this.new_desires)
                let new_options = this.get_new_options()
                let filtered = this.filterOptions(new_options)

                let first = filtered.pop()
                if (first.estimateProfit() > this.current_intention.estimateProfit()) {
                    // console.log("CHANGED")
                    this.current_intention = first 
                } else {
                    // console.log("NOT CHANGED")
                }
                // console.log("tmp", this.new_desires)
            }

            if (this.check_reachable()) {
                await this.current_intention.step(this)
            } else {
                return;
            }
        } while (this.current_intention.executing && !this.blocked)
    }

    async reactive_behavior() {
        // Check if the tile has a parcel
        let x = Math.round(this.x)
        let y = Math.round(this.y)

        if (this.map[x][y]?.parcel) {
            await this.pickup();
        }

        // Putdown if pass through delivery zone
        if (this.map[x][y]?.delivery) {
            await this.putdown()
        }
    }

    // Returns whether the destination is accesible
    check_reachable(): boolean {
        const intention = this.current_intention;
        if (intention) {
            switch (intention.desire.description) {
                case "explore":
                    // Explore is always reachable, at most move is blocked
                    return true;
                case "deliver": {
                    // Check if the delivery zone is free
                    let destination = this.map[intention.x][intention.y];
                    const successful_simulation = this.simulate_intention();
                    const destionation_clear = destination ? (destination.agentID === null) : false; 
                    return successful_simulation && destionation_clear;
                }
                case "pickup": {
                    // Check if the parcel is still in Beliefs and the tile is reachable
                    let parcel = intention.desire.parcel
                    const parcel_exists = this.parcels.has(parcel.id);
                    let destination = this.map[intention.x][intention.y];
                    const destionation_clear = destination ? (destination.agentID === null) : false;

                    const n_others = detect_agents(intention.x, intention.y, this);
                    const too_many_intruders = n_others < 1;

                    const successful_simulation = this.simulate_intention();

                    return parcel_exists && destionation_clear && too_many_intruders && successful_simulation;
                }
            }
        } else {
            return false;
        }
    }


    remove_parcel(parcel_id: string) {
        // TODO: Remove from agent.carry
        let parcel = this.parcels.get(parcel_id)
        if (parcel) {
            let x = Math.round(parcel.x)
            let y = Math.round(parcel.y)
            this.map[x][y]!.parcel = null
            this.parcels.delete(parcel_id)
        }
    }

    update_parcel(parcel: ParcelInfo) {
        // If transported remove
        if (parcel.carriedBy) {
            if (this.parcels.has(parcel.id)) {
                this.remove_parcel(parcel.id);
            }
        } else { // Save new parcel or update a known one
            // Removes old position
            if (this.parcels.has(parcel.id)) {
                let x = Math.round(parcel.x)
                let y = Math.round(parcel.y)

                this.map[x][y]!.parcel = null;
            }
            this.parcels.set(parcel.id, parcel);
            let x = Math.round(parcel.x)
            let y = Math.round(parcel.y) 

            this.map[x][y]!.parcel = parcel.id;
        }
    }

    // TODO: simulate execution of the plan and check whether blocked or something fails
    // Checks whether the current intention is still valid
    simulate_intention(): boolean {
        if (this.current_intention) {
            let x = Math.round(this.x);
            let y = Math.round(this.y);
            for (const action of this.current_intention.currentPlan) {
                [x, y] = this.next_position(x, y, action);
                if (this.map[x][y] != null) {
                    if (this.map[x][y]!.agentID != null) {
                        return false;
                    }
                }
            }

            return true;
        } else {
            return false;
        }
    }

    next_position(x: number, y: number, action: Action): [number, number] {
        switch(action) {
            case "left": {
                return [x-1, y];
            }
            case "right": {
                return [x+1, y];
            }
            case "up": {
                return [x, y+1];
            }
            case "down": {
                return [x, y-1];
            }
            default: {
                return [x,y];
            }
        }
    }

    // TODO: if action is blocked try to replan, maybe add a second plan to each intention
    //      OR save the search variables somewhere
    //      maybe requires to store the current intention
    // async executePlan(plan: Action[]) {
    //     for (let action of plan) {
    //         switch (action) {
    //             case "pickup":
    //                 await this.pickup()
    //                 break;

    //             case "putdown":
    //                 await this.putdown()
    //                 break;
                
    //             case "wait":
    //                 // TODO: decide what to do
    //                 break;
            
    //             default:
    //                 await this.move(action)
    //                 break;
    //         }
    //     }
    // }

}

// BDI => Beliefs, Desires, Intentions

// Belief = what the agent believes (map, parcel positions, other agents positions and actions, delivery positions)
//     Belief problem: may has data inconsistency => 2 databases (real and expected)
//         Strategies: static (stay there forever), annihilation (exists only if I see it), prediction
// The agent is executing a plan, sees an obstacle => re-plan, wait until changes back => wait until re-plan
// TODO: update belief

// Desires = goals the agent want to achieve (deliver packs, get packs, explore map)

// Intention = what the agent currently is doing (move to get a new pack, deliver packs, explore (no other option), planning, replan)
