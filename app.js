require('dotenv').config({ path: './config/.env' });
const { App } = require('@slack/bolt');
const { SLACK_APP_TOKEN, SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET } = process.env;
const channelsMap = require('./config/channel-user-map.json');
const blocksMap = require('./config/blocks-map.json');

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
        const excludedUserIds = await Promise.all(excludedMemberEmails.map(async (email) => getUserIdByEmail(email)));
        return channelMembers.filter(member => !excludedUserIds.includes(member));
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

const postMessageBlocks = async (channelId, selectedMembers) => {
    try {
        const configuredBlocks = mapSelectedMembersToBlocks(selectedMembers);
        const result = await app.client.chat.postMessage(
            {
                channel: channelId,
                text: "Time for pair programming!",
                blocks: configuredBlocks
            }
        );
        console.log(result);

        // TODO:
            // check if correct user responded
                // if not then { say } (with witty snark)
            // If rejection then { respond } (with witty snark)
            // If approval then { say } (user accepted, what say you other user?)
                // try to hide those buttons
            // figure out if we can use sockets?
                // if not then do we need a exposed http url?
            // deploy on AWS or Heroku depending on devops questions
            // install the app on TS workspace
            // update the env tokens, channels, exclusions, etc.
            // stretch goals: add time, availability, gcal integration

        app.action("radio_buttons-action-user1", async (msg) => {
            await msg.ack();
            await msg.respond(`You chose: ${msg.action.selected_option.value}`);
        });
        app.action("radio_buttons-action-user2", async (msg) => {
            await msg.ack();
            await msg.respond(`You chose: ${msg.action.selected_option.value}`);
        });
    } catch (error) {
        console.log(error);
    }
}

const mapSelectedMembersToBlocks = (selectedMembers) => {
    return blocksMap.map((block) => {
        if (block.block_id === 'titleMessage') {
            return {
                ...block,
                text: {
                    ...block.text,
                    text: `Hello there! <@${selectedMembers[0]}> & <@${selectedMembers[1]}>, would you like to pair today?`
                }
            }
        }
        if (block.block_id === 'user1Radios') {
            return {
                ...block,
                text: {
                    ...block.text,
                    text: `*<@${selectedMembers[0]}>*`
                }
            }
        }
        if (block.block_id === 'user2Radios') {
            return {
                ...block,
                text: {
                    ...block.text,
                    text: `*<@${selectedMembers[1]}>*`
                }
            }
        }
        return block;
    });
}

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
    for (const channel of channelsMap) {
        const { slackChannelName, excludedMemberEmails } = channel;
        const channelId = await getChannelId(slackChannelName);
        const channelMembers = await getChannelMembers(channelId);
        const filteredChannelMembers = await filterChannelMembers(channelMembers, excludedMemberEmails);
        const selectedMembers = getTwoRandomMembersFromList(filteredChannelMembers);
        await postMessageBlocks(channelId, selectedMembers);
    }
})();
