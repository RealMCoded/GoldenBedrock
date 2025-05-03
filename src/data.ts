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
    IAP=25, //in app purchase, so unused.
    URL_OPEN=27,
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

enum UserEvents
{
    HAND_ANGLE,
    LAVA_PARTICLE,
    RESPAWN,
    ACID_PARTICLE
}

/**
 * Send buffer data to a socket
 * @param socket Socket to send data to
 * @param data_id The ID of the data to send (DataType)
 * @param buffer_data Data to include
 */
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

/**
 * Globally sends data to all clients who are in the same room as the player.
 * @param player The player who is sending the data.
 * @param data_id The ID of the data to send (DataType)
 * @param buffer_data Data to include
 */
function broadcast_data(player:Player, data_id:DataType, ...buffer_data:Buffer[])
{
    online.forEach(element => {
        if (element.id != player.id && element.active == true && element.world == player.world)
        {
            send_data(element.socket, data_id, ...buffer_data)
        }
    })
}

/**
 * Change the dialog shown to the player.
 * @param player The player to update
 * @param dialog Dialog data
 */
function update_dialog(player:Player, dialog:Dialog)
{
    let header = Buffer.alloc(4);
    header.writeUInt16LE(0, 0); //used for final buffer size
    header.writeUInt16LE(5, 2); //data type

    player.currentDialog = dialog.name

    let finalBuffer = Buffer.concat(Array.prototype.concat(header, dialog.elements)); //combine header and buffer data
    finalBuffer.writeUInt16LE(finalBuffer.length, 0); //write size to header
    player.socket.write(finalBuffer); //pack it, ship it
}

export {DataType, UserEvents, send_data, broadcast_data, update_dialog}