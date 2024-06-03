import { PriorityQueue } from "@datastructures-js/priority-queue";
import { Intention } from "./intention.js";
import { Tile, ParcelInfo, Parcel, Direction, Desire, Action, AgentDesciption, Plan, Point } from "../types"
import { DIRECTIONS, compute_dense_tiles, compute_spawn_tiles, detect_agents } from "./auxiliary.js";
import { set_agent_listeners } from "./socket.js";
import { FORGET_AFTER } from "../config.js";
import { Beliefset } from "@unitn-asa/pddl-client";


// TODO: declare function for each of agents actions (communication lacks)
// TODO: idea is to bump into others when there are too many agents on the map (or maybe save agents for more time)
// TODO: make all asyncronous and launch principal loop which should do all actions (when available)
export class Agent {
    map: Tile[][];  // matrix[x,y] of Tiles
    map_size: [number, number];

    // Current information
    #x: number;
    #y: number;
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
    time_to_decay: number;
    last_deliver_time: number;

    current_intention?: Intention 
    blocked: boolean

    // Configuration of the level
    config: any;

    dense_tiles: Array<Point>
    dense_visited: number

    move_cost: number;
    dont_disturb: boolean;

    // BDI
    desires: Desire[]
    new_desires: Desire[]

    planner: (agent: Agent, goal: "delivery" | Point, use_cache: boolean) => Promise<[Action[] | undefined, [number, number]]>

    constructor(name: string, id: string, map: Tile[][], map_size: [number, number], map_config: any, 
            x: number, y: number, socket: any, 
            planner: (agent: Agent, goal: "delivery" | Point, use_cache: boolean) => Promise<[Action[] | undefined, [number, number]]>) {

        // Sets minimal required information
        this.map = map;
        this.map_size = map_size;
        this.#x = x;
        this.#y = y;
        this.id = id;
        this.name = name;
        this.config = map_config;
        this.planner = planner

        this.socket = socket; 
        this.move_cost = this.config.MOVEMENT_DURATION/1000;

        // Initialize new run (supposing the agent does not know nothing)
        this.parcels = new Map();
        this.carry = [];
        this.carrying_reward = 0;
        this.score = 0;
        this.agents = new Map();
        // this.current_optimal_cost = 0.0; // The optimal cost executing an intention 

        this.dont_disturb = false; // TODO: use to execute special actions

        this.last_deliver_time = Date.now();

        // TODO: try to estimate them OR extract from map.config
        this.time_to_move = 1000; // ms
        this.time_to_plan = 1000; // ms

        this.desires = [{description: "explore", tries_number: 0,}, {description: "deliver", tries_number: 0,}]
        this.new_desires = []

        this.current_intention= undefined;
        this.blocked = false;

        this.log("Agent created!")

        this.dense_tiles = compute_spawn_tiles(this.map);
        this.dense_visited = 0
        
        const parcel_decay_time: string = this.config.PARCEL_DECADING_INTERVAL

        if (parcel_decay_time !== 'infinite') {
            let decay = parcel_decay_time.replace(/\D/g, '');
            console.log("Decay", decay)

            let decay_time: number;
            try {
                decay_time = 1000 * Number(decay);
            } catch {
                decay_time = 1000;
            }
            // Updates known parcels
            setInterval(() => {
                // Decreases parcels' rewards
                for (let parcel of this.parcels.values()) {
                    parcel.reward -= 1;
                }
                for (let parcel of this.carry) {
                    parcel.reward -= 1;
                }

                // Removes expired parcels
                this.parcels.forEach((p, id, _) => {
                    if (p.reward < 1) {
                        this.remove_parcel(id)
                    }
                })
                this.carry.filter((p) => p.reward > 0);

            }, decay_time)

            this.time_to_decay = decay_time;
        } else {
            this.time_to_decay = 1_000_000;
        }
    }

