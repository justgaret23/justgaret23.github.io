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

/*
PS.init( system, options )
Called once after engine is initialized but before event-polling begins.
This function doesn't have to do anything, although initializing the grid dimensions with PS.gridSize() is recommended.
If PS.grid() is not called, the default grid dimensions (8 x 8 beads) are applied.
Any value returned is ignored.
[system : Object] = A JavaScript object containing engine and host platform information properties; see API documentation for details.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

//Loaded sprite ID's
let CENTER_ID;
let MIDDLE_ID;
let OUTER_ID;

//Planes of the grid and the popper
let wrapperPlane = 0;
let centerPlane = 1;
let middlePlane = 2;
let outerPlane = 3;

//Bubblewrap globals
let BUBBLEWRAP = {
	//Initial length and height of board
	length: 8,
	height: 8,
	wrapArray: 0,
	bubbleOpacityRate: 40,
	maxWrapDimension: 15,
	isPopping: false,
	beadsLeft: true,
	oneCycleComplete: false,

	//Array colors:
	//0 - grey
	//1 - Red
	//2 - green
	//3 - blue
	//4 - yellow
	//5 - magenta
	//6 - cyan
	//7 - black
	colorArray: [0x969696, 0xff7a7a, 0x59ff67, 0x5e7eff, 0xffff00, 0xff42ff, 0x47ffff, 0x000000],
	colorArrayMarker: 0,

	//makeWrap: creates the wrapper and the bubble popper
	makeWrap: function(){

		if(BUBBLEWRAP.length < this.maxWrapDimension && BUBBLEWRAP.height < this.maxWrapDimension){
			BUBBLEWRAP.length += PS.random(3);
			BUBBLEWRAP.height += PS.random(3);
		} else {
			BUBBLEWRAP.length = 8;
			BUBBLEWRAP.height = 8;
		}
		PS.gridSize( BUBBLEWRAP.length, BUBBLEWRAP.height); // or whatever size you want
		//ඞ
		BUBBLEWRAP.wrapArray = new Array(BUBBLEWRAP.length*BUBBLEWRAP.height);

		// Create random gray floor (currently inactive for testing purposes)
		PS.gridPlane(wrapperPlane);
		for (let y = 0; y < BUBBLEWRAP.height; y += 1) {
			for (let x = 0; x < BUBBLEWRAP.length; x += 1)  {
				let thickness = PS.random(4);
				if(thickness === 1){
					thickness = 2;
				}
				if((x >= 0) && (y >= 0) && (x < BUBBLEWRAP.length) && (y < BUBBLEWRAP.height)){
					PS.color(x,y, this.colorArray[this.colorArrayMarker]);
					PS.alpha(x,y,this.bubbleOpacityRate*thickness);
				}
				//Change the array part for each element
				BUBBLEWRAP.wrapArray[(y*BUBBLEWRAP.length) + x] = thickness;
			}
		}
		//Make them circles and provide unique grid color/shadow

		PS.border(PS.ALL,PS.ALL,0);
		PS.radius(PS.ALL,PS.ALL,50);
		//PS.gridColor(0xFF0000);
		//PS.bgColor(0,PS.ALL,0xFF0000);
		PS.gridShadow(true, 0x999999);

		//Make sprite loader here
		let centerLoader = function(data){
			CENTER_ID = PS.spriteImage(data);
			PS.spritePlane(CENTER_ID, centerPlane);
			PS.spriteAxis(CENTER_ID, 2, 2);
			//PS.spriteMove(CENTER_ID, xPos, yPos);
		};

		let middleLoader = function(data){
			MIDDLE_ID = PS.spriteImage(data);
			PS.spritePlane(MIDDLE_ID, middlePlane);
			PS.spriteAxis(MIDDLE_ID, 2, 2);
			//PS.spriteMove(MIDDLE_ID, xPos, yPos);
		};

		let outerLoader = function(data){
			OUTER_ID = PS.spriteImage(data);
			PS.spritePlane(OUTER_ID, outerPlane);
			PS.spriteAxis(OUTER_ID, 2, 2);
			//PS.spriteMove(OUTER_ID, xPos, yPos);
		};

		//Actually load image here
		PS.imageLoad("images/center.png", centerLoader);
		PS.imageLoad("images/middle.png", middleLoader);
		PS.imageLoad("images/outer.png", outerLoader);
	},

	//check to see if the wrap
	checkWrap: function(){
		//Assume there are no beads left, and try to disprove this assertion.
		BUBBLEWRAP.beadsLeft = false;
		for (let y = 0; y < BUBBLEWRAP.height; y += 1) {
			for (let x = 0; x < BUBBLEWRAP.length; x += 1)  {
				if(BUBBLEWRAP.wrapArray[(y*BUBBLEWRAP.length) + x] > 0){
					BUBBLEWRAP.beadsLeft = true;
					break;
				}
			}
		}

		//Play status messages prompting the player to do stuff
		if(!BUBBLEWRAP.beadsLeft){
			//oneCycleComplete makes the secret status messages only play after the first one
			if(BUBBLEWRAP.oneCycleComplete){
				let secretSignifier = PS.random(10);
				if(secretSignifier > 8){
					PS.statusText("I'll probably make something cheeky later.");
				} else if(secretSignifier < 3){
					PS.statusText("Have you tried pressing Z yet?");
				} else if(secretSignifier >= 3 && secretSignifier < 5){
					PS.statusText("X is a rather unimportant button.");
				} else if(secretSignifier >= 5 && secretSignifier < 7){
					PS.statusText("Nothing to C here.");
				} else if(secretSignifier >= 7 && secretSignifier < 9){
					PS.statusText("Different directions do different things!");
				}
			} else {
				PS.statusText("Press an arrow key to get more bubblewrap!");
			}
		}
	},

	//Move the sprite to wherever the mouse is
	move: function(x,y){
		PS.spriteMove(CENTER_ID,x,y);
		PS.spriteMove(MIDDLE_ID,x,y);
		PS.spriteMove(OUTER_ID,x,y);
		//PS.audioPlay("fx_click");
	},

	centerPop: function(x,y, popStrength){
		if((x >= 0) && (y >= 0) && (x < BUBBLEWRAP.length) && (y < BUBBLEWRAP.height) && BUBBLEWRAP.beadsLeft){
			//(x,y,0xFFFFFF);
			let bubbleStrength = BUBBLEWRAP.wrapArray[(y*BUBBLEWRAP.length) + x];
			if(bubbleStrength > 0){
				let bubbleHealth = bubbleStrength - popStrength;

				//Randomly assign a pop noise using rand
				let soundPicker = PS.random(3);

				this.callPopSound(popStrength, soundPicker);

				//play sound effect depending on game
				if(bubbleHealth === 0){
					PS.alpha(x,y,0);
					PS.border(x,y,2);
					PS.borderColor(PS.ALL,PS.ALL,this.colorArray[this.colorArrayMarker]);
					PS.borderAlpha(PS.ALL, PS.ALL, 100);
				} else if(bubbleHealth < 0){
					PS.glyph(x,y, "X");
					PS.alpha(x,y,0);
					PS.border(x,y,2);
					PS.borderColor(PS.ALL,PS.ALL,this.colorArray[this.colorArrayMarker]);
					PS.borderAlpha(PS.ALL, PS.ALL, 100);
				} else if(bubbleHealth > 0){
					PS.statusText("Keep popping!");

				}
				BUBBLEWRAP.wrapArray[(y*BUBBLEWRAP.length) + x] = Math.max(0, bubbleHealth);
			}
			//Check to see if there are any bubbles left
			this.checkWrap();
		}
	},

	middlePop: function(x,y){
		this.centerPop(x-1,y,2);
		this.centerPop(x+1,y,2);
		this.centerPop(x,y-1,2);
		this.centerPop(x,y+1,2);
	},

	outerPop: function(x,y){
		this.centerPop(x-2,y,1);
		this.centerPop(x+2,y,1);
		this.centerPop(x,y-2,1);
		this.centerPop(x,y+2,1);
		this.centerPop(x-1,y-1,1);
		this.centerPop(x-1,y+1,1);
		this.centerPop(x+1,y-1,1);
		this.centerPop(x+1,y+1,1);
	},

	callPopSound: function(popStrength, soundPicker){
		switch(popStrength){
			case 1:
				PS.audioPlay("CenterPop" + soundPicker, {path: "audio/", volume: 0.05});
				break;
			case 2:
				PS.audioPlay("MiddlePop" + soundPicker, {path: "audio/", volume: 0.05});
				break;
			case 3:
				PS.audioPlay("OuterPop" + soundPicker, {path: "audio/", volume: 0.05});
				break;
		}
	}
};

PS.init = function( system, options ) {
	// Change this string to your team name
	// Use only ALPHABETIC characters
	// No numbers, spaces or punctuation!

	const TEAM = "pix";

	// Begin with essential setup
	// Establish initial grid size

	//PS.debug("hello?");


	//Initialize bubble wrap grid, also remove borders


	BUBBLEWRAP.makeWrap();

	PS.statusText("Drag to pop!");
	// Install additional initialization code
	// here as needed

	// PS.dbLogin() must be called at the END
	// of the PS.init() event handler (as shown)
	// DO NOT MODIFY THIS FUNCTION CALL
	// except as instructed
	/*

	PS.dbLogin( "imgd2900", TEAM, function ( id, user ) {
		if ( user === PS.ERROR ) {
			return PS.dbErase( TEAM );
		}
		PS.dbEvent( TEAM, "startup", user );
		PS.dbSave( TEAM, PS.CURRENT, { discard : true } );
	}, { active : false } );
	*/
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
	// Uncomment the following code line
	// to inspect x/y parameters:
	BUBBLEWRAP.isPopping = true;
	BUBBLEWRAP.centerPop(x,y,3);
	BUBBLEWRAP.middlePop(x,y);
	BUBBLEWRAP.outerPop(x,y);


	// PS.debug( "PS.touch() @ " + x + ", " + y + "\n" );

	// Add code here for mouse clicks/touches
	// over a bead.
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

