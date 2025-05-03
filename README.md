<div align="center">
<!--<img src="./readme/logotext.png">-->
<img src="./readme/logo.png" width="128" height="128">
<h1>GoldenBedrock</h1>
</div>

<!------->

GoldenBedrock is an experimental private server for the game [Breaworlds](https://breaworldsgame.com) written in Node.js with Typescript. It's custom written from reverse-engineering the client code of an old developer build (dated around November 2020).

> [!IMPORTANT]  
> GoldenBedrock is not (and probably never will be) production ready software. The server code is not optimized for production. Use at your own risk.

## Project Status: Alpha (Proof of Concept)

GoldenBedrock is still heavy work in progress. 

Only very basic gameplay works right now.

Players can place and break tiles, but ownership of worlds does not work yet.

For a full list of features that work and don't work, read [the progress page](./PROGRESS.MD).

## Playing

Currently, there is not an official instance of GoldenBedrock running.

If you are using the [Breaworlds Private Server Manager (BWPSM)](https://github.com/RealMCoded/Breaworlds-PrivateServerManager), you can add a server that points to the localhosted version of GoldenBedrock.

```
ew0KICAiU2VydmVyTmFtZSI6ICJHb2xkZW5CZWRyb2NrLUxvY2FsaG9zdCIsDQogICJTZXJ2ZXJJcCI6ICIxMjcuMC4wLjEiLA0KICAiU2VydmVyUG9ydCI6ICIxODAxIiwNCiAgIlNlcnZlckJpbyI6ICJBIGxvY2FsaG9zdGVkIHZlcnNpb24gb2YgR29sZGVuQmVkcm9jaywgZm9yIGRldmVsb3BtZW50IHVzZS4iLA0KICAiU2VydmVyU29jaWFsTGluayI6ICIiLA0KICAiU2VydmVyU29jaWFsTmFtZSI6ICIiDQp9
```

Alternatively, you can run a development client with the `run-client.bat` file, or by opening a terminal in the `client` folder and running the following command:
```ps
.\Breaworlds-PrivateServer.exe 127.0.0.1 1801 GoldenBedrock-Development
```

## Setting up

GoldenBedrock requires [Node.js](https://nodejs.org/en) (Use any version that is 20 or newer)

During installation, make sure to install Chocolaty as it is required for `sqlite3`.

Once Node is installed, install the project dependencies by running `npm i` in the root folder.

You also need to install TypeScript with `npm install --global typescript`.

When the dependencies are finished, make sure to create a `.env` file for configuration.

Run the server by running `npn run serve`, or `node .`

You can read more about connecting to the server in the "Playing" section.

If you want to configure your MOTD, read [this page](./MOTD-GUIDE.md)!

### The `.env` file

Configuration is done via `.env` files. Create a file called `.env` in the root directory and pre-fill it with this content.

```env
NODE_ENV = "prod" #Server environment. dev enables logging. Valid options: dev, prod. Default: prod.
PORT = "1801" #The port the server is hosted on. Default: 1801
PLAYER_CAP = "100" #How many sessions can be connected at once. Default: 100
REGISTRATIONS_OPEN = "true" #Toggle if registrations are open. Default: true
IGNORE_VERSION = "false" #Allows versions other than 3.8.3 to connect. Default: false
SWEAR_FILTER = "false" #Censors swearing. Default: false
REPORTS_WEBHOOK="" #The webhook used for world and player reports. Default: (none)
SERVER_NAME="GoldenBedrock" #The name of your server. Default: "GoldenBedrock"
BLACKLISTED_USER_NAMES="quu98" #Disabled registrations for a particular player name, separated with |. example: "quu98|dev"
BLACKLISTED_WORLD_NAMES="breaworlds" #Disabled world registrations for a particular world name, separated with |. example: "tutorial|breaworlds|rewards"
RECOVERY_MAILER_SERVICE="gmail" #Service used for sending recovery emails. Default: gmail
RECOVERY_MAILER_EMAIL="" #Email used for the recovery mailer. Defailt: <blank>
RECOVERY_MAILER_DISPLAY_EMAIL="" #Email origin. Defailt: <blank>
RECOVERY_MAILER_PASSWORD="" #Password for the recovery mailer. Defailt: <blank>
```

Feel free to change these values as you wish. Player cap should be OK at larger values, I use 100 as a cap just to be safe.

## Frequently Asked Questions

**Q:** Why are you using such an old version when newer versions can be modified?

**A:** The build that I target (3.8.3) is one of the last builds that quu98 originally compiled before selling the game. 

**Q:** Will you ever target newer versions?

**A:** Probably not, only for the reason that I haven't really played those versions all that much. You can, however, fork this project and make the modifications yourself!

**Q:** Have you looked at the server source code leak that uses the exact same client version that you are targeting? Are you using it as a reference? 

**A:** I am aware of the 3.8.3 server source code and client being online. However, the code is so unreadable that it doesn't work that well as a reference. The only thing I have taken from it *(and the only thing i plan to take from it)* is the item listing. You wouldn't want to type out the information for 1,242 items right? As for the client, i've had it wayyyyy before it got leaked online.

## License

This project is under the [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.en.html).

## Legal Disclaimer

GoldenBedrock is an independent, private server project for the game *Breaworlds*. It is not affiliated with or endorsed by Bitdawn Studios, the developers of *Breaworlds*. All rights to the original game, including trademarks and intellectual property, belong to Bitdawn Studios.  

GoldenBedrock operates as a fan-driven initiative and is intended solely for private, non-commercial use. By using this server, users acknowledge that they understand and accept these terms. Any forks or derivatives of the GoldenBedrock server software are likewise independent and not endorsed by GoldenBedrock, Bitdawn Studios, or any affiliated parties. Users of such forks are solely responsible for their compliance with relevant terms and conditions.  

For inquiries, please contact: `contact [at] stuartt.ca`.  

This project is not responsible for any potential violations of Bitdawn Studios' terms of service by users. Users are advised to review and adhere to *Breaworlds*'s official policies.  