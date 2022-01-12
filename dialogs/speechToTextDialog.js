const fs = require('fs');
const http = require('https');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
var speechConfig = sdk.SpeechConfig.fromSubscription("68befe3c7508400196b3472c4a12ac66", "westeurope");
speechConfig.speechRecognitionLanguage = 'it-IT';
const sleep = require('util').promisify(setTimeout);


const {
    ActionTypes,
    ActivityTypes,
    CardFactory,
    ActivityHandler
} = require('botbuilder');

const {
    TextPrompt,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    WaterfallDialog,
    AttachmentPrompt
} = require('botbuilder-dialogs');

const axios = require('axios').default;

const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const ATT_PROMPT = 'ATT_PROMPT';
const SPEECHTOTEXT_DIALOG = 'SPEECHTOTEXT_DIALOG'
var value = null;


class SpeechToTextDialog extends ComponentDialog {
    constructor(userState) {
        super(SPEECHTOTEXT_DIALOG);

        this.userState = userState;
        this.addDialog(new AttachmentPrompt('ATT_PROMPT'));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.introStep.bind(this),
            this.speechToText.bind(this),
            this.finalStep.bind(this)
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

    async introStep(step) {

        return await step.prompt(ATT_PROMPT, {
            prompt: 'Dammi un file audio in input'
        });
    }  

    async speechToText(step) {
        
        const result = step.result;
       
        const attach = Object.values(result);
        for (const key in attach) {
            if (attach.hasOwnProperty(key)) {
                value = attach[key];        
            }
        }

       const message = await recognizeAudio(value);
        
      
        await step.context.sendActivity(message);   
}

            async finalStep(step) {
            return await step.endDialog();
        }

}


async function recognizeAudio(value) {

    let result;
    


    var pathAudio = value.contentUrl;
     
    console.log(pathAudio);

    result = await fromFile(pathAudio);
    result = await result();

    return result.text;

    async function fromFile(pathAudio) {

        const file = fs.createWriteStream("audioSpeech.wav");
        const request = http.get(pathAudio, function (response) {
            response.pipe(file);
        });

        let audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync("audioSpeech.wav"));

        let recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);



        const recognize = () => {
            return new Promise((resolve, reject) => {
                recognizer.recognizeOnceAsync(
                    (result) => {
                        if (result) resolve(result);
                    },
                    (err) => {
                        if (err) reject(err);
                    },
                );
            });
        };

        return recognize;
    }
    

/*
        switch (result.reason) {
            case sdk.ResultReason.RecognizedSpeech:
                console.log(`RECOGNIZED: Text=${result.text}`);
                textStampato = result.text; 
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

*/
    


}


module.exports.SpeechToTextDialog = SpeechToTextDialog;
module.exports.SPEECHTOTEXT_DIALOG = this.SPEECHTOTEXT_DIALOG;