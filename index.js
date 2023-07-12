const { Client, Events, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const config = require("./config.json");

const catId = config.categoryId; // category to target for duplicates (releases)
const chanId = config.channelIds; // channels to target for duplicates outside of category (creation-tips)
const ignoreId = config.ignoreIds; // channels to ignore completely (Program release updates)
const imgChanId = config.imgChanId; // channels to delete non image/link posts (inspiration)
const self = config.selfId;

client.on(Events.ClientReady, c => {
  console.log(`${c.user.tag} is ready!`);
});

client.on(Events.MessageCreate, async message => {
  if (message.author.id == self) {
    return;
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
      message.channel.send(`${message.author} Please only post links or images. This message will self distruct in 1 minute.`)
      .then(msg => {
        console.log(`Deleted message from "${message.author.username}" in "${message.channel.name}" and sent warning`);
        setTimeout(() => msg.delete(), 5*1000)
      })
    }
  }

});

client.login(config.token)