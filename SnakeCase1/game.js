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

	let MAP_BACKGROUND;


	let BACKGROUND_COLOR = 0xAAAAAA;
	let UI_COLOR = 0x777777;
	let UIPosition = gridSizeY-1;

	let BACKGROUND_PLANE = 0;


	//What objects will be on the game screen?
	//UI
	//Snake
	//Start
	//Goal
	//Powerups
	//Poles
	//Obstacles


	let SNAKE_PLANE = 4;
	let SNAKE_COLOR = 0x6CBB3C;
	let snakeLength = 3;
	let snakeSprite;
	let snakeX;
	let snakeY;
	let snakePosition;

	let POLE_COLOR = 0x784a00;
	let POLE_PLANE = 1;
	let POLE_MARKER = "pole";

	let START_COLOR = PS.COLOR_YELLOW;
	let START_PLANE = 2;
	let START_MARKER = "start";

	let GOAL_COLOR = 0xffee33;
	let GOAL_PLANE = 2;
	let GOAL_MARKER = "goal";

	let POWERUP_COLOR = PS.COLOR_BLUE;
	let POWERUP_PLANE = 3;
	let POWERUP_MARKER = "powerup";

	let OBSTACLE_COLOR = PS.COLOR_BLACK;
	let OBSTACLE_PLANE = 5;
	let OBSTACLE_MARKER = "obstacle";


	let timer_id;
	let mapdata;

	let imagemap = {
		width: 0,
		height: 0,
		pixelSize: 1,
		data: []
	};

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

	let snakeInitPlace = function(x,y){
		let oPlane = PS.gridPlane();
		PS.gridPlane
	}

	let moveSnake = function(x,y){
		//erase the previous line


	}

	let releaseSnake = function(x,y){

	}









	//Perlenspiel's event handlers
	return{
		init: function(){

			let onMapLoad = function(image){
				if(image === PS.ERROR){
					PS.debug( "onMapLoad(): image load error\n" );
					return;
				}

				//save map data for later
				mapdata = image;

				imagemap.width = GRID_LENGTH = image.width;
				imagemap.height = GRID_HEIGHT = image.height;

				PS.gridSize( GRID_X, GRID_Y );
				PS.border( PS.ALL, PS.ALL, 0 );

				let i = 0;
				for(let y = 0; y < GRID_HEIGHT; y += 1){
					for(let x = 0; x < GRID_LENGTH; x += 1){
						let data = MAP_BACKGROUND;
						let pixel = image.data[i];
						switch(pixel){
							case BACKGROUND_COLOR:
								break;
							case START_COLOR:
								placeStart(x,y);
								break;
							case GOAL_COLOR:
								placeGoal(x,y);
								break;
							case POWERUP_COLOR:
								placePowerup(x,y);
								break;
							case POLE_COLOR:
								placePole(x,y);
								break;
							case OBSTACLE_COLOR:
								placeObstacle(x,y);
								break;
							case UI_COLOR:
								PS.border(x,y, {top: 5});
								break;
							default:
								PS.debug( "onMapLoad(): unrecognized pixel value\n" );
								break;
						}
						imagemap.data[i] = data;
						i += 1;
					}
				}

				//Create and move snake sprite to appropriate plane and location
				snakeSprite = PS.spriteSolid(1,1);
				PS.solidSpriteColor(snakeSprite, SNAKE_COLOR);
				PS.spritePlane(snakeSprite, SNAKE_PLANE);
				PS.spriteMove(snakeSprite, snakeX, snakeY);
			};

			PS.imageLoad("images/demo.bmp", onMapLoad, 1);
			/*
			PS.gridSize( gridSizeX, gridSizeY); // or whatever size you want
			//PS.gridColor(BACKGROUND_COLOR);

			//Color background appropriately
			for(let i=0; i < UIPosition; i++){
				PS.color(PS.ALL, i, BACKGROUND_COLOR);
			}
			//Color UI bar
			PS.color(PS.ALL, UIPosition, UI_COLOR);

			for(let i = 0; i < snakeLength; i++){
				PS.color(gridSizeX-(i+1), UIPosition, SNAKE_COLOR);
			}

			PS.color(2,5,SNAKE_COLOR);
			PS.color(5,4,POLE_COLOR);
			PS.color(4,1,GOAL_COLOR);

			//Remove borders initially
			PS.border(PS.ALL, PS.ALL, 0);
			PS.border(PS.ALL, UIPosition, {top: 10});

			 */




			// Install additional initialization code
			// here as needed

			// PS.dbLogin() must be called at the END
			// of the PS.init() event handler (as shown)
			// DO NOT MODIFY THIS FUNCTION CALL
			// except as instructed

			/*
			const TEAM = "teamname";

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

		},
		release: function(x,y){

		},
		enter: function(x,y){

		},
		exit: function(x,y){

		},
		exitGrid: function(){

		},
		keyDown: function(key){

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

PS.keyUp = function( key, shift, ctrl, options ) {
	// Uncomment the following code line to inspect first three parameters:

	// PS.debug( "PS.keyUp(): key=" + key + ", shift=" + shift + ", ctrl=" + ctrl + "\n" );

	// Add code here for when a key is released.
};

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

