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

	let pause = false;

	////////////////////
	//Shared Variables//
	////////////////////

	//Colors
	const BACKGROUND_MAP_COLOR = 0xFFFFFF;
	const WALL_MAP_COLOR = 0x000000;
	const SPAWN_MAP_COLOR = 0x00FF00;
	const DOOR_MAP_COLOR = 0x0000FF;
	const SNAKE_MAP_COLOR = 0x009900;
	const PORCUPINE_MAP_COLOR = 0x5b3900;
	const HUMAN_MAP_COLOR = 0xeec39a;
	const PATROL_MAP_COLOR = 0xFFFF00;

	//data
	const WALL_MARKER = "wall";
	const DOOR_MARKER = "door";

	//maps for pathfinder
	const MAP_GROUND = 1;
	const MAP_WALL = 0;

	//planes
	const MAP_PLANE = 0;
	const EGGPLANT_PLANE = 1;
	const NPC_PLANE = 2;
	const ENEMY_PLANE = 3;
	const PLAYER_PLANE = 4;

	//player variables
	let playerX = 11;
	let playerY = 5;
	const PLAYER_COLOR = 0x999999;
	const PLAYER_SPEED = 0.5;
	let currentPlayerShards = 0;
	let playerPath = [];
	let enemyPaths = [];

	//enemies
	let enemies = [];

	//sprite ids
	let playerSprite;

	//grid variables
	let gridSizeX = 16;
	let gridSizeY = 16;

	//map variables
	const MAP_WIDTH = 96;
	const MAP_HEIGHT = 80;
	const SEGMENTS_WIDTH = MAP_WIDTH/gridSizeX;
	const SEGMENTS_HEIGHT = MAP_HEIGHT/gridSizeY;

	//room loading
	let loading = false;
	let loaded = false;

	let ZONES = [
		[
			[0 , 0],[ -1, -1 ], [ 0, -1 ], [ 1, -1 ],
			[ -1, 0 ], [ 1, 0 ],
			[ -1, 1 ], [ 0, 1 ], [ 1, 1 ]
		],
		[
			[ -2, -2 ], [ -1, -2 ], [ 0, -2 ], [ 1, -2 ], [ 2, -2 ],
			[ -2, -1 ], [ 2, -1 ],
			[ -2, 0 ], [ 2, 0 ],
			[ -2, 1 ], [ 2, 1 ],
			[ -2, 2 ], [ -1, 2 ], [ 0, 2 ], [ 1, 2 ], [ 2, 2 ]
		],
		[
			[ -1, -3 ], [ 0, -3 ], [ 1, -3 ],
			[ -3, -1 ], [ 3, -1 ],
			[ -3, 0 ], [ 3, 0 ],
			[ -3, 1 ], [ 3, 1 ],
			[ -1, 3 ], [ 0, 3 ], [ 1, 3 ]
		]
	];

	//////////////////////
	//Load patrol routes//
	//////////////////////

	let patrolPoints = [];

	let enemyTouch = function(s1, p1, s2, p2, type){
		if(type === PS.SPRITE_OVERLAP){
			PS.statusText("Rats! You were devoured!");
			onDeath();
		}
	}

	///////////////////
	// Enemy Classes //
	///////////////////

	/**
	 * Patrols with cone vision
	 * If the player steps within the cone, the charge at you
	 * @type {Human}
	 */
	let Human = class{
		constructor(x,y) {
			this.x = x; //current x position
			this.y = y; //current y position
			this.lastX = x; //previous x position
			this.lastY = y; //previous y position
			this.nextX = x; //next x position
			this.nextY = y; //next y position
			this.patrolSpeed = 1;
			this.alertSpeed = 2 + (1 + currentPlayerShards);
			this.alert = false;
			this.inMotion = false;
			this.sprite = PS.spriteSolid(1,1);
			PS.spriteSolidColor(this.sprite, HUMAN_MAP_COLOR);
			PS.spritePlane(this.sprite, ENEMY_PLANE);
		}

		update(){
			if(this.alert){
				if(!this.inMotion){
					this.lastX = PS.spriteMove().x;
					this.lastY = PS.spriteMove().y;

					this.inMotion = true;
				}
				//Set current target to the player
				this.nextX = playerX;
				this.nextY = playerY;


				//Pathfind your way to the player
			} else {
				this.inMotion = false;

			}

		}
	}
	/**
	 * Sentry with straight line vision
	 * They extend towards you at a fast pace upon seeing you
	 * @type {Snake}
	 */

	let Snake = class{
		constructor(x,y) {
			this.x = x; //current x position
			this.y = y; //current y position
			this.lastX = x; //previous x position
			this.lastY = y; //previous y position
			this.prevX = 0;
			this.prevY = 0;
			this.nextX = x; //next x position
			this.nextY = y; //next y position
			this.rotateCounter = 30;
			this.view = PS.line(this.x,this.y,this.x,this.y);
			this.lastView = [];
			this.snakeDirections = 0;
			this.alert = false;
			this.alertSpeed = 0.75;
			this.alertPath = [];
			this.alertTimer = 0;
			this.alertInit = false;
			this.sprite = PS.spriteSolid(1,1);
			PS.spriteSolidColor(this.sprite, SNAKE_MAP_COLOR);
			PS.spritePlane(this.sprite, ENEMY_PLANE);
			PS.spriteMove(this.sprite, this.x,this.y);


			enemies.push(this);
		}

		update(){
			this.moveSnake();
			if(this.alert){
				if(!this.alertInit){
					for(let i=0; i < this.view.length; i++){
						PS.color(this.view[i][0], this.view[i][1], BACKGROUND_MAP_COLOR);
					}
					this.alertInit = true;
				}

				this.nextX = playerX;
				this.nextY = playerY;
				//Pathfind your way to the player
				this.makeSnakePath(this.nextX, this.nextY);
				this.alertTimer++;

				if(this.alertTimer > 180){
					this.alert = false;
				}
			} else {
				this.alertInit = false;
				//If the snake is not at its origin, make it return to the origin
				if(findingTarget(this.x, this.y, this.lastX, this.lastY)){
					this.makeSnakePath(this.lastX, this.lastY);
				} else {
					//PS.statusText("ploopy");
					let checkX = this.x;
					let checkY = this.y;
					//If there is a wall directly next to the snake, skip that direction

                    switch(this.snakeDirections){
                        case 0:
                            this.view = PS.line(this.x,this.y,this.x,this.y);
                            break;
                        case 1:
                        	//up
							while(PS.data(this.x,checkY) !== WALL_MARKER){
								checkY--;
							}
							this.view = PS.line(this.x, this.y, this.x, checkY + 1);
                            break;
                        case 2:
                            //snake looks right

							while(PS.data(checkX,this.y) !== WALL_MARKER){
								checkX++;
							}
							this.view = PS.line(this.x, this.y, checkX-1, this.y);

                            break;
                        case 3:
                        	//down
							while(PS.data(this.x,checkY) !== WALL_MARKER){
								checkY++;
							}
							this.view = PS.line(this.x, this.y, this.x, checkY - 1);
							break;
                        case 4:
                            //snake looks left

							while(PS.data(checkX,this.y) !== WALL_MARKER){
								checkX--;
							}
							this.view = PS.line(this.x, this.y, checkX+1, this.y);

                            break;
                    }

                    //Compare the arrays to see if the view has changed. If it has, delete the last view
                    if(JSON.stringify(this.view) !== JSON.stringify(this.lastView)){
						for(let i=0; i < this.lastView.length; i++){
							PS.color(this.lastView[i][0], this.lastView[i][1], BACKGROUND_MAP_COLOR);
						}

						this.lastView = this.view;

					}

					//Create the snake's view that enables it to see the player
					for(let i=0; i < this.view.length; i++){
						PS.color(this.view[i][0], this.view[i][1], 0xFF0000);
					}

					//Update rotational counter as needed
					this.rotateCounter++;
					if(this.rotateCounter > 30){
						if(this.snakeDirections === (4 || 0)){
							this.snakeDirections = 1;
						} else {
							this.snakeDirections++;
						}
						this.rotateCounter = 0;
					}
				}
			}
		}

		moveSnake(){
			let dx = 0;
			let dy = 0;
			if(this.alertPath.length > 0){
				let next = this.alertPath[0];
				let nextX = Math.floor(next[0]);
				let nextY = Math.floor(next[1]);

				//stop when you run into a wall
				if(isWall(nextX,nextY)){
					this.alertPath = [];
				} else {
					dx = nextX + 0.5 - this.x;
					dy = nextY + 0.5 - this.y;
					if(distance(dx, dy) <= this.alertSpeed){
						this.alertPath.shift();
					}
				}
			}
			//determine movement speed
			if(dx !== 0 || dy !== 0){
				let normalizedVector = this.alertSpeed / distance(dx, dy);
				dx = normalizedVector * dx;
				dy = normalizedVector * dy;
			}

			//collide with walls
			let checkX = Math.floor(this.x + dx);
			if(onGrid(checkX, this.y) && isWall(checkX, this.y)){
				dx = checkX - Math.sign(dx)-this.x + 0.5;
			}

			let checkY = Math.floor(this.y + dy);
			if(onGrid(this.x, checkY) && isWall(this.x, checkY)){
				dy = checkY - Math.sign(dy)-this.y + 0.5;
			}

			checkX = Math.floor(this.x + dx);
			checkY = Math.floor(this.y + dy);
			if(onGrid(checkX, checkY) && isWall(checkX, checkY)){
				dx = checkY - Math.sign(dy)-this.x + 0.5;
				dy = checkY - Math.sign(dy)-this.y + 0.5;
			}

			//update position
			this.x += dx;
			this.y += dy;
			PS.spriteMove(this.sprite, this.x, this.y);

			//Reset alert timer if movement is detected
			if(this.prevX !== this.x || this.prevY !== this.y){
				this.alertTimer = 0;

				this.prevX = this.x;
				this.prevY = this.y;
			}
		}

		makeSnakePath(x,y){
			let startX = Math.floor(this.x);
			let startY = Math.floor(this.y);
			this.alertPath = PS.line(startX, startY, x, y);
		}
	}

	let Porcupine = class{
		constructor(x,y){
			this.x = x; //current x position
			this.y = y; //current y position
			this.lastX = x; //previous x position
			this.lastY = y; //previous y position
			this.prevX = 0;
			this.prevY = 0;
			this.alert = false;
			this.setLast = false;
			this.alertSpeed = 0.01;
			this.alertPath = [];
			this.alertTimer = 0;
			this.caution = false;
			this.sprite = PS.spriteSolid(1,1);
			PS.spriteSolidColor(this.sprite, PORCUPINE_MAP_COLOR);
			PS.spritePlane(this.sprite, ENEMY_PLANE);
			PS.spriteMove(this.sprite, this.x,this.y);


			enemies.push(this);
			patrolPoints.push([this.x, this.y]);
			this.patrolMarker = patrolPoints.length - 1;
		}

		update(){
			let alertGate = false;

			this.movePorcupine();
			if(this.alert){
				if(!this.setLast){
					this.lastX = this.x;
					this.lastY = this.y;

					for(let x = 0; x < gridSizeX; x += 1){
						for(let y = 0; y < gridSizeY; y += 1){
							if(PS.color(x,y) === 0xFF0000 && !isWall(x,y)){
								PS.color(x,y,0xFFFFFF);
							}
						}
					}

					this.setLast = true;
				}



				this.alertSpeed = 0.65
				this.caution = true;
				this.makePorcupinePath(playerX, playerY);

				this.alertTimer++;
				if(this.alertTimer > 50){

					this.alert = false;
				}

			} else {
				this.setLast = false;
				this.alertSpeed = 0.32
				if(findingTarget(this.x, this.y, this.lastX, this.lastY) && this.caution){
					this.makePorcupinePath(this.lastX, this.lastY);
					this.caution = false;

				} else {
					//Pursue the patrol points continuously
					let currentTarget = patrolPoints[this.patrolMarker];
					if(findingTarget(this.x, this.y, currentTarget[0], currentTarget[1])){
						this.makePorcupinePath(currentTarget[0], currentTarget[1]);
					} else {
						if(this.patrolMarker < patrolPoints.length-1){
							this.patrolMarker += 1;
						} else {
							this.patrolMarker = 0;
						}

					}
					for(let x = 0; x < gridSizeX; x += 1){
						for(let y = 0; y < gridSizeY; y += 1){
							if(PS.color(x,y) === 0xFF0000 && !isWall(x,y)){
								PS.color(x,y,0xFFFFFF);
							}
						}
					}

					if(!this.caution){
						//Keep the searchlights up!
						for ( let j = 0; j < ZONES.length; j += 1 ) {
							let zone = ZONES[ j ];
							for (let i = 0; i < zone.length; i += 1 ) {
								let offset = zone[ i ];
								let dx = this.x + offset[ 0 ];
								let dy = this.y + offset[ 1 ];
								if ( ( dx >= 0 ) && ( dx < gridSizeX ) && ( dy >= 0 ) && ( dy < gridSizeY ) && !isWall(dx,dy) ) {
									PS.color(dx,dy, 0xFF0000);
								}
							}
						}

					}



				}
			}
		}

		movePorcupine(){
			let dx = 0;
			let dy = 0;
			if(this.alertPath.length > 0){
				let next = this.alertPath[0];
				let nextX = Math.floor(next[0]);
				let nextY = Math.floor(next[1]);

				//stop when you run into a wall
				if(isWall(nextX,nextY)){
					this.alertPath = [];
				} else {
					dx = nextX + 0.5 - this.x;
					dy = nextY + 0.5 - this.y;
					if(distance(dx, dy) <= this.alertSpeed){
						this.alertPath.shift();
					}
				}
			}
			//determine movement speed
			if(dx !== 0 || dy !== 0){
				let normalizedVector = this.alertSpeed / distance(dx, dy);
				dx = normalizedVector * dx;
				dy = normalizedVector * dy;
			}

			//collide with walls
			let checkX = Math.floor(this.x + dx);
			if(onGrid(checkX, this.y) && isWall(checkX, this.y)){
				dx = checkX - Math.sign(dx)-this.x + 0.5;
			}

			let checkY = Math.floor(this.y + dy);
			if(onGrid(this.x, checkY) && isWall(this.x, checkY)){
				dy = checkY - Math.sign(dy)-this.y + 0.5;
			}

			checkX = Math.floor(this.x + dx);
			checkY = Math.floor(this.y + dy);
			if(onGrid(checkX, checkY) && isWall(checkX, checkY)){
				dx = checkY - Math.sign(dy)-this.x + 0.5;
				dy = checkY - Math.sign(dy)-this.y + 0.5;
			}

			//update position
			this.x += dx;
			this.y += dy;
			PS.spriteMove(this.sprite, this.x, this.y);

			//Reset alert timer if movement is detected
			if(this.prevX !== this.x || this.prevY !== this.y){
				this.alertTimer = 0;

				this.prevX = this.x;
				this.prevY = this.y;
			}
		}

		makePorcupinePath(x,y){
			let startX = Math.floor(this.x);
			let startY = Math.floor(this.y);
			this.alertPath = PS.line(startX, startY, x, y);
		}
	}

	let Bird = class{

	}

	///////////////////////
	//Game Loop Functions//
	///////////////////////

	/**
	 * Core update loop
	 */
	let updateGame = function(){
		//On initial load, make sure image is blitted before doing anything
		if(loading) {
			if(imageBlitted){
				loadRoomComplete();
				imageBlitted = false;
				loading = false;
			}

		} else {

			if(pause){
				return;
			}
			//basic gameplay stuff

			//accept player input

			movePlayer();
			//levelTransition(Math.floor(playerX), Math.floor(playerY));

			//Detect alert level
			if(PS.color(playerX, playerY) === PS.COLOR_RED){
				for(let i=0; i < enemies.length; i++){
					let enemy = enemies[i];
					enemy.alert = true;
				}
			}

			//move enemy patterns
			for(let i=0; i < enemies.length; i++){
				let enemy = enemies[i];
				PS.spriteCollide(playerSprite, enemyTouch);

				enemy.update();
			}
		}
	}

	/**
	 * Function that handles moving the player. Always active, but only does anything meaningful when you give it an array
	 */
	let movePlayer = function(){
		let dx = 0;
		let dy = 0;

		//Do not do anything if there is no player path assigned
		if(playerPath.length > 0){
			let next = playerPath[0];
			let nextX = Math.floor(next[0]);
			let nextY = Math.floor(next[1]);

			//stop when you run into a wall
			if(isWall(nextX,nextY)){
				playerPath = [];
			} else {
				dx = nextX + 0.5 - playerX;
				dy = nextY + 0.5 - playerY;
				if(distance(dx, dy) <= PLAYER_SPEED){
					playerPath.shift();
				}
			}
		}
		//determine movement speed
		if(dx !== 0 || dy !== 0){
			let normalizedVector = PLAYER_SPEED / distance(dx, dy);
			dx = normalizedVector * dx;
			dy = normalizedVector * dy;
		}

		//collide with walls
		let checkX = Math.floor(playerX + dx);
		if(onGrid(checkX, playerY) && isWall(checkX, playerY)){
			dx = checkX - Math.sign(dx)-playerX + 0.5;
		}

		let checkY = Math.floor(playerY + dy);
		if(onGrid(playerX, checkY) && isWall(playerX, checkY)){
			dy = checkY - Math.sign(dy)-playerY + 0.5;
		}

		checkX = Math.floor(playerX + dx);
		checkY = Math.floor(playerY + dy);
		if(onGrid(checkX, checkY) && isWall(checkX, checkY)){
			dx = checkY - Math.sign(dy)-playerX + 0.5;
			dy = checkY - Math.sign(dy)-playerY + 0.5;
		}

		//update position
		playerX += dx;
		playerY += dy;
		PS.spriteMove(playerSprite, playerX, playerY);
	}

	let makePlayerPath = function(x,y){
		let startX = Math.floor(playerX);
		let startY = Math.floor(playerY);
		playerPath = PS.line(startX, startY, x, y);
	}

	/////////////////////////
	//Map Loading Functions//
	/////////////////////////

	let timer_id;
	let mapdata;
	let initLoad = false;
	let canTransition = true;
	let currentXWindow = 32;
	let currentYWindow = 16;
	let currentLevelImage;
	let imageBlitted = false;
	let spawnX = 5;
	let spawnY = 5;

	let imagemap = {
		width: 0,
		height: 0,
		pixelSize: 1,
		data: []
	};

	var draw_map = function ( map ) {
		var oplane, i, x, y, data, color;

		oplane = PS.gridPlane();
		PS.gridPlane( MAP_PLANE );

		i = 0;
		for ( y = 0; y < gridSizeY; y += 1 ) {
			for ( x = 0; x < gridSizeX; x += 1 ) {
				data = map.data[ i ];
				switch ( data ) {
					case BACKGROUND_MAP_COLOR:
						color = BACKGROUND_MAP_COLOR;
						break;
					case WALL_MAP_COLOR:
						color = WALL_MAP_COLOR;
						PS.data(x,y,WALL_MARKER);
						break;
					case SPAWN_MAP_COLOR:
						color = BACKGROUND_MAP_COLOR;
						spawnX = x;
						spawnY = y;
						break;
					case SNAKE_MAP_COLOR:
						color = SPAWN_MAP_COLOR;
						break;
					case DOOR_MAP_COLOR:
						color = DOOR_MAP_COLOR;
						break;
					default:
						color = PS.COLOR_WHITE;
						break;
				}
				PS.color( x, y, color );
				i += 1;
			}
		}

		PS.gridPlane( oplane );
	};

	let onDeath = function(){
		pause = true;
		PS.debug(pause);
		for(let i=0; i < enemies.length; i++){
			PS.spriteDelete(enemies[i].sprite);
		}
		PS.border(PS.ALL, PS.ALL, 0);

		let oplane = PS.gridPlane();
		PS.gridPlane(PLAYER_PLANE);

		//initialize player sprite
		PS.spriteMove(playerSprite, spawnX,spawnY);

		PS.gridPlane(oplane);

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

		//PS.gridSize( gridSizeX, gridSizeY );
		//PS.border( PS.ALL, PS.ALL, 0 );

		let i = 0;
		for(let y = 0; y < gridSizeY; y += 1){
			for(let x = 0; x < gridSizeX; x += 1){
				let data = MAP_GROUND;
				let pixel = image.data[i];
				switch(pixel){
					case BACKGROUND_MAP_COLOR:
						break;
					case WALL_MAP_COLOR:
						data = MAP_WALL;
						break;
					case SPAWN_MAP_COLOR:
						playerX = x;
						playerY = y;
						break;
					case SNAKE_MAP_COLOR:
						new Snake(x,y);
						break;
					case PORCUPINE_MAP_COLOR:
						new Porcupine(x,y);
						patrolPoints.push([x,y]);
						break;
					case PATROL_MAP_COLOR:
						patrolPoints.push([x,y]);
						break;
					default:
						PS.debug( "onMapLoad(): unrecognized pixel value\n" );
						break;
				}
				imagemap.data[i] = data;
				i += 1;
			}
		}

		draw_map( imagemap );
	};

	/**
	 * Transition between levels
	 * @param x
	 * @param y
	 */
	let levelTransition = function(x,y){
		if(canTransition && PS.data(x,y) === DOOR_MARKER){
			if(x === 0 && currentXWindow <= MAP_WIDTH-16){
				currentXWindow -= 16;
				PS.imageLoad("images/ratMap.gif", blitImage);
				playerX = gridSizeX - 1;
				PS.spriteMove(playerSprite, gridSizeX-1, Math.floor(playerY));
				canTransition = false;
				playerPath = [];


			} else if(x === gridSizeX - 1 && currentXWindow <= MAP_WIDTH-16){
				currentXWindow += 16;
				PS.imageLoad("images/ratMap.gif", blitImage);
				canTransition = false;
				PS.spriteMove(playerSprite, 0, Math.floor(playerY));
				playerX = 0;
				playerPath = [];
			} else if(y === 0 && currentYWindow <= MAP_HEIGHT-16){
				currentYWindow -= 16;
				PS.imageLoad("images/ratMap.gif", blitImage);
				canTransition = false;
				PS.spriteMove(playerSprite, Math.floor(playerX), gridSizeY-1);
				playerY = gridSizeY-1;
				playerPath = [];

			} else if(y === gridSizeY - 1 && currentYWindow <= MAP_HEIGHT-16){
				currentYWindow += 16;
				PS.imageLoad("images/ratMap.gif", blitImage);
				canTransition = false;
				PS.spriteMove(playerSprite, Math.floor(playerX), 0);
				playerY = 0;
				playerPath = [];
			}
		}

		if(y !== 0 && y !== gridSizeY - 1 && x !== 0 && x !== gridSizeX - 1){
			canTransition = true;
		}


	}

	let loadRoomComplete = function(image){
		let i = 0;
		for(let y = 0; y < gridSizeY; y += 1){
			for(let x = 0; x < gridSizeX; x += 1){
				let data = MAP_GROUND;
				let pixel = image.data[i];
				//let pixel = PS.color(x,y);
				switch(pixel){
					case BACKGROUND_MAP_COLOR:
						break;
					case WALL_MAP_COLOR:
						data = MAP_WALL;
						break;
					case SPAWN_MAP_COLOR:
						playerX = x;
						playerY = y;
						break;
					case SNAKE_MAP_COLOR:
						new Snake(x,y);
						break;
					case PORCUPINE_MAP_COLOR:
						new Porcupine(x,y);
						//patrolPoints.push([x,y]);
						break;
					case PATROL_MAP_COLOR:
						patrolPoints.push([x,y]);
						break;
					case DOOR_MAP_COLOR:
						data = DOOR_MARKER;
						break;
					default:
						PS.debug( "onMapLoad(): unrecognized pixel value\n" );
						break;
				}
				imagemap.data[i] = data;
				//PS.data(x,y,data);
				i += 1;
			}
		}

		//draw_map( imagemap );
	}

	let blitImage = function(image){
		//PS.imageBlit(image, 0, 0, {left: currentXWindow, top: currentYWindow, width: gridSizeX, height: gridSizeY });
		//currentLevelImage = PS.imageCapture(1);
		imageBlitted = true;
	}

	///////////////////
	//Audio Functions//
	///////////////////

	////////////////////
	//Helper Functions//
	////////////////////

	/**
	 * Check to see if the player is within the enemy's sights
	 * @param playerX
	 * @param playerY
	 * @param enemyX
	 * @param enemyY
	 * @returns {boolean}
	 */
	let isPlayerSeen = function(playerX, playerY, enemyX, enemyY){
		return playerX === enemyX && playerY === enemyY;
	}

	let isWall = function(x,y){
		return (PS.data(x,y) === WALL_MARKER);
	}

	/**
	 * Ensures that an operation stays on the grid
	 * @param x - current x component
	 * @param y - current y component
	 * @returns {boolean}
	 */
	let onGrid = function(x,y){
		return (x >= 0 && y >= 0 && x < gridSizeX && y < gridSizeY);
	}

	/**
	 * Calculates the length of a vector
	 * @param x
	 * @param y
	 * @returns {number}
	 */
	let distance = function(x,y){
		return Math.sqrt((x * x) + (y * y));
	}

	let findingTarget = function(enemyX, enemyY, lastX, lastY){
		return Math.floor(enemyX) !== lastX || Math.floor(enemyY) !== lastY;
	}

	/////////////////////////////
	//Perlenspiel API Functions//
	/////////////////////////////

	let game_setup = function(){

		//border
		PS.border(PS.ALL, PS.ALL, 0);

		let oplane = PS.gridPlane();
		PS.gridPlane(PLAYER_PLANE);

		PS.imageLoad("images/betaRatMap.gif", onMapLoad, 1);

		//initialize player sprite
		playerSprite = PS.spriteSolid(1,1);
		PS.spriteSolidColor(playerSprite, PLAYER_COLOR);
		PS.spritePlane(playerSprite, PLAYER_PLANE);
		PS.spriteMove(playerSprite, playerX,playerY);

		PS.gridPlane(oplane);




		timer_id = PS.timerStart(2, updateGame);
	}

	return{
		init: function(){
			// Change this string to your team name
			// Use only ALPHABETIC characters
			// No numbers, spaces or punctuation!
			/*

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

			 */
			//status line
			PS.statusText("");
			PS.gridSize(gridSizeX, gridSizeY);


			game_setup();

			PS.debug(playerX)
		},
		//Click on another bead to make the player go to that location
		touch: function(x,y){
			PS.debug(playerY);

			if(x === Math.floor(playerX) && y === Math.floor(playerY)){
				//makePlayerPath(x, y);
			} else {
				makePlayerPath(x, y);
			}

		},
		release: function(x,y){

		},
		enter: function(x,y){

		},
		exit: function(x,y){

		},
		exitGrid: function(){
			//PS.debug(" Current X " + enemies[0].x + " Current Y " + enemies[0].y + " Target X " + patrolPoints[1][0] + " Target Y " + patrolPoints[1][1]);
			//PS.debug("lastX: " + enemies[0].lastX + " lastY: " + enemies[0].lastY);
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