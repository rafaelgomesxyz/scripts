var rankings = [
  'https://maratona.dev/ranking/',
  'https://maratona.dev/desafios/crie-um-sommelier-virtual-usando-inteligencia-artificial/',
  'https://maratona.dev/desafios/desafio-2-fiap-desenvolva-um-tutor-para-ensinar-matematica-para-criancas/',
  'https://maratona.dev/desafios/desafio-3-unija-da-imagem-ao-texto-use-a-inteligencia-artificial-para-aprender-ingles/',
  'https://maratona.dev/desafios/desafio-4-boticario-inteligencia-artificial-para-recomendacao-do-melhor-presente/'
];
var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();

function update() {
  var numRankings = rankings.length;
  for (var i = 0; i < numRankings; i++) {
    var names = [];

    var sheet = sheets[i];
    var numRows = sheet.getMaxRows() - 2;
    var values = numRows > 0 ? sheet.getRange(2, 1, numRows, sheet.getMaxColumns()).getValues() : [];
    var oldNumValues = values.length;
    
    var ranking = rankings[i];
    var response = UrlFetchApp.fetch(ranking);
    var text = response.getContentText();

    var items = text.match(/<li>.*?<span\sclass="ranking-name">.*?<\/span>.*?<span\sclass="ranking-place">.*?<\/span>.*?<\/li>/g);
    var numItems = items.length;
    for (var j = 0; j < numItems; j++) {
      var item = items[j];
      var matches = item.match(/<span\sclass="ranking-name">(.*?)<\/span>.*?<span\sclass="ranking-place">(.*?)<\/span>/);
      var name = matches[1];
      var place = parseInt(matches[2].match(/\d+/)[0]);

      var numValues = values.length;
      for (var k = 0; k < numValues && values[k][0] !== name; k++);
      if (k < numValues && values[k][0] === name) {
        var currentPlace = values[k][1] === '-' ? 101 : parseInt(values[k][1]);
        if (currentPlace === place) {
          values[k][2] = '-';
        } else {
          var change = currentPlace - place;
          values[k][1] = place + '';
          if (change > 0) {
            values[k][2] = '+' + change;
          } else {
            change *= -1;
            values[k][2] = '-' + change;
          }
          values[k][3] = place + ', ' + values[k][3];
        }
      } else {
        values.push([name, place + '', '*', place + '']);
      }
      
      names.push(name);
    }
    
    var newNumValues = values.length;
    var numNames = names.length;
    for (var j = 0; j < newNumValues; j++) {
      var name = values[j][0];
      for (var k = 0; k < numNames && names[k] !== name; k++);
      if (k >= numNames) {
        var currentPlace = values[j][1] === '-' ? 101 : parseInt(values[j][1]);
        if (currentPlace === 101) {
          values[j][2] = '-';
        } else {
          var change = 101 - currentPlace;
          values[j][1] = '-';   
          values[j][2] = '-' + change;
          values[j][3] = '-, ' + values[j][3];
        }
      }
    }
    
    var diff = newNumValues - oldNumValues;
    if (diff > 0) {
      sheet.insertRows(2, diff);
    }
    sheet.getRange(2, 1, sheet.getMaxRows() - 2, sheet.getMaxColumns()).setValues(values);
    
    sheet.sort(2, true);
  }  
}
