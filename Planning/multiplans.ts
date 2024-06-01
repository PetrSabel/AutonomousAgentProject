import { onlineSolver, PddlExecutor, PddlProblem, Beliefset, PddlDomain, PddlAction } from "@unitn-asa/pddl-client";
import { readFileSync } from "fs";
import { DIRECTIONS, Point } from "../SingleAgent/auxiliary.js";
import { Action } from "../types.js";
import { DOMAIN_PATH, MULTI_DOMAIN_PATH } from "../config.js";
import { MultiAgent } from "../MultiAgent/agent.js";

export async function plan(agent: MultiAgent, goal: string, for_cache: boolean = false, position?: Point): Promise<Action[] | undefined> {

    /** BeliefSet */
    const myBeliefset = new Beliefset();
    // My info
    myBeliefset.declare("me i")
    myBeliefset.undeclare("scored i")
    // Friends info
    if (agent.friends) {
        for (let f of agent.friends) {
            myBeliefset.declare("friend " + f)
            myBeliefset.undeclare("scored " + f)
        }
    }

    if (goal === "scored i") {
        if (agent.friends) {
            goal = "(or (scored i)"
            for (let f of agent.friends) [
                goal += " (scored " + f + ")" 
            ]
            goal += ")"
        } else {
            goal = "scored i";
        }
        myBeliefset.declare("carry i")
    } else {
        myBeliefset.undeclare("carry i")
    }

    let t = (position != undefined) ? "t" + position.x + "_" + position.y : "t" + agent.x + "_" + agent.y;
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
    // problem.saveToFile() // DEBUG

    let problem_string = problem.toPddlString()

    /** Domain */
    const DOMAIN_STRING: string = readFileSync( DOMAIN_PATH, 'utf8');

    if (goal == "multi") {
        let domain = readFileSync( MULTI_DOMAIN_PATH, 'utf8');
        const PROBLEM_STRING: string = readFileSync( "Planning/problem-multi.pddl", 'utf8');
        try {
            let plan = await onlineSolver(domain, PROBLEM_STRING);
            console.log("MULTI-PLAN is ", plan)
        } catch(e) {
            console.error("Solver ERROR", e)
        }
    }
    
    /** Solve */
    let plan: any = undefined;
    // console.time("solve " + t +  goal)
    try {
        plan = await onlineSolver(DOMAIN_STRING, problem_string);
    } catch(e) {
        console.error("Solver ERROR", e)
    }
    // console.timeEnd("solve " + t + goal)

    /** Execute */
    let moves = [];
    
    if (plan) {
        // Rewrite plan to the list of moves
        for (let a of plan) {
            if (a.action === "deliver"){
                moves.push("putdown");
            } else {
                moves.push(a.action.toLowerCase())
            }
        }

    } else {
        agent.log("IMPOSSIBLE INTENTION", goal);
        // problem.saveToFile();
        return undefined;
    }

    agent.log("PLAN", moves);
    return moves;
}
