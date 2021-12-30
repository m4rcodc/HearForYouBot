// Import required types from libraries
const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');
var subscriptionKey = "7effd08ae926474c95b33871fc35d9f2";
var endpoint = "https://api.cognitive.microsofttranslator.com/";
var location = "westeurope";
const {
    ActionTypes,
    ActivityTypes,
    CardFactory,
} = require('botbuilder');
const {
    TextPrompt,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    WaterfallDialog,
} = require('botbuilder-dialogs');

const {
    LuisRecognizer
} = require('botbuilder-ai');



const TRANSLATE_DIALOG = 'TRANSLATE_DIALOG';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const TEXT_PROMPT = 'TEXT_PROMPT';
var linguaScelta;

class TranslateDialog extends ComponentDialog {
    constructor(luisRecognizer,userState) {
        super(TRANSLATE_DIALOG);
        if (!luisRecognizer) throw new Error('[MainDialog]: Missing parameter \'luisRecognizer\' is required');
        this.luisRecognizer = luisRecognizer;
        this.addDialog(new TextPrompt('TEXT_PROMPT'));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.chiediLinguaStep.bind(this),
            this.optionLinguaStep.bind(this),
            this.traduciTestoStep.bind(this)
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

    async chiediLinguaStep(step) {

        const reply = {
            type: ActivityTypes.Message
        };

        const buttons = [{
                type: ActionTypes.PostBack,
                title: 'Italiano',
                value: 'italiano'
            },
            {
                type: ActionTypes.ImBack,
                title: 'Tedesco',
                value: 'tedesco'
            },
            {
                type: ActionTypes.ImBack,
                title: 'Inglese',
                value: 'inglese'
            },
            {
                type: ActionTypes.ImBack,
                title: 'Francese',
                value: 'francese'
            }
        ];

        const card = CardFactory.heroCard(
            '',
            undefined,
            buttons, {
                text: 'Seleziona la lingua in cui vuoi tradurre il testo:'
            }
        );

        reply.attachments = [card];

        await step.context.sendActivity(reply);

        return await step.prompt(TEXT_PROMPT, {
            prompt: 'Scrivimi la lingua in cui vuoi tradurre il testo'
        });

        

    }

    async optionLinguaStep(step) {
        console.log("OPTION LINGUA STEP");

        const lingua = step.result.value;
        console.log(lingua);

        console.log("SonoQui1");
        const luisResult = await this.luisRecognizer.executeLuisQuery(step.context);

        console.log("SonoQui2");
        if(lingua === "Inglese" || LuisRecognizer.topIntent(luisResult) === 'LinguaInglese' ) {

                linguaScelta = 'en';
            
        }

        else if(lingua === "Francese" || LuisRecognizer.topIntent(luisResult) === 'LinguaFrancese') {

                linguaScelta = 'fr';
        }

        else if(lingua === "Tedesco" || LuisRecognizer.topIntent(luisResult) === 'LinguaTedesca'){

                linguaScelta = 'de';
        }

        else if(lingua === "Italiano" ||  LuisRecognizer.topIntent(luisResult) === 'LinguaItaliana') {

                linguaScelta = 'it';
        }
        else {

            await step.context.sendActivity("Sembra che tu abbia digitato una lingua in cui non posso tradurre! Riprova selezionando tra le opzioni disponibili.");
            return await step.replaceDialog(this.id);
        }

        return await step.prompt(TEXT_PROMPT, {
            prompt: 'Inserisci il testo da tradurre'
        });

    }


    async traduciTestoStep(step){

        const option = step.result;

        axios({
            baseURL: endpoint,
            url: '/translate',
            method: 'post',
            headers: {
                'Ocp-Apim-Subscription-Key': subscriptionKey,
                'Ocp-Apim-Subscription-Region': location,
                'Content-type': 'application/json',
                'X-ClientTraceId': uuidv4().toString()
            },
            params: {
                'api-version': '3.0',
                'to': linguaScelta
            },
            data: [{
                'text': option
            }],
            responseType: 'json'
        }).then(function(response){

            var string = JSON.stringify(response.data, null, 4);
            console.log(string);
        })

    }
        
}

module.exports.TranslateDialog = TranslateDialog;
module.exports.TRANSLATE_DIALOG = TRANSLATE_DIALOG;