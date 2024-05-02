import { ICompare, PriorityQueue } from "@datastructures-js/priority-queue";
import { Action, Tile } from "./types";

export type State = {
    x: number, 
    y: number,
    moves: Action[],
};

// TODO: decide how to manage situations when other agent block me
// TODO: get estimate function that can help to ignore too distant/unreachable parcels (saving time)
export function Astar(map: Tile[][], map_size: [number, number], agent_x: number, agent_y: number, 
    h: ICompare<State>, goal: (tile: Tile) => boolean, goal_tile?: [number, number]
): [Action[] | undefined, [number, number]] {
    let plan = new Array<Action>;
    let final_x = Math.round(agent_x);
    let final_y = Math.round(agent_y);

    // TODO: check if there is some known parcel
    if (map) {

        // Try to reach it
        let q: PriorityQueue<State> = new PriorityQueue(h);
        // if (goal_tile) {
        //     // Start to search from the goal, supposing to arrive at the agent
        //     q.enqueue({x: goal_tile[0], y: goal_tile[1], moves: []})
        // }
        // TODO: inverse each action

        q.enqueue({x: Math.round(agent_x), y: Math.round(agent_y), moves: []});
        let visited: Array<[x:number, y:number]> = [];

        while (!q.isEmpty()) {
            // console.log(q.toArray())
            let curr = q.pop();
            let {x, y, moves} = curr;

            if (visited.some((el) => el[0] === x && el[1] === y)) {
                continue;
            } else {
                visited.push([x,y]);
            }
            
            try{
                let _ = map[x][y];
            } catch {
                console.log("HERE", x, y, map)    
            }
            let tile = map[x][y];

            // console.log("TILE", tile, x, y)
            if (!tile) {
                continue
            } else if (goal(tile) && tile.agentID === null) { 
                // Stops when find the first accepted block
                // console.log("Want to arrive to", x, y, tile, "from", agent_x, agent_y)
                plan = moves;
                final_x = x; 
                final_y = y;
                break;
            } else {

                if (tile.agentID){
                    // Agent blocks the path
                    // moves.push("wait")  
                    continue; // Ignore the tile if occupied  
                } 

                if (x > 0) {
                    q.enqueue({x: x-1, y, moves:[...moves, 'left']});
                }
                if (x < map_size[0] - 1) {
                    q.enqueue({x: x+1, y, moves:[...moves, 'right']});
                }

                if (y > 0) {
                    q.enqueue({x, y:y-1, moves:[...moves, 'down']});
                }
                if (y < map_size[1] - 1) {
                    q.enqueue({x, y:y+1, moves:[...moves, 'up']});
                }
            }
        }
    }

    // TODO: check condition 
    if (plan.length > 0 || goal(map[final_x][final_y])) {
        return [plan, [final_x, final_y]];
    } else {
        return [undefined, [final_x, final_y]]
    }
}
// Note: name "god" is quite powerful
