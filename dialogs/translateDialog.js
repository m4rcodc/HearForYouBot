// Import required types from libraries
const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');
const AZURE_TRANSLATE_SUB_KEY = process.env.AzureTranslateServiceKey;
const AZURE_TRANSLATE_ENDPOINT = process.env.AzureTranslateServiceEndpoint;
const AZURE_TRANSLATE_LOCATION = process.env.AzureTranslateServiceLocation;

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

const {
    MainDialog
} = require('./mainDialog.js')

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
            this.traduciTestoStep.bind(this),
            //this.askforfinalStep.bind(this),
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

    async chiediLinguaStep(step) {

        const reply = {
            type: ActivityTypes.Message
        };

        const buttons = [{
                type: ActionTypes.ImBack,
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
       

        const lingua = step.result;
        console.log(lingua);

   
        const luisResult = await this.luisRecognizer.executeLuisQuery(step.context);

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
        console.log(option);
        var prova = null;

        var axiosOptions = {
            baseURL: AZURE_TRANSLATE_ENDPOINT,
            url: '/translate',
            method: 'post',
            headers: {
                'Ocp-Apim-Subscription-Key': AZURE_TRANSLATE_SUB_KEY,
                'Ocp-Apim-Subscription-Region': AZURE_TRANSLATE_LOCATION,
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
        }

        const res = await axios(axiosOptions);

        if (res.status = 200) {

            var string = JSON.stringify(res.data,null,4);
            const pos = string.indexOf("to");
            var stringProva;
            stringProva =string.substring(167,pos-20);
            
            await step.context.sendActivity(stringProva);
            

            
        }

        return await step.endDialog(this.id);
    }

    
}

module.exports.TranslateDialog = TranslateDialog;
module.exports.TRANSLATE_DIALOG = TRANSLATE_DIALOG;