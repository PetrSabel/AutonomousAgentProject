import { PriorityQueue } from "@datastructures-js/priority-queue";
import { Intention } from "./intention.js";
import { Tile, ParcelInfo, Parcel, Direction, Desire, Action, AgentDesciption, Plan, Point } from "../types"
import { DIRECTIONS, compute_dense_tiles, compute_spawn_tiles, detect_agents } from "./auxiliary.js";
import { set_agent_listeners } from "./socket.js";
import { FORGET_AFTER } from "../config.js";
import { Beliefset } from "@unitn-asa/pddl-client";


const dumb = true; // Specifies if agent should stop by pumping into others or by preventing it

export class Agent {
    // Mandatory information
    map: Tile[][];  // matrix[x,y] of Tiles
    map_size: [number, number];
    id: string;
    name: string;
    socket: any;
    // Configuration of the level
    config: any;
    // Function to compute plans
    planner: (agent: Agent, goal: "delivery" | Point, use_cache: boolean) => Promise<[Action[] | undefined, [number, number]]>


    // Current information
    #x: number;
    #y: number;
    score: number;

    // Beliefs 
    parcels: Map<string, ParcelInfo>; 
    agents: Map<string, AgentDesciption>;
    carry: Parcel[];

    time_to_decay: number;
    last_deliver_time: number;

    // Current agent state
    current_intention?: Intention 
    blocked: boolean 
    stopped: boolean

    dense_tiles: Array<Point>
    dense_visited: number

    move_cost: number;
    dont_disturb: boolean;

    // Desires
    desires: Desire[]
    new_desires: Desire[]


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
        this.score = 0;
        this.agents = new Map();

        // Initial agent state
        this.dont_disturb = false; 
        this.stopped = false;
        this.last_deliver_time = Date.now();
        this.desires = [{description: "explore"}, {description: "deliver"}]
        this.new_desires = []
        this.current_intention= undefined;
        this.blocked = false;
        this.dense_tiles = compute_spawn_tiles(this.map);
        this.dense_visited = 0


        this.log("Agent created!")
        
