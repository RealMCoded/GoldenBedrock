import World from "./models/World"
import {Op} from "sequelize"
import * as fs from 'fs';

class GameWorld
{
    players:string[] = [];
    data:WorldData = {
        drop:[],
        tiles:{
            foreground: [],
            background: []
        }
    };
    spawn_location:number[] = [0, 0];
    name:string = "";

    constructor(name:string)
    {
        this.name = name;
        if (fs.existsSync(`./data/worlds/${this.name}.bw`))
        {
            this.loadFromDisk();
        }
        else
        {
            World.create({ name: this.name})
            this.generate();
            this.saveToDisk();
        }
        this.spawn_location = this.get_spawn();
    }

    close()
    {
        this.saveToDisk();
    }

    loadFromDisk()
    {
        const data = fs.readFileSync(`./data/worlds/${this.name}.bw`, 'utf-8')
        this.data = JSON.parse(data)
    }

    saveToDisk()
    {
        fs.writeFileSync(`./data/worlds/${this.name}.bw`, JSON.stringify(this.data))
    }

    private generate()
    {
        for(let world_y = 25; world_y < 50; world_y++)
        {
            for(let world_x = 0; world_x < 100; world_x++)
            {
                this.data.tiles.foreground.push({x: world_x, y: world_y, id: 9, data:[]})
                this.data.tiles.background.push({x: world_x, y: world_y, id: 15, data:[]})
                    
                //random cobble
                if (world_y > 28 && Math.floor(Math.random() * 15) == 0)
                {
                    this.data.tiles.foreground.push({x: world_x, y: world_y, id: 13, data:[]})
                }

                //random lava
                if (world_y > 34 && Math.floor(Math.random() * 10) == 0)
                {
                    this.data.tiles.foreground.push({x: world_x, y: world_y, id: 11, data:[]})
                }

                //random obsidian
                if (world_y > 39 && Math.floor(Math.random() * 10) == 0)
                {
                    this.data.tiles.foreground.push({x: world_x, y: world_y, id: 727, data:[]})
                }

                //layers of bedrock
                if (world_y > 47)
                    this.data.tiles.foreground.push({x:world_x, y:world_y, id: 5, data:[]})
            }
        }

        //spawn world entrance
        const worldEntranceX = Math.floor(Math.random() * 100)
        this.data.tiles.foreground.push({x:worldEntranceX, y:25, id: 5, data: []}) //bedrock
        this.data.tiles.foreground.push({x:worldEntranceX, y:24, id: 7, data: []}) //door
    }

    public game_format()
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

                for(let i=0; i < this.data.tiles.background.length; i++)
                {
                    if(this.data.tiles.background[i].y == world_y && this.data.tiles.background[i].x == world_x)
                        bgBuffer.writeUint16LE(this.data.tiles.background[i].id, 0)
                }

                for(let i=0; i < this.data.tiles.foreground.length; i++)
                {
                    if(this.data.tiles.foreground[i].y == world_y && this.data.tiles.foreground[i].x == world_x)
                        fgBuffer.writeUint16LE(this.data.tiles.foreground[i].id, 0)
                }

                let properties = Buffer.alloc(2)
                properties.writeUInt16LE(0)

                game_data = game_data.concat([bgBuffer, fgBuffer, properties, properties])
            }
        }

        return game_data
    }

    public get_spawn()
    {
        let location:number[] = [0, 0]

        //World Entrance is only on the FG
        let layer = this.data.tiles.foreground

        layer.forEach((element:Tile) => {
            if (element.id == 7)
            {
                location = [element.x, element.y]
            }
        });
        
        return location
    }

    public tiles_at_location(x:number, y:number)
    {
        let return_data = {
            "foreground": 0,
            "background": 0
        }

        this.data.tiles.foreground.forEach((element:Tile) => {
            if (element.x == x && element.y == y)
                return_data.foreground = element.id
        });

        this.data.tiles.background.forEach((element:Tile) => {
            if (element.x == x && element.y == y)
                return_data.background = element.id
        });

        return return_data;
    }

    public modify_tile(x:number, y:number, layer:number, tile:number, tile_data:any[] = [])
    {
        let tile_exists:boolean = false;

        if (layer == 1)
        {
            this.data.tiles.background.forEach((element:Tile) => {
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
            this.data.tiles.foreground.forEach((element:Tile) => {
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
                this.data.tiles.background.push({x:x, y:y, id:tile, data:tile_data})
            else if (layer == 2)
                this.data.tiles.foreground.push({x:x, y:y, id:tile, data:tile_data})
        }
    }

    public get_tile_data(x:number, y:number)
    {
        let tiledata:any[] = [];

        this.data.tiles.foreground.forEach((element:Tile) => {
            if (element.x == x && element.y == y)
                tiledata = element.data
        });

        return tiledata
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

async function random_world(current:string)
{
    const all_worlds = await World.findAll({ where: { [Op.not]: {name: current} } })

    if (all_worlds.length == 0)
    {
        return "ERR_NO_OTHER_WORLDS";
    }
    else return all_worlds[Math.floor(Math.random()*all_worlds.length)].dataValues.name
}


export { GameWorld, Theme, random_world }