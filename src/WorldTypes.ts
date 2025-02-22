interface WorldData
{
    drop:Drop[]
    tiles:{
        foreground: Tile[]
        background: Tile[]
    }
}

interface Drop
{
    x: number,
    y: number,
    id: number,
    count: number
}

interface Tile
{
    x: number,
    y: number,
    id: number,
    data: TileData[]
}

interface TileData
{
    key:string,
    value:any
}

export {WorldData, Tile}