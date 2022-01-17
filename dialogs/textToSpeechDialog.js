var sdk = require("microsoft-cognitiveservices-speech-sdk");
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
var fs = require('fs');
const AZURE_STORAGE_ENDPOINT = process.env.AzureStorageEndpoint;
const AZURE_STORAGE_TOKEN_SAS = process.env.TokenAzureStorageSAS;
const SPEECH_SERVICE_SUB_KEY = process.env.SpeechServiceSubscriptionKey;
const SPEECH_SERVICE_REGION = process.env.SpeechserviceRegion;



const {
    ComponentDialog,
	DialogSet,
	DialogTurnStatus,
	WaterfallDialog,
    TextPrompt,
} = require('botbuilder-dialogs');
const {
    BlobServiceClient
} = require('@azure/storage-blob');


ffmpeg.setFfmpegPath(path.join(__dirname.replace('dialogs', 'libs'), '/ffmpeg'));

const TEXTTOSPEECH_DIALOG = 'TEXTTOSPEECH_DIALOG';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const TEXT_PROMPT = 'TEXT_PROMPT';

//Variabili globali
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
            prompt: 'Inserisci un testo da convertire in audio:'
        });
    }

    async textToSpeechStep(step) {

        var text = step.result;
        let message = {};
        
        await syntethizeAudio(text,step); 
       
      
        const blobServiceClient = new BlobServiceClient(AZURE_STORAGE_ENDPOINT + AZURE_STORAGE_TOKEN_SAS);
          
            const containerName = 'public';
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(globalName);
        

            const blobOptions = {
                blobHTTPHeaders: {
                    blobContentType: 'audio/mp3'
                }
            };
            

        
        await blockBlobClient.uploadFile(globalLocalPath, blobOptions);

            console.log("Blob was uploaded successfully");


        message = {
            channelData : [
                {
                    method: 'sendAudio',
                    parameters: {
                        audio: `${AZURE_STORAGE_ENDPOINT}/public/${globalName}`,
                    },
                },
            ],
        };


        await step.context.sendActivity(message);
        
        
        await blockBlobClient.delete();

        await fs.unlinkSync(globalLocalPath);
    

        return await step.endDialog();


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

            await syn(text);


           const command = () => {
               return new Promise((resolve, reject) => {
                   ffmpeg(path.join(dir, 'message.wav'))
                       .outputOptions('-acodec libmp3lame')
                       .format('mp3')
                       .on('end', () => {
                           console.log("Conversione riuscita!");
                           resolve(path.join(dir, nomeFile + '.mp3'));
                       })
                       .on('error', (err) => {
                           console.log("Conversione non riuscita!");
                           reject();
                       })
                       .save(path.join(dir, nomeFile + '.mp3'));
               })
           }

           let pathSave = await command();

           const localName = nomeFile + '.mp3';

           globalLocalPath = pathSave;

           globalName = localName;

     

    }

module.exports.TextToSpeechDialog = TextToSpeechDialog;
module.exports.TEXTTOSPEECH_DIALOG = TEXTTOSPEECH_DIALOG;

