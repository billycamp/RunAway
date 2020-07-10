//game namespace
var ns_gns = ns_gns || {};

// gns scope globals
ns_gns.scoreIncrement = 0;
ns_gns.context;
ns_gns.mapWidth;
ns_gns.mapHeight;
ns_gns.movingObjects = new Array();
ns_gns.monsterCount = Math.floor(Math.random() * 5) + 3;
ns_gns.squareSize = 20;
ns_gns.isDead = false;
ns_gns.isStarted = false;
ns_gns.monstersStillMoving = false;
ns_gns.monsterMoveInterval = 50; //let each monster decide direction or not every .05 seconds
ns_gns.addMonsterInterval = 5000; //add a monster every 5 seconds
ns_gns.MonsterTypes = { sleepy: 0, stupid: 1, smart: 2, evil: 3 };
ns_gns.scoreBoardIntervalHandle;  //holder for scoreboard update interval handle
ns_gns.scoreBoardIntervalMS = 200;


ns_gns.rect = function (x,y,h,w)
{
    this.x = x;
    this.y = y;
    this.h = h;
    this.w = w;
}

Object.freeze(ns_gns.MonsterTypes);

//moving objects
ns_gns.Player = function (score, x, y, h, w) {
    this.score = score;
    this.goRight = false;
    this.goLeft = false;
    this.goUp = false;
    this.goDown = false;
    this.velocity = 3;
    this.rect = new ns_gns.rect(x, y, h, w);
    this.image = document.getElementById("playerImg");
}
ns_gns.Monster = function (rect, monsterType) {
    this.goRight = false;
    this.goLeft = false;
    this.goUp = false;
    this.goDown = false;
    this.rect = rect;
    this.MonsterType = monsterType;
    

    switch (this.MonsterType) {
        case ns_gns.MonsterTypes.sleepy:
            this.image = document.getElementById("sleepyImg");
            this.velocity = 1;
            break;
        case ns_gns.MonsterTypes.stupid:
            this.image = document.getElementById("stupidImg");
            //this.fillStyle = "#00ffff";
            this.velocity = 4;
            break;
        case ns_gns.MonsterTypes.smart:
            this.image =  document.getElementById("smartImg");
            //this.fillStyle = "#aa00ff";
            this.velocity = 5;
            break;
        case ns_gns.MonsterTypes.evil:
            this.image = document.getElementById("evilImg");
            this.velocity = 7;
            break;
        }
}

