import * as net from "net";
import { online } from "./main";
import { Dialog } from "./dialog";
import { Player } from "./player";

enum DataType 
{
    RECONNECT_SERVER = 0,
    LOGIN,
    REGISTER,
    RECOVERY,
    CONSOLE_MESSAGE,
    DIALOG,
    INVENTORY_UPDATE,
    SETTINGS_UPDATE,
    WARP,
    CONSOLE_MESSAGE_RAW,
    WORLD_DATA = 10,
    TILE_UPDATE,
    DROPS,
    PLAYER_MOVEMENT_DATA,
    PLAYER_PROFILE_DATA,
    ACTION_BUBBLES,
    CURRENCY_GEMS,
    INVENTORY_NOTIFICATION,
    PLAYER_PUNCH,
    TILE_PUNCH,
    WORLD_THEME = 20,
    PLAYER_MESSAGE,
    ADS, // displaying ads on mobile devices, so pretty much unused.
    UNUSED_23, // no code for this exists in client
    UNUSED_24, // no code for this exists in client
    IAP, //in app purchase, so unused.
    UNUSED_26, //no code for this exists in client
    URL_OPEN,
    MUSIC_TILES,
    USER_EVENTS, //things like respawning
    PARTICLES = 30,
    FISHING,
    EMOTES,
    SHOP_CONTENT,
    TRADING,
    FULL_SCREEN_NOTIFICATION,
    BALL,
    TIMER,
    CURRENCY_ROCKS //aka "newcurrency"
}

function send_data(socket:net.Socket, data_id:DataType, ...buffer_data:Buffer[])
{
    try
    {
        let header:Buffer = Buffer.alloc(4)
        header.writeUint16LE(0, 0) // Final buffer size
        header.writeUint16LE(data_id, 2) //Data Type

        let final_buffer = Buffer.concat(Array.prototype.concat(header, buffer_data))//combine header and buffer data
        final_buffer.writeUInt16LE(final_buffer.length, 0); //write size to header
        socket.write(final_buffer); //pack it, ship it
    }
    catch(e)
    {
        console.error('Error sending data: ', e);
    }
}

function broadcast_data(my_id:number, data_id:DataType, ...buffer_data:Buffer[])
{
    //my_id--

    online.forEach(element => {
        if (element.id != my_id && element.active == true && element.world == online[my_id-1].world)
        {
            send_data(element.socket, data_id, ...buffer_data)
        }
    })
}


function update_dialog(player:Player, dialog:Dialog)
{
    let header = Buffer.alloc(4);
    header.writeUInt16LE(0, 0); //used for final buffer size
    header.writeUInt16LE(5, 2); //data type

    player.currentDialog = dialog.name
    console.log(dialog.name)

    let finalBuffer = Buffer.concat(Array.prototype.concat(header, dialog.elements)); //combine header and buffer data
    finalBuffer.writeUInt16LE(finalBuffer.length, 0); //write size to header
    player.socket.write(finalBuffer); //pack it, ship it
}

export {DataType, send_data, broadcast_data, update_dialog}