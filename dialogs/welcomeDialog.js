const {
    ActionTypes,
    ActivityTypes,
    CardFactory,
    MessageFactory,
    InputHints
} = require('botbuilder');

const { LuisRecognizer } = require('botbuilder-ai');

const { ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');

const {
    MAIN_DIALOG,
    MainDialog
} = require('./mainDialog');


const WELCOME_DIALOG = 'WELCOME_DIALOG';
const TEXT_PROMPT = 'TEXT_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';




class WelcomeDialog extends ComponentDialog {
    constructor(luisRecognizer, userState) {
        super(WELCOME_DIALOG);

        if (!luisRecognizer) throw new Error('[MainDialog]: Missing parameter \'luisRecognizer\' is required');
        this.luisRecognizer = luisRecognizer;
        this.userState = userState;

       
        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new MainDialog(this.luisRecognizer, this.userState));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.welcomeStep.bind(this)
        ]));
        this.initialDialogId = WATERFALL_DIALOG;
    }

    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async welcomeStep(step) {
        if (!this.luisRecognizer.isConfigured) {
            const messageText = 'NOTE: LUIS is not configured. To enable all capabilities, add `LuisAppId`, `LuisAPIKey` and `LuisAPIHostName` to the .env file.';
            await step.context.sendActivity(messageText, null, InputHints.IgnoringInput);
            return await step.next();
        }


        var testo = "Con questo bot potrai svolgere diverse funzionalita, tra cui quelle di:" +
            "\n\n🔹SpeechToText per poter tradurre un file audio in testo." +
            "\n\n🔹TextToSpeech per poter tradurre un file testuale in audio." +
            "\n\n🔹Translate per poter tradurre il testo in un \' altra lingua." +
            "\n\n🔹ComputerVision per poter estrarre del testo da un\'immagine a tua scelta."

        var card = CardFactory.thumbnailCard(
            'Benvenuto, sono HearForYouBot!🤖',
            [{ url: 'https://i.postimg.cc/432NmVwd/Hear-For-You-Logo.png' }],
            [],
            {

                text: testo
                //text: 'Sono a tua completa disposizione! Con questo bot potrai svolgere diverse funzionalita, tra cui quelle di SpeechToText per poter tradurre un file audio in testo e viceversa, di Translate per poter tradurre il testo in un \' altra lingua, di ComputerVision per poter estrarre del testo da un \'immagine a tua scelta'
            }
        );

        await step.context.sendActivity({ attachments: [card] });


        return await step.beginDialog(MAIN_DIALOG);
    }
}
module.exports.WelcomeDialog = WelcomeDialog;
module.exports.WELCOME_DIALOG = WELCOME_DIALOG;