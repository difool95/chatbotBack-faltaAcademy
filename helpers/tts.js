// azure-cognitiveservices-speech.js
require('dotenv').config()
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const blendShapeNames = require('./blendshapeNames');
const _ = require('lodash');
const askGPT = require('./askGPT');
const translate = require('arabic-name-to-en/translate');
const fs = require('fs');
const path = require('path');
let context = "";
let SSML = '';


const key = process.env.AZURE_KEY;
const region = process.env.AZURE_REGION;
//<voice name="en-US-JennyNeural">
//<voice name="ar-TN-ReemNeural">
let currentLanguage = "english";
let resetDiscussion = false;
let triggerNumber = 0;
/**
 * Node.js server code to convert text to speech
 * @returns stream
 * @param {*} key your resource key
 * @param {*} region your resource region
 * @param {*} text text to convert to audio/speech
 * @param {*} filename optional - best for long text - temp file for converted speech/audio
 */
const textToSpeech = async (text, language, reset) => {
    // convert callback function to promise
    return new Promise(async (resolve, reject) => {
        let filePath = null;
        //READ CONTEXT FROM THE FILE
        if (language == "french") {
            filePath = path.join(__dirname, '../', 'contextFileFrench.txt'); // Replace with the actual file path
        }
        else if (language == "english") {
            filePath = path.join(__dirname, '../', 'contextFileEnglish.txt'); // Replace with the actual file path
        }
        fs.readFile(filePath, 'utf8', async (err, data) => {
            if (err) {
                console.error('Error reading the file:', err);
                return;
            }
            context = data;
            let speech = null;
            let ssml = null;
            if (reset) {
                resetDiscussion = true;
            }
            else {
                resetDiscussion = false;
            }
            speech = await askGPT(text, context, resetDiscussion);
            //speech = "Hello bilel how are you today, the news are some thing happened in palestine this week and it's real catastrophic, Hello bilel how are you today, the news are some thing happened in palestine this week and it's real catastrophic, Hello bilel how are you today, the news are some thing happened in palestine this week and it's real catastrophic"

            if (language == "arabic") {
                SSML = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="ar-TN">
            <voice name="ar-TN-ReemNeural">
            <mstts:viseme type="FacialExpression"/>
            __TEXT__
            </voice>
            </speak>`;
                ssml = SSML.replace("__TEXT__", speech);
            }
            else if (language == "french") {
                SSML = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="fr-FR">
            <voice name="fr-FR-CoralieNeural">
            <mstts:viseme type="FacialExpression"/>
            __TEXT__
            </voice>
            </speak>`;
                ssml = SSML.replace("__TEXT__", speech);
            }
            else if (language == "english") {
                SSML = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
            <voice name="en-US-JennyNeural">
            <mstts:viseme type="FacialExpression"/>
            __TEXT__
            </voice>
            </speak>`;
                ssml = SSML.replace("__TEXT__", speech);
            }



            const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
            speechConfig.speechSynthesisOutputFormat = 5; // mp3

            let audioConfig = null;
            let randomString = Math.random().toString(36).slice(2, 7);
            let filename = `./public/speech-${randomString}.mp3`;
            audioConfig = sdk.AudioConfig.fromAudioFileOutput(filename);


            let blendData = [];
            let timeStep = 1 / 60;
            let timeStamp = 0;
            const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);


            // Subscribes to viseme received event
            synthesizer.visemeReceived = function (s, e) {
                // `Animation` is an xml string for SVG or a json string for blend shapes

                var animation = JSON.parse(e.animation);
                _.each(animation.BlendShapes, blendArray => {

                    let blend = {};
                    _.each(blendShapeNames, (shapeName, i) => {
                        blend[shapeName] = blendArray[i];
                    });

                    blendData.push({
                        time: timeStamp,
                        blendshapes: blend
                    });
                    timeStamp += timeStep;
                });

            }
            synthesizer.speakSsmlAsync(

                ssml,
                result => {
                    synthesizer.close();
                    resolve({ blendData, filename: `/speech-${randomString}.mp3`, filena: randomString, speech: speech });
                },
                error => {
                    synthesizer.close();
                    reject(error);
                });
        });
    });



};

module.exports = textToSpeech;