const fs = require('fs');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const speechConfig = sdk.SpeechConfig.fromSubscription("68befe3c7508400196b3472c4a12ac66", "westeurope");
speechConfig.speechRecognitionLanguage = "it-IT";

const {
    ActionTypes,
    ActivityTypes,
    CardFactory,
    ActivityHandler
} = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const {
    TextPrompt,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    WaterfallDialog,
    ThisMemoryScope,
} = require('botbuilder-dialogs');

const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const TEXT_PROMPT = 'TEXT_PROMPT';
const SPEECHTOTEXT_DIALOG = 'SPEECHTOTEXT_DIALOG'

class SpeechToTextDialog extends ComponentDialog {
    constructor(userState) {
        super(SPEECHTOTEXT_DIALOG);

        this.userState = userState;
        this.addDialog(new TextPrompt('TEXT_PROMPT'));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.introStep.bind(this),
            this.speechToText.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG
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

    async introStep(step) {

        return await step.prompt(TEXT_PROMPT, {
            prompt: 'Dammi un file audio in input'
        });
    }

    async speechToText(step) {
        console.log("Sono qui nel metodo");
        const resultFile = step.result;
            
        function fromFile() {
            let audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync("./regIta.wav"));
            let recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

            recognizer.recognizeOnceAsync(result => {
                switch (result.reason) {
                    case sdk.ResultReason.RecognizedSpeech:
                        console.log(`RECOGNIZED: Text=${result.text}`);
                        recognizer.close();
                        break;
                    case sdk.ResultReason.NoMatch:
                        console.log("NOMATCH: Speech could not be recognized.");
                        break;
                    case sdk.ResultReason.Canceled:
                        const cancellation = CancellationDetails.fromResult(result);
                        console.log(`CANCELED: Reason=${cancellation.reason}`);

                        if (cancellation.reason == sdk.CancellationReason.Error) {
                            console.log(`CANCELED: ErrorCode=${cancellation.ErrorCode}`);
                            console.log(`CANCELED: ErrorDetails=${cancellation.errorDetails}`);
                            console.log("CANCELED: Did you update the key and location/region info?");
                        }
                        break;
                }
                recognizer.close();
            });
        }
        fromFile();
    
}
}

module.exports.SpeechToTextDialog = SpeechToTextDialog;
module.exports.SPEECHTOTEXT_DIALOG = this.SPEECHTOTEXT_DIALOG;