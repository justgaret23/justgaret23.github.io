/*
game.js for Perlenspiel 3.3.x
Last revision: 2018-10-14 (BM)

/* jshint browser : true, devel : true, esversion : 6, freeze : true */
/* globals PS : true */

"use strict"; // do not remove this directive!

/*
PS.init( system, options )
Called once after engine is initialized but before event-polling begins.
This function doesn't have to do anything, although initializing the grid dimensions with PS.gridSize() is recommended.
If PS.grid() is not called, the default grid dimensions (8 x 8 beads) are applied.
Any value returned is ignored.
[system : Object] = A JavaScript object containing engine and host platform information properties; see API documentation for details.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

let MAKE_LINE = false; //Keeps track of whether a player is drawing a line
let GRID_LENGTH = 7; //Length of the grid
let GRID_HEIGHT = 7; //Height of the grid
let initLineX = 0; //Placeholder var that holds the starting x coordinate of a line
let initLineY = 0; //Placeholder var that holds the starting y coordinate of a line
let envMarker = 0; //Array marker that keeps track of which set of colors should be used
let pastFirstBead = false; //A boolean that allows a sound to play on the first pixel of the line, but no other pixels.

//audio IDs
let yahooID,fallingID,oofID,boingID,hoohooID,okeydokeyID,jump1ID,jump2ID,jump3ID = "";

//PRESETS - Each index of the array has a different environment set based on levels from Super Mario 64
//0 - Peach's Castle
//1 - Jolly Roger Bay
//2 - Big Boo's Haunt
//3 - Hazy Maze Cave
let BACKGROUND_ARRAY = [0x29b800, 0x15B795, 0x332011, 0x303C20];
let BORDER_ARRAY = [0xdbd168, 0x004951, 0x484845, 0x586e45];
let PAGECOLOR_ARRAY = [0x3b85c5, 0x1F6497, 0x3939C9, 0x525252];
let STATUS_ARRAY = [ 0xc3d2de, 0xc3d2de, 0xc3d2de, 0xc3d2de];
let LINE_HEAD = 0xdf0301;
let LINE_TRAIL = 0xd5dad6;

PS.init = function( system, options ) {

	//Establish grid dimensions
	PS.gridSize(GRID_LENGTH, GRID_HEIGHT);
	
	//Initialize grid, border, and page colors from the first elements of the array
	PS.gridColor(PAGECOLOR_ARRAY[0]);
	PS.borderColor(PS.ALL, PS.ALL, BORDER_ARRAY[0]);
	PS.color(PS.ALL, PS.ALL, BACKGROUND_ARRAY[0]);
	
	//Status lines
	PS.statusColor(STATUS_ARRAY[0]);
	PS.statusText( "Draw lines and have fun!" );

	//Defining audio loaders and saving IDs
	let yahooLoader = function(data){
		yahooID = data.channel; //save ID
	}

	let fallingLoader = function(data){
		fallingID = data.channel;
	}

	let oofLoader = function(data){
		oofID = data.channel;
	}

	let boingLoader = function(data){
		boingID = data.channel;
	}

	let hoohooLoader = function(data){
		hoohooID = data.channel;
	}

	let okeydokeyLoader = function(data){
		okeydokeyID = data.channel;
	}

	let jump1Loader = function(data){
		jump1ID = data.channel;
	}

	let jump2Loader = function(data){
		jump2ID = data.channel;
	}

	let jump3Loader = function(data){
		jump3ID = data.channel;
	}


	//Executing audio loaders.
	//Most sounds only initialize the lock and take the path to the audio folder to play the sound.
	PS.audioLoad("yahoo", {
		lock: true,
		path: "audio/",
		volume: 0.25,
		onLoad: yahooLoader //specify loader location
	});

	PS.audioLoad("falling", {
		lock: true,
		path: "audio/",
		volume: 0.25,
		onLoad: fallingLoader //specify loader location
	});

	PS.audioLoad("oof", {
		lock: true,
		path: "audio/",
		volume: 0.25,
		onLoad: oofLoader //specify loader location
	});

	PS.audioLoad("boing", {
		lock: true,
		path: "audio/",
		volume: 0.25,
		onLoad: boingLoader //specify loader location
	});

	PS.audioLoad("hoohoo", {
		lock: true,
		path: "audio/",
		volume: 0.25,
		onLoad: hoohooLoader //specify loader location
	});

	//This sound plays once upon starting the game.
	PS.audioLoad("okeydokey", {
		lock: true,
		autoplay: true,
		path: "audio/",
		volume: 0.25,
		onLoad: okeydokeyLoader //specify loader location
	});

	PS.audioLoad("jump1", {
		lock: true,
		path: "audio/",
		volume: 0.25,
		onLoad: jump1Loader //specify loader location
	});

	PS.audioLoad("jump2", {
		lock: true,
		path: "audio/",
		volume: 0.25,
		onLoad: jump2Loader //specify loader location
	});

	PS.audioLoad("jump3", {
		lock: true,
		path: "audio/",
		volume: 0.25,
		onLoad: jump3Loader //specify loader location
	});
};

/*
PS.touch ( x, y, data, options )
Called when the left mouse button is clicked over bead(x, y), or when bead(x, y) is touched.
This function doesn't have to do anything. Any value returned is ignored.
[x : Number] = zero-based x-position (column) of the bead on the grid.
[y : Number] = zero-based y-position (row) of the bead on the grid.
[data : *] = The JavaScript value previously associated with bead(x, y) using PS.data(); default = 0.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.touch = function( x, y, data, options ) {

	//Seeing as how we are starting a new line, we have not made one bead yet
	pastFirstBead = false;

	//Indicate that we are making a line
	MAKE_LINE = true;

	//Set the color equal to the line head
	PS.color(x,y,LINE_HEAD);

	//Store the initial value of PS.touch using globals
	initLineX = x;
	initLineY = y;
};

/*
PS.release ( x, y, data, options )
Called when the left mouse button is released, or when a touch is lifted, over bead(x, y).
This function doesn't have to do anything. Any value returned is ignored.
[x : Number] = zero-based x-position (column) of the bead on the grid.
[y : Number] = zero-based y-position (row) of the bead on the grid.
[data : *] = The JavaScript value previously associated with bead(x, y) using PS.data(); default = 0.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

// UNCOMMENT the following code BLOCK to expose the PS.release() event handler:



PS.release = function( x, y, data, options ) {
	"use strict"; // Do not remove this directive!


	//Get the difference between the start and end lines.
	//If the difference is zero, we have not made a line.
		//Looping back in is prevented by using pastFirstBead
	let lineDifferenceX = Math.abs(initLineX - x);
	let lineDifferenceY = Math.abs(initLineY - y);

	//If we have not made a line, expand the grid
	//If we have made a line, shorten the grid
	if(lineDifferenceX === 0 && lineDifferenceY === 0 && !pastFirstBead){

		//Throughout this code, we use math.min to check for odd cases of 33.
		if(GRID_LENGTH < 32 && GRID_HEIGHT < 32){
			//Expand both height and width if both aren't maxed
			PS.audioPlayChannel(yahooID);
			GRID_LENGTH = Math.min(GRID_LENGTH + 2, 32);
			GRID_HEIGHT = Math.min(GRID_HEIGHT + 2, 32);
		} else if(GRID_LENGTH < 32){
			//Only expand the length if height is maxed
			PS.audioPlayChannel(boingID);
			PS.statusText("boingo");
			GRID_LENGTH = Math.min(GRID_LENGTH + 2, 32);
		} else if(GRID_HEIGHT < 32){
			//Only expand height if length is maxed
			PS.audioPlayChannel(boingID);
			PS.statusText("bongo");
			GRID_HEIGHT = Math.min(GRID_HEIGHT + 2, 32);
		} else {
			//If we cannot expand, play oof and change the environment
			PS.audioPlayChannel(oofID);
			if(envMarker < 3){
				envMarker = envMarker + 1;
			} else {
				envMarker = 0;
			}

			//Display unique status text upon switching environments
			switch(envMarker){
				case 0:
					PS.statusText("You've oof'ed right back where you started!");
					break;
				case 1:
					PS.statusText("You've oof'ed into the wrong spooky ocean");
					break;
				case 2:
					PS.statusText("You've oof'ed into the deadly spooky mansion");
					break;
				case 3:
					PS.statusText("You've oof'ed into the wrong deep dank cave.")
			}
		}
	} else {
		//Subtract line difference x and y from the grid
		GRID_LENGTH = GRID_LENGTH - lineDifferenceX;
		GRID_HEIGHT = GRID_HEIGHT - lineDifferenceY;
		PS.audioPlayChannel(hoohooID);
	}

	//Set first bead and make line equal to false
	pastFirstBead = false;
	MAKE_LINE = false;

	//Re-initialize the grid based on the new length, height, and current color information
	PS.gridSize(GRID_LENGTH, GRID_HEIGHT);
	PS.gridColor(PAGECOLOR_ARRAY[envMarker]);
	PS.borderColor(PS.ALL, PS.ALL, BORDER_ARRAY[envMarker]);
	PS.color(PS.ALL, PS.ALL, BACKGROUND_ARRAY[envMarker]);
};



/*
PS.enter ( x, y, button, data, options )
Called when the mouse cursor/touch enters bead(x, y).
This function doesn't have to do anything. Any value returned is ignored.
[x : Number] = zero-based x-position (column) of the bead on the grid.
[y : Number] = zero-based y-position (row) of the bead on the grid.
[data : *] = The JavaScript value previously associated with bead(x, y) using PS.data(); default = 0.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

// UNCOMMENT the following code BLOCK to expose the PS.enter() event handler:



PS.enter = function( x, y, data, options ) {
	"use strict"; // Do not remove this directive!

	//Always set the entered square equal to the line head
	PS.color(x,y,LINE_HEAD);
};



/*
PS.exit ( x, y, data, options )
Called when the mouse cursor/touch exits bead(x, y).
This function doesn't have to do anything. Any value returned is ignored.
[x : Number] = zero-based x-position (column) of the bead on the grid.
[y : Number] = zero-based y-position (row) of the bead on the grid.
[data : *] = The JavaScript value previously associated with bead(x, y) using PS.data(); default = 0.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

// UNCOMMENT the following code BLOCK to expose the PS.exit() event handler:



PS.exit = function( x, y, data, options ) {
	"use strict"; // Do not remove this directive!

	//Leave a trail in the head's wake if we are making a line
		//Otherwise, reset the environment after moving past
	if(MAKE_LINE){
		PS.color(x,y,LINE_TRAIL);
	} else {
		PS.color(x,y,BACKGROUND_ARRAY[envMarker]);
	}

	//We play the jump audio if we are making a line and have not made a bead yet
	if(MAKE_LINE && !pastFirstBead){

		//Randomly select jump audio clip
		let jumpClip = PS.random(3);

		//Play the randomly selected jump audio clip
		switch(jumpClip){
			case 1:
				PS.audioPlayChannel(jump1ID);
				break;
			case 2:
				PS.audioPlayChannel(jump2ID);
				break;
			case 3:
				PS.audioPlayChannel(jump3ID);
				break;
		}
	}
	//Set pastFirstBead to true, preventing jump from playing for the rest of the line
	pastFirstBead = true;
};



/*
PS.exitGrid ( options )
Called when the mouse cursor/touch exits the grid perimeter.
This function doesn't have to do anything. Any value returned is ignored.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

// UNCOMMENT the following code BLOCK to expose the PS.exitGrid() event handler:



PS.exitGrid = function( options ) {
	"use strict"; // Do not remove this directive!

	// Uncomment the following code line to verify operation:
	if(MAKE_LINE){
		PS.audioPlayChannel(fallingID);
		PS.statusText("Too bad!");
	}

	//Set MAKE_LINE equal to false to reset line operations
	MAKE_LINE = false;

	//Re-initialize colors
	PS.gridColor(PAGECOLOR_ARRAY[envMarker]);
	PS.borderColor(PS.ALL, PS.ALL, BORDER_ARRAY[envMarker]);
	PS.color(PS.ALL, PS.ALL, BACKGROUND_ARRAY[envMarker]);
};



/*
PS.keyDown ( key, shift, ctrl, options )
Called when a key on the keyboard is pressed.
This function doesn't have to do anything. Any value returned is ignored.
[key : Number] = ASCII code of the released key, or one of the PS.KEY_* constants documented in the API.
[shift : Boolean] = true if shift key is held down, else false.
[ctrl : Boolean] = true if control key is held down, else false.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

// UNCOMMENT the following code BLOCK to expose the PS.keyDown() event handler:

/*

PS.keyDown = function( key, shift, ctrl, options ) {
	"use strict"; // Do not remove this directive!

	// Uncomment the following code line to inspect first three parameters:

	// PS.debug( "PS.keyDown(): key=" + key + ", shift=" + shift + ", ctrl=" + ctrl + "\n" );

	// Add code here for when a key is pressed.
};

*/

