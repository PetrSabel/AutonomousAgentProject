import { Agent } from "./agent";
import { Astar } from "./astar";
import { generate_exact_position, isDelivery } from "./goals";
import { generate_air_distance, nearestTiles } from "./heuristics";
import { Action, Desire, Direction, Plan, Tile } from "./types";

export { plan, EXPLORE_COST, compute_dense_tiles, Point, detect_agents }

const EXPLORE_COST: number = 0.1;
// Delivery has a discount on move cost
const DELIVERY_DISCOUNT: number = 0.5;
const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];

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

function number_to_direction(index: number): Direction {
    return DIRECTIONS[ index % DIRECTIONS.length ];
}

// TODO: change "agent" with requested information
// TODO: take a callback function, called each time new cost estimation is computed
function plan(agent: Agent, desire: Desire): [Plan, number, [number, number]] {
    let plan: Action[] = []
    let score: number = 0
    let new_plan: Action[] | undefined = undefined;
    let coor: [number, number]

    // TODO: move each subcase in its own function
    switch (desire.description) {
        case "deliver": {
            // Find deliver tiles
            // Route to the nearest delivery zone
            [new_plan, coor] = Astar(agent.map, agent.map_size, agent.x, agent.y, nearestTiles, isDelivery);

            
            if (new_plan) {
                plan = new_plan
                plan.push("putdown")

                let parcels = agent.carry
                // Sum all carried rewards
                let reward = parcels.map(p => p.reward? p.reward : 0).reduce((acc, num) => acc + num, 0)
                let loss = parcels.map(p => Math.max(0, p.reward - plan.length)).reduce((acc, num) => acc + num, 0)
                // TODO: maybe place division
                score = reward - agent.move_cost * loss * DELIVERY_DISCOUNT / agent.time_to_decay;

                // console.log("DELIVER INTENTION", score, reward, loss)
            
            } else {
                score = -1
            }

            // Return obtained plan
            return [plan, score, coor]
        }
        case "explore": {
            // Decide where to move or Random move
            // plan = [number_to_direction(Math.floor(Math.random()*4))]
            
            // Goes to the point where more other points are visible
            //  Greedy exploring

            let choice = agent.dense_tiles.shift()!;
            if (choice == undefined) {
                console.error("HEEEEERE")
                // for(let i = 0; true; i++) {
                // }
            } else {
                // console.log("CHOICE", choice)
            }
            agent.dense_tiles.push(choice);

            [new_plan, coor] = Astar(agent.map, agent.map_size, agent.x, agent.y,
                    generate_air_distance(choice.x, choice.y),
                    generate_exact_position(choice.x, choice.y));

            // Generate some plan
            if (new_plan){
                plan = new_plan;
            } else {
                // Random move because cannot plan something
                plan = [number_to_direction(Math.floor(Math.random()*4))];
            }
            
            return [plan, EXPLORE_COST, coor];
        }
        case "pickup": {
            // Find route to parcel
            const parcel = desire.parcel;
            // TODO: change goal function to exactPosition OR isParcel is better
            [new_plan, coor] = Astar(agent.map, agent.map_size, agent.x, agent.y,
                generate_air_distance(parcel.x, parcel.y), generate_exact_position(parcel.x, parcel.y));
            
            // TODO: more sophisticate score
            
            if (new_plan) {
                score = parcel.reward - new_plan.length * agent.move_cost / agent.time_to_decay;
                // Evaluates if there is an agent closer than me
                const enemy_gap = detect_agents(parcel.x, parcel.y, agent)
                if (enemy_gap > 0) {
                    score /= Math.pow(2, enemy_gap);
                }

                plan = new_plan
                plan.push("pickup")

                // console.log("PICKUP INTENTION", parcel, score, plan.length * agent.move_cost)
            } else {
                score = -1
            }
            
            // Return plan
            return [plan, score, coor]
        }
        default:
            throw new Error("Desire not implemented")
    }
}

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

type Point = { x: number, y: number };

function compute_dense_tiles(map: Tile[][]) {
    // Compute dense tiles
        
    const rows = map.length;
    const cols = map[0].length;

    // TODO: move this computation to "map" handler and store inside the agent
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
        }
    }

    if (maxTruePoints.length < 1) {
        maxTruePoints.push({
            x: 0, y: 0
        })
    }

    let res = maxTruePoints.reverse().slice(0, Math.floor(maxTruePoints.length * 0.3));
    return shuffle(res);
}
