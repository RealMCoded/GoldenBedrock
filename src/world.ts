/*
    TODO: Rewrite worlds to use classes. 
    Instead of directly accessing world data files everytime, store the world data in an array that autosaves every so often.
    it would keep the write times down.

    for now the current system is fine for small scale uses but will cause issues when more people get on a server.
*/

import {WorldData, Tile} from './WorldTypes'
import World from "./models/World"
import {Op} from "sequelize"
import * as fs from 'fs';
//import { activeWorlds } from './main'

class GameWorld
{
    constructor(name:string)
    {
        
    }
}

enum Theme
{
    FOREST = 1,
    NIGHT,
    DARKNESS,
    DESERT,
    WINTER,
    SPACE,
    SPOOKY = 7
}

function create_world(name:string)
{
    console.log("World Creation")

    let data = generate_world();

    World.create({name:name})

    save_world(name, data)
}

async function random_world(current:string)
{
    const all_worlds = await World.findAll({ where: { [Op.not]: {name: current} } })

    if (all_worlds.length == 0)
    {
        return "ERR_NO_OTHER_WORLDS";
    }
    else return all_worlds[Math.floor(Math.random()*all_worlds.length)].dataValues.name
}

function generate_world()
{
    //if (world_exists(name)) return;

    let world_data:WorldData = {
        drop:[],
        tiles:{
            foreground: [],
            background: []
        }
    }

    for(let world_y = 25; world_y < 50; world_y++)
    {
        for(let world_x = 0; world_x < 100; world_x++)
        {
            world_data.tiles.foreground.push({x: world_x, y: world_y, id: 9, data:[]})
            world_data.tiles.background.push({x: world_x, y: world_y, id: 15, data:[]})

            //random cobble
            if (world_y > 28 && Math.floor(Math.random() * 15) == 0)
            {
                world_data.tiles.foreground.push({x: world_x, y: world_y, id: 13, data:[]})
            }

            //random lava
            if (world_y > 34 && Math.floor(Math.random() * 10) == 0)
            {
                world_data.tiles.foreground.push({x: world_x, y: world_y, id: 11, data:[]})
            }

            //random obsidian
            if (world_y > 39 && Math.floor(Math.random() * 10) == 0)
            {
                world_data.tiles.foreground.push({x: world_x, y: world_y, id: 727, data:[]})
            }

            //layers of bedrock
            if (world_y > 47)
                world_data.tiles.foreground.push({x:world_x, y:world_y, id: 5, data:[]})
        }
    }

    //spawn world entrance
    const worldEntranceX = Math.floor(Math.random() * 100)
    world_data.tiles.foreground.push({x:worldEntranceX, y:25, id: 5, data: []}) //bedrock
    world_data.tiles.foreground.push({x:worldEntranceX, y:24, id: 7, data: []}) //door

    return world_data
}

function save_world(name:string, data:WorldData)
{
    fs.writeFileSync(`./data/worlds/${name}.bw`, JSON.stringify(data))
}

function go_world(name:string)
{
    
}

function convert_to_game_format(world_data:WorldData)
{
    let game_data:Buffer[] = []

    for(let world_x=0; world_x < 100; world_x++)
    {
        for(let world_y=0; world_y < 50; world_y++)
        {
            let bgBuffer = Buffer.alloc(2)
            bgBuffer.writeUInt16LE(0, 0)
            let fgBuffer = Buffer.alloc(2)
            fgBuffer.writeUInt16LE(0, 0)

            for(let i=0; i < world_data.tiles.background.length; i++)
            {
                if(world_data.tiles.background[i].y == world_y && world_data.tiles.background[i].x == world_x)
                    bgBuffer.writeUint16LE(world_data.tiles.background[i].id, 0)
            }

            for(let i=0; i < world_data.tiles.foreground.length; i++)
            {
                if(world_data.tiles.foreground[i].y == world_y && world_data.tiles.foreground[i].x == world_x)
                    fgBuffer.writeUint16LE(world_data.tiles.foreground[i].id, 0)
            }

            let properties = Buffer.alloc(2)
            properties.writeUInt16LE(0)

            game_data = game_data.concat([bgBuffer, fgBuffer, properties, properties])
        }
    }

    return game_data
}

function find_spawn(name:string)
{
    const data = get_world_data(name)
    let location:number[] = [0, 0]
    //console.log(data.tiles.foreground)

    //World Entrance is only on the FG
    let layer = data.tiles.foreground

    layer.forEach((element:Tile) => {
        if (element.id == 7)
        {
            location = [element.x, element.y]
        }
    });
    
    return location
}

function tiles_at_location(world:string, x:number, y:number)
{
    const data = get_world_data(world)
    let return_data = {
        "foreground": 0,
        "background": 0
    }

    data.tiles.foreground.forEach((element:Tile) => {
        if (element.x == x && element.y == y)
            return_data.foreground = element.id
    });

    data.tiles.background.forEach((element:Tile) => {
        if (element.x == x && element.y == y)
            return_data.background = element.id
    });

    return return_data;
}

function modify_tile(world:string, x:number, y:number, layer:number, tile:number, tile_data:any[] = [])
{
    let data = get_world_data(world)
    let tile_exists:boolean = false;

    if (layer == 1)
    {
        data.tiles.background.forEach((element:Tile) => {
            if (element.x == x && element.y == y)
            {
                tile_exists = true;
                element.id = tile;
                element.data = tile_data
            }
        });
    }
    else if (layer == 2)
    {
        data.tiles.foreground.forEach((element:Tile) => {
            if (element.x == x && element.y == y)
            {
                tile_exists = true;
                element.id = tile;
                element.data = tile_data
            }
        });
    }

    if (!tile_exists)
    {
        if (layer == 1)
            data.tiles.background.push({x:x, y:y, id:tile, data:tile_data})
        else if (layer == 2)
            data.tiles.foreground.push({x:x, y:y, id:tile, data:tile_data})
    }

    save_world(world, data)
}

function get_world_data(name:string)
{
    const data = fs.readFileSync(`./data/worlds/${name}.bw`, 'utf-8')
    return JSON.parse(data)
}

async function world_exists(name: string): Promise<boolean> {
    let data = await World.findOne({ where: { name: name } });
    return data !== null;
}

export {go_world, world_exists, create_world, get_world_data, convert_to_game_format, Theme, find_spawn, tiles_at_location, random_world, modify_tile}