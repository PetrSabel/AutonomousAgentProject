import { Desire, Plan } from "./types";
import { Agent } from "./agent"

// TODO: change agent with requested information
function plan(agent: Agent, desire: Desire): [Plan, number] {
    switch (desire.description) {
        case "deliver":
            // Find deliver tiles
            // Route to the nearest one
            // Return obtained plan
            return [new Array, 3]
            
        case "explore":
            // Decide where to move or Random move
            return [new Array, 0]
            
        case "pickup":
            // Find route to parcel
            // Return plan
            return [new Array, 3]

        default:
            throw new Error("Desire not implemented")
    }
}


class Intention {
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

    start(agent: Agent) {
        if (!this.executing) {
            this.executing = true
            this.execute(agent)
        }
    }

    async execute(agent: Agent) {
        while (this.executing && this.currentPlan.length > 0) {
            let action = this.currentPlan.shift()!;
            switch (action) {
                case "pickup":
                    await agent.pickup();
                    break;

                case "putdown":
                    await agent.putdown();
                    break;

                case "left":
                    await agent.move("left")
                    .catch( err => {
                        this.replan(agent)
                    })
                    break;

                case "right":
                    await agent.move("right")
                    .catch( err => {
                        this.replan(agent)
                    })
                    break;

                case "up":
                    await agent.move("up")
                    .catch( err => {
                        this.replan(agent)
                    })
                    break;

                case "down":
                    await agent.move("down")
                    .catch( err => {
                        this.replan(agent)
                    })
                    break;

                default:
                    throw new Error("Action not recognized")
            }
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
//      expore => Intention: go (but where? randomly?)
//      deliver => Intention: go + Intention: putdown
// new, remove

// Intention: go, pickup, putdown
//      go => plan + execute
//      pickup => emit pickup
//      putdown => emit putdown
// Each intention has a cost, we choose the best one.
// We can also merge intentions, to achive better combined intention (score <= score1 + score2)
// Start, stop, merge, finish, replan
