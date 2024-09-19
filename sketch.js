// Webscocket variabelen
let socket;

// online data variabelen
let joinedLobbyId = null;
let playerId = null;
let joinedTime = 0;

// eindig game variabelen
let gameEnded = false;
let winner = 0;
let winningLine = null;

// Geschiedenis variabelen
let history = [];
let watchHistory = false, backButton = null;

// Reset game variabelen
const resetGameTime = 10; 
let timer = 0;

//Cell variabelen
const cells = [];

const cellStartPosX = 50;
const cellStartPosY = 50;

const cellAmountsX = 3;
const cellAmountsY = 3;
const cellWidth = 100;
const cellHeight = 100;

// Huidige speler
let currentPlayer = 1;

// Winnen combinaties
const winningCombos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Horizontaal
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Verticaal
    [0, 4, 8], [2, 4, 6] // Diagonaal
];
  

function setup() {
   // Connect met de websocket
    socket = new WebSocket('ws://localhost:3000');

    createCanvas(900, 900);
    background(255);

    // Maak buttons aan om een lobby te hosten of joinen
    let hostButton = createButton('Host lobby');
    hostButton.position(200, 200);
    hostButton.mousePressed(hostLobby);

    let joinButton = createButton('Join lobby');
    joinButton.position(200, 250);
    joinButton.mousePressed(joinLobby);


    // Dit runt wanneer er een bericht binnenkomt van uit de websocket
    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        // Kijk waarvoor het bericht is en voer de bijbehorende actie uit
        if (data.type === 'created') {
            console.log('Lobby created with ID:', data.lobbyId);
            joinedLobbyId = data.lobbyId;
            playerId = data.playerId;
            console.log('Player ID:', playerId);
            hostButton.hide();
            joinButton.hide();
        } else if (data.type === 'joined') {
            console.log('Joined lobby with ID:', data.lobbyId);
            joinedLobbyId = data.lobbyId;
            playerId = data.playerId;
            console.log('Player ID:', playerId);
            hostButton.hide();
            joinButton.hide();
        } else if (data.type === 'kicked') {
            console.log('You have been kicked from the lobby');
            joinedLobbyId = null;
            hostButton.show();
            joinButton.show();
        }else if(data.type === 'move') {
            cells[data.cellIndex].player = currentPlayer;
            currentPlayer = data.playerId == 1 ? 2 : 1;
            endGameCheck();
        } else if (data.type === 'error') {
            console.log('Error:', data.message);
        }
    };


    // Maak de cellen aan op de juiste coordinaten
    for (let i = 0; i < cellAmountsX; i++) {
        for (let j = 0; j < cellAmountsY; j++) {
            cells.push({ x: cellStartPosX + cellWidth * i, y: cellStartPosY + cellHeight * j, player: 0 });
        }
    }
}

function draw() {
    background(255);
    // Kijkt ofdat je in een lobby zit
    if (joinedLobbyId != null) {
        // Reset de text agline weer naar standaard
        textAlign(LEFT, BASELINE);
        fill(0);
        textSize(15);
        // Laat het speler ID zien
        text(`playerId: ${playerId}`, 50, 40);

        // Kijkt ofdat het spel is geëindigd
        if(gameEnded == true) {
            textSize(28);
            // Laat zien wie er heeft gewonnen of dat het gelijkspel is
            if(winner !== 0){
              text(`Speler ${winner} heeft gewonnen!`, 50, 25);
            }else{
              text('Gelijkspel!', 50, 25);
            }
            
            // kijkt ofdat de game gereset moet worden
            if(millis() - timer > resetGameTime * 1000){
              gameEnded = false;
              currentPlayer = 1;
              winner = 0;

              // zorgt ervoor dat alle cellen weer leeg zijn
              for (let i = 0; i < cells.length; i++) {
                cells[i].player = 0;
              }
            }
        }else{
            // Laat zien welke speler aan de beurt is
            textSize(20);
            text(`Speler ${currentPlayer} is aan de beurt.`, 50, 20);
        }

        textSize(10);
        fill(0);
        // Laat zien in welke lobby je zit
        text(`Joined Lobby: ${joinedLobbyId}`, 250, 40);

        // Laat de cellen zien
        for (let i = 0; i < cells.length; i++) {
            fill(255);
            rect(cells[i].x, cells[i].y, cellWidth, cellHeight);
            fill(0);

            // Veranderd de text algin naar het midden dat de text altijd in het midden zit.
            textAlign(CENTER, CENTER);
            textSize(cellWidth * 0.5);
            if (cells[i].player === 1) {
              text('X', cells[i].x + cellWidth / 2, cells[i].y + cellHeight / 2);
            } else if (cells[i].player === 2) {
              text('O', cells[i].x + cellWidth / 2, cells[i].y + cellHeight / 2);
            }
        }

        // Maak een lijn over de winnende cellen
        if(gameEnded == true && winner != 0){
            const [a, b, c] = winningLine;
            strokeWeight(5);
            line(cells[a].x + cellWidth / 2, cells[a].y + cellHeight / 2, cells[c].x + cellWidth / 2, cells[c].y + cellHeight / 2);
        }
        strokeWeight(1);
        
        // reset de text algin naar standaard
        textAlign(LEFT, BASELINE);
        fill(0);

        // Kijkt ofdat er een spel geschiedenis word weergegeven
        if(watchHistory == false){
            textSize(15);
            text('Geschiedenis:', 500, 50);

            // Laat alle geschiedenis zien
            for (let i = 0; i < history.length; i++) {
              // kijkt welke ronde het is
              let historyText = `Ronde ${i + 1}: `;
              // kijkt wie er heeft gewonnen of dat het gelijkspel is
              if (history[i].winner !== 0) {
                historyText += `Speler ${history[i].winner} heeft gewonnen!`;
              } else {
                historyText += 'Gelijkspel!';
              }
              // voegt de tijd toe
              historyText += ` (${new Date(history[i].time).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })})`;
              text(historyText, 500, 70 + 50 * i);
              
              // Kijk ofdat er al een button is aangemaakt
              if(!history[i].button){
                // als er geen button is maak er een aan
                let button = createButton('Bekijk');
                button.position(500, 82.5 + 50 * i);
                button.mousePressed(() => {
                  watchHistory = history[i];
                });
        
                history[i].button = button;
              }
            }
        }else{
            // Verwijder alle buttons
            for (let i = 0; i < history.length; i++) {
              if (history[i].button) {
                history[i].button.remove(); 
                history[i].button = null;
              }
            }
            
            // kijk ofdat er al een back button is aangemaakt
            if(backButton === null){
              // als er geen back button is maak er een aan
              backButton = createButton('Terug');
              backButton.position(500, 15);
        
              backButton.mousePressed(() => {
                watchHistory = false;
                backButton.remove();
                backButton = null;
              });
            }
            // krijg de cellen van de geschiedenis
            const historyCells = watchHistory.cells;

            // Laat de cellen zien
            for (let i = 0; i < historyCells.length; i++) {
              fill(255);
              rect(historyCells[i].x + 450, historyCells[i].y, cellWidth, cellHeight);
              fill(0);
        
              textAlign(CENTER, CENTER);
              textSize(cellWidth * 0.5);
              if (historyCells[i].player === 1) {
                text('X', (historyCells[i].x + 450) + cellWidth / 2, historyCells[i].y + cellHeight / 2);
              } else if (historyCells[i].player === 2) {
                text('O', (historyCells[i].x + 450) + cellWidth / 2, historyCells[i].y + cellHeight / 2);
              }
            }
        }
    }else{
        // kijkt ofdat de buttons er zijn en verwijderd ze
        for (let i = 0; i < history.length; i++) {
            if (history[i].button) {
              history[i].button.remove(); 
              history[i].button = null;
            }
        }
        // kijkt ofdat de back button er is en verwijderd hem
        if(backButton != null){
            backButton.remove();
            backButton = null;
        }
    }
}

