// This is a Google Apps Script (https://developers.google.com/apps-script/) that is integrated with a Google Sheet.

const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();

const MAX_CHALLENGES = 9;
const LAST_CHECKED_ROW = 1;
const LAST_CHECKED_COLUMN = 2;
const LAST_UPDATED_ROW = LAST_CHECKED_ROW + 1;
const LAST_UPDATED_COLUMN = LAST_CHECKED_COLUMN;
const NAME_COLUMN = 1;
const NUM_NAME_COLUMNS = 2;
const CURRENT_PLACE_COLUMN = NAME_COLUMN + NUM_NAME_COLUMNS;
const PLACE_CHANGES_COLUMN = CURRENT_PLACE_COLUMN + 1;
const PLACE_HISTORY_COLUMN = PLACE_CHANGES_COLUMN + 1;

function update() {
  const currentDate = Utilities.formatDate(new Date(), 'GMT-3', 'dd/MM/YY HH:mm:ss');
  let hasChangedGlobal = false;

  for (let i = 1; i < MAX_CHALLENGES; i++) {
    const sheet = sheets[i];
    let players = [];

    try {
      const response = UrlFetchApp.fetch(`https:\/\/maratona.dev/data/pt${i}.csv`); // Replace pt with es for Latin America
      const text = response.getContentText();
      const csv = Utilities.parseCsv(text);

      players = csv.slice(1);
    } catch (err) {
      sheet.getRange(LAST_CHECKED_ROW, LAST_CHECKED_COLUMN).setValue(currentDate);
      continue;
    }

    const numPlayers = players.length;

    if (numPlayers === 0) {
      sheet.getRange(LAST_CHECKED_ROW, LAST_CHECKED_COLUMN).setValue(currentDate);
      continue;
    }

    const names = [];
    const numFrozenRows = sheet.getFrozenRows();
    const startRow = numFrozenRows + 1;
    const startColumn = NAME_COLUMN;
    const numRows = sheet.getMaxRows() - numFrozenRows - 1;
    const numColumns = PLACE_HISTORY_COLUMN;
    const values = numRows > 0 ? sheet.getRange(startRow, startColumn, numRows, numColumns).getValues() : [];
    const oldNumValues = values.length;
    const changesBackup = new Array(oldNumValues).fill('-');
    let hasChanged = false;

    // Fill values for players that are currently in the ranking.
    for (let j = 0; j < numPlayers; j++) {
      const player = players[j];
      const name = player[0];
      const place = j + 1;
      const playerIndex = values.findIndex((subValues) => subValues[NAME_COLUMN - 1] === name);
      const playerExists = playerIndex > -1;

      names.push(name);

      if (playerExists) {
        changesBackup[playerIndex] = values[playerIndex][PLACE_CHANGES_COLUMN - 1];

        const rawCurrentPlace = values[playerIndex][CURRENT_PLACE_COLUMN - 1];
        const currentPlace = rawCurrentPlace === '< 100' ? 101 : parseInt(rawCurrentPlace);

        if (currentPlace === place) {
          values[playerIndex][PLACE_CHANGES_COLUMN - 1] = '-';
        } else {
          if (!hasChanged) {
            hasChanged = true;
          }

          const change = currentPlace - place;

          values[playerIndex][CURRENT_PLACE_COLUMN - 1] = place.toString();
          if (change > 0) {
            values[playerIndex][PLACE_CHANGES_COLUMN - 1] = `+${change}`;
          } else {
            values[playerIndex][PLACE_CHANGES_COLUMN - 1] = `-${change * -1}`;
          }
          values[playerIndex][PLACE_HISTORY_COLUMN - 1] = `${place}, ${values[playerIndex][PLACE_HISTORY_COLUMN - 1]}`;
        }
      } else {
        changesBackup.push('*');
        if (!hasChanged) {
          hasChanged = true;
        }

        values.push([name, '', place.toString(), '*', place.toString()]);
      }
    }

    const newNumValues = values.length;
    const numNames = names.length;

    // Fill values for players that are no longer in the ranking.
    for (let j = 0; j < newNumValues; j++) {
      const name = values[j][NAME_COLUMN - 1];
      const playerIndex = names.findIndex((subName) => subName === name);
      const playerExisted = playerIndex < 0;

      if (playerExisted) {
        changesBackup[j] = values[j][PLACE_CHANGES_COLUMN - 1];

        const rawCurrentPlace = values[j][CURRENT_PLACE_COLUMN - 1];
        const currentPlace = rawCurrentPlace === '< 100' ? 101 : parseInt(rawCurrentPlace);

        if (currentPlace === 101) {
          values[j][PLACE_CHANGES_COLUMN - 1] = '-';
        } else {
          if (!hasChanged) {
            hasChanged = true;
          }

          const change = 101 - currentPlace;

          values[j][CURRENT_PLACE_COLUMN - 1] = '< 100';
          values[j][PLACE_CHANGES_COLUMN - 1] = `-${change}`;
          values[j][PLACE_HISTORY_COLUMN - 1] = `< 100, ${values[j][PLACE_HISTORY_COLUMN - 1]}`;
        }
      }
    }

    sheet.getRange(LAST_CHECKED_ROW, LAST_CHECKED_COLUMN).setValue(currentDate);

    if (hasChanged) {
      if (!hasChangedGlobal && i > 0) {
        hasChangedGlobal = true;
      }

      sheet.getRange(LAST_UPDATED_ROW, LAST_UPDATED_COLUMN).setValue(currentDate);
    } else {
      for (let j = 0; j < newNumValues; j++) {
        values[j][PLACE_CHANGES_COLUMN - 1] = changesBackup[j];
      }
    }

    const diff = newNumValues - oldNumValues;

    // Insert new rows and apply formulas.
    if (diff > 0) {
      sheet.insertRows(startRow, diff);
      sheet.getRange(startRow, startColumn, diff, NUM_NAME_COLUMNS).mergeAcross();

      if (i === 0) {
        for (let j = 0; j < diff; j++) {
          for (let k = 1; k < MAX_CHALLENGES; k++) {
            const notation = sheet.getRange(startRow + j, NAME_COLUMN).getA1Notation();

            sheet.getRange(startRow + j, numColumns + k).setFormula(`=IFNA(FILTER('${k}'!C:C, '${k}'!A:A=${notation}), "-")`);
          }
        }
      }
    }

    if (newNumValues > 0) {
      const numRows = sheet.getMaxRows() - numFrozenRows - 1;

      sheet.getRange(startRow, startColumn, numRows, numColumns).setValues(values);
    }

    sheet.sort(CURRENT_PLACE_COLUMN, true);
  }

  if (hasChangedGlobal) {
    SpreadsheetApp.flush();
    getMissing();
  }
}

