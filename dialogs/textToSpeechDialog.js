var sdk = require("microsoft-cognitiveservices-speech-sdk");
var readline = require("readline");
const {v4: uuid} = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const sleep = require('util').promisify(setTimeout);
const Bluebird = require('bluebird');
var fs = require('fs');
const AZURE_STORAGE_ENDPOINT = process.env.AzureStorageEndpoint;
const AZURE_STORAGE_TOKEN_SAS = process.env.TokenAzureStorageSAS;
const SPEECH_SERVICE_SUB_KEY = process.env.SpeechServiceSubscriptionKey;
const SPEECH_SERVICE_REGION = process.env.SpeechserviceRegion;


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
        
        await syntethizeAudio(text,step); 
       
      
        const blobServiceClient = new BlobServiceClient(AZURE_STORAGE_ENDPOINT + AZURE_STORAGE_TOKEN_SAS);
          
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
                        audio: `${AZURE_STORAGE_ENDPOINT}/public/${globalName}`
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

           var speechConfig = sdk.SpeechConfig.fromSubscription(SPEECH_SERVICE_SUB_KEY, SPEECH_SERVICE_REGION);

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

