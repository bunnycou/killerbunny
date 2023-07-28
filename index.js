const { Client, Events, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const config = require("./config.json");

const catId = config.categoryId; // category to target for duplicates (releases)
const chanId = config.channelIds; // channels to target for duplicates outside of category (creation-tips)
const ignoreId = config.ignoreIds; // channels to ignore completely (Program release updates)
const imgChanId = config.imgChanId; // channels to delete non image/link posts (inspiration)
const self = config.selfId; // self
const cmdChan = config.cmdChan; // channel to check for commands
const prefix = config.prefix; // prefix for commands
const riotKey = config.riotKey;

// match v5 endpoint
const API_AMERICAS = "https://americas.api.riotgames.com/lol/match/v5/matches/"
const API_ASIA = "https://asia.api.riotgames.com/lol/match/v5/matches/"
const API_EUROPE = "https://europe.api.riotgames.com/lol/match/v5/matches/"
const API_SEA = "https://sea.api.riotgames.com/lol/match/v5/matches/"
// match id prefixes
const AMERICAS_PRE = ["NA1", "BR1", "LA1", "LA2"];
const ASIA_PRE = ["KR", "JP1"];
const EUROPE_PRE = ["EUN1", "EUW1", "TR1", "RU"];
const SEA_PRE = ["OC1", "PH2", "SG2", "TH2", "TW2", "VN2"];

class lolPlayer {
  constructor(name, level, role, champ) {
    this.name = name;
    this.level = level;
    this.role = role;
    this.champ = champ;
  }
}

async function checkGame(id, api, pre) {
  let url = api + pre + "_" + id + "?api_key=" + riotKey;
  const getGame = await fetch(url);
  if (getGame.ok) {
    let data = await getGame.json();
    return data;
  } else {
    return "err";
  }
}

function game2txt(game) {
  let info = game.info;
  let metadata = game.metadata;
  let blue = new Array();
  let red = new Array();
  let time = new Date(info.gameCreation).toUTCString();
  let version = info.gameVersion;

  let text = "## MatchID: " + metadata.matchId;
  text += "\n### Date: " + time + " | Version: " + version;

  for (part in info.participants) {
    part = info.participants[part];
    newPlayer = new lolPlayer(part.summonerName, part.summonerLevel, part.teamPosition, part.championName)
    if (part.teamId == 100) {
      blue.push(newPlayer);
    } else {
      red.push(newPlayer);
    }
  }

  text += "\n## Blue Team"
  for (player in blue) {
    player = blue[player];
    text += "\n" + player.name + ", lvl " + player.level + ", playing " + player.champ + " in " + player.role;
  }
  text += "\n## Red Team"
  for (player in red) {
    player = red[player];
    text += "\n" + player.name + ", lvl " + player.level + ", playing " + player.champ + " in " + player.role;
  }

  text += "\n### *if this match is against lvl 1 bots and is the reason for the ban, then it is likely a botted account*"
  text += "\n### *Riot has started banning more bot accounts, this is not modding related*"
  return text;

}

// for command "game"
async function processGameId(id, channel) { // find a match and then send a message with info
  let info = "No Game Found for " + id;
  
  if (id.indexOf("_") != -1) { // force check all regions because we expect users to only have the gameid
    id = id.split("_")[1]
  }

  for (pre in AMERICAS_PRE) {
    let game = await checkGame(id, API_AMERICAS, AMERICAS_PRE[pre]);
    if (game != "err") {
      info = game2txt(game);
    }
  }

  for (pre in EUROPE_PRE) {
    let game = await checkGame(id, API_EUROPE, EUROPE_PRE[pre]);
    if (game != "err") {
      info = game2txt(game);
    }
  }

  for (pre in SEA_PRE) {
    let game = await checkGame(id, API_SEA, SEA_PRE[pre]);
    if (game != "err") {
      info = game2txt(game);
    }
  }

  for (pre in ASIA_PRE) {
    let game = await checkGame(id, API_ASIA, ASIA_PRE[pre]);
    if (game != "err") {
      info = game2txt(game);
    }
  }

  channel.send(info);

} 

client.on(Events.ClientReady, c => {
  console.log(`${c.user.tag} is ready!`);
});

client.on(Events.MessageCreate, async message => {
  if (message.author.id == self) {
    return;
  }

  if (message.channelId == cmdChan) {
    if (message.content.startsWith(prefix)) {
      let args = message.content.split(" "); // arg 0 is prefix, arg 1 is command, all following args are cmd args
        if (args[1] == "game") {
          console.log("Checking Game ID: " + args[2]);
          message.channel.sendTyping();
          processGameId(args[2], message.channel);
        }

      return; // no further processing
    }
  }

  let dupecheck = false;
  let imgcheck = false;

  // conditions to trigger check
  if (message.channel.parentId == catId){
    dupecheck = true;
  } else if (chanId.includes(message.channelId)) {
    dupecheck = true;
  }
  if (imgChanId.includes(message.channelId)) {
    imgcheck = true;
  }

  if (ignoreId.includes(message.channelId)) {
    dupecheck = false;
  }

  // check message
  if (dupecheck) {
    message.channel.messages.fetch({ limit:2 }).then(messages => {
      if (messages.size < 2) {
          console.log(`Channel "${message.channel.name}" only has one message`);
      } else if (messages.at(0).content == messages.at(1).content) {
          message.delete();
          console.log(`Deleted message from "${message.author.username}" in "${message.channel.name}" at ${message.createdAt}`);
      }
    })
  }

  if (imgcheck) {
    if (message.content.includes("http")) return;
    if (message.attachments.size == 0) {
      message.delete();
      message.channel.send(`${message.author} Please only send messages containing a mod concept (image or link). Do not discuss concepts here. This message will self destruct in 1 minute.`)
      .then(msg => {
        console.log(`Deleted message from "${message.author.username}" in "${message.channel.name}" and sent warning`);
        setTimeout(() => msg.delete(), 5*1000)
      })
    }
  }

});

client.login(config.token)