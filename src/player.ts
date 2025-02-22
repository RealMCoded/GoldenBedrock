import * as net from "net";
import { BinaryReader } from "@picode/binary-reader";
import { DataType, send_data, update_dialog, broadcast_data } from "./data";
import { PlayerProfile } from "./profile";
import { Dialog } from "./dialog";
import { online, motd } from "./main";
import User from "./models/User";
import { generate_token, string_buffer } from "./utils";
import { convert_to_game_format, create_world, find_spawn, get_world_data, modify_tile, random_world, Theme, tiles_at_location, world_exists } from "./world";
import { item_from_id, ITEM_TYPE } from "./items";

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
        console.log(`[LOG:PlayerID ${this.id}] ` + data)
    }

    private error(data:any)
    {
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
        broadcast_data(this.id, DataType.CONSOLE_MESSAGE, string_buffer("[~1(user) ~0has entered the world.]"))
    }

    async close()
    {
        if (this.active)
        {
            let identifier = Buffer.alloc(4)
            identifier.writeInt32LE(this.id)

            let destroyBuffer = Buffer.alloc(1);
            destroyBuffer.writeUInt8(1);

            broadcast_data(this.id, DataType.PLAYER_MOVEMENT_DATA, identifier, destroyBuffer)

            broadcast_data(this.id, DataType.CONSOLE_MESSAGE, string_buffer("[~1(user) ~0has logged out.]"))
        }

        //remove connections
        online.forEach(element => {
            if (element.socket == this.socket)
                online.splice(this.id-1, 1)
        });
        this.socket.destroy()

        this.log("Destroyed player")
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

                if(ver !== '3.8.3')
                {
                    console.log(`Unsupported version - ${ver}`)
                        update_dialog(this, new Dialog()
                        .ItemText(true, "~1Unsupported Client", 72, 0)
                        .Text(true, "Your game version is not supported.", 48)
                        .Text(true, "Please use ~13.8.3~0 for best results.", 48)
                        .Text(true, "", 48)
                        )
                    return;
                }

                const country_leng = reader.readUint8();
                this.profile.country = reader.readArrayAsString(country_leng);

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
                const accnum = reader.readUint16();

                let account = await User.findOne({where: {username:uname}})

                if (account == null)
                {
                    success = false;
                    message = Buffer.from(`~3Account "${uname}" does not exit on this server. ~0Go register it!\0`, `utf-8`)
                }
                else if (passw != account.token)
                {
                    success = false;
                    message = Buffer.from(`~3Login failed! ~0Incorrect token.\0`, `utf-8`)
                }
                else
                {
                    success = true;
                    message = Buffer.from(`~5Welcome back, ${uname}! ~0There are ${online.length} players online.\0`, `utf-8`)
                }

                //login response
                let successBuffer = Buffer.alloc(1)
                successBuffer.writeUint8(success ? 1 : 0)
                let loginInfoBuffer = Buffer.alloc(0);
                if (success)
                {
                    loginInfoBuffer = Buffer.concat([
                        Buffer.from(uname + '\0', 'utf8'),
                        Buffer.from(passw + '\0', 'utf8')
                    ]);
                }
                send_data(this.socket, DataType.LOGIN, successBuffer, message, loginInfoBuffer)

                if (success) 
                {
                    await this.profile.load_profile(uname)

                    if (motd.render)
                        update_dialog(this, motd.messageOfTheDay)

                    //Send inventory data
                    let invData:Buffer = this.profile.get_inventory()
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
                const accnum = reader.readUint16();
                const token = generate_token();

                let account = await User.findOne({where: {username:uname}})

                if (account != null)
                {
                    success = false
                    message = Buffer.from(`~3Registration failed! ~0An account with that name already exists.\0`, `utf-8`)
                }
                else if (uname.length < 1 || email.length < 1)
                {
                    success = false
                    message = Buffer.from(`~3Registration failed! ~0You must provide a username and email.\0`, `utf-8`)
                }
                else if (uname.length < 2 || uname.length > 12)
                {
                    success = false
                    message = Buffer.from(`~3Registration failed! ~0Usernames must be between 3-12 characters long.\0`, `utf-8`)
                }
                //TODO: Blacklisted name check
                else
                {
                    account = await User.create({username: uname, email, token})
                    success = true
                    message = Buffer.from(`~1Welcome to GoldenBedrock, ${uname}! ~0You can now login.\0`, `utf-8`)
                }

                let successBuffer = Buffer.alloc(1)
                successBuffer.writeUint8(success ? 1 : 0)

                let loginInfoBuffer = Buffer.alloc(0);
                if (success)
                {
                    loginInfoBuffer = Buffer.concat([
                        Buffer.from(uname + '\0', 'utf8'),
                        Buffer.from(token + '\0', 'utf8')
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
                    .Button(true, "xit", "Yay!")
                    )
                }
            } break;

            case CommandType.RECOVER:
            {
                //TODO: actual recovery. for now just say its not working
                let message = Buffer.from(`~3Recovery failed! ~0Recovery does not work at the moment.\0`, `utf-8`)

                send_data(this.socket, DataType.RECOVERY, message)
            } break;

            case CommandType.ESC_MENU:
            {
                update_dialog(this, new Dialog("menu.main")
                .ItemText(true, `Menu - ~1${this.world}`, 72, 0)
                .Button(true, "warp", "Warp")
                .Button(true, "respawn", "Respawn")
                .Button(true, "shop", "Shop")
                .Button(true, "settings", "Settings")
                .Button(true, "mod", "Moderation")
                .Button(true, "bug", "Report a Bug")
                .Button(true, "close", "Close")
                )
            } break;

            case CommandType.INVENTORY_CLICK:
            {
                let doubleClick = reader.readUint8() //thank you quu for making the game send the double click signal 
                let slot = reader.readUint8()
                let item_data = item_from_id(this.profile.data.inventory.items[slot].index);
                console.log(doubleClick, slot)

                if (!doubleClick)
                {
                    //tooltip notification
                    let notification_time = Buffer.alloc(2)
                    notification_time.writeUint16LE(100)
    
                    let notification_icon = Buffer.alloc(2)
                    notification_icon.writeUint16LE(this.profile.data.inventory.items[slot].index)
    
                    let text = Buffer.from(item_data.name + "\0", 'utf-8')
                    send_data(this.socket, 17, notification_time, notification_icon, text)
                }
                else
                {
                    //double click actions
                    update_dialog(this, new Dialog()
                        .ItemText(true, item_data.name, 72, this.profile.data.inventory.items[slot].index)
                        .Text(true, item_data.info, 48)
                        .Button(true, "close", "Close")
                    )
                }
            } break;

            case CommandType.DIALOG_ACTION:
            {
                const worker = reader.readUint16()
                let header_length = reader.readUint8();
                let dialog_name = reader.readArrayAsString(header_length)
                let sub_length = reader.readUint8();
                let sub_action = reader.readArrayAsString(sub_length)

                console.log(dialog_name)
                console.log(sub_action)

                let dict:{key:string, value:string|number}[] = []

                let range_str = reader.readUint16()
                let range_int = reader.readUint16()

                for(var i=0; i < range_str; i++)
                {
                    let key_len = reader.readUint8()
                    let key = reader.readArrayAsString(key_len)
                    let value_len = reader.readUint8()
                    let value = reader.readArrayAsString(value_len)
                    dict.push({key, value})
                }
    
                for(var i=0; i < range_int; i++)
                {
                    let key_len = reader.readUint8()
                    let key = reader.readArrayAsString(key_len)
                    let value = reader.readUint16()
                    dict.push({key, value})
                }

                switch(dialog_name)
                {
                    case "menu.motd":
                    {
                        if (sub_action == "motd.linkbutton")
                        {
                            let uri = Buffer.from(motd.LinkButtonLink + "\0", 'utf-8')
                            send_data(this.socket, DataType.URL_OPEN, uri)
                        }
                    } break;

                    case "menu.main":
                    {
                        if (sub_action == "warp")
                        {
                            update_dialog(this, new Dialog("menu.warp")
                            .ItemText(true, "Warp to world", 72, 0)
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
                            let message = Buffer.from(`~5Opening bug report page!\0`, 'utf-8')
                            send_data(this.socket, DataType.CONSOLE_MESSAGE, message)
                            let uri = Buffer.from("https://github.com/RealMCoded/GoldenBedrock/issues\0", 'utf-8')
                            send_data(this.socket, DataType.URL_OPEN, uri)
                        }
                    } break;

                    case "menu.moderation":
                    {

                    } break;

                    case "menu.warp":
                    {
                        if (sub_action == "warp")
                        {
                            if ((dict[0].value as string).length == 0 || (dict[0].value as string).length > 32)
                            {
                                let message = Buffer.from("~3Warp failed! ~0World name must be between 1-32 characters.\0", 'utf-8');
                                send_data(this.socket, DataType.CONSOLE_MESSAGE, message);
                                return;
                            }

                            let destroyBuffer = Buffer.alloc(1);
                            destroyBuffer.writeUInt8(1);
                            broadcast_data(this.id, DataType.PLAYER_MOVEMENT_DATA, this.global_identifier, destroyBuffer)
                            broadcast_data(this.id, DataType.CONSOLE_MESSAGE, string_buffer("[~1(user) ~0has left the world.]"))

                            this.warp(dict[0].value as string)
                        }
                        else if (sub_action == "warp.reward")
                        {
                            let destroyBuffer = Buffer.alloc(1);
                            destroyBuffer.writeUInt8(1);
                            broadcast_data(this.id, DataType.PLAYER_MOVEMENT_DATA, this.global_identifier, destroyBuffer)
                            broadcast_data(this.id, DataType.CONSOLE_MESSAGE, string_buffer("[~1(user) ~0has left the world.]"))

                            this.warp("REWARDS")
                        }
                        else if (sub_action == "warp.rnd")
                        {
                            let world = await random_world(this.world)

                            let destroyBuffer = Buffer.alloc(1);
                            destroyBuffer.writeUInt8(1);
                            broadcast_data(this.id, DataType.PLAYER_MOVEMENT_DATA, this.global_identifier, destroyBuffer)
                            broadcast_data(this.id, DataType.CONSOLE_MESSAGE, string_buffer("[~1(user) ~0has left the world.]"))
    
                            this.warp(world)
                        }
                    } break;
                }
            } break;

            case CommandType.WORLD_CLICK:
            {
                let click_x = Math.floor(reader.readUint16() / 32);
                let click_y = Math.floor(reader.readUint16() / 32);
                let item = reader.readUint16();
                let click_count = reader.readUint16();
                console.log(click_x, click_y, item, click_count)
                let item_data = item_from_id(item);

                const world_data = tiles_at_location(this.world, click_x, click_y)

                let layer = +(world_data.foreground !== 0)+1

                console.log(layer)

                //Fist item
                if (item == 1)
                {
                    console.log("Fist")

                    if (world_data.foreground == 0 && world_data.background == 0) return;

                    //Check for tile in that location
                    if (click_count > 2)
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

                        broadcast_data(this.id, DataType.TILE_UPDATE, x_buffer, y_buffer, layer_buffer, place_buffer)

                        modify_tile(this.world, click_x, click_y, layer, 0)
                    }
                    else
                    {
                        let x_buffer = Buffer.alloc(2)
                        x_buffer.writeInt16LE(click_x)
            
                        let y_buffer = Buffer.alloc(2)
                        y_buffer.writeInt16LE(click_y)
            
                        let hit_buffer = Buffer.alloc(2)
                        hit_buffer.writeInt16LE(click_count + 1)
                                        
                        let hardness_buffer = Buffer.alloc(2)
                        hardness_buffer.writeInt16LE(3)
    
                        send_data(this.socket, DataType.TILE_PUNCH, x_buffer, y_buffer, hit_buffer, hardness_buffer)

                        broadcast_data(this.id, DataType.TILE_PUNCH, x_buffer, y_buffer, hit_buffer, hardness_buffer)
                    }
                }
                else if (item == 3)
                {
                    console.log("Wrench click interaction")
                }
                else // everything else
                {
                    console.log("Placeable?")

                    //if (world_data.foreground !== 0 && world_data.background !== 0) return;

                    //modify_tile(this.world, click_x, click_y, layer, 13)
                }
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
                broadcast_data(this.id, DataType.PLAYER_MOVEMENT_DATA, this.global_identifier, destroyBuffer, curX, curY)

                //Player data
                let profileData = this.profile.player_data_buffer()
                send_data(this.socket, DataType.PLAYER_PROFILE_DATA, this.local_identifier, profileData)
                broadcast_data(this.id, DataType.PLAYER_PROFILE_DATA, this.global_identifier, profileData)

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

                broadcast_data(this.id, DataType.PLAYER_MOVEMENT_DATA, this.global_identifier, leave, x_buffer, y_buffer)
            } break;

            case CommandType.ACTION_BUBBLES:
            {
                const action = reader.readInt16()
                let actionBuffer = Buffer.alloc(2)
                actionBuffer.writeUInt16LE(action)

                send_data(this.socket, DataType.ACTION_BUBBLES, this.local_identifier, actionBuffer)
                broadcast_data(this.id, DataType.ACTION_BUBBLES, this.global_identifier, actionBuffer)
            } break;

            case CommandType.PLAYER_CHAT:
            {
                const message_size = reader.readInt8();
                let mymessage = reader.readArrayAsString(message_size).replace("\r\n", "").replace("\n", "")

                if (mymessage.charAt(0) == "/") //is command
                {
                    send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer(`~5${mymessage}`))

                    let args = mymessage.split(" ")

                    //TODO: transition this to command-processor.ts
                    switch(args[0])
                    {
                        case "/motd":
                        {
                            if (motd.render)
                                update_dialog(this, motd.messageOfTheDay)
                            else
                                send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer("~3MOTD has been disabled on this server."))
                        } break;

                        case "/g":
                        {
                            if (args.length == 1)
                            {
                                send_data(this.socket, DataType.CONSOLE_MESSAGE, string_buffer("~5Usage: /g <message>. ~0This will cost you ~1200 ~0gems."));
                                return;
                            }

                            let message = Buffer.from(`~5[Global Message from ~1${this.profile.data.username}~5]~0 ${mymessage.substring(3)}\0`, 'utf-8');
                            let sentmessage = Buffer.from(`~4Global message sent!\0`, 'utf-8');
        
                            online.forEach(element => {
                                send_data(element.socket, DataType.CONSOLE_MESSAGE, message)
                            });

                            send_data(this.socket, DataType.CONSOLE_MESSAGE, sentmessage)
                        } break;

                        case "/warp":
                        {
                            if ((args.length == 1) || (args[1].length == 0 || args[1].length > 32)) 
                            {
                                let message = Buffer.from("~3Warp failed! ~0World name must be between 1-32 characters.\0", 'utf-8');
                                send_data(this.socket, DataType.CONSOLE_MESSAGE, message);
                                return;
                            }
                            
                            let destroyBuffer = Buffer.alloc(1);
                            destroyBuffer.writeUInt8(1);
                            broadcast_data(this.id, DataType.PLAYER_MOVEMENT_DATA, this.global_identifier, destroyBuffer)

                            this.warp(args[1])
                        } break;

                        case "/usredit":
                        {
                            if (args.length != 3) 
                            {
                                let message = Buffer.from(`~5Usage: /usredit <key> <value>\0`, 'utf-8');
                                send_data(this.socket, DataType.CONSOLE_MESSAGE, message);
                                return;
                            }

                            try
                            {
                                this.profile.set(args[1], args[2])
                                let message = Buffer.from(`~5Key "${args[1]}" set to "${args[2]}"\0`, 'utf-8');
                                send_data(this.socket, DataType.CONSOLE_MESSAGE, message);
                            }
                            catch(e)
                            {
                                let message = Buffer.from(`~3Error! ~0${e}\0`, 'utf-8');
                                send_data(this.socket, DataType.CONSOLE_MESSAGE, message);
                                return;
                            }
                        } break;

                        case "/item":
                        {
                            if (args.length != 3) 
                            {
                                let message = Buffer.from(`~5Usage: /item <id> <amount>\0`, 'utf-8');
                                send_data(this.socket, DataType.CONSOLE_MESSAGE, message);
                                return;
                            }

                            this.profile.data.inventory.items.push({index: +args[1], count: +args[2], equipped: 0})

                            //Send inventory data
                            let invData:Buffer = this.profile.get_inventory()
                            send_data(this.socket, DataType.INVENTORY_UPDATE, invData)
                            let message = Buffer.from(`~5Gave ${args[2]}x "${args[1]}"\0`, 'utf-8');
                            send_data(this.socket, DataType.CONSOLE_MESSAGE, message);
                        } break;

                        case "/usrref":
                        {
                            let message = Buffer.from(`~5Player refreshed.\0`, 'utf-8');
                            send_data(this.socket, DataType.CONSOLE_MESSAGE, message);

                            let profileData = this.profile.player_data_buffer()
                            send_data(this.socket, DataType.PLAYER_PROFILE_DATA, this.local_identifier, profileData)
                            broadcast_data(this.id, DataType.PLAYER_PROFILE_DATA, this.global_identifier, profileData)
                        } break;

                        default:
                        {
                            let message = Buffer.from(`~3Unknown Command: ~5${mymessage}\0`, 'utf-8')
                            send_data(this.socket, DataType.CONSOLE_MESSAGE, message)
                        } break;
                    }
                }
                else
                {
                    //TODO: Filtering
                    //console
                    let msg = Buffer.from(`[~1${this.profile.data.username}~0] ${mymessage}\0`, 'utf8')
                    broadcast_data(this.id, DataType.CONSOLE_MESSAGE, msg)
                    send_data(this.socket, DataType.CONSOLE_MESSAGE, msg)

                    //above player
                    let render_msg = Buffer.from(mymessage + "\0", 'utf8')

                    let visibleTime = Buffer.alloc(2)
                    visibleTime.writeUInt16LE(25)

                    send_data(this.socket, DataType.PLAYER_MESSAGE, this.local_identifier, render_msg, visibleTime)
                    broadcast_data(this.id, DataType.PLAYER_MESSAGE, this.global_identifier, render_msg, visibleTime)
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