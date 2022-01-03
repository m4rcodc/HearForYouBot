const fs = require('fs');
const path = require('path');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const speechConfig = sdk.SpeechConfig.fromSubscription("68befe3c7508400196b3472c4a12ac66", "westeurope");
speechConfig.speechRecognitionLanguage = "it-IT";
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
    ThisMemoryScope,
    AttachmentPrompt
} = require('botbuilder-dialogs');

const axios = require('axios').default;
const { SimpleSpeechPhrase } = require('microsoft-cognitiveservices-speech-sdk/distrib/lib/src/common.speech/Exports');

const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const ATT_PROMPT = 'ATT_PROMPT';
const SPEECHTOTEXT_DIALOG = 'SPEECHTOTEXT_DIALOG'
var value = null;
var textStampato = null;


class SpeechToTextDialog extends ComponentDialog {
    constructor(userState) {
        super(SPEECHTOTEXT_DIALOG);

        this.userState = userState;
        this.addDialog(new AttachmentPrompt('ATT_PROMPT'));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.introStep.bind(this),
            this.speechToText.bind(this)
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
        console.log(result);
        const attach = Object.values(result);
        console.log(attach);
        for (const key in attach) {
            if (attach.hasOwnProperty(key)) {
                value = attach[key];
                console.log(value.name);
        
            }
        }

        downloadAttachmentAndWrite(value);
        fromFile();
        await sleep(10000);
        await step.context.sendActivity(textStampato);
        
    
}
}

    
 async function fromFile() {
    const localAudioPath = __dirname + '\\' + value.name ;
    let audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(localAudioPath));
    let recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizeOnceAsync(result => {
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
    });
}

 async function downloadAttachmentAndWrite(attachment) {
    // Retrieve the attachment via the attachment's contentUrl.
    const url = attachment.contentUrl;

    // Local file path for the bot to save the attachment.
    const localFileName = path.join(__dirname, attachment.name);

    try {
        // arraybuffer is necessary for images
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        // If user uploads JSON file, this prevents it from being written as "{"type":"Buffer","data":[123,13,10,32,32,34,108..."
        /*if (response.headers['content-type'] === 'application/json') {
            response.data = JSON.parse(response.data, (key, value) => {
                return value && value.type === 'Buffer' ? Buffer.from(value.data) : value;
            });
        }*/
        fs.writeFile(localFileName, response.data, (fsError) => {
            if (fsError) {
                throw fsError;
            }
        });
    } catch (error) {
        console.error(error);
        return undefined;
    }
    // If no error was thrown while writing to disk, return the attachment's name
    // and localFilePath for the response back to the user.
    return {
        fileName: attachment.name,
        localPath: localFileName
    };
}

module.exports.SpeechToTextDialog = SpeechToTextDialog;
module.exports.SPEECHTOTEXT_DIALOG = this.SPEECHTOTEXT_DIALOG;