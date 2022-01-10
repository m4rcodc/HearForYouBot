'use strict';

const async = require('async');
const fs = require('fs');
const https = require('https');
const path = require("path");
const createReadStream = require('fs').createReadStream
const sleep = require('util').promisify(setTimeout);
const ComputerVisionClient = require('@azure/cognitiveservices-computervision').ComputerVisionClient;
const ApiKeyCredentials = require('@azure/ms-rest-js').ApiKeyCredentials;
const TelegramBot = require('node-telegram-bot-api');

const token = '5016576261:AAGSlXURwpLqmXOCV-zccYrykqk4mZ85Hak'

const bot = new TelegramBot(token);



/**
 * AUTHENTICATE
 * This single client is used for all examples.
 */
const key = 'f949748f29f546fd8199180f2d052826';
const endpoint = 'https://ocrhearforyou.cognitiveservices.azure.com/';

const computerVisionClient = new ComputerVisionClient(
    new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } }), endpoint);

const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');
var textEdit = "";
/**
 * AUTHENTICATE
 * This single client is used for all examples.
 */

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
    AttachmentPrompt,
    Attachment
} = require('botbuilder-dialogs');


const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const OCR_DIALOG = 'OCR_DIALOG';
const ATT_PROMPT = 'ATT_PROMPT';
var value = null;


class OcrDialog extends ComponentDialog {
    constructor(userState) {
        super(OCR_DIALOG);

        this.userState = userState;
        this.addDialog(new TextPrompt('TEXT_PROMPT'));
        this.addDialog(new AttachmentPrompt('ATT_PROMPT'));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.introStep.bind(this),
            this.downloadAttachStep.bind(this),
            //this.finalStep.bind(this)
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

        return await step.prompt(ATT_PROMPT, {
            prompt: 'Inserisci un\'immagine da cui ricavare un testo'
        });

    }

    async downloadAttachStep(step) {

        const result = step.result; 
        const attach = Object.values(result);
        console.log(attach);
        for (const key in attach) {
            if (attach.hasOwnProperty(key)) {
                value = attach[key];
        
            }
        }
        //var string = JSON.stringify(value.contentUrL,null,4);
        //var file_id = string.substring(39,75);

        

        //var file = context.bot.getFile()

        downloadAttachmentAndWrite(value);
     
        // var resultTemp = task.Result;
        computerVision();

        await sleep(10000); //dobbiamo inserire al posto di questo qualcosa per attendere che il metodo computer vision finisca
       
        console.log(textEdit);

        return await step.context.sendActivity(textEdit);

        //return await step.next();
}

           /* async finalStep(step) {

                return await step.endDialog();
            }*/

}



    async function computerVision() {
        async.series([
          async function () {
                // Status strings returned from Read API. NOTE: CASING IS SIGNIFICANT.
                // Before Read 3.0, these are "Succeeded" and "Failed"
                const STATUS_SUCCEEDED = "succeeded";
                const STATUS_FAILED = "failed"

                 const localImagePath = __dirname + '\\' + value.name ;//qui andrà il value.name dell'attachment

                 console.log('\Reading local image for text in ...', path.basename(localImagePath));


                 console.log('\nReadwritten text from local file...', localImagePath);
                const writingResult = await readTextFromFile(computerVisionClient, localImagePath);
                printRecText(writingResult);

                async function readTextFromFile(client, localImagePath) {
                    // To recognize text in a local image, replace client.read() with readTextInStream() as shown:
                    let result = await client.readInStream(() => createReadStream(localImagePath));
                    // Operation ID is last path segment of operationLocation (a URL)
                    let operation = result.operationLocation.split('/').slice(-1)[0];
            
                    // Wait for read recognition to complete
                    // result.status is initially undefined, since it's the result of read
                    while (result.status !== STATUS_SUCCEEDED) { await sleep(10000); result = await client.getReadResult(operation); }
                    return result.analyzeResult.readResults;
                  
                     // Return the first page of result. Replace [0] with the desired page if this is a multi-page file such as .pdf or .tiff.
                  }

                  function printRecText(printedText) {
                    console.log('Recognized text:');
                    for (const page in printedText) {
                      if (printedText.length > 1) {
                        console.log(`==== Page: ${page}`);
                      }
                        const result = printedText[page];
                    
                      if (result.lines.length) {
                        for (const line of result.lines) {
                            //console.log(line.words.map(w => w.text).join(' '));

                            textEdit += line.words.map(w => w.text).join(' '); //appendo i caratteri letti nella variabile globale textedit

                          }
                         // flagOcr = true;
                      }
                      else { console.log('No recognized text.'); }
                    }
                  }
                 

        }, 
        function () {
            return new Promise((resolve) => {
              resolve();
            })
          }
        ], (err) => {
          throw (err);
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
        if (response.headers['content-type'] === 'application/json') {
            response.data = JSON.parse(response.data, (key, value) => {
                return value && value.type === 'Buffer' ? Buffer.from(value.data) : value;
            });
        }
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

module.exports.OcrDialog =OcrDialog;
module.exports.OCR_DIALOG = this.OCR_DIALOG;