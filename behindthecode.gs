var rankings = [
  'https://maratona.dev/ranking/',
  'https://maratona.dev/desafios/crie-um-sommelier-virtual-usando-inteligencia-artificial/',
  'https://maratona.dev/desafios/desafio-2-fiap-desenvolva-um-tutor-para-ensinar-matematica-para-criancas/',
  'https://maratona.dev/desafios/desafio-3-unija-da-imagem-ao-texto-use-a-inteligencia-artificial-para-aprender-ingles/',
  'https://maratona.dev/desafios/desafio-4-boticario-inteligencia-artificial-para-recomendacao-do-melhor-presente/'
];
var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();

function update() {
  var hasDesafiosChanged = false;

  var currentDate = Utilities.formatDate(new Date(), 'GMT-3', 'dd/MM HH:mm:ss');

  var numRankings = rankings.length;
  for (var i = 0; i < numRankings; i++) {
    var names = [];

    var sheet = sheets[i];
    var numFrozenRows = sheet.getFrozenRows();
    var numRows = sheet.getMaxRows() - numFrozenRows - 1;
    var values = numRows > 0 ? sheet.getRange(numFrozenRows + 1, 1, numRows, 5).getValues() : [];
    var oldNumValues = values.length;

    var hasChanged = false;
    var changesBackup = new Array(oldNumValues);
    for (var j = 0; j < oldNumValues; j++) {
      changesBackup[j] = '-';
    }
    
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
        changesBackup[k] = values[k][3];
        
        var currentPlace = values[k][2] === '-' ? 101 : parseInt(values[k][2]);
        if (currentPlace === place) {
          values[k][3] = '-';
        } else {
          if (!hasChanged) {
            hasChanged = true;
          }

          var change = currentPlace - place;
          values[k][2] = place + '';
          if (change > 0) {
            values[k][3] = '+' + change;
          } else {
            change *= -1;
            values[k][3] = '-' + change;
          }
          values[k][4] = place + ', ' + values[k][4];
        }
      } else {
        if (!hasChanged) {
          hasChanged = true;
        }
        changesBackup.push('*');

        values.push([name, '', place + '', '*', place + '']);
      }
      
      names.push(name);
    }
    
    var newNumValues = values.length;
    var numNames = names.length;
    for (var j = 0; j < newNumValues; j++) {
      var name = values[j][0];
      for (var k = 0; k < numNames && names[k] !== name; k++);
      if (k >= numNames) {
        changesBackup[j] = values[j][3];

        var currentPlace = values[j][2] === '-' ? 101 : parseInt(values[j][2]);
        if (currentPlace === 101) {
          values[j][3] = '-';
        } else {
          if (!hasChanged) {
            hasChanged = true;
          }
          
          var change = 101 - currentPlace;
          values[j][2] = '-';   
          values[j][3] = '-' + change;
          values[j][4] = '-, ' + values[j][4];
        }
      }
    }
    
    sheet.getRange(1, 2).setValue(currentDate);
    if (hasChanged) {
      sheet.getRange(2, 2).setValue(currentDate);
      
      if (!hasDesafiosChanged && i > 0) {
        hasDesafiosChanged = true;
      }
    } else {
      for (var j = 0; j < newNumValues; j++) {
        values[j][3] = changesBackup[j];
      }
    }
    
    var diff = newNumValues - oldNumValues;
    if (diff > 0) {
      sheet.insertRows(numFrozenRows + 1, diff);
      sheet.getRange(numFrozenRows + 1, 1, diff, 2).mergeAcross();
      for (var j = 0; j < diff; j++) {
        for (var k = 1; k <= 8; k++) {
          var notation = sheet.getRange(numFrozenRows + j + 1, 1).getA1Notation();
          sheet.getRange(numFrozenRows + j + 1, k + 5).setFormula('=IFNA(FILTER(\'' + k + '\'!C:C, \'' + k + '\'!A:A=' + notation + '), "-")');
        }
      }
    }
    sheet.getRange(numFrozenRows + 1, 1, sheet.getMaxRows() - numFrozenRows - 1, 5).setValues(values);
    
    sheet.sort(3, true);
  }
  
  if (hasDesafiosChanged) {
    SpreadsheetApp.flush();
    getMissing();
  }
}

function getMissing() {
  var sheet_geral = sheets[0];
  var numFrozenRows_geral = sheet_geral.getFrozenRows();
  var numRows_geral = sheet_geral.getMaxRows() - numFrozenRows_geral - 1;
  var values_geral = numRows_geral > 0 ? sheet_geral.getRange(numFrozenRows_geral + 1, 1, numRows_geral, 5).getValues() : [];
  var oldNumValues = values_geral.length;

  var numRankings = rankings.length;
  for (var i = 1; i < numRankings; i++) {
    var sheet = sheets[i];
    var numFrozenRows = sheet.getFrozenRows();
    var numRows = sheet.getMaxRows() - numFrozenRows - 1;
    var values = numRows > 0 ? sheet.getRange(numFrozenRows + 1, 1, numRows, 5).getValues() : [];
    var numValues = values.length;

    for (var j = 0; j < numValues; j++) {
      var name = values[j][0];

      var numValues_geral = values_geral.length;
      for (var k = 0; k < numValues_geral && values_geral[k][0] !== name; k++);
      if (k >= numValues_geral) {
        values_geral.push([name, '', '-', '-', '-']);
      }
    }
  }
    
  var newNumValues = values_geral.length;
  var diff = newNumValues - oldNumValues;
  if (diff > 0) {
    sheet_geral.insertRows(numFrozenRows_geral + 1, diff);
    sheet_geral.getRange(numFrozenRows_geral + 1, 1, diff, 2).mergeAcross();
    for (var i = 0; i < diff; i++) {
      for (var j = 1; j <= 8; j++) {
        var notation = sheet_geral.getRange(numFrozenRows_geral + i + 1, 1).getA1Notation();
        sheet_geral.getRange(numFrozenRows_geral + i + 1, j + 5).setFormula('=IFNA(FILTER(\'' + j + '\'!C:C, \'' + j + '\'!A:A=' + notation + '), "-")');
      }
    }
  }
  sheet_geral.getRange(numFrozenRows_geral + 1, 1, sheet_geral.getMaxRows() - numFrozenRows_geral - 1, 5).setValues(values_geral);
  
  sheet_geral.sort(3, true);
}
