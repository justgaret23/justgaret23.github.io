/*
game.js for Perlenspiel 3.3.x
Last revision: 2021-03-24 (BM)

The following comment lines are for JSHint <https://jshint.com>, a tool for monitoring code quality.
You may find them useful if your development environment is configured to support JSHint.
If you don't use JSHint (or are using it with a configuration file), you can safely delete these lines.
*/

/* jshint browser : true, devel : true, esversion : 6, freeze : true */
/* globals PS : true */

"use strict"; // Do NOT delete this directive!

//Larger gameobject - IIFE
let G = (function (){
	let gridSizeX = 8;
	let gridSizeY = 8;
	let moveCounter = 0;
	let levelIndex = 1;

	let tick = 30;
	let running = true;

	let MAP_BACKGROUND;
	let BACKGROUND_MAP_COLOR = 0xAAAAAA; //background color
	let BACKGROUND_COLOR = 0x73D672;
	let BACKGROUND_PLANE = 0; //background plane
	let BACKGROUND_RGB;

	let UI_MAP_COLOR = 0x777777;
	let UI_COLOR = 0x9EA2AB;
	let UIPosition = gridSizeY-1;



	//Define snake constants here
	let SNAKE_PLANE = 4; //plane
	let SNAKE_MAP_COLOR = 0x026F23; //color
	let SNAKE_INIT_LENGTH = 4;
	let SNAKE_EYE = 0x0298; //Snake eye glyph constant
	let SNAKE_BONK = "⨂";
	let bonked = false;

	//Changeable snake attributes
	let snakeLength = SNAKE_INIT_LENGTH; //length of snake
	let snakeDistance = 0;
	let snakeSprite; //snake sprite global id
	let snakeX; //x coordinate of snake origin
	let snakeY; //y coordinate of snake origin
	let currX; //Current x position of the snake's head
	let currY; //Current y position of the snake's head
	let canMoveSnake = false; //boolean that determines if you can move snake or not
	let isPivoting = false; //Boolean that tracks whether the player is pivoting
	let snakeLine = []; //line array

	//Store door coordinates for unlocking process
	let doorX;
	let doorY;

	//////////////////////
	//COLORS AND MARKERS//
	//////////////////////

	let POLE_MAP_COLOR = 0x784a00; //color
	let POLE_COLOR = 0x836953;
	let POLE_PLANE = 1; //plane
	let POLE_MARKER = "pole"; //marker for PS.data

	let START_MAP_COLOR = PS.COLOR_YELLOW; //color
	let START_COLOR = 0xF5D372;
	let START_PLANE = 2; //plane
	let START_MARKER = "start"; //marker for PS.data

	let GOAL_MAP_COLOR = 0xffee33; //color
	let GOAL_COLOR = 0xF6ED69;
	let GOAL_MARKER = "goal"; //marker for PS.data

	let POWERUP_MAP_COLOR = PS.COLOR_BLUE; //color
	let POWERUP_COLOR = 0xF7CAD5;
	let POWERUP_PLANE = 3; //plane
	let POWERUP_MARKER = "powerup"; //marker for PS.data

	let HINT_MAP_COLOR = 0x444444;
	let HINT_MARKER = "hint";

	let OBSTACLE_MAP_COLOR = PS.COLOR_BLACK; //color
	let OBSTACLE_COLOR = 0x4F474A;
	let OBSTACLE_PLANE = 5; //plane
	let OBSTACLE_MARKER = "obstacle"; //marker for PS.data

	let KEY_MAP_COLOR = PS.COLOR_RED;
	let KEY_COLOR = 0xF7665E;
	//use powerup plane
	let KEY_MARKER = "key";

	let DOOR_MAP_COLOR = 0xFF00FF;
	let DOOR_COLOR = 0xF7665E;
	//use powerup plane
	let LOCKED_MARKER = "locked";
	let UNLOCKED_MARKER = "unlocked"



	let timer_id;
	let mapdata;

	let imagemap = {
		width: 0,
		height: 0,
		pixelSize: 1,
		data: []
	};

	/**
	 * updates the UI keeping track of the move counter and snake length
	 * @param snakeLength - current length of snake
	 */
	let updateUI = function(snakeLength){
		//Reset UI Grid
		let oPlane = PS.gridPlane();

		//Get the individual digits of the move counter and write them down using glyphs
		//Move counter caps at 99
		if(moveCounter < 100){
			let tensDigit = Math.floor(moveCounter/10);
			let onesDigit = moveCounter % 10;

			PS.gridPlane(OBSTACLE_PLANE);

			PS.glyph(0, UIPosition, tensDigit.toString());
			PS.glyph(1, UIPosition, onesDigit.toString());
		} else {
			PS.glyph(0, UIPosition, "9");
			PS.glyph(1, UIPosition, "9");
		}

		//Update color and snake length
		PS.color(PS.ALL, UIPosition, UI_COLOR);
		for(let i = 0; i < snakeLength; i++){
			PS.color(gridSizeX - (i+1), UIPosition, SNAKE_MAP_COLOR);
			PS.border(gridSizeX - (i+1), UIPosition, {left: 5});
		}
		PS.gridPlane(oPlane);
	}

	/**
	 * load the next level
	 * @param levelIndex - level to be loaded
	 */
	let loadLevel = function(levelIndex){

		//Change the status line depending on which pixels are moved
		switch(levelIndex){
			case 1:
				PS.statusText("Drag the snake onto other pixels to move it!");
				break;
			case 6:
				PS.statusText("Click on an empty space to pivot!");
				break;
			default:
				PS.statusText("");

		}

		//Load a level depending on the level index
		if(levelIndex > 12){
			PS.statusText("You found a new home!");
			PS.imageLoad("images/tutorial" + levelIndex + ".gif", onMapLoad, 1);
			//PS.imageLoad("images/newHome.gif", onMapLoad);
		} else {
			PS.imageLoad("images/tutorial" + levelIndex + ".gif", onMapLoad, 1);
		}
	}

	/**
	 * Redraws the snake line whenever it moves
	 */
	let redrawSnakeLine = function(){
		//PS.color(snakeLine[snakePart][0], snakeLine[snakePart][1], BACKGROUND_MAP_COLOR);
		for(let i=0; i < snakeLine.length; i++){
			PS.color(snakeLine[i][0], snakeLine[i][1], BACKGROUND_COLOR);
		}
	}

	/**
	 * delete the snake line upon release to be more accurate
	 * @param snakeLine - line to be deleted
	 */
	let deleteSnakeLine = function(snakeLine){
		for(let i = snakeLine.length-1; i >= 0; i-= 1){
			PS.color(snakeLine[i][0], snakeLine[i][1], BACKGROUND_COLOR);
			PS.spriteMove(snakeSprite, snakeLine[i][0], snakeLine[i][1]);
		}
		PS.spriteMove(snakeSprite, snakeX, snakeY);
	}

	/**
	 * delete the snake line upon release to be more accurate
	 * @param snakeLine - line to be deleted
	 */
	let deleteSnakePart = function(snakeLine){
		for(let i = snakeLine.length-1; i >= 0; i-= 1){
			PS.color(snakeLine[i][0], snakeLine[i][1], BACKGROUND_COLOR);
			PS.spriteMove(snakeSprite, snakeLine[i][0], snakeLine[i][1]);
		}
		PS.spriteMove(snakeSprite, snakeX, snakeY);
	}

	/////////////////////
	//PLACING FUNCTIONS//
	/////////////////////

	/**
	 * Figures out where to place the start of the level
	 * @param x - x position
	 * @param y - y position
	 */
	let placeStart = function(x,y){
		//Set up the grid plane
		let oPlane = PS.gridPlane();
		PS.gridPlane(START_PLANE);

		//Define attributes of start
		PS.color(x,y,START_COLOR);
		//PS.glyph(x,y, "★");
		PS.alpha(x,y,PS.ALPHA_OPAQUE);
		PS.data(x,y,START_MARKER);

		//Define starting coordinates of snake
		snakeX = x;
		snakeY = y;

		//reset gridplane
		PS.gridPlane(oPlane);
	}

	/**
	 * Figures out where to place the goal of the level
	 * @param x - x position
	 * @param y - y position
	 */
	let placeGoal = function(x,y){
		//Set up the grid plane
		let oPlane = PS.gridPlane();
		PS.gridPlane(START_PLANE);

		//Define attributes of start
		PS.color(x,y,GOAL_COLOR);
		PS.glyph(x,y,"⚑");
		PS.alpha(x,y,PS.ALPHA_OPAQUE);
		PS.data(x,y,GOAL_MARKER);

		//reset gridplane
		PS.gridPlane(oPlane);
	}

	/**
	 * Figures out where to place the goal of the level
	 * @param x - x position
	 * @param y - y position
	 */
	let placePole = function(x,y){
		//Set up the grid plane
		let oPlane = PS.gridPlane();
		PS.gridPlane(POLE_PLANE);

		//Define attributes of start
		PS.color(x,y,POLE_COLOR);
		PS.alpha(x,y,PS.ALPHA_OPAQUE);
		PS.data(x,y,POLE_MARKER);

		//reset gridplane
		PS.gridPlane(oPlane);
	}

	/**
	 * Figures out where to place the power ups of the level
	 * @param x - x position
	 * @param y - y position
	 */
	let placePowerup = function(x,y){
		//Set up the grid plane
		let oPlane = PS.gridPlane();
		PS.gridPlane(POWERUP_PLANE);

		//Define attributes of start
		PS.color(x,y,POWERUP_COLOR);
		PS.alpha(x,y,PS.ALPHA_OPAQUE);
		PS.data(x,y,POWERUP_MARKER);

		//reset gridplane
		PS.gridPlane(oPlane);
	}

	let placeHint = function(x,y){
		let oPlane = PS.gridPlane();
		PS.gridPlane(BACKGROUND_PLANE);

		//Define attributes of start
		PS.color(x,y, BACKGROUND_COLOR);
		PS.border(x,y,3);
		PS.data(x,y,HINT_MARKER);
		PS.fade(x,y,30);

		PS.gridPlane(oPlane);
	}

	let placeKey = function(x,y){
		let oPlane = PS.gridPlane();
		PS.gridPlane(POWERUP_PLANE);

		//Define attributes of start
		PS.color(x,y, KEY_COLOR);
		PS.alpha(x,y,128);
		PS.data(x,y,KEY_MARKER);

		PS.gridPlane(oPlane);
	}

	let placeDoor = function(x,y){
		let oPlane = PS.gridPlane();
		PS.gridPlane(BACKGROUND_PLANE);

		//Initialize door coordinates so we can change its status later on
		doorX = x;
		doorY = y;

		//Define attributes of start
		PS.color(x,y, DOOR_COLOR);
		PS.alpha(x,y,PS.ALPHA_OPAQUE);
		PS.data(x,y,LOCKED_MARKER);

		PS.gridPlane(OBSTACLE_PLANE);
		PS.color(x,y, DOOR_COLOR);
		PS.alpha(x,y,255);
		PS.gridPlane(oPlane);
	}

	/**
	 * Figures out where to place the power ups of the level
	 * @param x - x position
	 * @param y - y position
	 */
	let placeObstacle = function(x,y){
		//Set up the grid plane
		let oPlane = PS.gridPlane();
		PS.gridPlane(OBSTACLE_PLANE);

		//Define attributes of start
		PS.color(x,y,OBSTACLE_COLOR);
		PS.alpha(x,y,PS.ALPHA_OPAQUE);
		PS.data(x,y,OBSTACLE_MARKER);

		//reset gridplane
		PS.gridPlane(oPlane);
	}

	/**
	 * Figures out where to place the background of the level
	 * @param x - x position
	 * @param y - y position
	 */
	let placeBackground = function(x,y){
		let oPlane = PS.gridPlane();
		PS.gridPlane(BACKGROUND_PLANE);


		//Define attributes of start
		PS.color(x,y,BACKGROUND_COLOR);
		PS.alpha(x,y,PS.ALPHA_OPAQUE);
		PS.fade(x, y, 30);

		//reset gridplane
		PS.gridPlane(oPlane);
	}


	/**
	 * Figures out where to place level UI
	 * @param x - current X position
	 * @param y - current Y position
	 */
	let placeUI = function(x,y){
		let oPlane = PS.gridPlane();
		PS.gridPlane(OBSTACLE_PLANE);



		//Define attributes of start
		PS.color(x,y,UI_COLOR);
		PS.alpha(x,y,PS.ALPHA_OPAQUE);
		PS.fade(x, y, 15);
		PS.border(x,y, {top: 5});

		if(x < 2){
			PS.glyph(x,y,"0");
		}
		updateUI(snakeLength);

		//reset gridplane
		PS.gridPlane(oPlane);

	}

	/**
	 * Deletes the power up from the grid upon picking it up
	 * @param x - x position of power up
	 * @param y - y position of power up
	 */
	let deletePowerup = function(x,y){
		let oPlane = PS.gridPlane();
		PS.gridPlane(POWERUP_PLANE);

		//Define attributes of start
		PS.color(x,y,BACKGROUND_COLOR);
		PS.data(x,y,"no");
		PS.fade(x,y,30);

		PS.gridPlane(oPlane);
		PS.fade(x,y,30);
	}

	/**
	 * Unlocks a door
	 * @param x
	 * @param y
	 */
	let unlockDoor = function(x,y){
		let oPlane = PS.gridPlane();
		PS.gridPlane(BACKGROUND_PLANE);

		PS.data(x,y,UNLOCKED_MARKER);

		PS.color(x,y,BACKGROUND_COLOR);
		PS.fade(x,y,30);

		PS.gridPlane(OBSTACLE_PLANE);
		PS.alpha(x,y,0);

		//reset gridplane
		PS.gridPlane(oPlane);
	}

	/**
	 * Reset the snake's position
	 */
	let resetSnake = function(){
		PS.glyph(currX,currY,"");
		PS.spriteMove(snakeSprite, snakeX, snakeY);
		PS.glyph(snakeX,snakeY, SNAKE_EYE);
		deleteSnakeLine(snakeLine);
		snakeLine = [];
		snakeDistance = 0;
		updateUI(snakeLength);
		//moveCounter += 1;
		isPivoting = false;
		canMoveSnake = false;
	}

	/**
	 * Check to see if the line overlaps with an obstacle. If it does, forcibly reset the snake
	 * @param snakeLine
	 */
	let checkObstacleOverlap = function(snakeLine){
		for(let i=0; i < snakeLine.length; i++){
			//Check to see if a line part overlaps with an obstacle. If it does, reset
			if(PS.data(snakeLine[i][0], snakeLine[i][1]) === (OBSTACLE_MARKER || LOCKED_MARKER)){
				return true;
			}
		}
		return false;
	}

	/**
	 * Checks to see if the snake is running over itself
	 * @param pivotPoint
	 * @returns {boolean}
	 */
	let dupeCheck = function(pivotPoint){
		for(let i=0; i < snakeLine.length; i++){
			if(pivotPoint[0] === snakeLine[i][0] && pivotPoint[1] === snakeLine[i][1]){
				return true;
			}
		}
		return false;
	}

	/**
	 * move the snake to a desired place and check for boundary conditions
	 * @param x - current x location of snake
	 * @param y - current y location of snake
	 */
	let moveSnake = function(x,y){
		//First, check to see if the snake can move
		//If this isn't active, just don't move
		if(canMoveSnake){

			//Get the data of the current head location
			let data = PS.data(x,y);
			//let oplane = PS.gridPlane();

			//Draw the eye glyph at current position
			if(y < UIPosition && !checkObstacleOverlap(snakeLine)){
				PS.glyph(x,y, SNAKE_EYE);
			}

			//Draw the snake line here.
				//If we are not pivoting, use PS.line
				//If we are pivoting, the player can move the snake manually
			if(!isPivoting){
				//Assign data as a grabbable variable and make a new line

				snakeLine = PS.line(snakeX, snakeY, x, y);

				//PS.debug(snakeLine);
			} else if(isPivoting){
				//Initialize a point to add
				let pivotPoint = [x,y];


				//Check to see if the snake ran into itself
				if(dupeCheck(pivotPoint)){

					PS.statusText("pog1");
					//PS.debug("X: "+ x + " Y: " + y);
					PS.glyph(x,y,"");
					let oplane = PS.gridPlane();
					PS.gridPlane(0);
					PS.glyph(x,y,"");
					PS.audioPlay("SnakeGrab", {path: "audio/", volume: 0.3});
					resetSnake();
					PS.gridPlane(oplane);
					/*
					for(let i=snakeLine.length-1; i >= 0; i--){
						PS.spriteMove(snakeSprite, snakeLine[i][0], snakeLine[i][1]);
					}

					 */
					//resetSnake();
				} else {
					snakeLine.push(pivotPoint);
				}
			}

			//PS.debug("Gridplane: " + PS.gridPlane());

			//Reset if you move onto an obstacle marker
			if(data === (OBSTACLE_MARKER || LOCKED_MARKER)){
				PS.audioPlay("SnakeGrab", {path: "audio/", volume: 0.3});
				resetSnake();
				return;
			}

			//Check to make sure length isn't being exceeded
			if((snakeDistance <= snakeLength) && canMoveSnake){
				PS.spriteMove(snakeSprite,x,y);
				let snakeSound;
				if(snakeLine.length <= 4){
					snakeSound = Math.min(snakeLine.length + (PS.random(3)-1), 12);
				} else {
					snakeSound = Math.min(snakeLine.length + 1, 11);
				}

				if(snakeSound === 0){
					snakeSound = 1;
				}


				PS.audioPlay("snakeStep" + snakeSound, {path: "audio/", volume: 0.3});

				if(checkObstacleOverlap(snakeLine) || data === LOCKED_MARKER){
					PS.glyph(x,y,"");
					let oplane = PS.gridPlane();
					PS.gridPlane(0);
					PS.glyph(x,y,"");
					PS.audioPlay("SnakeGrab", {path: "audio/", volume: 0.3});
					resetSnake();
					PS.gridPlane(oplane);
				}

				snakeDistance = snakeLine.length;
				updateUI(snakeLength-snakeDistance);
				if(snakeLength - snakeDistance < 0){
					PS.audioPlay("SnakeGrab", {path: "audio/", volume: 0.3});
					PS.statusText("The snake stretched too far!");
					if(PS.glyph(x,y) === SNAKE_EYE){
						PS.glyph(x,y,"");
					}
					resetSnake();
				}
			}

			//Increase the snake's length if you enter a powerup
			if(data === POWERUP_MARKER){
				snakeLength += 1;
				deletePowerup(x,y);
				PS.audioPlay("fx_powerup1", {volume: 0.1});
				PS.statusText("The snake's length has increased!");
			}

			//Unlock doors
			if(data === KEY_MARKER){
				PS.data(x,y, "nah");
				unlockDoor(doorX, doorY);
				PS.audioPlay("fx_powerup1", {volume: 0.1});
				PS.statusText("The door to the goal has been unlocked!");
			}

			PS.gridPlane(BACKGROUND_PLANE);

			//Color in the line area
			for(let i=0; i < snakeLine.length; i++){
				PS.color(snakeLine[i][0], snakeLine[i][1], SNAKE_MAP_COLOR);
			}

			//Auto-reset snake if it travels into the UI
			if(y === UIPosition){
				resetSnake();
			}
		}
	}

	let onMapLoad = function(image){
		if(image === PS.ERROR){
			PS.debug( "onMapLoad(): image load error\n" );
			return;
		}

		//Timer
		//throttle - should i run this tick or not?
		//timer_id = PS.timerStart(tick, redrawSnakeLine());

		//save map data for later
		mapdata = image;

		imagemap.width = gridSizeX = image.width;
		imagemap.height = gridSizeY = image.height;

		UIPosition = gridSizeY-1;

		PS.gridSize( gridSizeX, gridSizeY );
		PS.border( PS.ALL, PS.ALL, 0 );

		let i = 0;
		for(let y = 0; y < gridSizeY; y += 1){
			for(let x = 0; x < gridSizeX; x += 1){
				let data = MAP_BACKGROUND;
				let pixel = image.data[i];
				switch(pixel){
					case BACKGROUND_MAP_COLOR:
						placeBackground(x,y);
						break;
					case START_MAP_COLOR:
						placeStart(x,y);
						break;
					case GOAL_MAP_COLOR:
						placeGoal(x,y);
						break;
					case POWERUP_MAP_COLOR:
						placePowerup(x,y);
						break;
					case HINT_MAP_COLOR:
						placeHint(x,y);
						break;
					case POLE_MAP_COLOR:
						placePole(x,y);
						break;
					case OBSTACLE_MAP_COLOR:
						placeObstacle(x,y);
						break;
					case UI_MAP_COLOR:
						placeUI(x,y);
						break;
					case KEY_MAP_COLOR:
						placeKey(x,y);
						break;
					case DOOR_MAP_COLOR:
						placeDoor(x,y);
						break;
					default:
						PS.debug( "onMapLoad(): unrecognized pixel value\n" );
						break;
				}
				imagemap.data[i] = data;
				i += 1;
			}
		}

		BACKGROUND_RGB = PS.unmakeRGB(BACKGROUND_COLOR, {});
		//drawBackground(imagemap);

		//Create and move snake sprite to appropriate plane and location
		snakeSprite = PS.spriteSolid(1,1);
		PS.spriteSolidColor(snakeSprite, SNAKE_MAP_COLOR);
		PS.spritePlane(snakeSprite, SNAKE_PLANE);
		PS.spriteMove(snakeSprite, snakeX, snakeY);
		PS.glyph(snakeX,snakeY, SNAKE_EYE);
	};


	//Perlenspiel's event handlers
	return{
		init: function(){
			PS.imageLoad("images/tutorial1.gif", onMapLoad, 1);
			PS.statusText("Drag the snake onto other pixels to move it!");
			updateUI(snakeLength);


			// Install additional initialization code
			// here as needed

			// PS.dbLogin() must be called at the END
			// of the PS.init() event handler (as shown)
			// DO NOT MODIFY THIS FUNCTION CALL
			// except as instructed

			/*
			const TEAM = "pix";

			// This code should be the last thing
			// called by your PS.init() handler.
			// DO NOT MODIFY IT, except for the change
			// explained in the comment below.

			PS.dbLogin( "imgd2900", TEAM, function ( id, user ) {
				if ( user === PS.ERROR ) {
					return;
				}
				PS.dbEvent( TEAM, "startup", user );
				PS.dbSend( TEAM, PS.CURRENT, { discard : true } );
			}, { active : false } );

			 */

			// Change the false in the final line above to true
			// before deploying the code to your Web site.
		},
		touch: function(x,y){
			//If you click on the snake, you can move it
			let data = PS.data(x,y);
			if(x === snakeX && y === snakeY && !canMoveSnake){
				canMoveSnake = true;
				PS.audioPlay("snakeStep1", {path: "audio/", volume: 0.3});
			}
			//If the player clicks again on an empty space, pivot
			if(canMoveSnake){
				let endDecider = PS.random(3) + 9;
				switch(data){
					case POLE_MARKER:
					case START_MARKER:
						moveCounter += 1;
						snakeX = x;
						snakeY = y;
						if(snakeLine.length > 1){
							PS.audioPlay("snakeStep" + endDecider, {path: "audio/", volume: 0.3});
						}
						deleteSnakeLine(snakeLine);
						if(isPivoting){
							snakeLine = [];
							isPivoting = false;
							PS.statusText("Branch latched onto! Pivot isn't needed anymore...");
						}
						updateUI(snakeLength);
						// resetSnake();
						break;
					case GOAL_MARKER:
						levelIndex += 1;
						PS.audioPlay("snakeStep" + endDecider, {path: "audio/", volume: 0.3});
						//moveCounter += 1;
						resetSnake();
						loadLevel(levelIndex);
						break;
					default:
						let pivotRando = PS.random(3);
						PS.audioPlay("SnakePivot" + pivotRando, {path: "audio/", volume: 0.3});
						if(levelIndex === 6){
							PS.statusText("You can move in any direction while pivoting!");
						} else {
							PS.statusText("Pivoting...");
						}

						isPivoting = true;
						break;
				}
			}
		},
		release: function(x,y){


		},
		enter: function(x,y){
			currX = x;
			currY = y;
			if(canMoveSnake){
				moveSnake(x,y);
			}

		},
		exit: function(x,y){
			//Erase in the line area
			if(checkObstacleOverlap(snakeLine)){
				PS.glyph(x,y,"");
				PS.spriteMove(snakeSprite, snakeX, snakeY);
			}
			if(PS.glyph(x,y) === SNAKE_EYE && canMoveSnake){
				PS.glyph(x,y,"");
			}

			if(PS.data(x,y) === GOAL_MARKER){
				PS.glyph(x,y, "⚑")
			}

			if(canMoveSnake) {
				redrawSnakeLine();
			}
		},
		exitGrid: function(){
			if(canMoveSnake){
				resetSnake();
				updateUI(snakeLength);
			}

		},
		keyDown: function(key){
			switch(key){
				//Z
				case 122:

					if(levelIndex === 6){
						PS.statusText("You can move in any direction while pivoting!");
					} else {
						PS.statusText("Pivoting...");
					}

					isPivoting = true;
					break;
				case PS.KEY_ARROW_UP:
					PS.glyph(currX,currY,"");
					PS.statusText("Line was cancelled.");
					PS.audioPlay("SnakeGrab", {path: "audio/", volume: 0.3});
					resetSnake();
					break;
			}
		},
		keyUp: function(key){
			switch(key){
				//Z
				case 122:
					PS.statusText("Pivot has stopped.");
					resetSnake();
					break;
			}
		}

	};
} () );

