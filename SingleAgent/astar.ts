import { ICompare, PriorityQueue } from "@datastructures-js/priority-queue";
import { Action, Tile } from "../types";

export type State = {
    x: number, 
    y: number,
    moves: Action[],
};

export function Astar(map: Tile[][], map_size: [number, number], agent_x: number, agent_y: number, 
    h: ICompare<State>, goal: (tile: Tile) => boolean, goal_tile?: [number, number]
): [Action[] | undefined, [number, number]] {
    let plan = new Array<Action>;
    let final_x = Math.round(agent_x);
    let final_y = Math.round(agent_y);

    // Sorted queue
    let q: PriorityQueue<State> = new PriorityQueue(h);
    q.enqueue({x: Math.round(agent_x), y: Math.round(agent_y), moves: []});
    let visited: Array<[x:number, y:number]> = [];

    while (!q.isEmpty()) {
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

        if (!tile) {
            continue
        } else if (tile.agentID) {
            continue; // Ignore the tile if occupied  
        } else if (goal(tile) && tile.agentID == null) { 
            // Stops when find the first accepted block
            plan = moves;
            final_x = x; 
            final_y = y;
            break;

        } else {

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

    const goal_free = map[final_x][final_y]?.agentID == null;
    if (plan.length > 0 && goal(map[final_x][final_y]) && goal_free) {
        return [plan, [final_x, final_y]];
    } else {
        return [undefined, [final_x, final_y]]
    }
}
