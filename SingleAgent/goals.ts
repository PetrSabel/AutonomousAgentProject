import { Tile } from "../types";

// Goal functions
const isParcel = (tile: Tile) => {
    if (tile) {
        return (tile.parcel != null)
    } else {
        return false;
    }
}

const isDelivery = (tile: Tile) => {
    if (tile) {
        return tile.delivery
    } else {
        return false;
    }
}

function generate_exact_position(x: number, y: number) {
    return (tile: Tile) => (tile !== null) ? (tile.x === x && tile.y === y) : false;
}

export { isParcel, isDelivery, generate_exact_position };