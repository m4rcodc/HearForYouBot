var sdk = require("microsoft-cognitiveservices-speech-sdk");
var readline = require("readline");
const fs = require('fs');
const path = require('path');
var subscriptionKey = "68befe3c7508400196b3472c4a12ac66";
var serviceRegion = "westeurope";
const sleep = require('util').promisify(setTimeout);
const {
    ActionTypes,
    ActivityTypes,
    CardFactory,
    MessageFactory,
    ActivityHandler
} = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const {
    TextPrompt,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    WaterfallDialog,
    ThisMemoryScope
} = require('botbuilder-dialogs');
const { ConsoleLoggingListener } = require("microsoft-cognitiveservices-speech-sdk/distrib/lib/src/common.browser/ConsoleLoggingListener");
const { dirname } = require("path");

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
            this.getUploadedAttachment.bind(this)
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
             nomeFile += '.wav';
             return await stepContext.next();

    }

    async introStep(step) {

        return await step.prompt(TEXT_PROMPT, {
            prompt: 'Inserisci un testo da convertire in audio'
        });
    }

    async textToSpeechStep(stepContext) {
         text = stepContext.result;
         var prova = __dirname.substring(0,38);
         localAudioPath = prova + '\\' + nomeFile;
         var audioConfig = sdk.AudioConfig.fromAudioFileOutput(nomeFile);
         var speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
     
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

    }

    async getUploadedAttachment(step) {
        console.log("Sono in getuploadedattachment");

        const card = CardFactory.audioCard("Your Audio", [localAudioPath]);
        card.contentType = "audio/wav";

        // const message = MessageFactory.attachment(card);

        await sleep(3000);
        console.log(card);
        await step.context.sendActivity({ attachments: [card] });

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

