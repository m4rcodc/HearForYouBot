// Import required types from libraries
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
    ThisMemoryScope
} = require('botbuilder-dialogs');
const {
    LuisRecognizer
} = require('botbuilder-ai');

const TRANSLATE_DIALOG = 'TRANSLATE_DIALOG';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class TranslateDialog extends ComponentDialog {
    constructor(userState) {
        super(TRANSLATE_DIALOG);

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.provaStep.bind(this)
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

    async provaStep(step) {
        await step.context.sendActivity("Ciao sono nel dialogo translate");
    }
}

module.exports.TranslateDialog = TranslateDialog;
module.exports.TRANSLATE_DIALOG = TRANSLATE_DIALOG;