import { Action, Desire, Plan } from "./types";
import { Agent } from "./agent"
import { Astar, number_to_direction } from "./socket";
import { generate_shortest_heuristic, nearestTiles } from "./heuristics";
import { generate_exact_position, isDelivery, isParcel } from "./goals";

// TODO: change agent with requested information
function plan(agent: Agent, desire: Desire): [Plan, number] {
    let plan: Action[] = []
    let score: number = 0
    let new_plan: Action[] | undefined = undefined;

    switch (desire.description) {
        case "deliver":
            // Find deliver tiles
            // Route to the nearest one
            new_plan = Astar(agent.map, agent.x, agent.y, nearestTiles, isDelivery);

            
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
                console.log("DELIVERYCOST ", score, reward, loss)
            
            } else {
                score = 0
            }

            // Return obtained plan
            return [plan, score]
            
        case "explore":
            // Decide where to move or Random move
            //plan = [number_to_direction(Math.floor(Math.random()*4))]
            let map = agent.map
            type Point = { x: number, y: number };
            const rows = map.length;
            const cols = map[0].length;

            let maxTrueCount = 0;
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
                                if (map[dx] && map[dx][dy]) {
                                    trueCount++;
                                }
                            }
                        }
                        return trueCount;
                    }

                    /*if (trueCount > maxTrueCount) {
                        maxTrueCount = trueCount;
                        maxTruePoints.splice(0, maxTruePoints.length, { x: i, y: j });
                    } else if (trueCount === maxTrueCount) {
                        maxTruePoints.push({ x: i, y: j });
                    }*/
                }
            }
            let TruePoints_correct = maxTruePoints.slice().reverse();
            console.log("fjyfhhfhjjhjhgjhjfjhf", TruePoints_correct);
            new_plan = Astar(agent.map, agent.x, agent.y, generate_shortest_heuristic(TruePoints_correct[0].x, TruePoints_correct[0].y),
                    generate_exact_position(TruePoints_correct[0].x, TruePoints_correct[0].y));
            if (new_plan){
                plan = new_plan;
            }
            else{
                plan == null;
            }
            
            return [plan, 0.1]
            
        case "pickup":
            // Find route to parcel
            let parcel = desire.parcel
            // TODO: change goal function to exactPosition
            new_plan = Astar(agent.map, agent.x, agent.y, generate_shortest_heuristic(parcel.x, parcel.y), isParcel);
            
            // TODO: more sophisticate score
            
            if (new_plan) {
                score = parcel.reward - plan.length
                plan = new_plan
                plan.push("pickup")
            } else {
                score = 0
            }
            
            // Return plan
            return [plan, score]

        default:
            throw new Error("Desire not implemented")
    }
}


export class Intention {
    // The associated desire
    desire: Desire 
    currentPlan: Plan
    // Estimated profit/cost of executing this intention
    cost: number
    executing: boolean

    constructor(agent: Agent, desire: Desire) {
        this.desire = desire
        // TODO: suddivide intention in subintentions
        this.executing = false;
        [this.currentPlan, this.cost] = plan(agent, desire)
    }
    // TODO: decide how we suddivide information between Desire, Intention and Plan

    start(): Action[] | undefined {
        if (!this.executing) {
            this.executing = true
            return this.currentPlan
        }
    }

    stop() {
        if (this.executing) {
            this.executing = false
        }
    }

    replan(agent: Agent) {
        [this.currentPlan, this.cost] = plan(agent, this.desire)
    }
}

// Desire possibilities: 'pick_up', 'explore', 'deliver'
//      pick_up => Intention: go + Intention: pickup
//      expore => Intention: random_go (but where? randomly?)
//      deliver => Intention: go + Intention: putdown
// new, remove

// Intention: go, pickup, putdown
//      random_go
//      go => plan + execute
//      pickup => emit pickup
//      putdown => emit putdown
// Each intention has a cost, we choose the best one.
// We can also merge intentions, to achive better combined intention (score <= score1 + score2)
// Start, stop, merge, finish, replan
