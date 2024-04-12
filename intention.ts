import { Action, Desire, Plan } from "./types";
import { Agent } from "./agent"
import { Astar, number_to_direction } from "./socket";
import { generate_shortest_heuristic, nearestTiles } from "./heuristics";
import { isDelivery, isParcel } from "./goals";

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
            plan = [number_to_direction(Math.floor(Math.random()*4))]
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