function mouseClicked() {
  console.log(millis() - joinedTime);
    // Kijkt ofdat je in een lobby zit en ofdat de speler een zet kan doen
    if(joinedLobbyId == null || currentPlayer != playerId || gameEnded == true || millis() - joinedTime < 1000){ 
        return;
    }
    // gaat alle cellen langs om te kijken ofdat daarin is geklikt
    for (let i = 0; i < cells.length; i++) {
      if (mouseX > cells[i].x && mouseX < cells[i].x + cellWidth && mouseY > cells[i].y && mouseY < cells[i].y + cellHeight) {
        if (cells[i].player === 0) {
            // zet de cell goed
            cells[i].player = currentPlayer; 

            // stuur een bericht naar de websocket zodat de speler aan de andere kant ook de zet ziet
            const message = {
                type: 'move',
                cellIndex: i,
                lobbyId: joinedLobbyId,
                playerId: playerId
            };
            socket.send(JSON.stringify(message));

            // verander de huidige speler
            currentPlayer = currentPlayer == 1 ? 2 : 1; 

            // kijkt ofdat het spel geëindigd moet worden
            endGameCheck();
        }
      }
    }
}

function endGameCheck() {
    let allCellsFilled = true;

    // kijkt ofdat alle cellen gevuld zijn
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].player === 0) {
        allCellsFilled = false;
      }
    }
    
    // kijkt ofdat er een winnaar is
    for (let combo of winningCombos) {
      let [a, b, c] = combo;
      if (cells[a].player !== 0 && cells[a].player === cells[b].player && cells[a].player === cells[c].player) {
        winner = cells[a].player;
        winningLine = combo;
      }
    }
    
    // kijkt ofdat er een winner of alle cellen gevuld zijn
    if (winner !== 0 || allCellsFilled) {
        gameEnded = true;
        timer = millis();

        // voeg de game toe aan de geschiedenis
        const historyCells = cells.map(cell => ({ x: cell.x, y: cell.y, player: cell.player }));
        history.push({ time: new Date(), winner: winner, gameMode: 'PlayervsPlayer', cells: historyCells });
    }
}

function hostLobby() {
    // verstuur een bericht naar de websocket dat er een lobby moet worden aangemaakt
    joinedTime = millis();
    const message = {
        type: 'create'
    };
    socket.send(JSON.stringify(message));
}

function joinLobby() {
    // vraag de speler om een lobby ID
    const lobbyId = prompt('Enter Lobby ID:');
    joinedTime = millis();
    // kijk ofdat de speler een lobby ID heeft ingevoerd
    if (lobbyId) {
        // verstuur een bericht naar de websocket dat de speler een lobby wilt joinen
        const message = {
            type: 'join',
            lobbyId: lobbyId
        };
        socket.send(JSON.stringify(message));
    }
}