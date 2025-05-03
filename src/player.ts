import * as net from "net";
import { BinaryReader } from "@picode/binary-reader";
import { DataType, send_data, update_dialog, broadcast_data, UserEvents } from "./data";
import { PlayerProfile } from "./profile";
import { Dialog } from "./dialog";
import { online, motd } from "./main";
import User from "./models/User";
import { account_online, generate_token, point_in_rectangle, string_buffer, validate_string } from "./utils";
import { convert_to_game_format, create_world, find_spawn, get_tile_data, get_world_data, modify_tile, random_world, Theme, tiles_at_location, world_exists } from "./world";
import { item_from_id, ITEM_TYPE } from "./item-types";
import { item_id, items } from "./item-id";
import { commands } from "./command-processor";
import { send_recovery_email } from "./mailer";

enum CommandType
{
    FIRST_CONNECTION = 0,
    LOGIN,
    REGISTER,
    RECOVER,
    PLAYER_CHAT,
    DIALOG_ACTION,
    INVENTORY_CLICK,
    ESC_MENU=9,
    WORLD_DATA = 10,
    WORLD_CLICK,
    ITEM_DROP,
    PLAYER_MOVEMENT,
    ACTION_BUBBLES = 15,
    // 16 - 21 do not exist at all in the game's code.
    ADS = 22,
    RESPAWN,
    FRIENDS_MENU,
    IAP,
    PING_TEST,
    PARTICLES = 29,
    SHOP_ITEM = 33,
    TRADE_ACTION,
    KEY_ALT_PRESS = 37 //most likely residual (used to serve a purpose but doesn't anymore.)
}

class Player
{
    socket: net.Socket;
    id: number;
    profile:PlayerProfile;
    active:boolean = false;
    x:number = 0;
    y:number = 0;
    world:string = "";
    currentDialog:string = "";
    dialog_item:number = 0;
    dialog_tile:number[] = [0, 0, 0]; //x, y, id
    inventory_slot:number = 0;
    creation_time:number = Date.now()
    local_identifier:Buffer = Buffer.alloc(4)
    global_identifier:Buffer = Buffer.alloc(4)

    constructor(socket:net.Socket, id:number)
    {
        this.socket = socket;
        this.id = id;
        this.profile = new PlayerProfile(socket)
        this.local_identifier.writeInt32LE(0)
        this.global_identifier.writeInt32LE(id)

        this.log(`New player created!`)
    }

    private log(data:any)
    {
        if (process.env.NODE_ENV == "dev")
            console.log(`[LOG:PlayerID ${this.id}] ` + data)
    }

    private error(data:any)
    {
        if (process.env.NODE_ENV == "dev")
            console.error(`[ERR:PlayerID ${this.id}] ` + data)
    }

    warp(world:string)
    {
        world = world.toUpperCase()

        if (this.world == world)
        {
            send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer("~3Warp failed! ~0You cannot warp to the same world you are already in."));
            return;
        }

        this.active = false;

        world_exists(world).then((exists) => {
            if (!exists) create_world(this.world)
        })

        this.world = world

        let successBuffer:Buffer = Buffer.alloc(1);
        successBuffer.writeUInt8(1);

        let messageBuffer:Buffer = string_buffer(`You have entered "${world}".`);
        let worldNameBuffer:Buffer = string_buffer(world)