/*
PS.keyUp ( key, shift, ctrl, options )
Called when a key on the keyboard is released.
This function doesn't have to do anything. Any value returned is ignored.
[key : Number] = ASCII code of the released key, or one of the PS.KEY_* constants documented in the API.
[shift : Boolean] = true if shift key is held down, else false.
[ctrl : Boolean] = true if control key is held down, else false.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

// UNCOMMENT the following code BLOCK to expose the PS.keyUp() event handler:

/*

PS.keyUp = function( key, shift, ctrl, options ) {
	"use strict"; // Do not remove this directive!

	// Uncomment the following code line to inspect first three parameters:

	// PS.debug( "PS.keyUp(): key=" + key + ", shift=" + shift + ", ctrl=" + ctrl + "\n" );

	// Add code here for when a key is released.
};

*/

/*
PS.input ( sensors, options )
Called when a supported input device event (other than those above) is detected.
This function doesn't have to do anything. Any value returned is ignored.
[sensors : Object] = A JavaScript object with properties indicating sensor status; see API documentation for details.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
NOTE: Currently, only mouse wheel events are reported, and only when the mouse cursor is positioned directly over the grid.
*/

// UNCOMMENT the following code BLOCK to expose the PS.input() event handler:

/*

PS.input = function( sensors, options ) {
	"use strict"; // Do not remove this directive!

	// Uncomment the following code lines to inspect first parameter:

//	 var device = sensors.wheel; // check for scroll wheel
//
//	 if ( device ) {
//	   PS.debug( "PS.input(): " + device + "\n" );
//	 }

	// Add code here for when an input event is detected.
};

*/

/*
PS.shutdown ( options )
Called when the browser window running Perlenspiel is about to close.
This function doesn't have to do anything. Any value returned is ignored.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
NOTE: This event is generally needed only by applications utilizing networked telemetry.
*/

// UNCOMMENT the following code BLOCK to expose the PS.shutdown() event handler:

/*

PS.shutdown = function( options ) {
	"use strict"; // Do not remove this directive!

	// Uncomment the following code line to verify operation:

	// PS.debug( "“Dave. My mind is going. I can feel it.”\n" );

	// Add code here to tidy up when Perlenspiel is about to close.
};

*/