function getMissing() {
  const globalSheet = sheets[0];
  const globalNumFrozenRows = globalSheet.getFrozenRows();
  const globalStartRow = globalNumFrozenRows + 1;
  const globalStartColumn = NAME_COLUMN;
  const globalNumRows = globalSheet.getMaxRows() - globalNumFrozenRows - 1;
  const globalNumColumns = PLACE_HISTORY_COLUMN;
  const globalValues = globalNumRows > 0 ? globalSheet.getRange(globalStartRow, globalStartColumn, globalNumRows, globalNumColumns).getValues() : [];
  const oldNumValues = globalValues.length;

  for (let i = 1; i < MAX_CHALLENGES; i++) {
    const sheet = sheets[i];
    const numFrozenRows = sheet.getFrozenRows();
    const startRow = numFrozenRows + 1;
    const startColumn = NAME_COLUMN;
    const numRows = sheet.getMaxRows() - numFrozenRows - 1;
    const numColumns = PLACE_HISTORY_COLUMN;
    const values = numRows > 0 ? sheet.getRange(startRow, startColumn, numRows, numColumns).getValues() : [];
    const numValues = values.length;

    for (let j = 0; j < numValues; j++) {
      const name = values[j][NAME_COLUMN - 1];
      const playerIndex = globalValues.findIndex((subValues) => subValues[NAME_COLUMN - 1] === name);
      const playerExists = playerIndex > -1;

      if (!playerExists) {
        globalValues.push([name, '', '< 100', '-', '< 100']);
      }
    }
  }

  const newNumValues = globalValues.length;
  const diff = newNumValues - oldNumValues;

  if (diff > 0) {
    globalSheet.insertRows(globalStartRow, diff);
    globalSheet.getRange(globalStartRow, globalStartColumn, diff, NUM_NAME_COLUMNS).mergeAcross();

    for (let i = 0; i < diff; i++) {
      for (let j = 1; j < MAX_CHALLENGES; j++) {
        const notation = globalSheet.getRange(globalStartRow + i, NAME_COLUMN).getA1Notation();

        globalSheet.getRange(globalStartRow + i, globalNumColumns + j).setFormula(`=IFNA(FILTER('${j}'!C:C, '${j}'!A:A=${notation}), "-")`);
      }
    }
  }

  if (newNumValues > 0) {
    const globalNumRows = globalSheet.getMaxRows() - globalNumFrozenRows - 1;

    globalSheet.getRange(globalStartRow, globalStartColumn, globalNumRows, globalNumColumns).setValues(globalValues);
  }

  globalSheet.sort(CURRENT_PLACE_COLUMN, true);
}
