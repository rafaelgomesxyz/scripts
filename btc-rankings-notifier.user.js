// ==UserScript==
// @name         BTC Rankings Notifier
// @namespace    Rafael G S
// @version      1.0
// @description  BTC Rankings
// @author       Rafael G S
// @match        https://app.slack.com/client/TKMUP9NGZ/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.notification
// @noframes
// ==/UserScript==

(async () => {
    let lastUpdate = await GM.getValue(`lastUpdate`, ``);
    let timeout = null;

    const currentDate = new Date();

    window.setTimeout(start, ((60 * (5 - (currentDate.getMinutes() % 5))) - currentDate.getSeconds() + 10) * 1000);

    async function start() {
        const response = await fetch(`https://script.google.com/macros/s/AKfycbwCZ35h6VudS0wAixKBHYffFBm-458_cQoBJlTxUg/exec`);
        const text = await response.text();
        const json = JSON.parse(text);
        if (lastUpdate !== json[0]) {
            lastUpdate = json[0];
            GM.setValue(`lastUpdate`, lastUpdate);
            GM.notification({
                title: `RANKING GERAL ATUALIZADO!`,
                onclick: () => window.open(`https://docs.google.com/spreadsheets/d/1iEpL8SkWPZMyPhDfWBVZKl0D4woXmV_splLwWEzniRk/edit?usp=sharing`, `_blank`)
            });
        }
        timeout = window.setTimeout(start, 300000);
    }

    function stop() {
        window.clearTimeout(timeout);
        timeout = null;
    }
})();
