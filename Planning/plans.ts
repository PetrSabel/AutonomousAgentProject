import { onlineSolver, PddlExecutor, PddlProblem, Beliefset, PddlDomain, PddlAction } from "@unitn-asa/pddl-client";
import { readFileSync } from "fs";
import { Agent } from "../SingleAgent/agent.js";
import { DIRECTIONS } from "../SingleAgent/auxiliary.js";

export async function plan(agent: Agent, goal: string) {

    /** BeliefSet */
    const myBeliefset = new Beliefset();
    // My info
    myBeliefset.declare("me i")
    myBeliefset.undeclare("scored i")
    myBeliefset.declare("carry i") // If with declare/undeclare
    let t = "t" + agent.x + "_" + agent.y 
    myBeliefset.declare("at i " + t)

    // Map
    for (let row of agent.map) {
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
                if (tile.agentID) {
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
                        let [nx, ny] = agent.next_position(tile.x, tile.y, dir)

                        if (agent.map[nx] != undefined && agent.map[nx][ny]) {
                            let nt = "t" + nx + "_" + ny 
                            myBeliefset.declare(dir + " " + t + " " + nt)
                        }
                    }
                }
            }
        }
    }

    let init_situation = myBeliefset.toPddlString();
    let objects = myBeliefset.objects;

    // Problem 
    let problem = new PddlProblem("first", objects.join("\n  "), init_situation, goal)
    problem.saveToFile() // DEBUG

    let problem_string = problem.toPddlString()

    /** Domain */
    const DOMAIN_PATH = "Planning/domain-deliveroo.pddl"
    const DOMAIN_STRING: string = readFileSync( DOMAIN_PATH, 'utf8');

    
    /** Solve */
    let plan = await onlineSolver(DOMAIN_STRING, problem_string)
    console.log(plan)

    /** Execute */
    // const pddlExecutor = new PddlExecutor( lightOn );
    // pddlExecutor.exec( plan );

}
