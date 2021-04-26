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


let G = ( function (){

	//Colors
	let BACKGROUND_MAP_COLOR = 0xFFFFFF;
	let WALL_MAP_COLOR = 0x000000;
	let SPAWN_MAP_COLOR = 0x00FF00;
	let DOOR_MAP_COLOR = 0x0000FF;
	let SNAKE_MAP_COLOR = 0x009900;

	//maps for pathfinder
	let MAP_GROUND = 1;
	let MAP_WALL = 0;

	//planes
	let MAP_PLANE = 0;
	let EGGPLANT_PLANE = 1;
	let NPC_PLANE = 2;
	let ENEMY_PLANE = 3;
	let PLAYER_PLANE = 4;

	//sprite ids
	let ratSprite;
	let humanSprite;
	let porcupineSprite;
	let birdSprite;
	let snakeSprite;

	//grid variables
	let gridSizeX = 16;
	let gridSizeY = 16;

	let timer_id;
	let mapdata;

	let imagemap = {
		width: 0,
		height: 0,
		pixelSize: 1,
		data: []
	};

	let drawMap = function(map){
		
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

		// Create darkness plane

		let oPlane = PS.gridPlane();

		if(levelIndex > 15 && levelIndex < 20){
			PS.gridPlane( DARKNESS_PLANE );
			PS.color( PS.ALL, PS.ALL, PS.COLOR_BLACK );
			PS.alpha( PS.ALL, PS.ALL, PS.ALPHA_OPAQUE );
			illuminate(snakeX,snakeY);

			PS.gridPlane(oPlane);
		}

		//Create and move snake sprite to appropriate plane and location
		snakeSprite = PS.spriteSolid(1,1);
		PS.spriteSolidColor(snakeSprite, SNAKE_MAP_COLOR);
		PS.spritePlane(snakeSprite, SNAKE_PLANE);
		PS.spriteMove(snakeSprite, snakeX, snakeY);
		PS.glyph(snakeX,snakeY, SNAKE_EYE);
	};

	return{
		init: function(){
			// Change this string to your team name
			// Use only ALPHABETIC characters
			// No numbers, spaces or punctuation!

			const TEAM = "teamname";

			// Begin with essential setup
			// Establish initial grid size

			PS.gridSize( 8, 8 ); // or whatever size you want

			// Install additional initialization code
			// here as needed

			// PS.dbLogin() must be called at the END
			// of the PS.init() event handler (as shown)
			// DO NOT MODIFY THIS FUNCTION CALL
			// except as instructed

			PS.dbLogin( "imgd2900", TEAM, function ( id, user ) {
				if ( user === PS.ERROR ) {
					return PS.dbErase( TEAM );
				}
				PS.dbEvent( TEAM, "startup", user );
				PS.dbSave( TEAM, PS.CURRENT, { discard : true } );
			}, { active : false } );
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

} ());

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