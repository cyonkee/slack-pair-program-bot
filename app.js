require('dotenv').config({ path: './config/.env' });
const { App } = require('@slack/bolt');
const { SLACK_APP_TOKEN, SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET } = process.env;
const channelsMap = require('./config/channel-user-map.json');

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

const getChannelMembers = async (channelId) => {
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
    const member0 = getRandomMemberFromList(members);
    const remainingMembers = members.filter(member => member !== member0);
    const member1 = getRandomMemberFromList(remainingMembers);
    return [member0, member1];
}

const postTitleMessage = async (channelId, selectedMembers) => {
    try {
        await app.client.chat.postMessage(
            {
                channel: channelId,
                text: 'Time for pair programming!',
                blocks: [
                    {
                        type: 'section',
                        block_id: 'titleMessage',
                        text: {
                            type: 'mrkdwn',
                            text: `Hello, <@${selectedMembers[0]}> & <@${selectedMembers[1]}> would you like to pair today?`
                        }
                    },
                    {
                        type: 'divider',
                        block_id: 'divider'
                    }
                ]
            }
        );
    } catch (error) {
        console.log(error);
    }
}

const postWhatSayYouMessages = async (channelId, selectedMembers) => {
    try {
        await app.client.chat.postMessage(
            {
                channel: channelId,
                text: 'Time for pair programming!',
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `What say you, <@${selectedMembers[0]}>?`
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `What say you, <@${selectedMembers[1]}>?`
                        }
                    },
                ]
            }
        );
    } catch (error) {
        console.log(error);
    }
}

const postEphemeralMessages = async (channelId, selectedMembers) => {
    await postEphemeralMessage(channelId, selectedMembers, 0);
    await postEphemeralMessage(channelId, selectedMembers, 1);
}

const postEphemeralMessage = async (channelId, selectedMembers, i) => {
    try {
        await app.client.chat.postEphemeral(
            {
                channel: channelId,
                user: selectedMembers[i],
                text: 'Time for pair programming!',
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*<@${selectedMembers[i]}>*`
                        },
                        accessory: {
                            type: 'radio_buttons',
                            options: [
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: 'Sure!',
                                        emoji: true
                                    },
                                    value: `user${i}-yes`
                                },
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: `Can't today :slightly_frowning_face:`,
                                        emoji: true
                                    },
                                    value: `user${i}-no`
                                }
                            ],
                            action_id: `radio_buttons-action-user${i}`
                        }
                    },
                ]
            }
        );
    } catch (error) {
        console.log(error);
    }
}

const registerActionListeners = (channelId, selectedMembers) => {
    registerActionListener(channelId, selectedMembers, 0);
    registerActionListener(channelId, selectedMembers, 1);
}

const registerActionListener = (channelId, selectedMembers, i) => {
    try {
        // TODO:
        // add schedule for pair bot
        // deploy on AWS
        // update the env tokens, channels, exclusions, etc.
        // expose http url
        // stretch goals: add time, availability, gcal integration
        
        app.action(`radio_buttons-action-user${i}`, async ({ ack, action, respond }) => {
            await ack();
            if (action.selected_option.value === `user${i}-no`) {
                await respond({ delete_original: true});
                await postRejectionMessage(channelId, selectedMembers[i]);
                
            }
            if (action.selected_option.value === `user${i}-yes`) {
                await respond({ delete_original: true});
                await postSuccessMessage(channelId, selectedMembers[i]);
            }
        });
    } catch (error) {
        console.log(error);
    }
}

const postSuccessMessage = async (channelId, selectedMember) => {
    try {
        await app.client.chat.postMessage(
            {
                channel: channelId,
                text: `<@${selectedMember}> is available to pair! :white_check_mark:`,
            }
        );
    } catch (error) {
        console.log(error);
    }
}

const postRejectionMessage = async (channelId, selectedMember) => {
    try {
        await app.client.chat.postMessage(
            {
                channel: channelId,
                text: `<@${selectedMember}> is unavailable to pair :slightly_frowning_face:`,
            }
        );
    } catch (error) {
        console.log(error);
    }
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
        await postTitleMessage(channelId, selectedMembers);
        await postWhatSayYouMessages(channelId, selectedMembers);
        await postEphemeralMessages(channelId, selectedMembers);
        registerActionListeners(channelId, selectedMembers);
    }
})();
