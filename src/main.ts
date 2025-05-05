import * as fs from 'fs';

if (!fs.existsSync(".env"))
{
    console.error("A \".env\" file does not exist! Please read the README.md file for setup instructions.")
    process.exit(1)
}

import { Player } from "./player";
import 'dotenv/config'
import { MessageOfTheDay } from "./motd";
import { GameServer, APIServer } from './server';
import { getCommitOrFail } from './utils';
import BadWordsNext from 'bad-words-next'
import en from 'bad-words-next/lib/en'
import { version } from '../package.json'

let online:Player[] = [];
//let activeWorlds:GameWorld[] = []
const wordfilter:BadWordsNext = new BadWordsNext({ data: en, placeholder:'*', placeholderMode: 'repeat' })
const blacklist = {
    world: process.env.BLACKLISTED_WORLD_NAMES.split("|"),
    user: process.env.BLACKLISTED_USER_NAMES.split("|"),
}
const commit:string = getCommitOrFail();

console.log(`GoldenBedrock - Version v${version} (commit ${commit.slice(0,7)})`)

let motd:MessageOfTheDay = new MessageOfTheDay()
const GServer:GameServer = new GameServer();
const AServer:APIServer = new APIServer();

export {online, motd, commit, wordfilter, blacklist}