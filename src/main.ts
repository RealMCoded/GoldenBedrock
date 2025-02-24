import * as fs from 'fs';

if (!fs.existsSync(".env"))
{
    console.error("A \".env\" file does not exist! Please read the README.md file for setup instructions.")
    process.exit(1)
}

import * as net from "net";
import { Player } from "./player";
import 'dotenv/config'
import { DataType, send_data } from "./data";
import { Dialog } from "./dialog";
import { MessageOfTheDay } from "./motd";
import { Filter } from "bad-words";

import sequelize from "./sequelize";
import User from "./models/User";
import World from "./models/World"

let online:Player[] = [];
//let activeWorlds:GameWorld[] = []
//let wordfilter:Filter = new Filter()

let motd:MessageOfTheDay = new MessageOfTheDay()

function findPlayer(socket:net.Socket): Player | undefined
{
    return online.find(element => element.socket === socket)
}

function isBrowserRequest(data: Buffer): boolean 
{
    const str = data.toString();
    return str.startsWith("GET") || str.startsWith("POST") || str.startsWith("HEAD") || str.startsWith("OPTIONS");
}

const server:net.Server = net.createServer(async (c) => {
    //kick any connections that are trying to join while at max capacity
    if (process.env.PLAYER_CAP)
    {
        if (online.length > +process.env.PLAYER_CAP-1)
        {
            let kick_message = Buffer.from('~3Too many players are online! ~0Please try connecting later.\0', 'utf8')
            send_data(c, DataType.CONSOLE_MESSAGE, kick_message)

            //Dialog Popup
            let diag = new Dialog()
                .ItemText(true, "~1The server is full!", 72, 0)
                .Text(true, `This server has reached the player cap of ~1${process.env.PLAYER_CAP} ~0online players.`, 48)
                .Text(true, "Please try connecting later, or try another server.", 48)
                .Text(true, "You will be kicked from the server in a moment.", 48)
                .Text(true, "", 48)
            
            let header = Buffer.alloc(4);
            header.writeUInt16LE(0, 0); //used for final buffer size
            header.writeUInt16LE(DataType.DIALOG, 2); //data type

            let finalBuffer = Buffer.concat(Array.prototype.concat(header, diag.elements)); //combine header and buffer data
            finalBuffer.writeUInt16LE(finalBuffer.length, 0); //write size to header
            c.write(finalBuffer); //pack it, ship it

            setTimeout((c)=>{
                c.destroy()
            }, 500, c)
            return;
        }
    }

    //add a new player to the online list
    online.push(new Player(c, online.length+1))

    //data routing to correct players
    c.on('data', async (data) => {
        let player = findPlayer(c)
        
        if (player)
            player.handle(data)
        else
            console.error(`Cant find player, bouncing data.`)
    })

    //Breaworlds disconnects by resetting the connection, so we handle it here.
    c.on('error', (err:any) => {
        if (err.code !== 'ECONNRESET') {
            console.error('Socket error: ', err);
        }
        else
        {
            //disconnect handle
            online.forEach(element => {
                if (element.socket == c)
                    element.close()
            });
        }
    })
})

server.listen(process.env.PORT, async () => {
    await sequelize.sync();
    await User.sync();
    await World.sync();

    console.log(`Hosting server on port ${process.env.PORT}`)
})

export {online, motd}