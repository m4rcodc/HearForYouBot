var sdk = require("microsoft-cognitiveservices-speech-sdk");
var readline = require("readline");
const {v4: uuid} = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const Bluebird = require('bluebird');
//import * as Bluebird from 'bluebird';
var subscriptionKey = "68befe3c7508400196b3472c4a12ac66";
var serviceRegion = "westeurope";
const sleep = require('util').promisify(setTimeout);
var fs = require('fs');

const serverUrl = 'https://hearforyoubot.azurewebsites.net';

//const cloudconvert = new require('cloudconvert');


const {
    ActionTypes,
	CardFactory,
	StatePropertyAccessor,
	TurnContext,
	UserState,
} = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const {
    ComponentDialog,
	DialogSet,
	DialogState,
	DialogTurnStatus,
	WaterfallDialog,
	WaterfallStepContext,
    TextPrompt,
    ThisMemoryScope
} = require('botbuilder-dialogs');
const { ActivityReceivedEventArgs } = require("microsoft-cognitiveservices-speech-sdk");



ffmpeg.setFfmpegPath(path.join(__dirname.replace('dialogs', 'libs'), '/ffmpeg.exe'));

const TEXTTOSPEECH_DIALOG = 'TEXTTOSPEECH_DIALOG';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const TEXT_PROMPT = 'TEXT_PROMPT';

var text = null;
var nomeFile = '';
var localAudioPath = '';
var localPath = '';
var localName = '';
var globalName = "";
class TextToSpeechDialog extends ComponentDialog {
    constructor(userState) {
        super(TEXTTOSPEECH_DIALOG);

        this.userState = userState;
        this.addDialog(new TextPrompt('TEXT_PROMPT'));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.askForNameFile.bind(this),
            this.gestioneFileAudio.bind(this),
            this.introStep.bind(this),
            this.textToSpeechStep.bind(this),
            //this.getUploadedAttachment.bind(this),
            //this.finalStep.bind(this)
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


    async askForNameFile(step) {

           return await step.prompt(TEXT_PROMPT, {
                prompt: 'Come vuoi chiamare il file audio?'
            });
    }

    async gestioneFileAudio(stepContext) {

             nomeFile = stepContext.result;
             return await stepContext.next();

    }

    async introStep(step) {

        return await step.prompt(TEXT_PROMPT, {
            prompt: 'Inserisci un testo da convertire in audio'
        });
    }

    async textToSpeechStep(step) {
        text = step.result;
        let message = {};
        

        await syntethizeAudio(text, step); //la return di questo metodo non funziona, restituisce sempre undefined
        step.context.sendActivity("after syntethize audio");
      
        // console.log("globalaudioname" + globalName);
       // await sleep(10000);
       // step.context.sendActivity(__dirname);
        message = {
            channelData : [
                {
                    method: 'sendAudio',
                    parameters: {
                        audio: 'https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_1MG.mp3',
                        //voice: `${process.env.SERVER_URL}/public/${audioName}`
                        //test su file da internet
                        //https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_1MG.mp3
                    },
                },
            ],
        };

        await step.context.sendActivity(message);


    
    }

}

       async function syntethizeAudio(text,step){

        var audioConfig = sdk.AudioConfig.fromAudioFileOutput(path.join(__dirname.replace('dialogs','bots'),'/audio/', 'message.wav'));

        var speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);

        var synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

        step.context.sendActivity("sono qui");

        const dir = path.join(__dirname.replace('dialogs','bots'), '/audio/');

        console.log("Sono qui");
        const syn = (text) => {
             return new Promise((resolve,reject) => { 
                    synthesizer.speakSsmlAsync(
                        `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US"><voice name="it-IT-IsabellaNeural"><mstts:express-as style="customerservice"><prosody rate="-10%" pitch="0%">
                                                ${text}
                                            </prosody>
                                            </mstts:express-as>
                                            </voice>
                                            </speak>`,                                  
                        (result) => {
                            if (result) {
                                resolve(result);    
                            }
                            synthesizer.close();
                        
                        },
                            (err) => {
                                if (err) {
                                    reject(err);
                            }
                            
                            synthesizer.close();
                            },

                      );

                 });

              };

/*
           function promisifyCommand(command, name) {
               return Bluebird.Promise.promisify((cb) => {
                   command.on('end', () => {
                       cb(null);
                   })
                       .on('error', (err) => {
                           cb(err);
                       })
                       .save(path.join(dir, name + '.mp3'));
               });
           }
*/
        
        //const id = uuid();

        await syn(text);
        
        const command = ffmpeg(path.join(dir,'message.wav'))
                        .outputOptions('-acodec libmp3lame')
               .format('mp3');

           step.context.sendActivity("after command");
         //  await promisifyCommand(command, nomeFile)();

           step.context.sendActivity("after promisifycommand");

        //fs.unlink(path.join(dir,nomeFile), () => {}); metodo per rimuovere il file audio
        localPath = path.join(dir,nomeFile + '.mp3');
        localName = nomeFile + '.mp3';
           fs.unlink(path.join(dir, 'message.wav'), () => { });

           step.context.sendActivity("before return final");
           globalName = localName;
        return {localName};

    }

module.exports.TextToSpeechDialog = TextToSpeechDialog;
module.exports.TEXTTOSPEECH_DIALOG = TEXTTOSPEECH_DIALOG;

