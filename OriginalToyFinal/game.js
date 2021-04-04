
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

let xPos = 3;
let yPos = 3;
//Loaded sprite ID's
let CENTER_ID;
let MIDDLE_ID;
let OUTER_ID;

let isLoaded = false;

//Planes of the grid and the popper
let wrapperPlane = 0;
let centerPlane = 1;
let middlePlane = 2;
let outerPlane = 3;

let G = ( function (){
	//Bubblewrap globals
	let BUBBLEWRAP = {
		//Initial length and height of board
		length: 8,
		height: 8,
		defaultDimension: 8,
		wrapArray: 0, //Array of bubbles
		bubbleOpacityRate: 40, //The rate at which bubbles become more opaque
		maxWrapDimension: 15, //
		isPopping: false, //Determines whether the player is popping bubbles
		beadsLeft: true, //Determines whether there are bubbles yet to be popped
		oneCycleComplete: false, //Determines if a cycle has been completed. Allows for some helpful procedures.

		//Array colors:
		//0 - grey
		//1 - Red
		//2 - green
		//3 - blue
		//4 - yellow
		//5 - magenta
		//6 - cyan
		colorArray: [0x969696, 0xff7a7a, 0x00ba10, 0x5e7eff, 0xccc931, 0xff42ff, 0x00b8b8],
		colorArrayMarker: 0, //Marks where to grab data in the array
		lastColor: 0, //The last color that was picked
		nextColor: 0, //The next color that will be picked
		wrapChosen: false, //Indicates whether the player chose a wrap

		//makeWrap: creates the wrapper and the bubble popper
		makeWrap: function(){

			/*
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
            isLoaded = true;
             */


			//Check if the bubble wrap has exceeded the max dimensions
			if(this.length < this.maxWrapDimension && this.height < this.maxWrapDimension){
				//If not, increase height and length randomly
				this.length += PS.random(3);
				this.height += PS.random(3);
			} else {
				//If so, reset length and height back to default.
				this.length = this.defaultDimension;
				this.height = this.defaultDimension;
			}
			//Initialize the grid with the new length and height
			PS.gridSize( this.length, this.height);

			//Initialize the array of bubbles
			this.wrapArray = new Array(this.length*this.height);


			//PS.gridPlane(wrapperPlane);
			for (let y = 0; y < this.height; y += 1) {
				for (let x = 0; x < this.length; x += 1)  {
					let thickness = PS.random(4);
					if(thickness === 1){
						thickness = 2;
					}
					if((x >= 0) && (y >= 0) && (x < this.length) && (y < this.height)){
						PS.color(x,y, this.colorArray[this.colorArrayMarker]);
						PS.alpha(x,y,this.bubbleOpacityRate*thickness);
					}
					//Change the array part for each element
					this.wrapArray[(y*this.length) + x] = thickness;
				}
			}
			//Make them circles and provide unique grid color/shadow

			//Remove borders and set radius to max
			PS.border(PS.ALL,PS.ALL,0);
			PS.radius(PS.ALL,PS.ALL,50);

			//Fade between colors
			PS.gridColor(this.lastColor);
			PS.gridFade(60);
			PS.gridColor(this.colorArray[this.colorArrayMarker]);
			PS.gridFade(60);

			//Make the background opaque and reset color
			PS.bgAlpha(PS.ALL,PS.ALL,255);
			PS.bgColor(PS.ALL,PS.ALL,0xFDFDFD);

			//Set grid shadow to white
			PS.gridShadow(true, 0xFFFFFF);


		},

		//check to see if the wrap has any beads left. Take action if no beads remain.
		checkWrap: function(){
			//Assume there are no beads left, and try to disprove this assertion.
			this.beadsLeft = false;
			for (let y = 0; y < this.height; y += 1) {
				for (let x = 0; x < this.length; x += 1)  {
					if(this.wrapArray[(y*this.length) + x] > 0){
						this.beadsLeft = true;
						break;
					}
				}
			}

			//If there are no beads left
			if(!this.beadsLeft){

				//You can no longer pop.
				this.isPopping = false;

				//Save the last color
				this.lastColor = this.colorArray[this.colorArrayMarker];

				//If the player didn't manually pick a bubblewrap, randomly select a new one that is not the previous wrap
				//Otherwise, honor the player's requests
				if(!this.wrapChosen){
					let newWrap = PS.random(7)-1;
					//make sure it's always different from the last
					while(newWrap === this.colorArrayMarker){
						newWrap = PS.random(7)-1;
					}
					this.colorArrayMarker = newWrap;
					PS.gridColor(this.colorArray[this.colorArrayMarker]);

				} else {
					this.colorArrayMarker = this.nextColor;
				}

				//Set the border color equal to the color chosen
				PS.borderColor(PS.ALL,PS.ALL, this.colorArray[this.colorArrayMarker]);

				//Make the new wrap and reset variables accordingly
				this.wrapChosen = false;

				this.oneCycleComplete = true;
				this.beadsLeft = true;
				this.makeWrap();

			}
		},

		//Move the sprite to wherever the mouse is
		moveOn: function(x,y){
			//if((x >= 0) && (y >= 0) && (x < BUBBLEWRAP.length) && (y < BUBBLEWRAP.height) && BUBBLEWRAP.beadsLeft) {
			/*
            PS.spriteMove(CENTER_ID,x,y);
            PS.spriteMove(MIDDLE_ID,x,y);
            PS.spriteMove(OUTER_ID,x,y);
             */

			//Enable borders for the dragged sprite
			this.moveOnCheck(x,y,10);

			//layer 2
			this.moveOnCheck(x-1,y,7);
			this.moveOnCheck(x-1,y-1,7);
			this.moveOnCheck(x-1,y+1,7);
			this.moveOnCheck(x,y-1,7);
			this.moveOnCheck(x,y+1,7);
			this.moveOnCheck(x+1,y-1,7);
			this.moveOnCheck(x+1,y,7);
			this.moveOnCheck(x+1,y+1,7);

			//layer 3
			this.moveOnCheck(x-2,y-1,5);
			this.moveOnCheck(x-2,y,5);
			this.moveOnCheck(x-2,y+1,5);
			this.moveOnCheck(x-1,y+2,5);
			this.moveOnCheck(x-1,y-2,5);
			this.moveOnCheck(x,y+2,5);
			this.moveOnCheck(x,y-2,5);
			this.moveOnCheck(x+1,y+2,5);
			this.moveOnCheck(x+1,y-2,5);
			this.moveOnCheck(x+2,y-1,5);
			this.moveOnCheck(x+2,y,5);
			this.moveOnCheck(x+2,y+1,5);

			//}

			//PS.audioPlay("fx_click");
		},

		moveOnCheck: function(x,y,borderSize){
			//Check for borders, if there are beads left, and if the bead is still not popped
			if((x >= 0) && (y >= 0) && (x < this.length) && (y < this.height) && this.beadsLeft && PS.alpha(x,y) > 0) {
				//Set border to border size and make the border not alpha
				PS.borderColor(x,y,this.colorArray[this.colorArrayMarker]);
				PS.border(x,y,borderSize);
				PS.borderAlpha(x,y,255);
			}
		},

		moveOff: function(x,y){
			if((x >= 0) && (y >= 0) && (x < this.length) && (y < this.height) && this.beadsLeft) {
				//Enable borders for the dragged sprite
				this.moveOffCheck(x,y,10);

				//layer 2
				this.moveOffCheck(x-1,y);
				this.moveOffCheck(x-1,y-1);
				this.moveOffCheck(x-1,y+1);
				this.moveOffCheck(x,y-1);
				this.moveOffCheck(x,y+1);
				this.moveOffCheck(x+1,y-1);
				this.moveOffCheck(x+1,y);
				this.moveOffCheck(x+1,y+1);

				//layer 3
				this.moveOffCheck(x-2,y-1);
				this.moveOffCheck(x-2,y);
				this.moveOffCheck(x-2,y+1);
				this.moveOffCheck(x-1,y+2);
				this.moveOffCheck(x-1,y-2);
				this.moveOffCheck(x,y+2);
				this.moveOffCheck(x,y-2);
				this.moveOffCheck(x+1,y+2);
				this.moveOffCheck(x+1,y-2);
				this.moveOffCheck(x+2,y-1);
				this.moveOffCheck(x+2,y);
				this.moveOffCheck(x+2,y+1);
			}
		},

		moveOffCheck: function(x,y){
			if((x >= 0) && (y >= 0) && (x < this.length) && (y < this.height) && this.beadsLeft && PS.alpha(x,y) > 0) {

				PS.border(x,y,0);
			}

		},

		centerPop: function(x,y, popStrength){

			//check bounds
			if((x >= 0) && (y >= 0) && (x < this.length) && (y < this.height) && this.beadsLeft){
				//(x,y,0xFFFFFF);
				let bubbleStrength = this.wrapArray[(y*this.length) + x];
				if(bubbleStrength > 0){
					let bubbleHealth = bubbleStrength - popStrength;

					//Randomly assign a pop noise using rand
					let soundPicker = PS.random(3);

					this.callPopSound(popStrength, soundPicker);

					let hintGiver = false;

					if (PS.random(100) > 96){
						hintGiver = true;
					}


					//play sound effect depending on game
					//If you make an exact pop
					if(bubbleHealth <= 0){
						PS.fade(x,y,30);
						PS.color(x,y,0xFFFFFF);
						PS.fade(x,y,30);
						PS.color(x,y,0xFDFDFD);

						PS.alpha(x,y,0);
						PS.border(x,y,2);
						PS.borderColor(PS.ALL,PS.ALL,this.colorArray[this.colorArrayMarker]);
						PS.borderAlpha(PS.ALL, PS.ALL, 100);
						if(hintGiver && this.oneCycleComplete){
							this.makeHint(x,y);
						}
						if(bubbleHealth < 0){
							//PS.glyph(x,y, 0x2297);
						}
					} else if(bubbleHealth > 0){
						//PS.statusText("Keep popping!");
						PS.border(x,y,0);

					}
					this.wrapArray[(y*this.length) + x] = Math.max(0, bubbleHealth);
				}
				//Check to see if there are any bubbles left
				this.checkWrap();
			}
		},

		middlePop: function(x,y){
			//layer 2
			this.centerPop(x-1,y,2);
			this.centerPop(x-1,y-1,2);
			this.centerPop(x-1,y+1,2);
			this.centerPop(x,y-1,2);
			this.centerPop(x,y+1,2);
			this.centerPop(x+1,y-1,2);
			this.centerPop(x+1,y,2);
			this.centerPop(x+1,y+1,2);
		},

		outerPop: function(x,y){
			//layer 3
			this.centerPop(x-2,y-1,1);
			this.centerPop(x-2,y,1);
			this.centerPop(x-2,y+1,1);
			this.centerPop(x-1,y+2,1);
			this.centerPop(x-1,y-2,1);
			this.centerPop(x,y+2,1);
			this.centerPop(x,y-2,1);
			this.centerPop(x+1,y+2,1);
			this.centerPop(x+1,y-2,1);
			this.centerPop(x+2,y-1,1);
			this.centerPop(x+2,y,1);
			this.centerPop(x+2,y+1,1);

		},

		callPopSound: function(popStrength, soundPicker){
			switch(popStrength){
				case 1:
					PS.audioPlay("CenterPop" + soundPicker, {path: "audio/", volume: 0.3});
					break;
				case 2:
					PS.audioPlay("MiddlePop" + soundPicker, {path: "audio/", volume: 0.3});
					break;
				case 3:
					PS.audioPlay("OuterPop" + soundPicker, {path: "audio/", volume: 0.3});
					break;
			}
		},
		makeHint: function(x,y){
			let secretSignifier = PS.random(10);
			if(secretSignifier > 8){
				PS.glyph(x,y,"→");
			} else if(secretSignifier < 3){
				PS.glyph(x,y,"Z");
			} else if(secretSignifier >= 3 && secretSignifier < 5){
				PS.glyph(x,y,"←");
			} else if(secretSignifier >= 5 && secretSignifier < 7){
				PS.glyph(x,y,"C");
			} else if(secretSignifier >= 7 && secretSignifier < 9) {
				PS.glyph(x, y, "↓");
			}
		}
	};
	return{
		init: function(){
			BUBBLEWRAP.makeWrap();

			// PS.dbLogin() must be called at the END
			// of the PS.init() event handler (as shown)
			// DO NOT MODIFY THIS FUNCTION CALL
			// except as instructed

			/*
            const TEAM = "pix";
            PS.dbLogin( "imgd2900", TEAM, function ( id, user ) {
                if ( user === PS.ERROR ) {
                    return;
                }
                PS.dbEvent( TEAM, "startup", user );
                PS.dbSend( TEAM, PS.CURRENT, { discard : true } );
            }, { active : true } );
             */
		},
		touch: function(x,y){
			BUBBLEWRAP.isPopping = true;
			BUBBLEWRAP.centerPop(x,y,3);
			BUBBLEWRAP.middlePop(x,y);
			BUBBLEWRAP.outerPop(x,y);
		},
		release: function(x,y){
			BUBBLEWRAP.isPopping = false;
		},
		enter: function(x,y){
			//Move on
			BUBBLEWRAP.moveOn(x,y);

			//Run the popping functions here
			if(BUBBLEWRAP.isPopping){
				BUBBLEWRAP.centerPop(x,y,3);
				BUBBLEWRAP.middlePop(x,y);
				BUBBLEWRAP.outerPop(x,y);
			}
		},
		exit: function(x,y){
			// Uncomment the following code line to inspect x/y parameters:
			BUBBLEWRAP.moveOff(x,y);
			if(PS.alpha(x,y) > 0){
				PS.border(x,y,0);
			}
		},
		exitGrid: function(){
			BUBBLEWRAP.isPopping = false;
		},
		keyDown: function(key){
			if(BUBBLEWRAP.beadsLeft){
				switch(key){
					case PS.KEY_ARROW_UP:
						//PS.debug("Wrap is regenerated!");
						BUBBLEWRAP.nextColor = 0;
						//BUBBLEWRAP.makeWrap();
						break;
					case PS.KEY_ARROW_DOWN:
						//PS.debug("Wrap is regenerated!");
						BUBBLEWRAP.nextColor = 1;
						//BUBBLEWRAP.makeWrap();
						break;
					case PS.KEY_ARROW_LEFT:
						//PS.debug("Wrap is regenerated!");
						BUBBLEWRAP.nextColor = 2;
						//BUBBLEWRAP.makeWrap();
						break;
					case PS.KEY_ARROW_RIGHT:
						//PS.debug("Wrap is regenerated!");
						BUBBLEWRAP.nextColor = 3;
						//BUBBLEWRAP.makeWrap();
						break;
					//Z
					case 122:
						//PS.debug("Wrap is regenerated!");
						BUBBLEWRAP.nextColor = 4;
						//BUBBLEWRAP.makeWrap();
						break;
					case 120:
						//PS.debug("Wrap is regenerated!");
						BUBBLEWRAP.nextColor = 5;
						//BUBBLEWRAP.makeWrap();
						break;
					case 99:
						//PS.debug("Wrap is regenerated!");
						BUBBLEWRAP.nextColor = 6;
						//BUBBLEWRAP.makeWrap();
						break;

				}
				PS.gridColor(BUBBLEWRAP.colorArray[BUBBLEWRAP.nextColor]);
				//PS.statusText("You picked a color!");
				BUBBLEWRAP.wrapChosen = true;
				//BUBBLEWRAP.oneCycleComplete = true;
				//BUBBLEWRAP.beadsLeft = true;
			}
		}
	};
} () );

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