        // Sets function to decrease parcels values
        const parcel_decay_time: string = this.config.PARCEL_DECADING_INTERVAL
        if (parcel_decay_time !== 'infinite') {
            // Extract seconds from level configuration
            let decay = parcel_decay_time.replace(/\D/g, '');
            console.log("Decay", decay)

            let decay_time: number;
            try {
                // Transforms into milliseconds
                decay_time = 1000 * Number(decay);
            } catch {
                decay_time = 1000;
            }
            // Updates known parcels periodically
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

    // Coordinates are rounded because are used as indexes
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

    // Prints messages with agent id (for logging)
    log(...args: any[]) {
        console.log("("+this.id+")", ...args)
    }

    // Sets listeners to update beliefs 
    setListeners() {
        set_agent_listeners(this.socket, this);
    }

    // Stops agent and reset intention
    reset() {
        this.current_intention = undefined;
        this.dont_disturb = false;
        this.blocked = false;
        this.stopped = false;
    }

    // Stop comletelly the agent (not moving)
    stop() {
        this.current_intention = undefined;
        this.dont_disturb = true;
        this.blocked = true;
        this.stopped = true;
    }

    // Launch agent
    start() {
        this.log("Launching agent!")
        this.setListeners()
        
        this.loop()
    }

    createIntention(desire: Desire) {
        if (desire.description === "deliver") {
            return new Intention(desire, true)
        } else {
            return new Intention(desire);
        }
    }

    // Change current intention
    changeIntention(new_intention: Intention) {
        if (!this.dont_disturb) {
            if (this.current_intention) {
                if (this.current_intention.estimateProfit(this) < new_intention.estimateProfit(this)) {
                    this.executeIntention(new_intention)
                }
            } else {
                this.executeIntention(new_intention)             
            }
        }
    }

    // Agent actions

    async pickup() {
        this.socket.emit( 'pickup', (parcels: Parcel[]) => {
            // Move parcels from map to carry
            for (let parcel of parcels) {
                this.carry.push(parcel);
                this.remove_parcel(parcel.id)
            }
        } );
    }

    async putdown() {
        await this.socket.emit( 'putdown' );

        // Remove from beliefs
        for (const parcel of this.carry) {
            this.remove_parcel(parcel.id);
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
        if (!this.stopped) {
            await this.reactive_behavior();
            
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
    }

    // Main loop
    async loop() {
        while (true) {
            try {
                // Get possible intentions
                let options = this.getOptions()
                this.log("\n\nCOMPUTING", options.length ,"options.....")

                // Compute plans for options
                // console.time("-------------------------------")
                await Promise.all(options.map(opt => opt.compute_plan(this, this.planner)));
                // console.timeEnd("-------------------------------")
                
                // Remove impossible options and more
                let queue = this.filterOptions(options)

                // Take best option
                let first = queue.pop();
                if (first) {
                    // Skip if there is alraeady an intention
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
        }
    }

    // Transforms desires into intentions
    getOptions(): Intention[] {
        this.desires = [];
        this.desires.length = 0;

        this.desires.push({description: "explore"});
        this.desires.push({description: "deliver"})
        for(let parcel of this.parcels.values()) {
            this.desires.push({
                description:"pickup",
                parcel: parcel
            })
        }

        let res: Array<Intention> = new Array;
        for (let desire of this.desires) {
            let intention = this.createIntention(desire);

            res.push(intention)
        }

        return res;
    }

    // Transforms desires appeared during movement into intentions
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
        options = options.filter(option => option.currentPlan != undefined);
        options = options.filter(option => option.cost >= 0.0);
        // Sorted queue
        let queue = new PriorityQueue((a: Intention, b: Intention) => a.cost > b.cost ? -1 : 1, options)

        return queue;
    }

    async executeIntention(intention: Intention, ignoring: boolean = false) {
        if (this.stopped) {
            this.log("NOT EXECUTING because STOPPED")
            return;
        }
        // Reset agent state 
        this.blocked = false 
        this.dont_disturb = ignoring;
        this.current_intention = intention;
        this.log("EXECUTING", intention.desire.description, intention.x, intention.y,
                    "From", this.x, this.y, "SCORE", intention.cost, intention.currentPlan, "\n\n+++++++++++++++")

        let reachable: boolean;
        do {
            await this.reactive_behavior();

            // Check if need to replan
            if (this.new_desires.length > 0 && !this.dont_disturb) {
                this.log("NEW DESIRES FOUND")
                
                if (this.current_intention != undefined && this.current_intention.desire.description == "deliver") {
                    this.log("SKIPPED BECAUSE DELIVERING")
                    
                } else {
                    let new_options = this.get_new_options()
    
                    for (let option of new_options) {
                        await option.compute_plan(this, this.planner);
                    }
    
                    let filtered = this.filterOptions(new_options)
    
                    // If new intention is better, execute it
                    let first = filtered.pop()
                    if (first) {
                        if (this.current_intention == undefined) {
                            this.current_intention = first;
                        } else if (first.estimateProfit(this) > this.current_intention.estimateProfit(this)) {
                            this.log("CHANGED")
                            this.current_intention = first 
                        } else {
                            // console.log("NOT CHANGED")
                        }
                    }
                }
            }
            
            // Do an action
            await this.current_intention.step(this);

            if (dumb) {
                reachable = this.current_intention != undefined && this.current_intention.executing && !this.blocked;
            } else {
                reachable = this.current_intention != undefined && this.current_intention.executing && !this.blocked && this.check_reachable();
            }
        } while (reachable)

        // Reset agent 
        if (this.current_intention != undefined) {
            this.current_intention.stop()
            this.dont_disturb = false;
            this.current_intention = undefined;
        }

        // Give a possibility to update beliefs (asynchronously)
        await new Promise(res => setTimeout(res, 50));
    }

    // Waits some time
    async timer(ms: number) {
        await new Promise(res => setTimeout(res, ms));
    }

    async reactive_behavior() {
        let x = this.x
        let y = this.y

        // Check if the tile has a parcel
        if (this.map[x][y] != undefined && this.map[x][y].parcel) {
            await this.pickup();
        }

        // Putdown if pass through delivery zone
        if (this.map[x][y] != undefined && this.map[x][y].delivery) {
            await this.putdown()
        }
    }

    // Returns whether the destination is reachable
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

    // Remove parcels from beliefs 
    remove_parcel(parcel_id: string) {
        let parcel = this.parcels.get(parcel_id)
        if (parcel) {
            let x = Math.round(parcel.x)
            let y = Math.round(parcel.y)
            this.map[x][y]!.parcel = null
            this.parcels.delete(parcel_id)
        }
    }

    update_parcel(parcel: ParcelInfo) {
        // If transported, remove
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

    // Checks whether the current intention is still valid (no agent blocks)
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

    // Create PDDL BeliefSet
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

    // Removes immediatelly an agent from beliefs
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

    // Returns current position
    get_coor(): Point {
        return { x:Math.round(this.x), y: Math.round(this.y) };
    }
}
