import { ICompare } from "@datastructures-js/priority-queue";
import { State } from "./astar"

export { nearestTiles, generate_air_distance }

const BETTER_OPTION: number = -1;
const WORSE_OPTION: number = 1;

const nearestTiles: ICompare<State> = (a: State, b: State) => {
    let dist_a = a.moves.length 
    let dist_b = b.moves.length 
    
    return dist_a < dist_b ? BETTER_OPTION : WORSE_OPTION;
};

// Considers distance to given (x,y)
function generate_air_distance(x: number, y: number) {
    return (a: State, b: State) => {
        let dist_a = Math.abs(x - a.x) + Math.abs(y - a.y)
        let dist_b = Math.abs(x - b.x) + Math.abs(y - b.y)

        return dist_a < dist_b ? BETTER_OPTION : WORSE_OPTION;
    }
}
