var sdk = require("microsoft-cognitiveservices-speech-sdk");
var readline = require("readline");
const {v4: uuid} = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
var subscriptionKey = "68befe3c7508400196b3472c4a12ac66";
var serviceRegion = "westeurope";
const sleep = require('util').promisify(setTimeout);
const Bluebird = require('bluebird');
var fs = require('fs');

//const serverUrl = 'https://hearforyoubot.azurewebsites.net';




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
const { getEnvironmentData } = require("worker_threads");
const {
    BlobServiceClient
} = require('@azure/storage-blob');


ffmpeg.setFfmpegPath(path.join(__dirname.replace('dialogs', 'libs'), '/ffmpeg.exe'));

const TEXTTOSPEECH_DIALOG = 'TEXTTOSPEECH_DIALOG';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const TEXT_PROMPT = 'TEXT_PROMPT';

//Variabili globali
var text = null;
var nomeFile = '';
var globalName = "";
var globalLocalPath = "";

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
        
        await syntethizeAudio(text,step); //la return di questo metodo non funziona, restituisce sempre undefined
       
      
        const blobServiceClient = new BlobServiceClient(
            'https://hearforyoustorage.blob.core.windows.net/?sv=2020-08-04&ss=bfqt&srt=sco&sp=rwdlacupitfx&se=2022-12-10T03:16:34Z&st=2022-01-10T19:16:34Z&spr=https&sig=yZh2v9l0IbVt8wE5jcteyrpnw5PKyME6mzDm8jHvvDQ%3D'          
            );
          
            const containerName = 'public';
            const containerClient = blobServiceClient.getContainerClient(containerName);
            //const createContainerResponse = await containerClient.create();
            const blockBlobClient = containerClient.getBlockBlobClient(globalName);


            const blobOptions = {
                blobHTTPHeaders: {
                    blobContentType: 'audio/mp3'
                }
            };
            
            
            await blockBlobClient.uploadFile(globalLocalPath, blobOptions);
           

            console.log("Blob was uploaded successfully");

            console.log('\nListing blobs...');

        message = {
            channelData : [
                {
                    method: 'sendAudio',
                    parameters: {
                        audio: `https://hearforyoustorage.blob.core.windows.net/public/${globalName}`
                        //voice: `${process.env.SERVER_URL}/public/${audioName}`
                        
                    },
                },
            ],
        };
        await step.context.sendActivity(message);

        return step.endDialog();


    }

}

       async function syntethizeAudio(text,step){

        var audioConfig = sdk.AudioConfig.fromAudioFileOutput(path.join(__dirname.replace('dialogs','bots'),'/audio/', 'message.wav'));

        var speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);

        var synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
        
       

        const dir = path.join(__dirname.replace('dialogs','bots'), '/audio/');

       
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

        
        //const id = uuid();

           function promisifyCommand(command) {
               return Bluebird.Promise.promisify((cb) => {
                   command
                       .on('end', () => {
                           cb(null);
                       })
                       .on('error', (err) => {
                           cb(err);
                       })
                       .save(path.join(dir, nomeFile + '.mp3'));
               });
           }


        await syn(text);


           const command = ffmpeg(path.join(dir, 'message.wav'))
               .outputOptions('-acodec libmp3lame')
               .format('mp3');
              
           await promisifyCommand(command)();

       
           console.log(dir + " " + nomeFile);


           const localPath = path.join(dir, nomeFile + '.mp3');

           const localName = nomeFile + '.mp3';

           globalLocalPath = localPath;

           globalName = localName;

     

    }

module.exports.TextToSpeechDialog = TextToSpeechDialog;
module.exports.TEXTTOSPEECH_DIALOG = TEXTTOSPEECH_DIALOG;

