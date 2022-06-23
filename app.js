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

// Find conversation ID using the conversations.list method
async function findChannelId(name) {
    try {
        // Call the conversations.list method using the built-in WebClient
        const result = await app.client.conversations.list({
            // The token you used to initialize your app
            token: SLACK_BOT_TOKEN
        });

        for (const channel of result.channels) {
            if (channel.name === name) {
                return channel.id;
            }
        }
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
    // Start your app
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
})();

(async () => {
    // Find channel with a specified channel `name`
    const channelId = await findChannelId('slackathon');
    postMessage(channelId);
})();
