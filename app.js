require('dotenv').config();
const { App } = require('@slack/bolt');
const { SLACK_APP_TOKEN, SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET } = process.env;

// Initializes your app with your bot token and signing secret
const app = new App({
    appToken: SLACK_APP_TOKEN,
    signingSecret: SLACK_SIGNING_SECRET,
    socketMode: true,
    token: SLACK_BOT_TOKEN,
});

async function findChannelId(name) {
    try {
        const result = await app.client.conversations.list();
        return result.channels.find(channel => channel.name === name).id;
    }
    catch (error) {
        console.error(error);
    }
}

async function postMessage(channelId) {
    try {
        // Call the chat.postMessage method using the WebClient
        const result = await app.client.chat.postMessage({
            channel: channelId,
            text: "Hello world"
        });

        console.log(result);
    }
    catch (error) {
        console.error(error);
    }
}

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
    const channelId = await findChannelId('slackathon');
    postMessage(channelId);
})();