    get x () {
        return Math.round(this.#x);
    }

    set x (x: number) {
        this.#x = x;
    }

    get y () {
        return Math.round(this.#y);
    }

    set y (y: number) {
        this.#y = y;
    }

    log(...args: any[]) {
        console.log("("+this.id+")", ...args)
    }

    setListeners() {
        set_agent_listeners(this.socket, this);
    }

    start() {
        this.log("Launching agent!")
        this.setListeners()
        
        // TODO: compute all possible plans
        let i = 0;
        let prom = []
        for (let row of this.map) {
            for (let tile of row) {
                if (tile) {
                    for (let row1 of this.map) {
                        for (let tile1 of row1) {
                            if (tile1 != undefined && (tile.spawnable && tile1.delivery)) {
                                // Plan from tile to tile1
                                // console.log("Posting", i)
                                let goal = "at i t" + tile1.x + "_" + tile1.y;
                                prom.push([goal, {x: tile.x, y: tile.y}]);
                                i += 1
                            }
                        }
                    }
                }
            }
        }

        // Promise.all(prom).then(
        //     () => console.log("FINISHED")
        // )
        // this.log("TO CACHE", prom.length)

        this.loop()
    }

    createIntention(desire: Desire) {
        return new Intention(desire);
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
            // console.log("Picked up", this.map[this.x][this.y])
            // console.log("HERE BUG", this.parcels)
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

        this.last_deliver_time = Date.now()
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

    async execute_action(action: Action) {
        switch (action) {
            case "pickup": {
                await this.pickup()
                break;
            }
            case "putdown": {
                await this.putdown()
                break;
            }
            
            case "wait": {
                // TODO: decide what to do
                // this.replan(agent)
                // agent.blocked = true 
                break;
            }
        
            case "left":
            case "right":
            case "up":
            case "down": {
                await this.move(action)
                break;
            }

            default: {
                console.error(action);
                throw new Error("UNRECOGNIZED COMMAND")
            }
        }
    }

    // Main loop
    async loop() {
        while (true) {
            // console.log("------------------------------------------")
            // console.error("New iteration")

            try {
                let options = this.getOptions()

                this.log("\n\nCOMPUTING", options.length ,"options.....")
                // console.time("-------------------------------")
                await Promise.all(options.map(opt => opt.compute_plan(this, this.planner)));
                // console.timeEnd("-------------------------------")
                // await new Promise(res => setTimeout(res, 5000));
                
                let queue = this.filterOptions(options)

                // console.log("QUEUE")
                // for (let q of queue.toArray()) {
                //     console.log(q)
                // }

                let first = queue.pop();
                if (first) {
                    if (this.current_intention != undefined && this.current_intention.executing == true) {
                        await new Promise(res => setTimeout(res, 100));
                    } else {
                        await this.executeIntention(first);
                    }
                }

                await new Promise(res => setTimeout(res, 5));
            } catch(e) {
                this.log("Some error", e)
                await new Promise(res => setTimeout(res, 100));
            }

            // break;
            // await new Promise(res => setTimeout(res, 5000));
        }
    }

    // TODO: try to estimate the intention cost to ignore uninteresting ones
    getOptions(): Intention[] {
        this.desires = [];
        this.desires.length = 0;

        this.desires.push({description: "explore", tries_number: 0,});
        this.desires.push({description: "deliver", tries_number: 0,})
        for(let parcel of this.parcels.values()) {
            this.desires.push({
                description:"pickup",
                parcel: parcel, 
                tries_number: 0,
            })
        }

        // let optimal_cost: number = EXPLORE_COST;
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
        this.new_desires = [];
        this.new_desires.length = 0;

        return res;
    }

    // Return ordered list of options
    filterOptions(options: Intention[]) {
        // TODO: filter options based on some criteria
        options = options.filter(option => option.currentPlan != undefined)
        options = options.filter(option => option.cost >= 0.0)
        let queue = new PriorityQueue((a: Intention, b: Intention) => a.cost > b.cost ? -1 : 1)
        

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
        this.log("EXECUTING", intention.desire.description, intention.x, intention.y,
                    "From", this.x, this.y, "SCORE", intention.cost)

        let reachable: boolean;
        do {
            await this.reactive_behavior();

            if (this.new_desires.length > 0) {
                this.log("NEW DESIRES FOUND")
                
                if (this.current_intention != undefined && this.current_intention.desire.description == "deliver") {
                    this.log("SKIPPED BECAUSE DELIVERING")
                    
                } else {
                    let new_options = this.get_new_options()
    
                    for (let option of new_options) {
                        await option.compute_plan(this, this.planner);
                    }
    
                    let filtered = this.filterOptions(new_options)
    
                    let first = filtered.pop()
                    if (first) {
                        if (this.current_intention == undefined) {
                            this.current_intention = first;
                        } else if (first.estimateProfit() > this.current_intention.estimateProfit()) {
                            this.log("CHANGED")
                            this.current_intention = first 
                        } else {
                            // console.log("NOT CHANGED")
                        }
                    }
                }
            }
            

            await this.current_intention.step(this);

            const dumb = true;
            if (dumb) {
                reachable = this.current_intention != undefined && this.current_intention.executing && !this.blocked;
            } else {
                reachable = this.current_intention != undefined && this.current_intention.executing && !this.blocked && this.check_reachable();
            }
        } while (reachable)

        if (this.current_intention != undefined) {
            this.current_intention.stop()
        }

        // Give a possibility to update beliefs (asynchronously)
        await new Promise(res => setTimeout(res, 50));
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
        let intention = this.current_intention;
        if (intention) {
            switch (intention.desire.description) {
                case "explore": {
                    const successful_simulation = this.simulate_intention();
                    return successful_simulation;
                }
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
                    const x = Math.round(parcel.x)
                    const y = Math.round(parcel.y)
                    const parcel_exists = this.parcels.has(parcel.id) && 
                                          this.map[x][y] != null && 
                                          this.map[x][y]!.parcel != null;
                    let destination = this.map[intention.x][intention.y];
                    const destionation_clear = destination ? (destination.agentID === null) : false;

                    const enemy_gap = detect_agents(intention.x, intention.y, this);
                    // An intruder is too close (at least 2 tile closer)
                    const intruder_too_close = enemy_gap > 1;

                    const successful_simulation = this.simulate_intention();

                    return parcel_exists && destionation_clear && !intruder_too_close && successful_simulation;
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
        } else { 
            // Removes old position
            if (this.parcels.has(parcel.id)) {
                let x = Math.round(parcel.x)
                let y = Math.round(parcel.y)

                this.map[x][y]!.parcel = null;
            }
            // Save new parcel or update a known one
            this.parcels.set(parcel.id, parcel);
            let x = Math.round(parcel.x)
            let y = Math.round(parcel.y) 

            this.map[x][y]!.parcel = parcel.id;
        }
    }

    // Checks whether the current intention is still valid
    simulate_intention(): boolean {
        if (this.current_intention) {
            let x = Math.round(this.x);
            let y = Math.round(this.y);
            for (let action of this.current_intention.currentPlan!.slice()) {
                [x, y] = this.next_position(x, y, action);
                if (x >= 0 && x < this.map_size[0] && y >= 0 && y < this.map_size[1]) {
                    if (this.map[x][y] != null) {
                        if (this.map[x][y]!.agentID != null) {
                            return false;
                        }
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

    get_beliefset(goal: string, for_cache: boolean, position?: Point) {
        const myBeliefset = new Beliefset();
        // My info
        myBeliefset.declare("me i")
        myBeliefset.undeclare("scored i")

        if (goal === "scored i") {
            myBeliefset.declare("carry i")
        } else {
            myBeliefset.undeclare("carry i")
        }

        let t = (position != undefined) ? "t" + position.x + "_" + position.y : "t" + this.x + "_" + this.y;
        myBeliefset.declare("at i " + t)

        // Map
        for (let row of this.map) {
            for (let tile of row) {
                if (tile) {
                    t = "t" + tile.x + "_" + tile.y 
                    myBeliefset.declare("tile " + t)

                    // Tile descriptions
                    if (tile.delivery) {
                        myBeliefset.declare("delivery " + t)
                    }
                    if (tile.spawnable) {
                        myBeliefset.declare("spawn " + t)
                    }
                    // Other agents positions
                    if (tile.agentID && !for_cache) {
                        myBeliefset.undeclare("free " + t)
                    } else {
                        myBeliefset.declare("free " + t)
                    }
                    
                    // Parcels
                    if (tile.parcel) {
                        myBeliefset.declare("withparcel " + t)
                    }

                    // Moves
                    for (let dir of DIRECTIONS) {
                        if (tile) {
                            let [nx, ny] = this.next_position(tile.x, tile.y, dir)

                            if (this.map[nx] != undefined && this.map[nx][ny]) {
                                let nt = "t" + nx + "_" + ny 
                                myBeliefset.declare(dir + " " + t + " " + nt)
                            }
                        }
                    }
                }
            }
        }

        return myBeliefset;
    }

    forget_agent(x: number, y: number, a: AgentDesciption) {
        let my_x = Math.round(this.x);
        let my_y = Math.round(this.y);
        const vision_distance = this.config.AGENTS_OBSERVATION_DISTANCE + 1;

        // Forget an agent if no more visible
        if (Math.abs(my_x - x) + Math.abs(my_y - y) > vision_distance) {
            if (this.map[x][y]!.agentID === a.id) {
                this.log("FORGETTING", a)
                this.delete_agent(a);
            }
        } else if (this.map[x][y]!.agentID == null) {
            // If already forgot => OK
        } else {
            // If still visible and present, then postpone
            setTimeout(() => {
                this.forget_agent(x, y, a)
            }, FORGET_AFTER)
        }
    }

    delete_agent(a: AgentDesciption) {
        if (this.agents.has(a.id)) {

            for (let x = 0; x < this.map_size[0]; x += 1) {
                for (let y = 0; y < this.map_size[1]; y += 1){
                    if (this.map[x][y] != null && this.map[x][y].agentID === a.id) {
                        this.map[x][y].agentID = null;
                    }
                }
            }

            this.agents.delete(a.id);
        }
    }

    update_agent(a: AgentDesciption) {
        if (a.id === this.id) {
            return;
        }
        // Save or update new agent
        this.agents.set(a.id, a);

        // Remove old position
        for (let x = 0; x < this.map_size[0]; x += 1) {
            for (let y = 0; y < this.map_size[1]; y += 1){
                if (this.map[x][y] != null && this.map[x][y].agentID === a.id) {
                    this.map[x][y].agentID = null;
                }
            }
        }

        let x = Math.round(a.x)
        let y = Math.round(a.y)

        // Remember the agent in that position for a bit
        if (this.map[x][y]) {
            this.map[x][y]!.agentID = a.id;

            setTimeout(() => {
                this.forget_agent(x, y, a)
            }, FORGET_AFTER) 
        }
    }

    get_coor(): Point {
        return { x:Math.round(this.x), y: Math.round(this.y) };
    }

    // TODO: if action is blocked try to replan, maybe add a second plan to each intention
    //      OR save the search variables somewhere
    //      maybe requires to store the current intention
}

// BDI => Beliefs, Desires, Intentions

// Belief = what the agent believes (map, parcel positions, other agents positions and actions, delivery positions)
//     Belief problem: may has data inconsistency => 2 databases (real and expected)
//         Strategies: static (stay there forever), annihilation (exists only if I see it), prediction
// The agent is executing a plan, sees an obstacle => re-plan, wait until changes back => wait until re-plan

// Desires = goals the agent want to achieve (deliver packs, get packs, explore map)

// Intention = what the agent currently is doing (move to get a new pack, deliver packs, explore (no other option), planning, replan)
