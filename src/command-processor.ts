import { DataType, send_data, update_dialog, broadcast_data } from "./data";
import { Player } from "./player";
import { string_buffer, validate_string } from "./utils";
import { online, motd } from "./main";
import { Dialog } from "./dialog";
import { item_id, items } from "./item-id";

type CommandCallback = (player:Player, args: string[]) => any;

interface Command 
{
    callback: CommandCallback;
    //expectedArgs?: number | null; 
}

class SlashCommands
{
    private commands: Record<string, Command> = {};
    public command_list:string[] = []

    register_command(command: string, callback: CommandCallback)
    {
        this.commands[command] = { callback };
        this.command_list.push("/" + command)
    }

    process_command(player:Player, input:string)
    {
        const parts = input.slice(1).trim().split(/\s+/); // Remove '/' and split input
        const command = parts.shift()?.toLowerCase(); // Extract command
        const args = parts; // Remaining parts are arguments

        if (!command || !this.commands[command]) 
            return send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer(`~3Unknown Command: ~5/${command}`))
        
        const { callback } = this.commands[command]

        try
        {
            callback(player, args)
        }
        catch(e)
        {
            console.error(e)
            send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer(`~3Command Error: ~5${e}`))
        }
    }
}

let commands:SlashCommands = new SlashCommands()

commands.register_command("help", (player, args) => {
    let commandsDialog:Dialog = new Dialog("menu.help");

    commandsDialog.ItemText(true, `List of commands`, 72, 0)

    commands.command_list.forEach(element => {
        commandsDialog.Text(true, element, 48)
    });

    commandsDialog.Button(true, "close", "Close")

    update_dialog(player, commandsDialog)
})

commands.register_command("motd", (player, args) => {
    if (motd.render)
        update_dialog(player, motd.messageOfTheDay)
    else
        send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer("~3MOTD has been disabled on this server."))
})

commands.register_command("e", (player, args) => {
    if (args.length != 1)
        return send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer("~5Usage: /e <emote>. ~0Valid emotes: wave, dance"))

    let emote_id:number;
    let emote_duration:number;

    if (args[0] == "wave")
    {
        emote_id = 1
        emote_duration = 5
    }
    else if (args[0] == "dance")
    {
        emote_id = 3
        emote_duration = 255
    }
    else
    {
        send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer("~5Usage: /e <emote>. ~0Valid emotes: wave, dance"));
        return;
    }

    let dance_id_buffer = Buffer.alloc(1)
    dance_id_buffer.writeUint8(emote_id)

    let dance_frame_buffer = Buffer.alloc(1)
    dance_frame_buffer.writeUint8(0)

    let dance_time_buffer = Buffer.alloc(1)
    dance_time_buffer.writeUint8(emote_duration)

    send_data(player.socket, DataType.EMOTES, player.local_identifier, dance_id_buffer, dance_frame_buffer, dance_time_buffer)
})

commands.register_command("g", (player, args) => {
    if (args.length == 0)
        return send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer("~5Usage: /g <message>. ~0This will cost you ~1200 ~0gems."))

    let global_message = args.join(" ")
    
    online.forEach(element => {
        send_data(element.socket, DataType.CONSOLE_MESSAGE, string_buffer(`~5[Global Message from ~1${player.profile.data.username}~5]~0 ${global_message}`))
    });

    send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer("~4Global message sent!"))
})

commands.register_command("warp", (player, args) => {
    if (args.length != 1)
        return send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer("~5Usage: /warp <world>. ~0Warp to another world."))

    if (validate_string(args[0]) == false || (args[0].length == 0 || args[0].length > 32))
        return send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer("~3Warp failed! ~0World name must be between 1-32 characters, with letters A-z 0-9."))

    let destroyBuffer = Buffer.alloc(1);
    destroyBuffer.writeUInt8(1);
    broadcast_data(player, DataType.PLAYER_MOVEMENT_DATA, player.global_identifier, destroyBuffer)

    player.warp(args[0])
})

