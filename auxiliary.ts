import { Agent } from "./agent";
import { Astar } from "./astar";
import { generate_exact_position, isDelivery } from "./goals";
import { generate_air_distance, nearestTiles } from "./heuristics";
import { Action, Desire, Plan, Tile } from "./types";

export { plan, EXPLORE_COST, compute_dense_tiles, Point, detect_agents }

const EXPLORE_COST: number = 0.1;
const MOVE_COST: number = 2;


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
                const reward = parcels.map(p => p.reward? p.reward : 0).reduce((acc, num) => acc + num, 0)
                const loss = parcels.map(p => Math.max(0, p.reward - plan.length)).reduce((acc, num) => acc + num, 0)
                // TODO: maybe place division
                score = reward - loss 
                //score = 20
                // console.log("DELIVERYCOST ", score, reward, loss)
            
            } else {
                score = 0
            }

            // Return obtained plan
            return [plan, score, coor]
        }
        case "explore": {
            // Decide where to move or Random move
            // plan = [number_to_direction(Math.floor(Math.random()*4))]
            
            // Goes to the point where more other points are visible
            //  Greedy exploring

            const choice = agent.dense_tiles.shift()!;
            agent.dense_tiles.push(choice);

            [new_plan, coor] = Astar(agent.map, agent.map_size, agent.x, agent.y,
                    generate_air_distance(choice.x, choice.y),
                    generate_exact_position(choice.x, choice.y));
            if (new_plan){
                plan = new_plan;
            }
            else{
                plan == null;
            }
            
            return [plan, EXPLORE_COST, coor]
        }
        case "pickup": {
            // Find route to parcel
            const parcel = desire.parcel;
            // TODO: change goal function to exactPosition OR isParcel is better
            [new_plan, coor] = Astar(agent.map, agent.map_size, agent.x, agent.y,
                generate_air_distance(parcel.x, parcel.y), generate_exact_position(parcel.x, parcel.y));
            
            // TODO: more sophisticate score
            
            if (new_plan) {
                score = parcel.reward - plan.length * MOVE_COST
                // Evaluates if there is an agent nearby
                const n_others = detect_agents(parcel.x, parcel.y, agent)
                if (n_others > 0) {
                    score /= Math.pow(2, n_others);
                }

                plan = new_plan
                plan.push("pickup")
            } else {
                score = 0
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
    
    for (const intruder of agent.agents.values()) {
        let [moves, _] = Astar(map, agent.map_size, intruder.x, intruder.y,
            generate_air_distance(x, y), generate_exact_position(x, y));

        let intruder_distance = moves? moves.length : 100_000;
        
        if (intruder_distance < my_distance) {
            res += 1;
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

    return maxTruePoints.reverse().slice(0, Math.floor(maxTruePoints.length * 0.3));
}