PS.release = function( x, y, data, options ) {
	BUBBLEWRAP.isPopping = false;
	// Uncomment the following code line to inspect x/y parameters:

	// PS.debug( "PS.release() @ " + x + ", " + y + "\n" );

	// Add code here for when the mouse button/touch is released over a bead.
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

PS.enter = function( x, y, data, options ) {
	// Uncomment the following code line to inspect x/y parameters:

	//Move the popper to the mouse's current location
	BUBBLEWRAP.move(x,y);

	if(BUBBLEWRAP.isPopping){
		BUBBLEWRAP.centerPop(x,y,3);
		BUBBLEWRAP.middlePop(x,y);
		BUBBLEWRAP.outerPop(x,y);
	}

	// PS.debug( "PS.enter() @ " + x + ", " + y + "\n" );

	// Add code here for when the mouse cursor/touch enters a bead.
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

PS.exit = function( x, y, data, options ) {
	// Uncomment the following code line to inspect x/y parameters:

	// PS.debug( "PS.exit() @ " + x + ", " + y + "\n" );

	// Add code here for when the mouse cursor/touch exits a bead.
};

/*
PS.exitGrid ( options )
Called when the mouse cursor/touch exits the grid perimeter.
This function doesn't have to do anything. Any value returned is ignored.
[options : Object] = A JavaScript object with optional data properties; see API documentation for details.
*/

PS.exitGrid = function( options ) {
	BUBBLEWRAP.isPopping = false;
	// Uncomment the following code line to verify operation:

	// PS.debug( "PS.exitGrid() called\n" );

	// Add code here for when the mouse cursor/touch moves off the grid.
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

PS.keyDown = function( key, shift, ctrl, options ) {
	// Uncomment the following code line to inspect first three parameters:

	//Enables secret status messages to play on subsequent loads
	BUBBLEWRAP.oneCycleComplete = true;

	PS.debug( "PS.keyDown(): key=" + key + ", shift=" + shift + ", ctrl=" + ctrl + "\n" );
	if(!BUBBLEWRAP.beadsLeft){
		switch(key){
			case PS.KEY_ARROW_UP:
				PS.debug("Wrap is regenerated!");
				BUBBLEWRAP.colorArrayMarker = 0;
				BUBBLEWRAP.makeWrap();
				break;
			case PS.KEY_ARROW_DOWN:
				PS.debug("Wrap is regenerated!");
				BUBBLEWRAP.colorArrayMarker = 1;
				BUBBLEWRAP.makeWrap();
				break;
			case PS.KEY_ARROW_LEFT:
				PS.debug("Wrap is regenerated!");
				BUBBLEWRAP.colorArrayMarker = 2;
				BUBBLEWRAP.makeWrap();
				break;
			case PS.KEY_ARROW_RIGHT:
				PS.debug("Wrap is regenerated!");
				BUBBLEWRAP.colorArrayMarker = 3;
				BUBBLEWRAP.makeWrap();
				break;
			//Z
			case 122:
				PS.debug("Wrap is regenerated!");
				BUBBLEWRAP.colorArrayMarker = 4;
				BUBBLEWRAP.makeWrap();
				break;
			case 120:
				PS.debug("Wrap is regenerated!");
				BUBBLEWRAP.colorArrayMarker = 5;
				BUBBLEWRAP.makeWrap();
				break;
			case 99:
				PS.debug("Wrap is regenerated!");
				BUBBLEWRAP.colorArrayMarker = 6;
				BUBBLEWRAP.makeWrap();
				break;

		}

		BUBBLEWRAP.beadsLeft = true;
	}



	// Add code here for when a key is pressed.
};

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