        send_data(this.socket, DataType.WARP, successBuffer, messageBuffer, worldNameBuffer)
        broadcast_data(this, DataType.CONSOLE_MESSAGE, string_buffer(`[~1${this.profile.data.username} ~0has entered the world.]`))
    }

    async close()
    {
        if (this.active)
        {
            let identifier = Buffer.alloc(4)
            identifier.writeInt32LE(this.id)

            let destroyBuffer = Buffer.alloc(1);
            destroyBuffer.writeUInt8(1);

            broadcast_data(this, DataType.PLAYER_MOVEMENT_DATA, identifier, destroyBuffer)
            broadcast_data(this, DataType.CONSOLE_MESSAGE, string_buffer(`[~1${this.profile.data.username} ~0has logged out.]`))
        }

        //remove connections
        online.forEach((element, index) => {
            if (element.socket == this.socket)
            {
                delete online[index]
                online.splice(index, 1)
            }
        });
        this.socket.destroy()
        this.log("Destroyed.")
    }

    async handle(data:Buffer)
    {
        const reader:BinaryReader = new BinaryReader(data)

        const data_size = reader.readUint16(); //not used in any context.
        const command = reader.readUint16();

        //Command 26 (PING_TEST) is used only for anti speed cheat.
        //I personally do not care for it at all, so we can just ignore it.
        //if you do want to implement it:
        /*
        buffer_u16, current_year
        buffer_u16, current_month
        buffer_u16, current_day
        buffer_u16, current_hour
        buffer_u16, current_minute
        buffer_u16, current_second
        */ 

        if (!this.active && this.world == "" && Date.now() > this.creation_time + 60000 )
        {
            this.log("Inactive on title screen for 60 seconds, kicked.")
            send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer("You have been disconnected for 60 seconds of inactivity on the login screen."))
            this.close()
        }

        if (command === CommandType.PING_TEST) return;

        this.log(`Got command ${command} (${CommandType[command]}) `)

        switch(command)
        {
            case CommandType.FIRST_CONNECTION:
            {
                const platformType = reader.readInt16();
                const platformVersion = reader.readInt32();
                const device_leng = reader.readUint8();
                const device = reader.readArrayAsString(device_leng);
                const ver_leng = reader.readUint8();
                const ver = reader.readArrayAsString(ver_leng);
                const country_leng = reader.readUint8();
                this.profile.country = reader.readArrayAsString(country_leng);

                if(ver !== '3.8.3')
                {
                    this.log(`Unsupported version - ${ver}`)
                        update_dialog(this, new Dialog()
                        .ItemText(true, "~1Unsupported Client", 72, 0)
                        .Text(true, "Your game version is not supported.", 48)
                        .Text(true, "Please use client version ~13.8.3~0.", 48)
                        .Text(true, "", 48)
                        )
                    this.close()
                    return;
                }

                send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer("~rConnected to GoldenBedrock successfully!"))
                send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer("Learn more at ~5https://github.com/RealMCoded/GoldenBedrock"))
            } break;

            case CommandType.LOGIN:
            {
                let success:boolean;
                let message:Buffer;

                const uname_size = reader.readUint8();
                const uname = reader.readArrayAsString(uname_size);
                const passw_size = reader.readUint8();
                const passw = reader.readArrayAsString(passw_size);
                const accounts = reader.readUint16();

                let account = await User.findOne({where: {username:uname}})

                if (account == null)
                {
                    success = false;
                    message = string_buffer(`~3Account "${uname}" does not exit on this server. ~0Go register it!`)
                }
                else if (passw != account.token)
                {
                    success = false;
                    message = string_buffer(`~3Login failed! ~0The token doesn't match the one associated with this account.`)
                }
                else if (account_online(uname))
                {
                    success = false;
                    message = string_buffer(`~3Login failed! ~0This account is already logged in.`)
                }
                else
                {
                    success = true;
                    message = string_buffer(`~5Welcome back, ${uname}! ~0There are ${online.length} players online.`)
                }

                //login response
                let successBuffer = Buffer.alloc(1)
                successBuffer.writeUint8(success ? 1 : 0)
                let loginInfoBuffer = Buffer.alloc(0);
                if (success)
                {
                    loginInfoBuffer = Buffer.concat([
                        string_buffer(uname),
                        string_buffer(passw)
                    ]);
                }
                send_data(this.socket, DataType.LOGIN, successBuffer, message, loginInfoBuffer)

                if (success) 
                {
                    await this.profile.load_profile(uname)

                    if (motd.render)
                        update_dialog(this, motd.messageOfTheDay)

                    //Send inventory data
                    let invData:Buffer = this.profile.get_inventory_buffer()
                    send_data(this.socket, DataType.INVENTORY_UPDATE, invData)

                    //set proper country data, if verified
                    if (this.profile.data.verified)
                        this.profile.country = "breaworlds.verified"

                    this.warp("TUTORIAL")
                }
            } break;

            case CommandType.REGISTER:
            {
                let success:boolean;
                let message:Buffer;

                const uname_size = reader.readUint8();
                const uname = reader.readArrayAsString(uname_size);
                const email_size = reader.readUint8();
                const email = reader.readArrayAsString(email_size);
                const accounts = reader.readUint16();
                const token = generate_token();

                let account = await User.findOne({where: {username:uname}})

                if (account != null)
                {
                    success = false
                    message = string_buffer(`~3Registration failed! ~0An account with that name already exists.`)
                }
                else if (uname.length < 1 || email.length < 1)
                {
                    success = false
                    message = string_buffer(`~3Registration failed! ~0You must provide a username and email.`)
                }
                else if (uname.length < 2 || uname.length > 12)
                {
                    success = false
                    message = string_buffer(`~3Registration failed! ~0Usernames must be between 3-12 characters long.`)
                }
                else if (validate_string(uname) == false)
                {
                    success = false
                    message = string_buffer(`~3Registration failed! ~0Usernames can only contain characters A-z 0-9.`)
                }
                //TODO: Blacklisted name check
                else
                {
                    account = await User.create({username: uname, email, token})
                    success = true
                    message = string_buffer(`~1Welcome to GoldenBedrock, ${uname}! ~0You can now login.`)
                }

                let successBuffer = Buffer.alloc(1)
                successBuffer.writeUint8(success ? 1 : 0)

                let loginInfoBuffer = Buffer.alloc(0);
                if (success)
                {
                    loginInfoBuffer = Buffer.concat([
                        string_buffer(uname),
                        string_buffer(token)
                    ]);
                }

                send_data(this.socket, DataType.REGISTER, successBuffer, message, loginInfoBuffer)

                if (success)
                {
                    update_dialog(this, new Dialog()
                    .ItemText(true, "~0Registration complete!", 72, 0)
                    .Text(true, "Congrats, You are now a GoldenBedrock member!", 50)
                    .Text(true, `Your account token is ~1${token}~0.`, 50)
                    .Text(true, "Make sure to keep your token in a safe place.", 50)
                    .Button(true, "close", "Yay!")
                    )
                }
            } break;

            case CommandType.RECOVER:
            {
                let message:Buffer;

                const uname_size = reader.readUint8();
                const uname = reader.readArrayAsString(uname_size);
                const email_size = reader.readUint8();
                const email = reader.readArrayAsString(email_size);
                const accounts = reader.readUint16();

                let account = await User.findOne({where: {username:uname, email:email}})

                if (account == null)
                    message = string_buffer("~3Recovery failed! ~0There is no account with that username and email on this server.")
                else if (uname.length < 1 || email.length < 1)
                    message = string_buffer(`~3Recovery failed! ~0You must provide a username and email.`)
                else
                {
                    message = string_buffer(`~1An email has been sent with your account token. Check your spam folder.`)
                    send_recovery_email(account.username, account.token, account.email)
                }
                
                //TODO: actual recovery. for now just say its not working
                send_data(this.socket, DataType.RECOVERY, message)
            } break;

            case CommandType.FRIENDS_MENU:
            {
                update_dialog(this, new Dialog("menu.friends")
                .ItemText(true, `Friends - 0/0 `, 72, 0)
                .Text(true, "Friends to be added eventually.", 48)
                .Button(true, "close", "Close")
                )
            } break;

            case CommandType.INVENTORY_CLICK:
            {
                let doubleClick = reader.readUint8() //thank you quu for making the game send the double click signal 
                let slot = reader.readUint8()
                let item_data = item_from_id(this.profile.data.inventory.items[slot].index);

                this.inventory_slot = slot;

                if (!doubleClick)
                {
                    //tooltip notification
                    let notification_time = Buffer.alloc(2)
                    notification_time.writeUint16LE(100)
    
                    let notification_icon = Buffer.alloc(2)
                    notification_icon.writeUint16LE(this.profile.data.inventory.items[slot].index)
    
                    let text = string_buffer(item_data.name)
                    send_data(this.socket, 17, notification_time, notification_icon, text)
                }
                else
                {
                    if (this.currentDialog !== "")
                        return;

                    this.dialog_item = this.profile.data.inventory.items[slot].index
                    //Double Click
                    let item_dialog:Dialog = new Dialog("menu.item")

                    item_dialog.ItemText(true, item_data.name, 72, this.profile.data.inventory.items[slot].index)
                    item_dialog.Text(true, item_data.info, 48)
                    item_dialog.Text(true, `Rarity: ${item_data.rarity}`, 48)
                    item_dialog.Text(true, `Farmability: ${item_data.farmability}`, 48)

                    if (item_data.type == ITEM_TYPE.EQUIPPABLE) 
                    {
                        if (this.profile.data.avatar.equipped.includes(this.dialog_item))
                            item_dialog.Button(true, "item.unequip", "Unequip")
                        else
                            item_dialog.Button(true, "item.equip", "Equip")
                    }
                    if (item_data.can_drop) item_dialog.Button(true, "item.drop", "Drop")
                    if (item_data.can_trash) item_dialog.Button(true, "item.trash", "Trash")

                    item_dialog.Button(true, "close", "Close")
                    update_dialog(this, item_dialog)
                }
            } break;

            case CommandType.ESC_MENU:
            {
                update_dialog(this, new Dialog("menu.main")
                .ItemText(true, `Menu - ~1${this.world}`, 72, 3)
                .Button(true, "warp", "Warp")
                .Button(true, "respawn", "Respawn")
                .Button(true, "shop", "Shop")
                .Button(true, "settings", "Settings")
                .Button(true, "mod", "Moderation")
                .Button(true, "bug", "Report a Bug")
                .Button(true, "close", "Close")
                )
            } break;

            case CommandType.DIALOG_ACTION:
            {
                this.currentDialog = ""
                const worker = reader.readUint16()
                let header_length = reader.readUint8();
                let dialog_name = reader.readArrayAsString(header_length)
                let sub_length = reader.readUint8();
                let sub_action = reader.readArrayAsString(sub_length)

                let range_str = reader.readUint16()
                let range_int = reader.readUint16()

                this.log(`Dialog Name: ${dialog_name}`)
                this.log(`Dialog SubAction: ${sub_action}`)

                let dict_str:{key:string, value:string}[] = []
                let dict_int:{key:string, value:number}[] = []

                for(let i=0; i < range_str; i++)
                {
                    let key_len = reader.readUint8()
                    let key = reader.readArrayAsString(key_len)
                    let value_len = reader.readUint8()
                    let value = reader.readArrayAsString(value_len)
                    dict_str.push({key, value})
                }
    
                for(let i=0; i < range_int; i++)
                {
                    let key_len = reader.readUint8()
                    let key = reader.readArrayAsString(key_len)
                    let value = reader.readUint16()
                    dict_int.push({key, value})
                }

                switch(dialog_name)
                {
                    case "menu.motd":
                    {
                        if (sub_action == "motd.linkbutton")
                        {
                            let uri = string_buffer(motd.LinkButtonLink)
                            send_data(this.socket, DataType.URL_OPEN, uri)
                        }
                    } break;

                    case "menu.main":
                    {
                        if (sub_action == "warp")
                        {
                            update_dialog(this, new Dialog("menu.warp")
                            .ItemText(true, "Warp to world", 72, 3)
                            .Text(true, "Where do you want to go?", 50)
                            .TextBox(true, "worldName", "", 32)
                            .Text(true, "World name must be 1-32 characters long, only A-Z and 0-9 characters are allowed", 25)
                            .Button(false, "warp", "Warp")
                            .Button(false, "warp.reward", "Rewards")
                            .Button(false, "warp.rnd", "Random")
                            .Button(false, "Close", "Close")
                            )
                        }
                        else if (sub_action == "respawn")
                        {
                            let event_buff = Buffer.alloc(2)
                            event_buff.writeUint16LE(UserEvents.RESPAWN)
                            send_data(this.socket, DataType.USER_EVENTS, this.local_identifier, event_buff)
                            broadcast_data(this, DataType.USER_EVENTS, this.global_identifier, event_buff)
                        }
                        else if (sub_action == "settings")
                        {
                            update_dialog(this, new Dialog("menu.settings")
                            .ItemText(true, `~1Settings`, 72, 0)
                            .Button(true, "settings.general", "General")
                            .Button(true, "settings.account", "Account")
                            .Button(true, "settings.avatar", "Avatar")
                            .Button(true, "settings.privacy", "Privacy")
                            .Button(true, "close", "Close")
                            )
                        }
                        else if (sub_action == "mod")
                        {
                            update_dialog(this, new Dialog("menu.moderation")
                            .ItemText(true, `~1Moderation`, 72, 0)
                            .Button(true, "mod.report", "Report World")
                            .Button(true, "mod.clone", "Clone World")
                            .Button(true, "mod.data", "(~3Advanced~1) Data Editor")
                            .Button(true, "close", "Close")
                            )
                        }
                        else if (sub_action == "bug")
                        {
                            send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer("~5Opening bug report page!"))
                            send_data(this.socket, DataType.URL_OPEN, string_buffer("https://github.com/RealMCoded/GoldenBedrock/issues"))
                        }
                    } break;

                    case "menu.moderation":
                    {

                    } break;

                    case "menu.sign.edit":
                    {
                        if (sub_action == "menu.sign.confirm")
                        {
                            modify_tile(this.world, this.dialog_tile[0], this.dialog_tile[1], 2, this.dialog_tile[2], [dict_str[0].value])
                        }
                    } break;

                    case "menu.item":
                    {
                        if (sub_action == "item.trash")
                        {
                            update_dialog(this, new Dialog("menu.item.trash")
                            .ItemText(true, "Trashing item", 72, this.dialog_item)
                            .Text(true, "How many do you want to trash?", 48)
                            .TextBox(true, "item.trash.count", "1", 5)
                            .CheckBox(true, false, "item.trash.confirm", "Confirm trashing", 32)
                            .Button(false, "item.trash.confirm", "Trash")
                            .Button(false, "item.trash.cancel", "Cancel")
                            )
                        } 
                        else if (sub_action == "item.drop")
                        {
                            update_dialog(this, new Dialog("menu.item.drop")
                            .ItemText(true, "Drop item", 72, this.dialog_item)
                            .Text(true, "How many do you want to drop?", 48)
                            .TextBox(true, "item.drop.count", "1", 5)
                            .Button(false, "item.drop.confirm", "Drop")
                            .Button(false, "item.drop.cancel", "Cancel")
                            )
                        } 
                        else if (sub_action == "item.equip")
                        {
                            this.profile.equip_item(this.dialog_item)
                            let profileData = this.profile.player_data_buffer()
                            send_data(this.socket, DataType.PLAYER_PROFILE_DATA, this.local_identifier, profileData)
                            broadcast_data(this, DataType.PLAYER_PROFILE_DATA, this.global_identifier, profileData)
                            let invData:Buffer = this.profile.get_inventory_buffer()
                            send_data(this.socket, DataType.INVENTORY_UPDATE, invData)
                        }
                        else if (sub_action == "item.unequip")
                        {
                            this.profile.unequip_item(this.dialog_item)
                            let profileData = this.profile.player_data_buffer()
                            send_data(this.socket, DataType.PLAYER_PROFILE_DATA, this.local_identifier, profileData)
                            broadcast_data(this, DataType.PLAYER_PROFILE_DATA, this.global_identifier, profileData)
                            let invData:Buffer = this.profile.get_inventory_buffer()
                            send_data(this.socket, DataType.INVENTORY_UPDATE, invData)
                        }
                    } break;

                    case "menu.item.trash":
                    {
                        if (sub_action == "item.trash.confirm")
                        {
                            if (dict_int[0].value == 1)
                            {
                                //it's confirmed. nuke it.
                                let count:number = +dict_str[0].value

                                if (Number.isNaN(count) || count <= 0 || count > 999) //replace 999 with actual count
                                    return send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer("~3You are trashing too little or too much of this item."))
                                else
                                {
                                    await this.profile.edit_inventory(this.dialog_item, -count)
                                    let invData:Buffer = this.profile.get_inventory_buffer()
                                    send_data(this.socket, DataType.INVENTORY_UPDATE, invData)

                                    return send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer(`~1Trashed ${count}x items.`))
                                }
                            }
                            else
                            {
                                send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer("~3You must confirm this action."))
                            }
                        }
                    } break;

                    case "menu.item.drop":
                    {
                        if (sub_action == "item.drop.confirm")
                            {
                                //it's confirmed. nuke it.
                                let count:number = +dict_str[0].value
    
                                if (Number.isNaN(count) || count <= 0 || count > 999) //replace 999 with actual count
                                        return send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer("~3You are dropping too little or too much of this item."))
                                else
                                {
                                    //spawn drop
                                    let destroyBuffer = Buffer.alloc(1)
                                    destroyBuffer.writeUint8(0)
                                    let indexBuffer = Buffer.alloc(2)
                                    indexBuffer.writeUint16LE(this.dialog_item)
                                    let countBuffer = Buffer.alloc(2)
                                    countBuffer.writeUint16LE(count)
                                    let xBuffer = Buffer.alloc(2)
                                    xBuffer.writeUint16LE((this.x) + 32) //TODO: directions
                                    let yBuffer = Buffer.alloc(2)
                                    yBuffer.writeUint16LE(this.y + 8)

                                    send_data(this.socket, DataType.DROPS, destroyBuffer, indexBuffer, countBuffer, xBuffer, yBuffer)
                                    broadcast_data(this, DataType.DROPS, destroyBuffer, indexBuffer, countBuffer, xBuffer, yBuffer)

                                    await this.profile.edit_inventory(this.dialog_item, -count)
                                    let invData:Buffer = this.profile.get_inventory_buffer()
                                    send_data(this.socket, DataType.INVENTORY_UPDATE, invData)

                                    return send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer(`~Dropped ${count}x items.`))
                                }
                            }
                    } break;

                    case "menu.warp":
                    {
                        if (sub_action == "warp")
                        {
                            if (validate_string(dict_str[0].value) == false || dict_str[0].value.length == 0 || dict_str[0].value.length > 32)
                            {
                                send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer("~3Warp failed! ~0World name must be between 1-32 characters, with letters A-z 0-9."));
                                return;
                            }

                            let destroyBuffer = Buffer.alloc(1);
                            destroyBuffer.writeUInt8(1);
                            broadcast_data(this, DataType.PLAYER_MOVEMENT_DATA, this.global_identifier, destroyBuffer)
                            broadcast_data(this, DataType.CONSOLE_MESSAGE, string_buffer(`[~1${this.profile.data.username} ~0has left the world.]`))

                            this.warp(dict_str[0].value)
                        }
                        else if (sub_action == "warp.reward")
                        {
                            let destroyBuffer = Buffer.alloc(1);
                            destroyBuffer.writeUInt8(1);
                            broadcast_data(this, DataType.PLAYER_MOVEMENT_DATA, this.global_identifier, destroyBuffer)
                            broadcast_data(this, DataType.CONSOLE_MESSAGE, string_buffer(`[~1${this.profile.data.username} ~0has left the world.]`))

                            this.warp("REWARDS")
                        }
                        else if (sub_action == "warp.rnd")
                        {
                            let world = await random_world(this.world)

                            if (world == "ERR_NO_OTHER_WORLDS")
                            {
                                send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer("~3Warp failed! ~0No other worlds exist yet. Go make one!"));
                                return;
                            }

                            let destroyBuffer = Buffer.alloc(1);
                            destroyBuffer.writeUInt8(1);
                            broadcast_data(this, DataType.PLAYER_MOVEMENT_DATA, this.global_identifier, destroyBuffer)
                            broadcast_data(this, DataType.CONSOLE_MESSAGE, string_buffer(`[~1${this.profile.data.username} ~0has left the world.]`))
    
                            this.warp(world)
                        }
                    } break;
                }
            } break;

            case CommandType.WORLD_CLICK:
            {
                //Player hand movement for clicking
                let event_buff = Buffer.alloc(2)
                event_buff.writeUint16LE(UserEvents.HAND_ANGLE)
                send_data(this.socket, DataType.USER_EVENTS, this.local_identifier, event_buff)
                broadcast_data(this, DataType.USER_EVENTS, this.global_identifier, event_buff)

                //ok back to reading data haha
                let raw_click_x = reader.readUint16()
                let raw_click_y = reader.readUint16() 
                let click_x = Math.floor(raw_click_x / 32);
                let click_y = Math.floor(raw_click_y / 32);

                let item = reader.readUint16();
                let click_count = reader.readUint16();
                this.log(`RawX: ${raw_click_x}, RawY: ${raw_click_y}, X: ${click_x}, Y: ${click_y}, Item: ${item}, Clicks: ${click_count}`)
                let item_data = item_from_id(item);

                const world_data = tiles_at_location(this.world, click_x, click_y)

                let layer = +(world_data.foreground !== 0)+1

                if (item == item_id.fist)
                {
                    this.log("Fist")

                    if (world_data.foreground == 0 && world_data.background == 0) return;

                    let hardness:number = 0;
                    if (layer == 1)
                        hardness = items[world_data.background].hardness
                    else if (layer == 2)
                        hardness = items[world_data.foreground].hardness

                    //Check for tile in that location
                    if (click_count >= hardness)
                    {
                        let x_buffer = Buffer.alloc(2)
                        x_buffer.writeInt16LE(click_x)
            
                        let y_buffer = Buffer.alloc(2)
                        y_buffer.writeInt16LE(click_y)

                        let layer_buffer = Buffer.alloc(2)
                        layer_buffer.writeInt16LE(layer)
            
                        let place_buffer = Buffer.alloc(2)
                        place_buffer.writeInt16LE(0)
    
                        send_data(this.socket, DataType.TILE_UPDATE, x_buffer, y_buffer, layer_buffer, place_buffer)
                        broadcast_data(this, DataType.TILE_UPDATE, x_buffer, y_buffer, layer_buffer, place_buffer)
                        modify_tile(this.world, click_x, click_y, layer, 0)

                        //Summon drop of item
                        let drop_item = layer == 1 ? world_data.background : world_data.foreground
                        let item_count = 1

                        if (drop_item % 2 == 0) //is a tree
                        {
                            drop_item--
                            item_count = Math.floor(Math.random() * (5 - 1) + 1)
                        }
                        else
                        {
                            //chance to drop seeds or the item itself, or even nothing
                            let drop_type = Math.floor(Math.random() * (3 - 0) + 0)
                            if (drop_type == 0) //item
                            {
                                //TODO: low and high density polyethylene
                            }
                            else if (drop_type == 1) //seed
                            {
                                drop_item++
                                item_count = Math.floor(Math.random() * (3 - 1) + 1)
                            }
                            else if (drop_type == 2) //nothing. squat.
                            {
                                drop_item = 0 //null
                            }
                        }

                        if (drop_item !== 0)
                        {
                            let destroyBuffer = Buffer.alloc(1)
                            destroyBuffer.writeUint8(0)
                            let indexBuffer = Buffer.alloc(2)
                            indexBuffer.writeUint16LE(drop_item)
                            let countBuffer = Buffer.alloc(2)
                            countBuffer.writeUint16LE(item_count)
                            let xBuffer = Buffer.alloc(2)
                            xBuffer.writeUint16LE((click_x*32)+8)
                            let yBuffer = Buffer.alloc(2)
                            yBuffer.writeUint16LE((click_y*32)+8)

                            send_data(this.socket, DataType.DROPS, destroyBuffer, indexBuffer, countBuffer, xBuffer, yBuffer)
                            broadcast_data(this, DataType.DROPS, destroyBuffer, indexBuffer, countBuffer, xBuffer, yBuffer)
                        }

                        //give gem rewards. TODO: proper calculations.
                        this.profile.set_gems(Math.floor(Math.random() * (5 - 0) + 0))
                    }
                    else
                    {
                        let x_buffer = Buffer.alloc(2)
                        x_buffer.writeInt16LE(click_x)
            
                        let y_buffer = Buffer.alloc(2)
                        y_buffer.writeInt16LE(click_y)
            
                        let hit_buffer = Buffer.alloc(2)
                        hit_buffer.writeInt16LE(click_count+1)
                                        
                        let hardness_buffer = Buffer.alloc(2)
                        hardness_buffer.writeInt16LE(hardness+1)
    
                        send_data(this.socket, DataType.TILE_PUNCH, x_buffer, y_buffer, hit_buffer, hardness_buffer)
                        broadcast_data(this, DataType.TILE_PUNCH, x_buffer, y_buffer, hit_buffer, hardness_buffer)
                    }
                }
                else if (item == item_id.wrench)
                {
                    this.log("Wrench click interaction")

                    //player wrench
                    online.forEach(element => {
                        //ignore elements that are inactive, or not in the world
                        if (element.active == false) return;
                        if (element.world != this.world) return;

                        if (point_in_rectangle(raw_click_x, raw_click_y, element.x, element.y, element.x + 32, element.y + 32))
                        {
                            let user_ui:Dialog = new Dialog("menu.user").ItemText(true, element.profile.data.username, 72, 3)
                            .Text(true, `Level: ${element.profile.data.level}`, 48)

                            if (element.id == this.id)
                            {
                                //it's you!
                                user_ui
                                .Text(true, `X: ${this.x/32}, Y:${this.y/32}`, 48)
                            }
                            else
                            {
                                //it's not you.
                            }
                            user_ui.Button(true, "close", "Close")
                            update_dialog(this, user_ui)
                            return;
                        }
                    });

                    //tile wrench
                    const world_data = tiles_at_location(this.world, click_x, click_y)
                    if (world_data.foreground == 0) return;

                    this.dialog_tile = [click_x, click_y, world_data.foreground]

                    if (world_data.foreground == item_id.wooden_sign)
                    {
                        let sign_data = get_tile_data(this.world, click_x, click_y)
                        update_dialog(this, new Dialog("menu.sign.edit")
                        .ItemText(true, "Edit sign", 72, 69)
                        .TextBox(true, "menu.sign.content", sign_data[0], 32)
                        .Text(true, "Text must follow the code of conduct!", 25)
                        .Button(false, "menu.sign.confirm", "Save")
                        .Button(true, "menu.sign.exit", "Close")
                        )
                    }
                }
                else // everything else
                {
                    this.log("Other item interaction")

                    switch(item_data.type)
                    {
                        case ITEM_TYPE.NONE: {} break;
                        case ITEM_TYPE.FOREGROUND: {
                            if (world_data.foreground !== 0) return;

                            let x_buffer = Buffer.alloc(2)
                            x_buffer.writeInt16LE(click_x)
                
                            let y_buffer = Buffer.alloc(2)
                            y_buffer.writeInt16LE(click_y)
    
                            let layer_buffer = Buffer.alloc(2)
                            layer_buffer.writeInt16LE(2)
                
                            let place_buffer = Buffer.alloc(2)
                            place_buffer.writeInt16LE(item)
        
                            send_data(this.socket, DataType.TILE_UPDATE, x_buffer, y_buffer, layer_buffer, place_buffer)
                            broadcast_data(this, DataType.TILE_UPDATE, x_buffer, y_buffer, layer_buffer, place_buffer)
                            modify_tile(this.world, click_x, click_y, 2, item)

                            await this.profile.edit_inventory(item, -1)
                            let invData:Buffer = this.profile.get_inventory_buffer()
                            send_data(this.socket, DataType.INVENTORY_UPDATE, invData)
                        } break;
                        case ITEM_TYPE.BACKGROUND: {
                            if (world_data.background !== 0) return;

                            let x_buffer = Buffer.alloc(2)
                            x_buffer.writeInt16LE(click_x)
                
                            let y_buffer = Buffer.alloc(2)
                            y_buffer.writeInt16LE(click_y)
    
                            let layer_buffer = Buffer.alloc(2)
                            layer_buffer.writeInt16LE(1)
                
                            let place_buffer = Buffer.alloc(2)
                            place_buffer.writeInt16LE(item)
        
                            send_data(this.socket, DataType.TILE_UPDATE, x_buffer, y_buffer, layer_buffer, place_buffer)
                            broadcast_data(this, DataType.TILE_UPDATE, x_buffer, y_buffer, layer_buffer, place_buffer)
                            modify_tile(this.world, click_x, click_y, 1, item)

                            await this.profile.edit_inventory(item, -1)
                            let invData:Buffer = this.profile.get_inventory_buffer()
                            send_data(this.socket, DataType.INVENTORY_UPDATE, invData)
                        } break;
                        case ITEM_TYPE.EQUIPPABLE: {
                            send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer(`~3You cannot place equippable items!`))
                        } break;
                        case ITEM_TYPE.INTERACTABLE: {
                            if (item == item_id.white_ball)
                            {
                                let px = Buffer.alloc(2), py = Buffer.alloc(2), bx = Buffer.alloc(2), by = Buffer.alloc(2);

                                px.writeUInt16LE(this.x)
                                py.writeUint16LE(this.y)
                                bx.writeUInt16LE(raw_click_x)
                                by.writeUint16LE(raw_click_y)

                                send_data(this.socket, DataType.BALL, px, py, bx, by)
                                broadcast_data(this, DataType.BALL, px, py, bx, by)
                            }
                        } break;
                        case ITEM_TYPE.TREE: {
                            let x_buffer = Buffer.alloc(2)
                            x_buffer.writeInt16LE(click_x)
                
                            let y_buffer = Buffer.alloc(2)
                            y_buffer.writeInt16LE(click_y)
    
                            let layer_buffer = Buffer.alloc(2)
                            layer_buffer.writeInt16LE(2)
                
                            let place_buffer = Buffer.alloc(2)
                            place_buffer.writeInt16LE(item)
        
                            send_data(this.socket, DataType.TILE_UPDATE, x_buffer, y_buffer, layer_buffer, place_buffer)
                            broadcast_data(this, DataType.TILE_UPDATE, x_buffer, y_buffer, layer_buffer, place_buffer)
                            modify_tile(this.world, click_x, click_y, 2, item)

                            await this.profile.edit_inventory(item, -1)
                            let invData:Buffer = this.profile.get_inventory_buffer()
                            send_data(this.socket, DataType.INVENTORY_UPDATE, invData)
                        } break;
                    }
                }
            } break;

            case CommandType.ITEM_DROP:
            {
                let drop_x, drop_y, drop_item, drop_count
                drop_x = reader.readUint16()
                drop_y = reader.readUint16()
                drop_item = reader.readUint16()
                drop_count = reader.readUint16()

                let destroyBuffer = Buffer.alloc(1)
                destroyBuffer.writeUint8(1)
                let indexBuffer = Buffer.alloc(2)
                indexBuffer.writeUint16LE(drop_item)
                let countBuffer = Buffer.alloc(2)
                countBuffer.writeUint16LE(drop_count)
                let xBuffer = Buffer.alloc(2)
                xBuffer.writeUint16LE(drop_x)
                let yBuffer = Buffer.alloc(2)
                yBuffer.writeUint16LE(drop_y)

                send_data(this.socket, DataType.DROPS, destroyBuffer, indexBuffer, countBuffer, xBuffer, yBuffer)
                broadcast_data(this, DataType.DROPS, destroyBuffer, indexBuffer, countBuffer, xBuffer, yBuffer)

                await this.profile.edit_inventory(drop_item, drop_count)
                let invData:Buffer = this.profile.get_inventory_buffer()
                send_data(this.socket, DataType.INVENTORY_UPDATE, invData)

            } break;

            case CommandType.WORLD_DATA:
            {
                //NOTE: right now only the essentials are sent to the client.

                //Step 1: World Data
                //has to be done manually due to how the world data is requested.
                let header:Buffer = Buffer.alloc(4)
                header.writeUint16LE(0, 0) // Final buffer size
                header.writeUint16LE(DataType.WORLD_DATA, 2) //Data Type

                let world_size = Buffer.alloc(4)
                world_size.writeUint16LE(100, 0) //x scale
                world_size.writeUint16LE(50, 2) //y scale

                let world_data = convert_to_game_format(get_world_data(this.world));

                let final_buffer = Buffer.concat(Array.prototype.concat([header, world_size], world_data))//combine header and buffer data
                final_buffer.writeUInt16LE(final_buffer.length, 0); //write size to header
                this.socket.write(final_buffer); //pack it, ship it

                //Theme data
                let worldTheme = Buffer.alloc(2);
                worldTheme.writeUInt16LE(Theme.FOREST, 0);
                send_data(this.socket, DataType.WORLD_THEME, worldTheme)

                //Set player position to door X and Y
                let destroyBuffer = Buffer.alloc(1);
                destroyBuffer.writeUInt8(0);

                let spawn = find_spawn(this.world)

                let curX = Buffer.alloc(2); 
                curX.writeUInt16LE(spawn[0]*32, 0);
                let curY = Buffer.alloc(2); 
                curY.writeUInt16LE(spawn[1]*32, 0);

                this.x = spawn[0]*32
                this.y = spawn[1]*32

                send_data(this.socket, DataType.PLAYER_MOVEMENT_DATA, this.local_identifier, destroyBuffer, curX, curY)
                broadcast_data(this, DataType.PLAYER_MOVEMENT_DATA, this.global_identifier, destroyBuffer, curX, curY)

                //Player data
                let profileData = this.profile.player_data_buffer()
                send_data(this.socket, DataType.PLAYER_PROFILE_DATA, this.local_identifier, profileData)
                broadcast_data(this, DataType.PLAYER_PROFILE_DATA, this.global_identifier, profileData)

                //gems
                let gems = Buffer.alloc(4)
                gems.writeUint32LE(this.profile.data.gems)
                send_data(this.socket, DataType.CURRENCY_GEMS, gems)

                //Tell the client about the other players in the world
                online.forEach(element => {
                    //ignore elements that are us, innactive, or not in the world
                    if (element.socket == this.socket) return;
                    if (element.active == false) return;
                    if (element.world != this.world) return;

                    let other_id = Buffer.alloc(4)
                    other_id.writeInt32LE(element.id)

                    //Others X and Y
                    let destroyBuffer = Buffer.alloc(1);
                    destroyBuffer.writeUInt8(0);

                    let curX = Buffer.alloc(2); 
                    curX.writeUInt16LE(element.x, 0);
                        
                    let curY = Buffer.alloc(2); 
                    curY.writeUInt16LE(element.y, 0);
                    send_data(this.socket, DataType.PLAYER_MOVEMENT_DATA, other_id, destroyBuffer, curX, curY)

                    //Others Player Data
                    let profileData = element.profile.player_data_buffer()
                    send_data(this.socket, DataType.PLAYER_PROFILE_DATA, other_id, profileData)
                });
                this.active = true;
            } break;

            case CommandType.PLAYER_MOVEMENT:
            {
                //get x and y
                const new_x = reader.readUint16();
                const new_y = reader.readUint16();

                this.x = new_x;
                this.y = new_y;

                let leave = Buffer.alloc(1);
                leave.writeUInt8(0);

                let x_buffer = Buffer.alloc(2); 
                x_buffer.writeUInt16LE(this.x, 0);

                let y_buffer = Buffer.alloc(2); 
                y_buffer.writeUInt16LE(this.y, 0);

                broadcast_data(this, DataType.PLAYER_MOVEMENT_DATA, this.global_identifier, leave, x_buffer, y_buffer)

                //Interactable tiles
                const world_data = tiles_at_location(this.world, Math.round(this.x/32), Math.round(this.y/32))
                let tile_text:string = ""

                switch(world_data.foreground)
                {
                    case item_id.wooden_sign:
                    {
                        tile_text = get_tile_data(this.world, Math.round(this.x/32), Math.round(this.y/32))[0]
                    } break;
                }

                if (tile_text !== "")
                {
                    //tooltip notification
                    let notification_time = Buffer.alloc(2)
                    notification_time.writeUint16LE(100)
    
                    let notification_icon = Buffer.alloc(2)
                    notification_icon.writeUint16LE(world_data.foreground)
    
                    let text = string_buffer(tile_text)
                    send_data(this.socket, 17, notification_time, notification_icon, text)
                }
            } break;

            case CommandType.RESPAWN:
            {
                //Set player position to door X and Y
                let destroyBuffer = Buffer.alloc(1);
                destroyBuffer.writeUInt8(0);

                let spawn = find_spawn(this.world)

                let curX = Buffer.alloc(2); 
                curX.writeUInt16LE(spawn[0]*32, 0);
                let curY = Buffer.alloc(2); 
                curY.writeUInt16LE(spawn[1]*32, 0);

                this.x = spawn[0]*32
                this.y = spawn[1]*32

                send_data(this.socket, DataType.PLAYER_MOVEMENT_DATA, this.local_identifier, destroyBuffer, curX, curY)
                broadcast_data(this, DataType.PLAYER_MOVEMENT_DATA, this.global_identifier, destroyBuffer, curX, curY)
            } break;

            case CommandType.ACTION_BUBBLES:
            {
                //FIXME: Sometimes, bubbles dont disappear
                const action = reader.readInt16()
                let actionBuffer = Buffer.alloc(2)
                actionBuffer.writeUInt16LE(action)

                send_data(this.socket, DataType.ACTION_BUBBLES, this.local_identifier, actionBuffer)
                broadcast_data(this, DataType.ACTION_BUBBLES, this.global_identifier, actionBuffer)
            } break;

            case CommandType.PLAYER_CHAT:
            {
                const message_size = reader.readInt8();
                let mymessage = reader.readArrayAsString(message_size).replace("\r\n", "").replace("\n", "")

                if (mymessage.charAt(0) == "/") //is command
                {
                    send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer(`~5${mymessage}`))

                    commands.process_command(this, mymessage)
                }
                else
                {
                    //TODO: Filtering
                    //console
                    let msg = string_buffer(`[~1${this.profile.data.username}~0] ${mymessage}`)
                    broadcast_data(this, DataType.CONSOLE_MESSAGE, msg)
                    send_data(this.socket, DataType.CONSOLE_MESSAGE, msg)

                    //above player
                    let render_msg = string_buffer(mymessage)
                    let visibleTime = Buffer.alloc(2)
                    visibleTime.writeUInt16LE(mymessage.length * 2)

                    send_data(this.socket, DataType.PLAYER_MESSAGE, this.local_identifier, render_msg, visibleTime)
                    broadcast_data(this, DataType.PLAYER_MESSAGE, this.global_identifier, render_msg, visibleTime)
                }
            } break;

            default:
            {
                this.error(`Command ${command} (${CommandType[command]}) not implemented yet!`)
            } break;
        }
    }
}

export { Player };