//monster control
ns_gns.addMonster = function (newMonsterType) {
    var newMonsterLocation = new ns_gns.rect( Math.floor((Math.random() * (ns_gns.mapWidth - ns_gns.squareSize)) + 1),
                                              Math.floor((Math.random() * (ns_gns.mapHeight - ns_gns.squareSize)) + 1),
                                              ns_gns.squareSize,
                                              ns_gns.squareSize);

    //don't put the new monster right on the player
    var playerHalo = new ns_gns.rect(ns_gns.movingObjects[0].rect.x - ns_gns.squareSize,
                                     ns_gns.movingObjects[0].rect.y - ns_gns.squareSize,
                                     ns_gns.movingObjects[0].rect.w + (ns_gns.squareSize * 2),
                                     ns_gns.movingObjects[0].rect.h + (ns_gns.squareSize * 2));
    while (ns_gns.isCollide(newMonsterLocation, playerHalo)) {
        newMonsterLocation = new ns_gns.rect(Math.floor((Math.random() * (ns_gns.mapWidth - ns_gns.squareSize)) + 1), Math.floor((Math.random() * (ns_gns.mapHeight - ns_gns.squareSize)) + 1), ns_gns.squareSize, ns_gns.squareSize);
    }

    // todo smarter monster type picker
    // todo abstract magic numbers
    // 30% of monsters are sleepy, 30% dumb, 20% smart, 10% evil
    if (newMonsterType === undefined) {
        var newMonsterRoll = Math.random();

        if (newMonsterRoll >= .9) {
            newMonsterType = ns_gns.MonsterTypes.evil;
        }
        else {
            if (newMonsterRoll < .9 && newMonsterRoll >= .7) {
                newMonsterType = ns_gns.MonsterTypes.smart;
            } else {
                if (newMonsterRoll < .7 && newMonsterRoll >= .3) {
                    newMonsterType = ns_gns.MonsterTypes.stupid;
                } else {
                    if (newMonsterRoll < .3) {
                        newMonsterType = ns_gns.MonsterTypes.sleepy;
                    }
                }
            }

        }
    }
    ns_gns.movingObjects.push(new ns_gns.Monster(newMonsterLocation, newMonsterType));
    ns_gns.scoreIncrement += newMonsterType;
}
ns_gns.moveMonsters = function () {
    //once we have enough monsters, we might need to stop from piling up calls to move
    if (!ns_gns.monstersStillMoving) {
        ns_gns.monstersStillMoving = true;
        ns_gns.movingObjects.forEach(ns_gns.moveEachMonster);
        ns_gns.monstersStillMoving = false;
    }
    
}
ns_gns.moveEachMonster = function (monster, index) {
    // 1 2 3
    // 4 - 5
    // 6 7 8
    var direction = 0;
    var player = ns_gns.movingObjects[0];
    //skip player 0, don't move if dead      
   
    if (index > 0 && (!ns_gns.isDead)) {
        var newMonsterMoveRoll = Math.random();
        var distance = ns_gns.getDistanceBetweenMovingObjects(monster, player);
        //refactor: Replace magic numbers with constants
        switch (monster.MonsterType) {
            case ns_gns.MonsterTypes.sleepy:
                //5% chance of sleepy monster change direction, direction random
                //50% chance of stopping
                if (newMonsterMoveRoll > .95 ) {
                    //Pick a direction
                    direction = Math.floor(Math.random() * 8) + 1;
                } else if (newMonsterMoveRoll < .5) {
                    //stop
                    direction = -1;
                } 
                break;
            case ns_gns.MonsterTypes.stupid:
                //20% chance of change direction randomly, 10% chance of moving towards player 
                //20% chance of stopping
                if (newMonsterMoveRoll > .7 && newMonsterMoveRoll <= .9) {
                    //Pick a direction
                    direction = Math.floor(Math.random() * 8) + 1;
                } else if (newMonsterMoveRoll > .9 ) {
                    direction = ns_gns.getDirectionTowardsPlayer(monster, player);
                } else if (newMonsterMoveRoll < .2) {
                    //stop
                    direction = -1;
                }
                break;
            case ns_gns.MonsterTypes.smart:
                //5% chance of change direction randomly, 25% chance of moving towards player (100% if close) 
                if (newMonsterMoveRoll > .95) {
                    //Pick a direction
                    direction = Math.floor(Math.random() * 8) + 1;
                } else if (newMonsterMoveRoll < .26 || distance < 50) {
                    direction = ns_gns.getDirectionTowardsPlayer(monster, player);
                }
                break;
            case ns_gns.MonsterTypes.evil:
                //90% total chance of moving chance of moving towards player unless player
                //is close, then 100%
                if (newMonsterMoveRoll > .1 || distance < 100) {
                    direction = ns_gns.getDirectionTowardsPlayer(monster, player);
                } else {
                    direction = Math.floor(Math.random() * 8) + 1;
                }
                break;
        }

        ns_gns.monsterMovePattern(monster, direction);
        ns_gns.moveAnything(index);
    }
}
//draw
ns_gns.clearCanvas = function () {
    ns_gns.context.clearRect(0, 0, ns_gns.mapWidth, ns_gns.mapHeight);
}
ns_gns.draw = function () {
    ns_gns.clearCanvas();
    ns_gns.processKbd();
    ns_gns.movingObjects.forEach(ns_gns.drawEach);
    window.requestAnimationFrame(ns_gns.draw);
}
ns_gns.drawEach = function (item, index) {
    //ns_gns.context.fillStyle = item.fillStyle;
    //ns_gns.context.fillRect(item.rect.x, item.rect.y, item.rect.w, item.rect.h);
    ns_gns.context.drawImage(item.image, item.rect.x, item.rect.y, item.rect.w, item.rect.h)
    
    //check collide now
    if (index > 0) {
        //skip collide test for player object 0
        //set to dead if collide, stop movement
        if (ns_gns.isCollide(item.rect, ns_gns.movingObjects[0].rect)) {
            ns_gns.isDead = true;
            ns_gns.movingObjects[0].goRight = false;
            ns_gns.movingObjects[0].goLeft = false;
            ns_gns.movingObjects[0].goUp = false;
            ns_gns.movingObjects[0].goDown = false;
        }

    }

}
//score
ns_gns.setHighScore = function (score) {
    var scoreArray = ns_gns.getHighScoreArray();
    var swap = 0;
    scoreArray.unshift(score);

    for (var f = 0; f < scoreArray.length-1; f++) {
        if (parseInt(scoreArray[f + 1]) > parseInt(scoreArray[f]) ) {
            swap = scoreArray[f+1];
            scoreArray[f + 1] = scoreArray[f];
            scoreArray[f] = swap;
        }
    }
    scoreArray = scoreArray.slice(0, 5);

    document.cookie = "High Score=" + ns_gns.formatScoreArray(scoreArray, ",") + ";expires=Tue, 19 Jan 2038 03:14:07 UTC;";

    return (parseInt(score) >= parseInt(scoreArray[0]));
}
ns_gns.formatScoreArray = function (scoreArray, delimiter) {
    var scoreListStr = "";
    for (var f = 0; f < scoreArray.length; f++) {
        scoreListStr = scoreListStr + scoreArray[f];
        if (f == scoreArray.length - 1) {
            delimiter = "";
        }
        scoreListStr = scoreListStr + delimiter;
    }
    return scoreListStr;
}
ns_gns.getHighScoreArray = function () {
    var highScore = document.cookie ? document.cookie : "High Score=0,0,0,0,0";
    var unpack = highScore.split("=");
    var scoreArray = unpack[1].split(",");
    return scoreArray;
}
ns_gns.getHighScoreHtml = function () {
    return ns_gns.formatScoreArray(ns_gns.getHighScoreArray(), "<br />");
}
ns_gns.showScoreHtml = function (score) {

    document.getElementById("scoreValue").innerText = score;
}
ns_gns.scoreBoard = function () {

    var score = ns_gns.movingObjects[0].score;
    ns_gns.showScoreHtml(score);
    
    if (ns_gns.isDead) {
        //Don't call again
        window.clearInterval(ns_gns.scoreBoardIntervalHandle);
        //check list and add score if appropriate
        var newHS = ns_gns.setHighScore(score);
        //todo replace with dialog
        var finishStr;
        if (newHS) {
            //HTML finishStr = "\x3Ch1\x3EGame Over\x3C\x2Fh1\x3E\x3Cstrong\x3EGreat Game - You set a new high score!\x3Cbr \x2F\x3E\x3Cbr \x2F\x3EPress Enter key to play again!\x3C\x2Fstrong\x3E";
            finishStr = "Great Game - You set a new high score! Press Enter key to play again!";
        } else {
            //HTML finishStr = "\x3Ch1\x3EGame Over\x3C\x2Fh1\x3E\x3Cstrong\x3EThe monsters are getting ready for you...\x3Cbr \x2F\x3E\x3Cbr \x2F\x3EPress Enter to play again!\x3C\x2Fstrong\x3E";
            finishStr = "Game Over. More monsters are getting ready for you... Press Enter to play again!";
        }

        ns_gns.showBanner(finishStr);

        //ns_gns.gameStateControl();
        location.reload();

    }
    else {

        ns_gns.movingObjects[0].score += ns_gns.scoreIncrement;
    }
    
}
// movement
ns_gns.getDistanceBetweenMovingObjects = function (mover1, mover2)
{
    var a = mover1.rect.x - mover2.rect.x;
    var b = mover1.rect.y - mover2.rect.y;
    return Math.sqrt(a * a + b * b);
}
ns_gns.getDirectionTowardsPlayer = function (monster,player) {
    // 1 2 3
    // 4 - 5
    // 6 7 8
    var direction = 0;
    if (monster.rect.y > player.rect.y) {
        // 1, 2, or 3
        if (monster.rect.x > player.rect.x) {
            direction = 1;
        }
        else if (monster.rect.x < player.rect.x) {
            direction = 3;
        } else {
            direction = 2;
        }

    } else if (monster.rect.y < player.rect.y) {
        //6, 7, or 8
        if (monster.rect.x > player.rect.x) {
            direction = 6;
        }
        else if (monster.rect.x < player.rect.x) {
            direction = 8;
        } else {
            direction = 7;
        }
    } else if (monster.rect.x > player.rect.x) {
        direction = 4;
    } else {
        direction = 5;
    }
    return direction;
}
ns_gns.monsterMovePattern = function (monster, direction) {
    // 1 2 3
    // 4 - 5
    // 6 7 8
    //stop = -1

    switch (direction) {
        case -1:
            monster.goRight = false;
            monster.goLeft = false;
            monster.goUp = false;
            monster.goDown = false;
            break;
        case 1:
            monster.goRight = false;
            monster.goLeft = true;
            monster.goUp = true;
            monster.goDown = false;
            break;
        case 2:
            monster.goRight = false;
            monster.goLeft = false;
            monster.goUp = true;
            monster.goDown = false;
            break;
        case 3:
            monster.goRight = true;
            monster.goLeft = false;
            monster.goUp = true;
            monster.goDown = false;
            break;
        case 4:
            monster.goRight = false;
            monster.goLeft = true;
            monster.goUp = false;
            monster.goDown = false;
            break;
        case 5:
            monster.goRight = true;
            monster.goLeft = false;
            monster.goUp = false;
            monster.goDown = false;
            break;
        case 6:
            monster.goRight = false;
            monster.goLeft = true;
            monster.goUp = false;
            monster.goDown = true;
            break;
        case 7:
            monster.goRight = false;
            monster.goLeft = true;
            monster.goUp = false;
            monster.goDown = true;
            break;
        case 8:
            monster.goRight = true;
            monster.goLeft = false;
            monster.goUp = false;
            monster.goDown = true;
            break;
    }

}
ns_gns.isCollide = function (rect1, rect2) {
    //simple rect collide check from https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
    return (rect1.x < rect2.x + rect2.w &&
            rect1.x + rect1.w > rect2.x &&
            rect1.y < rect2.y + rect2.h &&
            rect1.h + rect1.y > rect2.y);
}
ns_gns.moveAnything = function (index) {
    var thing = ns_gns.movingObjects[index];
    //Speed
    if (thing.goRight) ns_gns.movingObjects[index].rect.x += thing.velocity;
    if (thing.goLeft) ns_gns.movingObjects[index].rect.x -= thing.velocity;
    if (thing.goUp) ns_gns.movingObjects[index].rect.y -= thing.velocity;
    if (thing.goDown) ns_gns.movingObjects[index].rect.y += thing.velocity;
    //wall
    //if (thing.rect.x <= 0) ns_gns.movingObjects[index].rect.x = 0;
    //if ((thing.rect.x + thing.rect.w) >= ns_gns.mapWidth) ns_gns.movingObjects[index].rect.x = ns_gns.mapWidth - thing.rect.w;
    //if (thing.rect.y <= 0) ns_gns.movingObjects[index].rect.y = 0;
    //if ((thing.rect.y + ns_gns.movingObjects[index].rect.h) >= ns_gns.mapHeight) ns_gns.movingObjects[index].rect.y = ns_gns.mapHeight - thing.rect.h;
    if (thing.rect.x < 0) ns_gns.movingObjects[index].rect.x = ns_gns.mapWidth - thing.rect.w;
    if ((thing.rect.x + thing.rect.w) > ns_gns.mapWidth) ns_gns.movingObjects[index].rect.x = 0;
    if (thing.rect.y < 0) ns_gns.movingObjects[index].rect.y = ns_gns.mapHeight - thing.rect.h;
    if ((thing.rect.y + ns_gns.movingObjects[index].rect.h) > ns_gns.mapHeight) ns_gns.movingObjects[index].rect.y = 0;

}
//Player control 
ns_gns.processKbd = function () {
    if (!ns_gns.isDead) {
        ns_gns.moveAnything(0);
    }
}
ns_gns.onKeyDown = function (evt) {
    if (evt.keyCode == 39 || evt.keyCode == 68) ns_gns.movingObjects[0].goRight = true;
    if (evt.keyCode == 37 || evt.keyCode == 65) ns_gns.movingObjects[0].goLeft = true;
    if (evt.keyCode == 38 || evt.keyCode == 87) ns_gns.movingObjects[0].goUp = true;
    if (evt.keyCode == 40 || evt.keyCode == 83) ns_gns.movingObjects[0].goDown = true;
}
ns_gns.onKeyUp = function (evt) {
    if (evt.keyCode == 13) ns_gns.gameStateControl();
    if (evt.keyCode == 39 || evt.keyCode == 68) ns_gns.movingObjects[0].goRight = false;
    if (evt.keyCode == 37 || evt.keyCode == 65) ns_gns.movingObjects[0].goLeft = false;
    if (evt.keyCode == 38 || evt.keyCode == 87) ns_gns.movingObjects[0].goUp = false;
    if (evt.keyCode == 40 || evt.keyCode == 83) ns_gns.movingObjects[0].goDown = false;
}
//setup
ns_gns.init = function () {
    //todo - move magic #s to constants
    var winWidth = window.innerWidth;
    var winHeight = window.innerHeight;
    $('#losCanvas')[0].width = winWidth - (Math.round(winWidth / 4) );
    $('#losCanvas')[0].height = winHeight -(Math.round(winHeight / 8) );
    ns_gns.context = $('#losCanvas')[0].getContext('2d');
    ns_gns.mapWidth = $('#losCanvas').width();
    ns_gns.mapHeight = $('#losCanvas').height();
    //add player
    ns_gns.movingObjects.push(new ns_gns.Player(0, (ns_gns.mapWidth - ns_gns.squareSize) / 2, (ns_gns.mapHeight - ns_gns.squareSize) / 2, ns_gns.squareSize, ns_gns.squareSize));  //use index 0 for player
    //Add 5 sleepy monsters
    for (i = 0; i < 6; i++) {
        ns_gns.addMonster(ns_gns.MonsterTypes.sleepy);
    }
    //Add 1 evil monster
    ns_gns.addMonster(ns_gns.MonsterTypes.evil);

    //Add remaining MonsterCount (random types)
    for (f = 0; f < ns_gns.monsterCount; f++) {
        ns_gns.addMonster();
    }

    document.getElementById("highScore").innerHTML = ns_gns.getHighScoreHtml();
    
    ns_gns.gameStateControl();
}
ns_gns.showBanner = function (htmlStr) {
    //TODO replace with Div showing game to avoid page reload
    alert(htmlStr);

}
ns_gns.gameStart = function () {
    //give points and display death (if applicable) every 1/5 of a second
    ns_gns.scoreBoardIntervalHandle = setInterval(ns_gns.scoreBoard, ns_gns.scoreBoardIntervalMS);

    //Monster management
    setInterval(ns_gns.moveMonsters, ns_gns.monsterMoveInterval);
    setInterval(ns_gns.addMonster, ns_gns.addMonsterInterval);

    //start animation loop
    window.requestAnimationFrame(ns_gns.draw);
}
ns_gns.gameStateControl = function()
{
    if (!ns_gns.isStarted) {
        //ns_gns.hideBanner();
        ns_gns.isStarted = true;
        ns_gns.gameStart();
    } else if (ns_gns.isDead) {
        
        location.reload();
    }
}

//kbd handlers
$(document).keydown(ns_gns.onKeyDown);
$(document).keyup(ns_gns.onKeyUp);