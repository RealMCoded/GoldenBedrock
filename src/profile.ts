// @ts-nocheck

import * as net from "net";
import User from "./models/User";
import { get_flag } from "./utils";
import { items } from "./item-id";
import { DataType, send_data } from "./data";

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

    async set_gems(amount:number)
    {
        this.data.gems += amount

        let account = await User.findOne({where: {username:this.data.username}})
        await account.update({gems: this.data.gems})

        let gems = Buffer.alloc(4)
        gems.writeUint32LE(this.data.gems)

        send_data(this.socket, DataType.CURRENCY_GEMS, gems)
    }

    async edit_inventory(item:item_id, count:number)
    {
        let found:boolean = false;

        this.data.inventory.items.forEach((element, index, object) => {
            if (element.index == item)
            {
                found = true;
                element.count += count

                if (element.count < 1)
                {
                    object.splice(index, 1)
                }
            }
        });

        if (!found)
        {
            this.data.inventory.items.push({index: item, count: count})
        }

        let account = await User.findOne({where: {username:this.data.username}})
        await account.update({inventory: this.data.inventory})

        return this.data.inventory
    }
    
    get_inventory_buffer()
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
            let equip:boolean = this.data.avatar.equipped.includes(this.data.inventory.items[i].index);
            buffer.writeUInt16LE(equip, offset);
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

    async equip_item(item:item_id)
    {
        let item_data:item_data = items[item]

        if (item_data.body_layer == BODY_LAYER.none)
            return console.error("[Equip] Tried to equip a non equippable item.")

        this.data.avatar.equipped.forEach((element, index) => {
            let tempData:item_data = items[element]

            if(item_data.body_layer == tempData.body_layer)
                this.data.avatar.equipped.splice(index, 1)
        });

        this.data.avatar.equipped.push(item);

        let account = await User.findOne({where: {username:this.data.username}})
        await account.update({avatar: this.data.avatar})
    }

    async unequip_item(item:item_id)
    {
        if (!this.data.avatar.equipped.includes(item)) return;

        this.data.avatar.equipped.forEach((element, index) => {
            if (element == item)
                this.data.avatar.equipped.splice(index, 1)
        });

        let account = await User.findOne({where: {username:this.data.username}})
        await account.update({avatar: this.data.avatar})
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

        let equipped_items: Buffer[] = Array.from({ length: 13 }, () => {
            const buf = Buffer.alloc(2);
            buf.writeUInt16LE(0);
            return buf;
        });

        //this is my old outfit, for testing reasons.
        /*
        this.equip_item(item_id.messy_brown_hair)
        this.equip_item(item_id.golden_egg_head)
        this.equip_item(item_id.nightmare_scythe)
        this.equip_item(item_id.black_pants)
        this.equip_item(item_id.black_shoes)
        this.equip_item(item_id.diamond_cape)
        this.equip_item(item_id.dark_sweater)
        this.equip_item(item_id.black_wool_scarf)
        */

        //assemble items
        this.data.avatar.equipped.forEach((element, index) => {
            let item_data:item_data = items[element]

            equipped_items[item_data.body_layer-1].writeUInt16LE(element)
        });

        let itemEffect = Buffer.alloc(2)
        itemEffect.writeUInt16LE(0)

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
            equipped_items[0], //Equipped 1
            equipped_items[1], //Equipped 2
            equipped_items[2], //Equipped 3
            equipped_items[3], //Equipped 4
            equipped_items[4], //Equipped 5
            equipped_items[5], //Equipped 6
            equipped_items[6], //Equipped 7
            equipped_items[7], //Equipped 8
            equipped_items[8], //Equipped 9
            equipped_items[9], //Equipped 10
            equipped_items[10], //Equipped 11
            equipped_items[11], //Equipped 12
            equipped_items[12], //Equipped 13
            itemEffect, //ItemEffect 1
            itemEffect, //ItemEffect 2
            itemEffect, //ItemEffect 3
            visible,
            noclip,
            frozen
        ])
    }
}

export {PlayerProfile}