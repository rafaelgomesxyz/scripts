const mammoth = require("mammoth");
const pdfjs = require("pdfjs-dist");
const NLURequest = require("../model/nlu-request");
require('dotenv').load();

const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1');

exports.NLU = (req, res) => {
    nlu = new NaturalLanguageUnderstandingV1({
        iam_apikey: process.env.IAM_APIKEY,
        version_date: '2019-05-18'
    });

    if (req.file) {
        if (req.file.mimetype == 'application/pdf') {
            pdfjs.getDocument({ data: req.file.buffer }).then(result => {
                // console.table(result.numPages)
                let pages = []
                for (let i = 1; i <= result.numPages; i++) {
                    pages.push(new Promise((resolve, reject) => {
                        result.getPage(i).then(result2 => {
                            result2.getTextContent().then(result3 => {
                                let heigth = -1
                                let paragrafs = []
                                let paragraf = ''
                                result3.items.forEach(element => {
                                    if (element.transform[5] == heigth) {
                                        paragraf += element.str
                                    } else {
                                        paragrafs.push(paragraf)
                                        paragraf = element.str
                                        heigth = element.transform[5]
                                    }
                                });
                                resolve(paragrafs.join('\n'))
                            }).catch((err) => {
                                console.log(err);
                                reject(err)
                            });
                        }).catch((err) => {
                            console.log(err);
                            reject(err)
                        });
                    }))
                }
                Promise.all(pages).then(result4 => {
                    let text = result4.join('\n')
                    let request = new NLURequest(nlu, text, process.env.MODEL_ID)
                    request.execute().then(result5 => res.send(result5)).catch((err) => {
                        console.log(err);
                        res.sendStatus(500).json({ error: true })
                    });
                }).catch(err => {
                    console.log(err)
                    res.sendStatus(500).json({ error: true })
                })
            }).catch((err) => {
                console.log(err);
                res.sendStatus(500)
            });
        } else if (req.file.mimetype == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            mammoth.extractRawText({ buffer: req.file.buffer })
                .then(function (result) {
                    var text = result.value; // The generated HTML
                    var messages = result.messages; // Any messages, such as warnings during conversion
                    if (messages.length > 0) {
                        console.log(messages)
                    }
                    let request = new NLURequest(nlu, text, process.env.MODEL_ID)
                    request.execute().then(result => res.send(result)).catch((err) => {
                        console.log(err);
                        res.sendStatus(500).json({ error: true });
                    });
                }).catch((err) => {
                    console.log(err);
                    res.sendStatus(500).json({ error: true })
                });
        }
        else {
            res.sendStatus(500).json({ error: true })
        }
    } else {
        let text = req.body.input;
        let request = new NLURequest(nlu, text)
        request.execute().then(result => res.send(result)).catch((err) => {
            console.log(err);
            res.sendStatus(500).json({ error: true })
        });
    }
}
