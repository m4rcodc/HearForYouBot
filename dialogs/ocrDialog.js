'use strict';
const path = require("path");
const sleep = require('util').promisify(setTimeout);
const ComputerVisionClient = require('@azure/cognitiveservices-computervision').ComputerVisionClient;
const ApiKeyCredentials = require('@azure/ms-rest-js').ApiKeyCredentials;
/**
 * AUTHENTICATE
 * This single client is used for all examples.
 */
const COMPUTERVISION_KEY = process.env.ComputerVisionKey;
const COMPUTERVISION_ENDPOINT = process.env.ComputerVisionEndpoint;

const computerVisionClient = new ComputerVisionClient(
    new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': COMPUTERVISION_KEY } }), COMPUTERVISION_ENDPOINT);


/**
 * AUTHENTICATE
 * This single client is used for all examples.
 */


const {
    TextPrompt,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    WaterfallDialog,
    AttachmentPrompt,
} = require('botbuilder-dialogs');


const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const OCR_DIALOG = 'OCR_DIALOG';
const ATT_PROMPT = 'ATT_PROMPT';


class OcrDialog extends ComponentDialog {
    constructor(userState) {
        super(OCR_DIALOG);

        this.userState = userState;
        this.addDialog(new TextPrompt('TEXT_PROMPT'));
        this.addDialog(new AttachmentPrompt('ATT_PROMPT'));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.introStep.bind(this),
            this.downloadAttachStep.bind(this)
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
            prompt: 'Inserisci un\'immagine da cui ricavare un testo:'
        });

    }

    async downloadAttachStep(step) {

        var value = null;
        const result = step.result; 
        const attach = Object.values(result);
        for (const key in attach) {
            if (attach.hasOwnProperty(key)) {
                value = attach[key];
            }
        }
   
        let resultText = await computerVision(value.contentUrl);
        
        await step.context.sendActivity(resultText);

        return await step.endDialog();
    }

}



    async function computerVision(contentUrl) {
        
                // Status strings returned from Read API. NOTE: CASING IS SIGNIFICANT.
                // Before Read 3.0, these are "Succeeded" and "Failed"
                const STATUS_SUCCEEDED = "succeeded";

                const remoteImagePath = contentUrl;

                var textEdit = '';

                 console.log('\Reading local image for text in ...', path.basename(remoteImagePath));


              
                const writingResult = await readTextFromURL(computerVisionClient, remoteImagePath);
                

                async function readTextFromURL(client, url) {
                    // To recognize text in a local image, replace client.read() with readTextInStream() as shown:
                    let result = await client.read(url);
                    // Operation ID is last path segment of operationLocation (a URL)
                    let operation = result.operationLocation.split('/').slice(-1)[0];

                    // Wait for read recognition to complete
                    // result.status is initially undefined, since it's the result of read
                    while (result.status !== STATUS_SUCCEEDED) { await sleep(1000); result = await client.getReadResult(operation); }
                    return result.analyzeResult.readResults; // Return the first page of result. Replace [0] with the desired page if this is a multi-page file such as .pdf or .tiff.
                }

                const printRecText = (printedText) => {
                    return new Promise((resolve, reject) => {
                        console.log('Recognized text:');
                       
                        for (const page in printedText) {
                            if (printedText.length > 1) {
                                console.log(`==== Page: ${page}`);
                            }
                            const result = printedText[page];
                            var count = 0;
                            if (result.lines.length) {
                                for (const line of result.lines) {
                                    textEdit += line.words.map(w => w.text).join(' ');
                                    textEdit += ' ';
                                }

                            }
                            else {
                                console.log('No recognized text.');
                                reject();
                            }
                        }
                        resolve(textEdit);
                    })
                }

                
                
        return printRecText(writingResult);

       
    } 


module.exports.OcrDialog =OcrDialog;
module.exports.OCR_DIALOG = this.OCR_DIALOG;