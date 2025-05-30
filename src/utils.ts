import { online } from "./main";
import * as net from "net";
import { Player } from "./player";
import { items } from './item-id'
import { execSync } from "child_process";

function getCommitOrFail() 
{
    try {
        return execSync("git rev-parse HEAD").toString().trim();
    } catch (e) {
        return "GIT-NOT-INSTALLED";
    }
}

function isBrowserRequest(data: Buffer): boolean 
{
    const str = data.toString();
    return str.startsWith("GET") || str.startsWith("POST") || str.startsWith("HEAD") || str.startsWith("OPTIONS");
}

function item_from_id(id:number)
{
    return items[id] || {
        name: "Unknown #" + id,
        info: "Unknown Item with ID " + id,
        type: ITEM_TYPE.NONE,
        body_layer: BODY_LAYER.none,
        rarity: 0,
        farmability: 0,
        hardness: 0,
        can_trade: false,
        can_trash: true,
        can_drop: false,
        can_lock: false,
        is_solid: false
    }
}

function item_id_from_name(name:string)
{
    let item_id:number = 0;

    for(const item in items)
    {
        if (items[item].name === name)
        {
            item_id = +item
            break;
        }
    }

    return item_id
}

/**
 * Returns player element from socket
 * @param socket Network Socket
 */
function findPlayer(socket:net.Socket): Player | undefined
{
    return online.find(element => element.socket === socket)
}

/**
 * Generates a random 6 letter long token.
 * @returns Random Token
 */
function generate_token(): string
{
    const chars:string = "QWERTYUIOPASDFGHJKLZXCVBNM0123456789"
    let token:string = "";

    for(let i = 0; i < 6; i++)
        token += chars.charAt(Math.floor(Math.random() * chars.length))

    return token;
}

/**
 * 
 * @param string Input string
 * @returns boolean
 */
function validate_string(string:string): boolean
{
    let regex = /^[A-Za-z0-9]+$/
    
    return regex.test(string)
}

/**
 * Returns if an account is online.
 * @param username 
 * @returns boolean
 */
function account_online(username:string): boolean
{
    let is_online:boolean = false;
    online.forEach(element => {
        if (element.profile.data.username == username)
        {
            is_online = true;
        }
    });
    return is_online;
}

/**
 * Creates a null terminated String buffer.
 * @param string 
 * @returns Buffer
 */
function string_buffer(string:string) : Buffer
{
    return Buffer.from(string + "\0", 'utf-8')
}

/**
 * Returns the flag sprite ID for a country.
 * @param country 
 * @returns Country ID
 */
function get_flag(country:string): number
{
    const country_list = [
        "ad",
        "ae",
        "af",
        "ag",
        "ai",
        "al",
        "am",
        "an",
        "ao",
        "ar",
        "as",
        "at",
        "au",
        "aw",
        "ax",
        "az",
        "ba",
        "bb",
        "bd",
        "be",
        "bf",
        "bg",
        "bh",
        "bi",
        "bj",
        "bm",
        "bn",
        "bo",
        "br",
        "bs",
        "bt",
        "bv",
        "bw",
        "by",
        "bz",
        "ca",
        "es.catalonia",
        "cc",
        "cd",
        "cf",
        "cg",
        "ch",
        "ci",
        "ck",
        "cl",
        "cm",
        "cn",
        "co",
        "cr",
        "cs",
        "cu",
        "cv",
        "cx",
        "cy",
        "cz",
        "de",
        "dj",
        "dk",
        "dm",
        "do",
        "dz",
        "ec",
        "ee",
        "eg",
        "eh",
        "gb.england",
        "er",
        "es",
        "et",
        "breaworlds.verified",
        "breaworlds.youtuber",
        "fi",
        "fj",
        "fk",
        "fm",
        "fo",
        "fr",
        "ga",
        "gb",
        "en",
        "gd",
        "ge",
        "gf",
        "gh",
        "gi",
        "gl",
        "gm",
        "gn",
        "gp",
        "gq",
        "gr",
        "gs",
        "gt",
        "gu",
        "gw",
        "gy",
        "hk",
        "hm",
        "hn",
        "hr",
        "ht",
        "hu",
        "id",
        "ie",
        "il",
        "in",
        "io",
        "iq",
        "ir",
        "is",
        "it",
        "jm",
        "jo",
        "jp",
        "ke",
        "kg",
        "kh",
        "ki",
        "km",
        "kn",
        "kp",
        "kr",
        "kw",
        "ky",
        "kz",
        "la",
        "lb",
        "lc",
        "li",
        "lk",
        "lr",
        "ls",
        "lt",
        "lu",
        "lv",
        "ly",
        "ma",
        "mc",
        "md",
        "me",
        "mg",
        "mh",
        "mk",
        "ml",
        "mm",
        "mn",
        "mo",
        "mp",
        "mq",
        "mr",
        "ms",
        "mt",
        "mu",
        "mv",
        "mw",
        "mx",
        "my",
        "mz",
        "na",
        "nc",
        "ne",
        "nf",
        "ng",
        "ni",
        "nl",
        "no",
        "np",
        "nr",
        "nu",
        "nz",
        "om",
        "pa",
        "pe",
        "pf",
        "pg",
        "ph",
        "pk",
        "pl",
        "pm",
        "pn",
        "pr",
        "ps",
        "pt",
        "pw",
        "py",
        "qa",
        "re",
        "ro",
        "rs",
        "ru",
        "rw",
        "sa",
        "sb",
        "sc",
        "gb.scotland",
        "sd",
        "se",
        "sg",
        "sh",
        "si",
        "sj",
        "sk",
        "sl",
        "sm",
        "sn",
        "so",
        "sr",
        "st",
        "sv",
        "sy",
        "sz",
        "tc",
        "td",
        "tf",
        "tg",
        "th",
        "tj",
        "tk",
        "tl",
        "tm",
        "tn",
        "to",
        "tr",
        "tt",
        "tv",
        "tw",
        "tz",
        "ua",
        "ug",
        "um",
        "us",
        "uy",
        "uz",
        "va",
        "vc",
        "ve",
        "vg",
        "vi",
        "vn",
        "vu",
        "gb.wales",
        "wf",
        "ws",
        "ye",
        "yt",
        "za",
        "zm",
        "zw",
        "nomo"
    ]

    const returnCountry = country_list.findIndex((element) => element == country.toLowerCase());
   
    return returnCountry || 229
}

/**
 * Returns if a point is in a rectangle
 * @param point_x 
 * @param point_y 
 * @param rectangle_x1 Top left X of Rectangle
 * @param rectangle_y1 Top left Y of Rectangle
 * @param rectangle_x2 Bottom right X of Rectangle
 * @param rectangle_y2 Bottom right Y of Rectangle
 * @returns boolean
 */
function point_in_rectangle(point_x:number, point_y:number, rectangle_x1:number, rectangle_y1:number, rectangle_x2:number, rectangle_y2:number) : boolean
{
    //taken from GameMaker's HTML5 runner
    if( ( point_x >= rectangle_x1 && point_x <= rectangle_x2 ) && ( point_y >= rectangle_y1 && point_y <= rectangle_y2 ) )
	    return true;
	else
	    return false;
}

export {findPlayer, generate_token, get_flag, string_buffer, point_in_rectangle, validate_string, account_online, item_from_id, item_id_from_name, getCommitOrFail}