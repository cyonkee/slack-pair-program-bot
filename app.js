require('dotenv').config({ path: './config/.env' });
const { App } = require('@slack/bolt');
const { SLACK_APP_TOKEN, SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET } = process.env;
const channelsMap = require('./config/channel-user-map.json');
const buttonsMap = require('./config/buttons-map.json');

// Initializes your app with your bot token and signing secret
const app = new App({
    appToken: SLACK_APP_TOKEN,
    signingSecret: SLACK_SIGNING_SECRET,
    socketMode: true,
    token: SLACK_BOT_TOKEN,
});

const getChannelId = async (channelName) => {
    try {
        const { channels } = await app.client.conversations.list();
        return channels.find(channel => channel.name === channelName).id;
    }
    catch (error) {
        console.error(error);
    }
}

const getChannelMembers = async (channelId) =>  {
    try {
        const { members } = await app.client.conversations.members({ channel: channelId });
        return members;
    }
    catch (error) {
        console.error(error);
    }
}

const getUserIdByEmail = async (email) => {
    try {
        const { user } = await app.client.users.lookupByEmail({ email });
        return user.id;
    }
    catch (error) {
        console.error(error);
    }
}

const filterChannelMembers = async (channelMembers, excludedMemberEmails) => {
    try {
        const exludedUserIds = await Promise.all(excludedMemberEmails.map(async (email) => getUserIdByEmail(email)));
        return channelMembers.filter(member => !exludedUserIds.includes(member));
    }
    catch (error) {
        console.error(error);
    }
}

const getRandomMemberFromList = (members) => (members[Math.floor((Math.random() * members.length))]);

const getTwoRandomMembersFromList = (members) => {
    const member1 = getRandomMemberFromList(members);
    const remainingMembers = members.filter(member => member !== member1);
    const member2 = getRandomMemberFromList(remainingMembers);
    return [member1, member2];
}

const postMessage = async (channelId, channelMembers) => {
    try {
        const memberText = channelMembers.map(member => `<@${member}>`);
        const result = await app.client.chat.postMessage({
            channel: channelId,
            text: memberText
        });

        console.log(result);
    }
    catch (error) {
        console.error(error);
    }
}

const getButton = (buttonNumber) => {
    try {
        return button = buttonsMap[buttonNumber]
    } catch (error) {
        console.error(error);
    }
}

const showButton = async (channelId, buttonNumber) => {
    try {
        const result = await app.client.chat.postMessage(
            {
                channel: channelId,
                text: "The Coolest Button in the Universe",
                blocks: [getButton(buttonNumber)]
            }
        );
        console.log(result);
        app.action("radio_buttons-action", async ({ action, ack, respond }) => {
            await ack();
            console.log(action);
            await respond(`You chose: ${action.selected_option.value}`);

        });
    } catch (error) {
        console.log(error);
    }
}

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
    /*
    for (const channel of channelsMap) {
        const { slackChannelName, excludedMemberEmails } = channel;
        const channelId = await getChannelId(slackChannelName);
        const channelMembers = await getChannelMembers(channelId);
        const filteredChannelMembers = await filterChannelMembers(channelMembers, excludedMemberEmails);
        const selectedMembers = getTwoRandomMembersFromList(filteredChannelMembers);
        await postMessage(channelId, selectedMembers);
    }
    */
   await showButton(await getChannelId('slackathon'), 0);
})();
