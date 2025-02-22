import { Dialog } from "./dialog";
import * as fs from 'fs';

class MessageOfTheDay
{
    render:boolean = false;
    messageOfTheDay:Dialog = new Dialog("menu.motd");
    LinkButtonLink:string = "";

    constructor()
    {
        if (!fs.existsSync("motd.txt"))
        {
            console.error("[MOTD] motd.txt does not exist! MOTD will not render.");
            return;
        };

        let file_contents = fs.readFileSync('motd.txt', 'utf-8');
        file_contents.split(/\r?\n/).forEach(line =>  {
            if (line === "") return; //skip blank lines
            let commands = line.split("|");
            //console.log(commands)

            try
            {
                switch(commands[0])
                {
                    case "Text":
                    {
                        this.messageOfTheDay.Text(true, commands[2], +commands[1]);
                    } break;
                    case "ItemText":
                    {
                        this.messageOfTheDay.ItemText(true, commands[3], +commands[2], +commands[1]);
                    } break;
                    case "LinkButton":
                    {
                        if (this.LinkButtonLink !== "")
                            console.error("[MOTD] A maximum on 1 link button is allowed on MOTD popups.");
                        else
                        {
                            this.messageOfTheDay.Button(true, "motd.linkbutton", commands[2]);
                            this.LinkButtonLink = commands[1];
                        }
                    } break;
                    default:
                    {
                        console.error("[MOTD] Unknown item command: " + commands[0]);
                    } break;
                }
            }
            catch (e)
            {
                console.error(`[MOTD] Error while rendering MOTD!!` + e)
            }
        });

        this.messageOfTheDay.Button(true, "motd.exit", "Close")
        console.log("[MOTD] Rendered.")
    }
}

export { MessageOfTheDay }