import { Agent } from "./agent.js";
import { Astar } from "./astar.js";
import { generate_exact_position, isDelivery } from "./goals.js";
import { generate_air_distance, nearestTiles } from "./heuristics.js";
import { Action, Desire, Direction, Plan, Point, Tile } from "../types";
import { plan } from "../Planning/plans.js";
import { DPPL_PLANNING, DELIVERY_WEIGHT, DELIVERY_EVERY, RANDOM_PICKUP } from "../config.js";
import { MultiAgent } from "../MultiAgent/agent.js";
import { multiplan } from "../Planning/multiplans.js";

export { plan_intention, compute_spawn_tiles, compute_dense_tiles, detect_agents, DIRECTIONS, 
    plan_and_coors_astar, plan_and_coors_pddl, plan_and_coors_multipddl
}

// Delivery has a discount on move cost
const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];
// Key is in form: "x y goal" where goal can be "delivery" or "goal_x goal_y"
const cached_plans: Map<string, Plan> = new Map();
// Pickup options should be considered as good exploration options

// Shuffle an array 
function shuffle<T>(a: Array<T>) {
    let j: number, x: T, i: number;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

// Convert a number into valid direction
function number_to_direction(index: number): Direction {
    return DIRECTIONS[ index % DIRECTIONS.length ];
}

//Planners

// Version Astar
async function plan_and_coors_astar(agent: Agent, goal: "delivery" | Point, use_cache = false): 
        Promise<[Action[] | undefined, [number, number]]> {
    if (goal == "delivery") {
        return new Promise((res, rej) => {
            try {
                res(Astar(agent.map, agent.map_size, agent.x, agent.y, nearestTiles, isDelivery));
            } catch {
                rej("Some error in Astar")
            }
        });
    } else {
        return new Promise((res, rej) => {
            try {
                res(Astar(agent.map, agent.map_size, agent.x, agent.y,
                        generate_air_distance(goal.x, goal.y),
                        generate_exact_position(goal.x, goal.y)));
            } catch {
                rej("Some error in Astar")
            }
        });
    }
}

// Version PDDL
async function plan_and_coors_pddl(agent: Agent, goal: "delivery" | Point, use_cache = true): 
        Promise<[Action[] | undefined, [number, number]]> {

    let key = agent.x + " " + agent.y + " ";
    if (goal === "delivery") {
        key += goal 
    } else {
        key += (goal.x + " " + goal.y)
    }

    let p: Action[] | undefined = undefined;
    // Check cache
    if (use_cache && cached_plans.has(key)) {
        // Gets plan from cache
        p = cached_plans.get(key).slice();

        // Updates cache (async)
        if (goal == "delivery") {
            plan(agent, "scored i", true).then((res) => {
                    if (res) save_plan(key, res.slice())
                }
            )
        } else {
            let t = "t" + goal.x + "_" + goal.y;
            plan(agent, "at " + "i " + t, true).then((res) => {
                    if (res) save_plan(key, res.slice())
                }
            )
        }

    } else {
        // Compute a plan from zero
        agent.log("CACHE MISS", key)
        if (goal == "delivery") {
            p = await plan(agent, "scored i");
        } else {
            let t = "t" + goal.x + "_" + goal.y;
            p = await plan(agent, "at " + "i " + t);
        }

        // Add to cache (if exists)
        if (p != undefined) {
            console.log("SAVE to CACHE", key)
            save_plan(key, p.slice());
        } else {
            // Special case: same start and goal 
            if (goal !== "delivery" && goal.x == agent.x && goal.y == agent.y) {
                save_plan(key, []);
            }
        }
    }

    // Compute final position after executing the plan
    let pos: [number, number] = [agent.x, agent.y];
    if (p) {
        pos = compute_final_position(p, agent);
    }

    return [p, pos];
}

// Version Multiagent PDDL
async function plan_and_coors_multipddl(agent: MultiAgent, goal: "delivery" | Point, use_cache = true): 
        Promise<[Action[] | undefined, [number, number]]> {

    let key = agent.x + " " + agent.y + " ";
    if (goal == "delivery") {
        key += goal;
        use_cache = false; // Exchange is not well cachable
    } else {
        key += (goal.x + " " + goal.y)
    }

    let p: Action[] | undefined = undefined;
    // Check cache
    if (use_cache && cached_plans.has(key)) {
        p = cached_plans.get(key).slice();
        if (goal == "delivery") {
            plan(agent, "scored i", true).then((res) => {
                    if (res) save_plan(key, res.slice())
                }
            )
        } else {
            let t = "t" + goal.x + "_" + goal.y;
            plan(agent, "at " + "i " + t, true).then((res) => {
                    if (res) save_plan(key, res.slice())
                }
            )
        }
    } else {
        // Compute a plan from zero
        agent.log("CACHE MISS", key)
        if (goal == "delivery") {

            let goal_description = "scored i";
            [p, agent.friend_plan] = await multiplan(agent, goal_description);
        } else {
            let t = "t" + goal.x + "_" + goal.y;
            p = await plan(agent, "at " + "i " + t);
        }

        // Add to cache
        if (p != undefined) {
            console.log("SAVE to CACHE", key)
            save_plan(key, p.slice());
        } else {
            // Special case: same start and goal 
            if (goal !== "delivery" && goal.x == agent.x && goal.y == agent.y) {
                save_plan(key, []);
            }
        }
    }

    let pos: [number, number] = [agent.x, agent.y];

    if (p) {
        pos = compute_final_position(p, agent);
    }

    return [p, pos];
}

function compute_final_position(plan: Action[], agent: Agent) {
    let pos: [number, number] = [agent.x, agent.y];
    for (let a of plan) {
        pos = agent.next_position(pos[0], pos[1], a);
    }

    return pos;
}

function save_plan(key: string, plan: Action[]) {
    cached_plans.set(key, plan)
}

let plan_and_coors = DPPL_PLANNING ? plan_and_coors_pddl : plan_and_coors_astar;

// Computes score for each plan
async function plan_intention(agent: Agent, desire: Desire,
    planner: (agent: Agent, goal: "delivery" | Point, use_cache: boolean) => Promise<[Action[] | undefined, [number, number]]>,
        use_cache = true): 
        Promise<[Plan | undefined, number, [number, number]]> {

    let plan: Action[] | undefined = undefined
    let score: number = 0
    let new_plan: Action[] | undefined = undefined;
    let coor: [number, number]

    switch (desire.description) {
        case "deliver": {
            // Find deliver tiles
            // Route to the nearest delivery zone
            [new_plan, coor] = await planner(agent, "delivery", use_cache);
            
            if (new_plan) {
                plan = new_plan
                plan.push("putdown")

                let parcels = agent.carry
                // Sum all carried rewards
                let reward = parcels.map(p => p.reward).reduce((acc, num) => acc + num, 0)
                let loss = parcels.map(p => Math.max(0, p.reward - plan.length)).reduce((acc, num) => acc + num, 0)
                
                if (agent.last_deliver_time + DELIVERY_EVERY * 1_000 < Date.now() && loss > 0) {
                    // Agent should consider delivery every 1 minute
                    score = 1_000_000;
                } else if (agent.time_to_decay > 10_000) {
                    score = 0
                } else {
                    score = reward / DELIVERY_WEIGHT;
                }
            
            } else {
                score = 0
            }

            // Possible random choice for exploring
            if (score < 0) {
                score = Math.random()
            }

            // Return obtained plan
            return [plan, score, coor]
        }
        case "explore": {
            // Decide where to move or Random move
            
            // Random choice from spawners
            let index = Math.floor(Math.random() * agent.dense_tiles.length);
            let choice = agent.dense_tiles[index];

            if (choice == undefined) {
                choice = agent.get_coor();
            }

            [new_plan, coor] = await plan_and_coors(agent, {x: choice.x, y: choice.y}, use_cache);

            // Generate some plan
            if (new_plan){
                plan = new_plan;
            } else {
                // Random move because cannot plan something

                // Gets possible moves
                let available = []
                for (let dir of DIRECTIONS) {
                    let [x,y] = agent.next_position(agent.x, agent.y, dir);
                    if (agent.map[x] != undefined && agent.map[x][y] != undefined 
                        && agent.map[x][y].agentID == undefined) {
                        available.push(dir)
                    }
                }

                // Chooses randomly
                if (available.length > 0) {
                    let index = Math.floor(Math.random()*available.length);
                    plan = [available[index]];
                } else {
                    // agent.log("COMPLETELY BLOCKED", agent.agents, agent.map)
                }
                agent.log("AVAILABLE", available, plan)
            }
            
            return [plan, Math.random(), coor];
        }
        case "pickup": {
            // Find route to parcel
            const parcel = desire.parcel;
            [new_plan, coor] = await plan_and_coors(agent, {x: parcel.x, y: parcel.y}, use_cache);
            
            if (new_plan) {
                score = parcel.reward - new_plan.length * agent.move_cost / agent.time_to_decay;

                // Evaluates if there is an agent closer than me
                const enemy_gap = detect_agents(parcel.x, parcel.y, agent)
                if (enemy_gap > 0) {
                    score /= Math.pow(2, enemy_gap);
                }

                plan = new_plan
                plan.push("pickup")

            } else {
                score = 0
            }

            // Prioritized random choice for exploring
            if (score < 0) {
                score = Math.random() * RANDOM_PICKUP;
            }
            
            // Return plan
            return [plan, score, coor]
        }
        default:
            throw new Error("Desire not implemented")
    }
}

// Returns the gap between another agent and me 
function detect_agents(x: number, y: number, agent: Agent): number {
    let map = agent.map;
    let res = 0;

    const [moves, _] = Astar(map, agent.map_size, agent.x, agent.y,
        generate_air_distance(x, y), generate_exact_position(x, y));
    const my_distance = moves ? moves.length : 100_000;
    
    for (let intruder of agent.agents.values()) {
        let [moves, _] = Astar(map, agent.map_size, intruder.x, intruder.y,
            generate_air_distance(x, y), generate_exact_position(x, y));

        let intruder_distance = moves? moves.length : 100_000;
        
        if (intruder_distance < my_distance) {
            // Compute maximum advantage of another agent
            res = Math.max(my_distance - intruder_distance, res);
        }
    }

    return res;
}

function compute_spawn_tiles(map: Tile[][]): Point[] {
    let res: Point[] = [];
    for (let row of map) {
        for (let tile of row) {
            if (tile != undefined && tile.spawnable) {
                res.push({x: tile.x, y: tile.y})
            }
        }
    }

    return shuffle(res).slice(0, 10);
}

// Compute tiles with maximum visible spawners
function compute_dense_tiles(map: Tile[][]): Point[] {
    const rows = map.length;
    const cols = map[0].length;

    function getTrueCount(point: Point): number {
        const { x, y } = point;
        let trueCount = 0;
        for (let m = -2; m <= 2; m++) {
            for (let n = -2; n <= 2; n++) {
                const dx = x + m;
                const dy = y + n;
                if (map[dx] && map[dx][dy] !== null) {
                    trueCount += map[dx][dy]?.spawnable? 1 : 0;
                }
            }
        }
        return trueCount;
    }

    let maxTruePoints: Point[] = [];

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let trueCount = 0;

            for (let m = -2; m <= 2; m++) {
                for (let n = -2; n <= 2; n++) {
                    const x = i + m;
                    const y = j + n;

                    if (x >= 0 && x < rows && y >= 0 && y < cols && map[x][y]) {
                        trueCount++;
                    }
                }
            }

            insertInDescendingOrder({ x: i, y: j }, trueCount, maxTruePoints);
            function insertInDescendingOrder(point: Point, count: number, points: Point[]): void {
                let index = 0;
                while (index < points.length && count > getTrueCount(points[index])) {
                    index++;
                }
                if(map[point.x][point.y]) {
                    points.splice(index, 0, point);
                }
                
            }
            
            
        }
    }

    if (maxTruePoints.length < 1) {
        maxTruePoints.push({
            x: 0, y: 0
        })
    }

    let res = maxTruePoints.filter((p) => getTrueCount(p) > 0);
    res = res.reverse().slice(0, Math.floor(maxTruePoints.length * 0.3));
    return shuffle(res);
}