/*
PS.init( system, options )
Called once after engine is initialized but before event-polling begins.
This function doesn't have to do anything, although initializing the grid dimensions with PS.gridSize() is recommended.
If PS.grid() is not called, the default grid dimensions (8 x 8 beads) are applied.
Any value returned is ignored.
[system : Object] = A JavaScript object containing engine and host platform information properties; see API documentation for details.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.init = G.init;

/*
PS.touch ( x, y, data, options )
Called when the left mouse button is clicked over bead(x, y), or when bead(x, y) is touched.
This function doesn't have to do anything. Any value returned is ignored.
[x : Number] = zero-based x-position (column) of the bead on the grid.
[y : Number] = zero-based y-position (row) of the bead on the grid.
[data : *] = The JavaScript value previously associated with bead(x, y) using PS.data(); default = 0.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.touch = G.touch;

/*
PS.release ( x, y, data, options )
Called when the left mouse button is released, or when a touch is lifted, over bead(x, y).
This function doesn't have to do anything. Any value returned is ignored.
[x : Number] = zero-based x-position (column) of the bead on the grid.
[y : Number] = zero-based y-position (row) of the bead on the grid.
[data : *] = The JavaScript value previously associated with bead(x, y) using PS.data(); default = 0.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.release = G.release;

/*
PS.enter ( x, y, button, data, options )
Called when the mouse cursor/touch enters bead(x, y).
This function doesn't have to do anything. Any value returned is ignored.
[x : Number] = zero-based x-position (column) of the bead on the grid.
[y : Number] = zero-based y-position (row) of the bead on the grid.
[data : *] = The JavaScript value previously associated with bead(x, y) using PS.data(); default = 0.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.enter = G.enter;

/*
PS.exit ( x, y, data, options )
Called when the mouse cursor/touch exits bead(x, y).
This function doesn't have to do anything. Any value returned is ignored.
[x : Number] = zero-based x-position (column) of the bead on the grid.
[y : Number] = zero-based y-position (row) of the bead on the grid.
[data : *] = The JavaScript value previously associated with bead(x, y) using PS.data(); default = 0.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.exit = G.exit;

/*
PS.exitGrid ( options )
Called when the mouse cursor/touch exits the grid perimeter.
This function doesn't have to do anything. Any value returned is ignored.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.exitGrid = G.exitGrid;

/*
PS.keyDown ( key, shift, ctrl, options )
Called when a key on the keyboard is pressed.
This function doesn't have to do anything. Any value returned is ignored.
[key : Number] = ASCII code of the released key, or one of the PS.KEY_* constants documented in the API.
[shift : Boolean] = true if shift key is held down, else false.
[ctrl : Boolean] = true if control key is held down, else false.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.keyDown = G.keyDown;

/*
PS.keyUp ( key, shift, ctrl, options )
Called when a key on the keyboard is released.
This function doesn't have to do anything. Any value returned is ignored.
[key : Number] = ASCII code of the released key, or one of the PS.KEY_* constants documented in the API.
[shift : Boolean] = true if shift key is held down, else false.
[ctrl : Boolean] = true if control key is held down, else false.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.keyUp = G.keyUp;

/*
PS.input ( sensors, options )
Called when a supported input device event (other than those above) is detected.
This function doesn't have to do anything. Any value returned is ignored.
[sensors : Object] = A JavaScript object with properties indicating sensor status; see API documentation for details.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
NOTE: Currently, only mouse wheel events are reported, and only when the mouse cursor is positioned directly over the grid.
*/

PS.input = function( sensors, options ) {
	// Uncomment the following code lines to inspect first parameter:

	//	 var device = sensors.wheel; // check for scroll wheel
	//
	//	 if ( device ) {
	//	   PS.debug( "PS.input(): " + device + "\n" );
	//	 }

	// Add code here for when an input event is detected.
};

/*
PS.shutdown ( options )
Called when the browser window running Perlenspiel is about to close.
This function doesn't have to do anything. Any value returned is ignored.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
NOTE: This event is generally needed only by applications utilizing networked telemetry.
*/

PS.shutdown = function( options ) {
	// Uncomment the following code line to verify operation:

	// PS.debug( "“Dave. My mind is going. I can feel it.”\n" );

	// Add code here to tidy up when Perlenspiel is about to close.
};