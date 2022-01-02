

//import { QnACardBuilder } from "botbuilder-ai";
//import { Context } from "microsoft-cognitiveservices-speech-sdk/distrib/lib/src/common.speech/RecognizerConfig";

const fs = require('fs');

const path = require("path");
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

const { AttachmentClass }= require('./attachment.js');

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
            this.ocrStep.bind(this)
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

    async ocrStep(step) {
        console.log(step.results);
        console.log("sono qui");
        const att = new AttachmentClass();
        att.downloadAttachmentAndWrite(step);
    }

}

/*
async function handleIncomingAttachment(turnContext) {
    // Prepare Promises to download each attachment and then execute each Promise.
    const promises = turnContext.activity.attachments.map(this.downloadAttachmentAndWrite);
    const successfulSaves = await Promise.all(promises);

    // Replies back to the user with information about where the attachment is stored on the bot's server,
    // and what the name of the saved file is.
    async function replyForReceivedAttachments(localAttachmentData) {
        if (localAttachmentData) {
            // Because the TurnContext was bound to this function, the bot can call
            // `TurnContext.sendActivity` via `this.sendActivity`;
            await this.sendActivity(`Attachment "${ localAttachmentData.fileName }" ` +
                `has been received and saved to "${ localAttachmentData.localPath}".`);
        } else {
            await this.sendActivity('Attachment was not successfully saved to disk.');
        }
    }

    // Prepare Promises to reply to the user with information about saved attachments.
    // The current TurnContext is bound so `replyForReceivedAttachments` can also send replies.
    const replyPromises = successfulSaves.map(replyForReceivedAttachments.bind(turnContext));
    await Promise.all(replyPromises);
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

    */
module.exports.OcrDialog =OcrDialog;
module.exports.OCR_DIALOG = this.OCR_DIALOG;