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

const serverUrl = 'https://api.telegram.org/5016576261:AAGSlXURwpLqmXOCV-zccYrykqk4mZ85Hak';

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
        
        const { dir, audioName} = await syntethizeAudio(text,)
        
        message = {

            text: 'Eccoti il tuo audio',
            "channelDat" : [
                {
                    method: 'sendVoice',
                    parameters: {
                         voice: `${serverUrl}/public/${audioName}`,
                        //voice: `${process.env.SERVER_URL}/public/${audioName}`
                    },
                },
            ],
        };

        await step.context.sendActivity(message);


        /*localAudioPath = "." + '\\' + nomeFile;
        console.log(localAudioPath);
         var audioConfig = sdk.AudioConfig.fromAudioFileOutput(path.join(__dirname.replace('dialog','bot'),'/audio/',nomeFile),
         );
         var speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
     
        const dir = path.join(__dirname.replace('dialog','bot'),'/audio');

         var synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
     

         synthesizer.speakSsmlAsync(
             `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US"><voice name="it-IT-IsabellaNeural"><mstts:express-as style="customerservice"><prosody rate="-10%" pitch="0%">
                                         ${text}
                                     </prosody>
                                     </mstts:express-as>
                                     </voice>
                                     </speak>`,                                  
             function (result) {
                 if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                   console.log("synthesis finished.");
                 } else {
                   console.error("Speech synthesis canceled, " + result.errorDetails +
                       "\nDid you update the subscription info?");
                 }
                 synthesizer.close();
                 synthesizer = undefined;
               },
     
               function (err) {
                 console.trace("err - " + err);
                 synthesizer.close();
                 synthesizer = undefined;
               });

               return await stepContext.next();
*/
    }

}

       async function syntethizeAudio(text){

        var audioConfig = sdk.AudioConfig.fromAudioFileOutput(path.join(__dirname.replace('dialogs','bots'),'/audio/', 'message.wav'),
         );

        var speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);

        var synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

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


        function promisifyCommand(command,id) {
            return Bluebird.Promise.promisify((cb) => {
                command.on('end', () => {
                    cb(null);
                })
                .on('error', (err) => {
                    cb(err);
                })
                .save(path.join(dir,id + '.mp3'));
            });
        }

        
        const id = uuid();

        await syn(text);
        
        const command = ffmpeg(path.join(dir,'message.wav'))
                        .outputOptions('-acodec libmp3lame')
                        .format('mp3');
        await promisifyCommand(command,nomeFile)();
        //fs.unlink(path.join(dir,nomeFile), () => {}); metodo per rimuovere il file audio
        var localPath = path.join(dir,nomeFile + '.mp3');
        var localName = nomeFile + '.mp3';
        return {localPath, localName};

    }
    
    /*

    async getUploadedAttachment(step) {
        console.log("Sono in getuploadedattachment");
        console.log("ciao");
        // const card = CardFactory.audioCard("Your Audio", [localAudioPath]);

        const cloudConvert = new CloudConvert('eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNzNmNjMyYzYzMzYyY2NlZTY4NDQxNTQ5MGI1OTRlZDRlOGI0ZWY1M2M1OThjZTZkZGEzNTZkYTM3N2I1YjEwNTgzMDY4ZWU0YjkzOGRmYjYiLCJpYXQiOjE2NDEzOTk2MDEuNjU1NDk1LCJuYmYiOjE2NDEzOTk2MDEuNjU1NDk5LCJleHAiOjQ3OTcwNzMyMDEuNjQyNjMxLCJzdWIiOiI1NTUzMDY4OCIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sucmVhZCIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.rfhv3pHP6ULx1lau_dQbpf46zBg54_OHSrlDe770SoFwa5Zwcmpen9R-n39V-7tzQnqXIDNZj8S8OFJT7aUXM65LI5RBA4P2e3vTIcd-3z0kJWjP6g_GVf4TC_iPgkwpsjjmSIfmWwRUodag7EjU5jubxsUfWFX11f45pSH_b4ok0CzAyOoR8jguDGHHZtpDIn5EZQyeBTh_Q4MwdYryJeuwP2jelwj75W2I0CFlAdmD3iV7kSEZUGtnoStDQRTjs-qV8o6Qt0RjPj2CBwMmWnrCJBrOyVnICpg4yGsjTlG5iYjXYAPNpB1EkV646i0BDQK3XE21YWX6W5xx9ch-SmjEz0YVF3UOm-Y2ZtxVisZ3312aqF4LkokMvW0sJ1jloJmBrKtzbjGWrGeShiCWxf14uE5ySHRB6hJxz7yJ-0bXQvzVO_MxHzHS4RIuaFLmJPmqUBgVZ20gVMWjbtNbAlUuZ-g98K_CSipltE4CNmRGSShGGzGDWgLW7ro4hF6uJkLNb4l_K1rXnavLMFli1Yw2ngtlfI7RHOzui_LW56VHQZHB_pWhCkcnzSb2uXCFqCjewAc-Eh94jEqmrT8NtVwr8KdLgS5fxdlFDHm8k8Y5lIImqThhY81RUIuf5YthcdHs2scPfNpMEuB58iw-Ex1nfJpfYDIixYOkcTUrrgk');
        let job = await cloudConvert.jobs.create({
            "tasks": {
                "inputFile": {
                    "operation": "import/upload"
                },
                "task-1": {
                    "operation": "convert",
                    "input": [
                        "inputFile"
                    ],
                    "output_format": "mp3"
                },
                "export-1": {
                    "operation": "export/url",
                    "input": [],
                    "inline": false,
                    "archive_multiple_files": false
                }
            },
            "tag": "jobbuilder"
        });

        const uploadTask = job.tasks.filter(task => task.name === 'inputFile')[0];

        const inputFile = fs.createReadStream(localAudioPath);

        
        await cloudConvert.tasks.upload(uploadTask, inputFile, 'file.mp3');

        console.log(job.result);


        /*
        let channelData = JSON.stringify({
            "channelData": {
                "method": "sendAudio",
                "parameters": {
                    "audio": {
                        "url": "./passodallaluan.mp3",
                        "mediaType": "audio/mp3",
                    }
                }
            }
        });
    
    */
/*
        const card = CardFactory.audioCard("Your Audio", [job.result]);
        card.contentType = "audio/mp3";

        // const message = MessageFactory.attachment(card);


        await sleep(3000);
        // console.log(card);
        await step.context.sendActivity({ attachments: [card] });



    }

    async finalStep(step) {

        return await step.endDialog();
    }

   
}
/*
async function syntethizeAudio(textToConvert){

    const localFileAudioPath = __dirname + '\\' + filename ;
    var audioConfig = sdk.AudioConfig.fromAudioFileOutput(filename);
    var speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);

    var synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    synthesizer.speakSsmlAsync(
        `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US"><voice name="it-IT-IsabellaNeural"><mstts:express-as style="customerservice"><prosody rate="-10%" pitch="0%">
                                    ${textToConvert}
                                </prosody>
                                </mstts:express-as>
                                </voice>
                                </speak>`,                                  
        function (result) {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              console.log("synthesis finished.");
            } else {
              console.error("Speech synthesis canceled, " + result.errorDetails +
                  "\nDid you update the subscription info?");
            }
            synthesizer.close();
            synthesizer = undefined;
          },

          function (err) {
            console.trace("err - " + err);
            synthesizer.close();
            synthesizer = undefined;
          });
    }
*/

module.exports.TextToSpeechDialog = TextToSpeechDialog;
module.exports.TEXTTOSPEECH_DIALOG = TEXTTOSPEECH_DIALOG;

