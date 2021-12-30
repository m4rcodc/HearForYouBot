// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { TimexProperty } = require('@microsoft/recognizers-text-data-types-timex-expression');
const { MessageFactory, 
        InputHints,
        ActivityTypes,
        ActionTypes,
        CardFactory
        } = require('botbuilder');
const { LuisRecognizer 
        } = require('botbuilder-ai');
const { ComponentDialog, 
        DialogSet, 
        DialogTurnStatus, 
        TextPrompt, 
        WaterfallDialog 
    } = require('botbuilder-dialogs');

const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const MAIN_DIALOG = 'MAIN_DIALOG'
const TEXT_PROMPT = 'TEXT_PROMPT';

class MainDialog extends ComponentDialog {
    constructor(luisRecognizer, userState) {
        super('MAIN_DIALOG');

        if (!luisRecognizer) throw new Error('[MainDialog]: Missing parameter \'luisRecognizer\' is required');
        this.luisRecognizer = luisRecognizer;
        this.userState = userState;
        //Adding used dialogs
        this.addDialog(new TextPrompt('TEXT_PROMPT'));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.introStep.bind(this),
                this.mainMenuStep.bind(this),
                this.optionStep.bind(this),
                this.loopStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    /**
     * First step in the waterfall dialog. Prompts the user for a command.
     * Currently, this expects a booking request, like "book me a flight from Paris to Berlin on march 22"
     * Note that the sample LUIS model will only recognize Paris, Berlin, New York and London as airport cities.
     */
    async introStep(step) {
        if (!this.luisRecognizer.isConfigured) {
            const messageText = 'NOTE: LUIS is not configured. To enable all capabilities, add `LuisAppId`, `LuisAPIKey` and `LuisAPIHostName` to the .env file.';
            await step.context.sendActivity(messageText, null, InputHints.IgnoringInput);
            return await step.next();
        }


        const messageText = step.options.restartMsg ? step.options.restartMsg : 'Come posso aiutarti?\n\nSe vuoi sapere cosa posso fare per te scrivi \"menu\"';
        const promptMessage = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
        return await step.prompt('TEXT_PROMPT', { prompt: promptMessage });
    }

    /**
     * Second step in the waterfall.  This will use LUIS to attempt to extract the origin, destination and travel dates.
     * Then, it hands off to the bookingDialog child dialog to collect any remaining details.
     */
    async mainMenuStep(step) {
        console.log("MENUSTEP");
        const reply = {
            type: ActivityTypes.Message
        };

        const buttons = [{
                type: ActionTypes.ImBack,
                title: 'Traduci un testo in altra lingua',
                value: 'Traduci'
            },
            {
                type: ActionTypes.ImBack,
                title: 'Genera un file testuale a partire da un file audio',
                value: 'SpeechToText'
            },
            {
                type: ActionTypes.ImBack,
                title: 'Genera un file audio a partire da un file testuale',
                value: 'TextToSpeech'
            },
            {
                type: ActionTypes.ImBack,
                title: 'Ricava il testo da un immagine',
                value: 'TextFromImage'
            }
        ];

        const card = CardFactory.heroCard(
            '',
            undefined,
            buttons, {
                text: 'HearForYouBot menu'
            }
        );

        reply.attachments = [card];

        await step.context.sendActivity(reply);

        return await step.prompt(TEXT_PROMPT, {
            prompt: 'Seleziona un\'opzione dal menu per proseguire!'
        });
        
    }

    async optionStep(step) {
        console.log("OPTION STEP");
        const option = step.result.value;
        console.log(option);
            console.log("Sono qui 1");
            const luisResult = await this.luisRecognizer.executeLuisQuery(step.context);
            console.log("Sono qui");
            if(option === "Traduci" || LuisRecognizer.topIntent(luisResult) === 'Traduzione' ) {
                console.log("Sono quiiiiiii");
                await step.context.sendActivity("Traduco");
            }

            else if(option === "Tradurre un file audio in testuale" || LuisRecognizer.topIntent(luisResult) === 'Conversione Audio-Testo') {
                console.log("Sono quiiiiiii1111");
                await step.context.sendActivity("Audio in testo");
            }

            else if(option === "Tradurre un file testuale in audio" || LuisRecognizer.topIntent(luisResult) === 'Conversione Testo-Audio') {

                await step.context.sendActivity("Testo in audio");
            }

            else if(option === "Prendere testo da immagine" || LuisRecognizer.topIntent(luisResult) === 'Testo da Immagine') {

                await step.context.sendActivity("Testo da Immagine");
            }

            else {

                await step.context.sendActivity("Sembra che tu abbia digitato un comando che non conosco! Riprova.");
            }

            return await step.replaceDialog(this.id);
        }

        async loopStep(step) {
            return await step.replaceDialog(this.id);
        }
    }
    module.exports.MainDialog = MainDialog;
    module.exports.MAIN_DIALOG = MAIN_DIALOG;

    /**
     * This is the final step in the main waterfall dialog.
     * It wraps up the sample "book a flight" interaction with a simple confirmation.
     */
   /* async finalStep(stepContext) {
        // If the child dialog ("bookingDialog") was cancelled or the user failed to confirm, the Result here will be null.
        if (stepContext.result) {
            const result = stepContext.result;
            // Now we have all the booking details.

            // This is where calls to the booking AOU service or database would go.

            // If the call to the booking service was successful tell the user.
            const timeProperty = new TimexProperty(result.travelDate);
            const travelDateMsg = timeProperty.toNaturalLanguage(new Date(Date.now()));
            const msg = `I have you booked to ${ result.destination } from ${ result.origin } on ${ travelDateMsg }.`;
            await stepContext.context.sendActivity(msg, msg, InputHints.IgnoringInput);
        }

        // Restart the main dialog with a different message the second time around
        return await stepContext.replaceDialog(this.initialDialogId, { restartMsg: 'What else can I do for you?' });
    }*/

