const { ActivityHandler,ActivityTypes } = require('botbuilder');
const { CardFactory } = require('botbuilder');
//const WelcomeCard = require('./resources/welcomeCard.json');

class DialogBot extends ActivityHandler {
    /**
     *
     * @param {ConversationState} conversationState
     * @param {UserState} userState
     * @param {Dialog} dialog
     */
    constructor(conversationState, userState, dialog) {
        super();
        if (!conversationState) throw new Error('[DialogBot]: Missing parameter. conversationState is required');
        if (!userState) throw new Error('[DialogBot]: Missing parameter. userState is required');
        if (!dialog) throw new Error('[DialogBot]: Missing parameter. dialog is required');

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.dialogState = this.conversationState.createProperty('DialogState');

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    const reply = {
                        type: ActivityTypes.Message
                    };
                    var card = CardFactory.thumbnailCard(
                        'Benvenuto, sono HearForYouBot!',
                        [{
                            url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtB3AwMUeNoq4gUBGe6Ocj8kyh3bXa9ZbV7u1fVKQoyKFHdkqU"
                        }],
                        [],
                        {
                            text: 'Sono a tua completa disposizione! Con questo bot potrai svolgere diverse funzionalità, tra cui quelle di SpeechToText per poter tradurre un file audio in testo e viceversa, di Translate per poter tradurre il testo in un \' altra lingua, di ComputerVision per poter estrarre del testo da un \'immagine a tua scelta',
                        }
                    );
                    reply.attachments = [card];
                    await context.sendActivity(reply);
                    await dialog.run(context, this.dialogState);
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMessage(async (context, next) => {
            console.log('Running dialog with Message Activity.');

            // Run the Dialog with the new message Activity.
            await this.dialog.run(context, this.dialogState);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    /**
     * Override the ActivityHandler.run() method to save state changes after the bot logic completes.
     */
    async run(context) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }
}

module.exports.DialogBot = DialogBot;
