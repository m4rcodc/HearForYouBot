const fs = require('fs');
const http = require('https');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const SPEECH_SERVICE_SUB_KEY = process.env.SpeechServiceSubscriptionKey;
const SPEECH_SERVICE_REGION = process.env.SpeechserviceRegion;
const sleep = require('util').promisify(setTimeout);
const CLOUDCONVERT_API_KEY = process.env.CloudConvertApiKey;
var CloudConvert = require('cloudconvert');
cloudConvert = new CloudConvert(CLOUDCONVERT_API_KEY);
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
            prompt: 'Dammi un file audio in input:'
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

        console.log(value);
       const message = await recognizeAudio(value);
        
      
        await step.context.sendActivity(message);
        return await step.endDialog();
}

          

}


async function recognizeAudio(value) {

    let result;
    var fileName;

    const pathAudio = value.contentUrl;

    console.log(pathAudio);

    result = await fromFile(pathAudio);
    result = await result();

    fs.unlinkSync(fileName);

    return result.text;

    async function fromFile(pathAudio) {

        let job = await cloudConvert.jobs.create({
            "tasks": {
                "import-1": {
                    "operation": "import/url",
                    "url": pathAudio
                },
                "task-1": {
                    "operation": "convert",
                    "input": [
                        "import-1"
                    ],
                    "output_format": "wav"
                },
                "export-1": {
                    "operation": "export/url",
                    "input": [
                        "task-1"
                    ],
                    "inline": false,
                    "archive_multiple_files": false
                }
            },
            "tag": "jobbuilder"
        });

        job = await cloudConvert.jobs.wait(job.id);

        const exportTask = job.tasks.filter(task => task.operation === 'export/url' && task.status === 'finished')[0];
        const file = exportTask.result.files[0];

        const writeStream = fs.createWriteStream(file.filename);

        http.get(file.url, function (response) {
            response.pipe(writeStream);
        });

        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });


        let audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(file.filename));

        var speechConfig = sdk.SpeechConfig.fromSubscription(SPEECH_SERVICE_SUB_KEY, SPEECH_SERVICE_REGION);
        speechConfig.speechRecognitionLanguage = 'it-IT';

        let recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

        fileName = file.filename;
        


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
    

    


}


module.exports.SpeechToTextDialog = SpeechToTextDialog;
module.exports.SPEECHTOTEXT_DIALOG = this.SPEECHTOTEXT_DIALOG;