//STAFF COMMANDS
commands.register_command("item", (player, args) => {
    if (args.length != 2)
        return send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer("~5Usage: /item <id> <amount>. ~0Gives an item from it's ID."))

    player.profile.edit_inventory(+args[0], +args[1])

    let invData:Buffer = player.profile.get_inventory_buffer()
    send_data(player.socket, DataType.INVENTORY_UPDATE, invData)
    send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer(`~5Gave ${args[1]}x "${items[+args[0]].name}"`))
})

commands.register_command("find", (player, args) => {
    if (args.length != 1)
        return send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer("~5Usage: /find <name>. ~0Lists items containing a string"))

    let itemList:Dialog = new Dialog("menu.items")
    itemList.ItemText(true, `Items containing "${args[0]}"`, 72, 3)

    items.forEach((element, index) => {
        if (element.name.toLowerCase().includes(args[0].toLowerCase()))
            itemList.ItemText(true, `${index} | ${element.name}`, 48, index)
    });

    itemList.Button(true, "close", "Close")

    update_dialog(player, itemList)
})

commands.register_command("equip", (player, args) => {
    if (args.length != 1)
        return send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer("~5Usage: /equip <id>. ~0Temp equip item"))

    player.profile.equip_item(+args[0])

    let profileData = player.profile.player_data_buffer()
    send_data(player.socket, DataType.PLAYER_PROFILE_DATA, player.local_identifier, profileData)
    broadcast_data(player, DataType.PLAYER_PROFILE_DATA, player.global_identifier, profileData)

    send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer(`~5Data refreshed.`))
})

commands.register_command("usredit", (player, args) => {
    if (args.length != 2)
        return send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer("~5Usage: /usredit <key> <value>. ~0Temp edit local player data"))

    player.profile.set(args[0], args[1])

    send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer(`~5Key "${args[0]}" set to "${args[1]}"`))
})

commands.register_command("usrref", (player, args) => {
    let profileData = player.profile.player_data_buffer()
    send_data(player.socket, DataType.PLAYER_PROFILE_DATA, player.local_identifier, profileData)
    broadcast_data(player, DataType.PLAYER_PROFILE_DATA, player.global_identifier, profileData)

    send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer(`~5Data refreshed.`))
})

commands.register_command("noclip", (player, args) => {
    player.profile.noclip = !player.profile.noclip
    let profileData = player.profile.player_data_buffer()
    send_data(player.socket, DataType.PLAYER_PROFILE_DATA, player.local_identifier, profileData)
    broadcast_data(player, DataType.PLAYER_PROFILE_DATA, player.global_identifier, profileData)

    send_data(player.socket, DataType.CONSOLE_MESSAGE, string_buffer(`~5Data refreshed.`))
})

commands.register_command("nerdstats", (player, args) => {
    //store node memory usage
    const mem = `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100} MB`;
    //store node uptime
    const uptime = `${(Math.round(process.uptime() * 100) / 100)/60} minutes`;
    //store node version
    const version = process.version;
    //store node platform
    const platform = process.platform;
    //store node arch
    const arch = `${process.arch}`;
    //store node cpu speed
    const cpuSpeed = `${Math.round(process.cpuUsage().system / 1000 / 1000 * 100) / 100} MHz`;
    //store node total cpu usage
    const cpuUsage = `${Math.round(process.cpuUsage().user / 1000 / 1000 * 100) / 100} MHz`;

    update_dialog(player, new Dialog()
    .ItemText(true, "Server Stats", 72, 3)
    .Text(true, `Mem Usage: ${mem}`, 50)
    .Text(true, `CPU Usage: ${cpuUsage}`, 50)
    .Text(true, `Uptime: ${uptime}`, 50)
    .Text(true, `Node Version: ${version}`, 50)
    .Text(true, `Platform (arch) : ${platform} (${arch})`, 50)
    .Button(true, "xit", "cool, thx.")
    )
})

export { commands }