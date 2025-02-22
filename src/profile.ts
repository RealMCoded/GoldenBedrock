// @ts-nocheck

import * as net from "net";
import User from "./models/User";
import { get_flag } from "./utils";

class PlayerProfile
{
    socket:net.Socket;
    data:User = new User().dataValues
    country:string = "";
    frozen:boolean = false;
    visible:boolean = true;
    noclip:boolean = false;

    constructor(socket:net.Socket)
    {
        this.socket = socket;
    }

    async load_profile(name:string)
    {
        let account = await User.findOne({where: {username:name}})
        if (account == null) 
        {
            console.error("Loaded nonexistant player?")
            return;
        }

        this.data = account?.dataValues
    }

    async set(key:string, value:any)
    {
        this.data[key] = value;
    }

    get_inventory()
    {
        //Create buffer from inventory data
        let buffer:Buffer = Buffer.alloc(this.data.inventory.slots * 6); // 6 bytes per slot (2 for index, 2 for count, 2 for equip)
        let offset:number = 0;

        // Write sorted items to buffer
        for (let i = 0; i < this.data.inventory.items.length; i++) {
            buffer.writeUInt16LE(this.data.inventory.items[i].index, offset);
            offset += 2;
            buffer.writeUInt16LE(this.data.inventory.items[i].count, offset);
            offset += 2;
            buffer.writeUInt16LE(this.data.inventory.items[i].equipped, offset);
            offset += 2;
        }

        // Fill remaining slots with zeros
        for (let i = this.data.inventory.items.length; i < this.data.inventory.slots; i++) {
            buffer.writeUInt16LE(0, offset);
            offset += 2;
            buffer.writeUInt16LE(0, offset);
            offset += 2;
            buffer.writeUInt16LE(0, offset);
            offset += 2;
        }

        return buffer;
    }

    player_data_buffer()
    {
        let flag = get_flag(this.country)

        let skin_r = Buffer.alloc(2)
        skin_r.writeUInt16LE(240)
        let skin_g = Buffer.alloc(2)
        skin_g.writeUInt16LE(192)
        let skin_b = Buffer.alloc(2)
        skin_b.writeUInt16LE(127)
        let skin_a = Buffer.alloc(2)
        skin_a.writeUInt16LE(255)

        let is_female = Buffer.alloc(1)
        is_female.writeUInt8(0) // bool

        let countryB = Buffer.alloc(2)
        countryB.writeUInt16LE(flag)

        let jumps = Buffer.alloc(2)
        jumps.writeUInt16LE(0)

        let username;
        if (this.data.displayname != null)
            username = Buffer.from(this.data.displayname + "\0", 'utf8')
        else
            username = Buffer.from(this.data.username + "\0", 'utf8')

        //for now just send placeholder equip information.
        let partItem = Buffer.alloc(2)
        partItem.writeUInt16LE(0)

        let visible = Buffer.alloc(1)
        visible.writeUInt8(+this.visible) // bool

        let noclip = Buffer.alloc(1)
        noclip.writeUInt8(+this.noclip) // bool

        let frozen = Buffer.alloc(1)
        frozen.writeUInt8(+this.frozen) // bool

        return Buffer.concat([
            skin_r,
            skin_g,
            skin_b,
            skin_a,
            is_female,
            countryB,
            jumps,
            username,
            partItem, //Equipped 1
            partItem, //Equipped 2
            partItem, //Equipped 3
            partItem, //Equipped 4
            partItem, //Equipped 5
            partItem, //Equipped 6
            partItem, //Equipped 7
            partItem, //Equipped 8
            partItem, //Equipped 9
            partItem, //Equipped 10
            partItem, //Equipped 11
            partItem, //Equipped 12
            partItem, //Equipped 13
            partItem, //ItemEffect 1
            partItem, //ItemEffect 2
            partItem, //ItemEffect 3
            visible,
            noclip,
            frozen
        ])
    }
}

export {PlayerProfile}