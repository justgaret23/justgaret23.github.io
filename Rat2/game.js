/*
 game.js for Perlenspiel 3.3.x
 Last revision: 2018-10-14 (BM)
 */

"use strict";

/* jshint browser : true, devel : true, esversion : 5, freeze : true */
/* globals PS : true */

const G = ( function () {
	// These define the colors assignments used in the .gif map

	let gameClear = false;

	let levelIndexX = 2;
	let levelIndexY = 2;

	const WALL_COLOR = PS.COLOR_BLACK;
	const GROUND_COLOR = PS.COLOR_WHITE;
	const ACTOR_COLOR = PS.COLOR_GREEN;
	const SNAKE_COLOR = PS.COLOR_RED;
	const HUMAN_COLOR = PS.COLOR_CYAN;
	const DOOR_COLOR = PS.COLOR_BLUE;
	const SHARD_COLOR = PS.COLOR_YELLOW;
	const ELDER_COLOR = PS.COLOR_MAGENTA;
	const ELDER_TALK_COLOR = 0xb100b1;
	const NPC_COLOR = 0x5b5b5b;

	// These define the data used by the pathfinder

	const _MAP_WALL = 0;
	const _MAP_GROUND = 1;
	const _MAP_DOOR = 2;
	const _MAP_SHARD = 3;
	const _MAP_TALK_NPC = 4;
	const _MAP_NPC = 5;

	// These are the plane assignments

	const _PLANE_MAP = 0;
	const _PLANE_SHARD = 1;
	const _PLANE_ENEMY_SIGHT = 2;
	const _PLANE_ENEMY = 3;
	const _PLANE_ACTOR = 4;
	const _PLANE_BLOOD = 5;
	const _PLANE_ELDER = 6;

	// These are the actual drawing colors for all elements

	//Color schemes:
	// red/grey
	// green/light grey
	// blue/darker grey
	//grey/brown
	const _DRAW_WALL = [0x600000, 0x006000, 0x000060];
	const _DRAW_GROUND = 0x787D88;


	const _DRAW_ACTOR = 0x685d5d;
	const _DRAW_SNAKE = 0x405833;//0x093A1B;
	const _DRAW_HUMAN = 0x82623B;
	const _DRAW_FOV = PS.COLOR_YELLOW;//0xB49100;
	const _DRAW_DOOR = 0x00618e;//0x002F59;
	const _DRAW_SHARD = 0x41053F;
	const _DRAW_ELDER = PS.COLOR_MAGENTA;

	let _rgb_ground = PS.unmakeRGB( _DRAW_GROUND, {} );
	let _rgb_wall = PS.unmakeRGB( _DRAW_WALL[0], {} );

	let _grid_x;
	let _grid_y;

	let _actor_x = -1;
	let _actor_y;
	let _actor_originX;
	let _actor_originY;
	let _actor_path = null;
	let _actor_position;
	let _actor_sprite;
	let _actor_moving = false;
	let moveUp = false;
	let moveDown = false;
	let moveLeft = false;
	let moveRight = false;
	let _actor_moveX = 0;
	let _actor_moveY = 0;
	let isDead = false;

	//Amount of shards the player has on them
	let playerShardsInPossession = 0;
	let shardsInBase = 0;
	let totalShards = 4;
	//We use the coordinates of the level to keep track of where the shards are
	let shardArray = [];
	let shardsCarriedArray = [];
	let shardsCollectedArray = [];

	//talking
	let shardNotif = false;

	let enemies = [];
	let enemyCoords = [];

	//Enemy IDs:
	//Snake: 0
	//Human: 1
	let enemyTypes = [];

	let _enemy_x;
	let _enemy_y;

	//map variables
	let gridSizeX = 16;
	let gridSizeY = 16;
	const MAP_WIDTH = 96;
	const MAP_HEIGHT = 80;
	const SEGMENTS_WIDTH = MAP_WIDTH/16;
	const SEGMENTS_HEIGHT = MAP_HEIGHT/16;
	let transitioning = false;
	let onInitLoad = false;

	let _player_timer_id;
	let _timer_id;
	let reviveCounter = 60;
	let checkAdvancedMove
	let _pathmap;
	let pause = false;

	let _mapdata;

	const _imagemap = {
		width : 0,
		height : 0,
		pixelSize : 1,
		data : []
	};

	var actor_step = function ( h, v ) {
		var nx, ny;

		// Calculate proposed new location.

		nx = _actor_x + h;
		ny = _actor_y + v;

		if ( _is_wall( nx, ny ) ) {
			return;
		}

		// Is new location off the grid?
		// If so, exit without moving.

		if ( ( nx < 0 ) || ( nx >= gridSizeX ) || ( ny < 0 ) || ( ny >= gridSizeY ) ) {
			return;
		}

		_actor_path = null;
		_actor_place( nx, ny );
	};

	const _is_wall = function ( x, y ) {
		let data = _imagemap.data[ ( y * _grid_x ) + x ];
		return ( data === _MAP_WALL );
	};

	const _actor_place = function ( x, y ) {
		if(!isDead){
			PS.spriteMove( _actor_sprite, x, y );
			_actor_x = x;
			_actor_y = y;
		} else {
			PS.spriteMove( _actor_sprite, _actor_originX, _actor_originY );
			_actor_x = _actor_originX;
			_actor_y = _actor_originY;
		}
	};

	///////////////////
	// Enemy Classes //
	///////////////////

	let Snake = class{
		constructor(x,y){
			this._enemy_x = x;
			this._enemy_y = y;
			this._enemy_originX = x;
			this._enemy_originY = y;
			this._enemy_path = null;
			this._enemy_position = 0;
			this._enemy_touched = false;
			this._enemy_sight = [];
			this._enemy_prev_sight = [];
			this._enemy_rotate_counter = 0;
			this._enemy_view_direction = 0;
			this._enemy_sprite = PS.spriteSolid( 1, 1 ); // Create 1x1 solid sprite, save its ID
			PS.spriteSolidColor( this._enemy_sprite, _DRAW_SNAKE ); // assign color
			PS.spritePlane( this._enemy_sprite, _PLANE_ENEMY ); // move to assigned plane
			PS.spriteMove(this._enemy_sprite, x, y);

			enemies.push(this);
		}

		update(){


			if(this._enemy_path){
				PS.debug("wut")
				PS.spriteCollide(_actor_sprite, enemyTouch);
				let path;
				if(!this._enemy_touched){
					path = PS.pathFind( _pathmap, this._enemy_x, this._enemy_y, _actor_x, _actor_y );
				} else {
					path = [];
				}

				if ( path.length > 0 ) {
					//this._enemy_position = 0;
					this._enemy_path = path;


					let point = this._enemy_path[ this._enemy_position ];
					if(typeof point !== 'undefined'){
						let x = point[ 0 ];
						let y = point[ 1 ];


						this.enemyPlace( x, y );
					}

				} else {
					this._enemy_touched = false;
				}
				PS.gridPlane(2);
				for(let i=0; i < this._enemy_sight.length; i++){
					PS.color(this._enemy_sight[i][0], this._enemy_sight[i][1], _DRAW_GROUND);
				}
				PS.gridPlane(_PLANE_MAP);


				this._enemy_position += 1;
				//PS.debug(this._enemy_position)
				if ( this._enemy_position >= this._enemy_path.length ) {
					this._enemy_path = null;
					this._enemy_position = 0;
				}

			} else {
				//this._enemy_touched = false;
				this.enemyView(this._enemy_x, this._enemy_y);
			}
		}

		enemyPlace( x, y ) {
			PS.spriteMove( this._enemy_sprite, x, y );
			PS.alpha(x,y,255);
			_enemy_x = x;
			_enemy_y = y;
		};

		enemyView(x,y){
			let oplane = PS.gridPlane();
			PS.gridPlane(_PLANE_ENEMY_SIGHT);
			//PS.color(x,y,_DRAW_GROUND)

			//PS.statusText("ploopy");
			let checkX = x;
			let checkY = y;
			//If there is a wall directly next to the snake, skip that direction

			switch(this._enemy_view_direction){
				case 0:
					this._enemy_sight = PS.line(x,y,x,y);
					break;
				case 1:
					//up
					while(PS.data(x,checkY) === _MAP_GROUND){
						checkY--;
					}
					this._enemy_sight = PS.line(x, y, x, checkY + 1);
					break;
				case 2:
					//snake looks right

					while(PS.data(checkX,y) === _MAP_GROUND){
						checkX++;
					}
					this._enemy_sight = PS.line(x, y, checkX-1, y);

					break;
				case 3:
					//down
					while(PS.data(x,checkY) === _MAP_GROUND){
						checkY++;
					}
					this._enemy_sight = PS.line(x, y, x, checkY - 1);
					break;
				case 4:
					//snake looks left

					while(PS.data(checkX,y) === _MAP_GROUND){
						checkX--;
					}
					this._enemy_sight = PS.line(x, y, checkX+1, y);

					break;
			}

			//Compare the arrays to see if the view has changed. If it has, delete the last view
			if(JSON.stringify(this._enemy_sight) !== JSON.stringify(this._enemy_prev_sight)){
				for(let i=0; i < this._enemy_prev_sight.length; i++){

					PS.color(this._enemy_prev_sight[i][0], this._enemy_prev_sight[i][1], _DRAW_GROUND);
					PS.alpha(this._enemy_prev_sight[i][0], this._enemy_prev_sight[i][1], 0);

				}

				this._enemy_prev_sight = this._enemy_sight;

			}

			//Create the human's view that enables it to see the player
			for(let i=0; i < this._enemy_sight.length; i++){
				if(PS.data(this._enemy_sight[i][0], this._enemy_sight[i][1]) === _MAP_GROUND){
					PS.color(this._enemy_sight[i][0], this._enemy_sight[i][1], _DRAW_FOV);
					PS.alpha(this._enemy_prev_sight[i][0], this._enemy_prev_sight[i][1], 255);
				}
			}

			//Update rotational counter as needed
			this._enemy_rotate_counter++;
			if(this._enemy_rotate_counter > 10){
				if(this._enemy_view_direction === (4 || 0)){
					this._enemy_view_direction = 1;
				} else {
					this._enemy_view_direction++;
				}
				this._enemy_rotate_counter = 0;
			}

			PS.gridPlane(oplane);
		}
	}

	let Human = class{
		constructor(x,y){
			this._enemy_x = x;
			this._enemy_y = y;
			this._enemy_originX = x;
			this._enemy_originY = y;
			this._enemy_path = null;
			this._enemy_position = 0;
			this._enemy_touched = false;
			this._enemy_sight_left = [];
			this._enemy_sight_right = [];
			this._enemy_sight = [];
			this._enemy_sight_range = 3;
			this._enemy_prev_sight = [];
			this._enemy_rotate_counter = 0;
			this._enemy_view_direction = 0;
			this._enemy_sprite = PS.spriteSolid( 1, 1 ); // Create 1x1 solid sprite, save its ID
			PS.spriteSolidColor( this._enemy_sprite, _DRAW_HUMAN ); // assign color
			PS.spritePlane( this._enemy_sprite, _PLANE_ENEMY ); // move to assigned plane
			PS.spriteMove(this._enemy_sprite, x, y);

			enemies.push(this);
		}

		update(){


			if(this._enemy_path){
				PS.spriteCollide(_actor_sprite, enemyTouch);
				let path;
				if(!this._enemy_touched){
					path = PS.pathFind( _pathmap, this._enemy_x, this._enemy_y, _actor_x, _actor_y );
				} else {
					path = [];
				}

				if ( path.length > 0 ) {
					//this._enemy_position = 0;
					this._enemy_path = path;


					let point = this._enemy_path[ this._enemy_position ];
					if(typeof point !== 'undefined'){
						let x = point[ 0 ];
						let y = point[ 1 ];


						this.enemyPlace( x, y );
					}

				} else {
					this._enemy_touched = false;
				}
				PS.gridPlane(2);
				for(let i=0; i < this._enemy_sight.length; i++){
					if(onGrid(this._enemy_sight[i][0], this._enemy_sight[i][1]) &&
						PS.data(this._enemy_sight[i][0], this._enemy_sight[i][1]) === _MAP_GROUND){
						PS.color(this._enemy_sight[i][0], this._enemy_sight[i][1], _DRAW_GROUND);
					}

				}
				PS.gridPlane(_PLANE_MAP);

				this._enemy_position += 1;
				//PS.debug(this._enemy_position)
				if ( this._enemy_position >= this._enemy_path.length ) {
					this._enemy_path = null;
					this._enemy_position = 0;
				}

			} else {
				//this._enemy_touched = false;
				this.enemyView(this._enemy_x, this._enemy_y);
			}
		}

		enemyPlace( x, y ) {
			PS.spriteMove( this._enemy_sprite, x, y );
			PS.alpha(x,y,255);
			_enemy_x = x;
			_enemy_y = y;
		};

		enemyView(x,y){
			let oplane = PS.gridPlane();
			PS.gridPlane(_PLANE_ENEMY_SIGHT);
			//PS.color(x,y,_DRAW_GROUND)

			//PS.statusText("ploopy");
			let checkX = x;
			let checkY = y;
			//If there is a wall directly next to the snake, skip that direction
			this._enemy_sight = [];


			//Make two mini-lines of sight and connect them
			switch(this._enemy_view_direction){
				case 0:
					this._enemy_sight = PS.line(x,y,x,y);
					break;
				case 1:
					//up
					this._enemy_sight_left = PS.line(x,y,x - this._enemy_sight_range, y - this._enemy_sight_range);
					this._enemy_sight_right = PS.line(x,y,x + this._enemy_sight_range, y - this._enemy_sight_range);
					break;
				case 2:
					//snake looks right

					this._enemy_sight_left = PS.line(x,y,x + this._enemy_sight_range, y + this._enemy_sight_range);
					this._enemy_sight_right = PS.line(x,y,x + this._enemy_sight_range, y - this._enemy_sight_range);

					break;
				case 3:
					//down
					this._enemy_sight_left = PS.line(x,y,x + this._enemy_sight_range, y + this._enemy_sight_range);
					this._enemy_sight_right = PS.line(x,y,x - this._enemy_sight_range, y + this._enemy_sight_range);
					break;
				case 4:
					//snake looks left

					this._enemy_sight_left = PS.line(x,y,x - this._enemy_sight_range, y - this._enemy_sight_range);
					this._enemy_sight_right = PS.line(x,y,x - this._enemy_sight_range, y + this._enemy_sight_range);
					break;
			}




			//push all arrays onto enemy sight
			for(let i = 0; i < this._enemy_sight_left.length; i++){
				if(onGrid(this._enemy_sight_left[i][0], this._enemy_sight_left[i][1])){
					this._enemy_sight.push(this._enemy_sight_left[i]);
				}

			}

			//push all arrays onto enemy sight
			for(let i = 0; i < this._enemy_sight_right.length; i++){
				if(onGrid(this._enemy_sight_right[i][0], this._enemy_sight_right[i][1])){

				}this._enemy_sight.push(this._enemy_sight_right[i]);

			}


			//push the in-betweens
			if(this._enemy_view_direction !== 0){
				for(let i = 0; i < this._enemy_sight_range; i++){
					let left = this._enemy_sight_left[i];
					let right = this._enemy_sight_right[i];

					let fillSight = PS.line(this._enemy_sight_left[i][0], this._enemy_sight_left[i][1], this._enemy_sight_right[i][0], right[1]);

					for(let i = 0; i < fillSight.length; i++){
						if(onGrid(this._enemy_sight[i][0], this._enemy_sight[i][1])){
							this._enemy_sight.push(fillSight[i]);
						}

					}

				}
			}



			//Compare the arrays to see if the view has changed. If it has, delete the last view
			if(JSON.stringify(this._enemy_sight) !== JSON.stringify(this._enemy_prev_sight)){
				for(let i=0; i < this._enemy_prev_sight.length; i++){
					if(onGrid(this._enemy_prev_sight[i][0], this._enemy_prev_sight[i][1])){
						PS.color(this._enemy_prev_sight[i][0], this._enemy_prev_sight[i][1], _DRAW_GROUND);
						PS.alpha(this._enemy_prev_sight[i][0], this._enemy_prev_sight[i][1], 0);
					}
				}
				this._enemy_prev_sight = this._enemy_sight;
			}

			//Create the snake's view that enables it to see the player
			for(let i=0; i < this._enemy_sight.length; i++){
				if(onGrid(this._enemy_sight[i][0], this._enemy_sight[i][1])){
					if(PS.data(this._enemy_sight[i][0], this._enemy_sight[i][1]) === _MAP_GROUND){
						PS.color(this._enemy_sight[i][0], this._enemy_sight[i][1], _DRAW_FOV);
						PS.alpha(this._enemy_prev_sight[i][0], this._enemy_prev_sight[i][1], 255);
					}
				}
			}

			//Update rotational counter as needed
			this._enemy_rotate_counter++;
			if(this._enemy_rotate_counter > 10){
				if(this._enemy_view_direction === (4 || 0)){
					this._enemy_view_direction = 1;
				} else {
					this._enemy_view_direction++;
				}
				this._enemy_rotate_counter = 0;
			}

			PS.gridPlane(oplane);
		}
	}


	let enemyTouch = function(s1, p1, s2, p2, type){

		if(type === PS.SPRITE_OVERLAP){
			isDead = true;
			//pause = true;
			PS.statusText("Rats! You were devoured!");
			PS.debug("why");

			/*
			for(let i = 0; i < enemies.length; i++){
				PS.spriteDelete(enemies[i]._enemy_sprite);
			}
			enemies = [];



			if(enemyCoords.length !== enemyTypes.length){
				PS.debug("WHAT IS HAPENIONG THE HOUSE IS ON FIRE YOU NERD");
			}

			//Remake all enemies with original behavior
			for(let i = 0; i < enemyCoords.length; i++){
				let coordinate = enemyCoords[i];
				switch(enemyTypes[i]){
					case 0:
						new Snake(coordinate[0], coordinate[1]);
						break;
					case 1:
						new Human(coordinate[0], coordinate[1]);
						break;
				}
			}
			enemies = [];

			 */

			for(let i = 0; i < enemies.length; i++){
				PS.spriteMove(enemies[i]._enemy_sprite, enemies[i]._enemy_originX, enemies[i]._enemy_originY);
				enemies[i]._enemy_position = 0;
				enemies[i]._enemy_rotate_counter = 0;
				//enemies[i]._enemy_path = [];
				enemies[i]._enemy_path = PS.pathFind( _pathmap, enemies[i]._enemy_x, enemies[i]._enemy_y, enemies[i]._enemy_originX, enemies[i]._enemy_originY);
				enemies[i]._enemy_touched = true;
			}

			_actor_x = _actor_originX;
			_actor_y = _actor_originY;

			//Take all the shards the player is currently carrying
			shardsCarriedArray = [];

			PS.spriteMove(_actor_sprite, _actor_originX, _actor_originY);



			//_actor_path = PS.pathFind( _pathmap, _actor_x, _actor_y, _actor_originX, _actor_originY );






			//enemies = [];

		}
	}

	// ========================
	//GENERAL GAME FUNCTIONS //
	// ========================

	/**
	 * Ensures that an operation stays on the grid
	 * @param x - current x component
	 * @param y - current y component
	 * @returns {boolean}
	 */
	let onGrid = function(x,y){
		return (x >= 0 && y >= 0 && x < gridSizeX && y < gridSizeY);
	}

	const _player_clock = function(){
		if(_actor_moving){
			actor_step(_actor_moveX, _actor_moveY);
		}

		while(reviveCounter < 60 && isDead){
			reviveCounter++;
			_actor_x = _actor_originX;
			_actor_y = _actor_originY;
		}

		if(reviveCounter >= 60){
			isDead = false;
			//PS.statusText("It's tail time!");
		}

	}

	const _clock = function () {


		//check to see if all shards were retrieved





		/////////////////////////////
		//talk to people, it's cool//
		/////////////////////////////
		if(PS.data(_actor_x, _actor_y) === _MAP_TALK_NPC){
			if(shardsCarriedArray.length > 1){
				PS.statusText("Those " + shardsCarriedArray.length + " eggplant pieces are safe with me!");
				shardNotif = true;
			} else if(shardsCarriedArray.length === 1){
				PS.statusText("I'll take that shard off your hands!");
				shardNotif = true;
			} else if(!shardNotif && !gameClear){
				PS.statusText("Bring the eggplant pieces back to me!");
			} else if(gameClear){
				PS.statusText("The eternal eggplant is reassembled! Huzzah!");
			}
			//Give all of your shards to the elder
			for(let i = 0; i < shardsCarriedArray.length; i++){
				shardsCollectedArray.push(shardsCarriedArray[i]);
			}
			shardsCarriedArray = [];
		}

		//Enemy detection
		let oplane = PS.gridPlane();
		PS.gridPlane(_PLANE_ENEMY_SIGHT);
		if(PS.color(_actor_x, _actor_y) === _DRAW_FOV){
			//PS.statusText("obama location");
			for(let i=0; i < enemies.length; i++){
				let enemy = enemies[i];
				let path = PS.pathFind( _pathmap, enemy._enemy_x, enemy._enemy_y, _actor_x, _actor_y );
				if ( path.length > 0 ) {
					enemy._enemy_position = 0;
					enemy._enemy_path = path;
				}
			}

		}
		PS.gridPlane(oplane);

		//Pick up shard
		if(PS.data(_actor_x, _actor_y) === _MAP_SHARD){
			PS.statusText("Eggplant GET!");
			PS.gridPlane()
			PS.color(_actor_x, _actor_y, GROUND_COLOR);
			let oplane = PS.gridPlane();
			PS.gridPlane(_PLANE_SHARD);
			PS.alpha(_actor_x,_actor_y, 0);
			PS.gridPlane(oplane);

			shardsCarriedArray.push([levelIndexX, levelIndexY]);
			PS.data(_actor_x, _actor_y, _MAP_GROUND);
		}

		if(PS.data(_actor_x, _actor_y) === _MAP_DOOR){

			onInitLoad = true;
			PS.statusText("");
			for(let i = 0; i < enemies.length; i++){
				PS.spriteDelete(enemies[i]._enemy_sprite);
			}
			enemies = [];

			//Left screen transition
			if(_actor_x === 0){
				_actor_x = gridSizeX-2;
				levelIndexX -= 1;
			//Up screen transition
			} else if(_actor_y === 0){
				_actor_y = gridSizeY-2;
				levelIndexY -= 1;
			//Right screen transition
			} else if(_actor_x === gridSizeX - 1){
				_actor_x = 1;
				levelIndexX += 1;
			//Down Screen transition
			} else if(_actor_y === gridSizeY - 1){
				_actor_y = 1;
				levelIndexY += 1;
			}

			//Reset respawn location
			_actor_originX = _actor_x
			_actor_originY = _actor_y;
			PS.spriteMove(_actor_sprite, _actor_x, _actor_y);

			PS.imageLoad("images/ratmap" + levelIndexX + "-" + levelIndexY + ".gif", onMapLoad, 1 );
		}



		//Path functions
		if ( _actor_path ) {
			let point = _actor_path[ _actor_position ];
			if(typeof point !== 'undefined'){
				let x = point[ 0 ];
				let y = point[ 1 ];

				//_actor_place( x, y );
			}

			_actor_position += 1;
			if ( _actor_position >= _actor_path.length ) {
				_actor_path = null;
				_actor_position = 0;
			}
		}

		//Standard enemy behavior
		for(let i = 0; i < enemies.length; i++){
			let enemy = enemies[i];
			enemy.update();
		}


	};

	// ==============
	//MAP FUNCTIONS//
	// ==============

	const _shade = function ( color ) {
		const range = 32;

		const vary = function ()  {
			return ( PS.random( range * 2 ) - range );
		};

		const r = color.r + vary();
		const g = color.g + vary();
		const b = color.b + vary();

		return PS.makeRGB( r, g, b );
	};


	const _draw_map = function ( map ) {
		PS.gridPlane( _PLANE_MAP );

		let i = 0;
		for ( let y = 0; y < map.height; y += 1 ) {
			for ( let x = 0; x < map.width; x += 1 ) {
				PS.gridPlane( _PLANE_MAP );
				let color;
				let data = map.data[ i ];
				switch ( data ) {
					case _MAP_GROUND:
					case _MAP_TALK_NPC: {
						color = _DRAW_GROUND;
						break;
					}
					case _MAP_NPC:
						color = ELDER_COLOR;
						break;
					case _MAP_WALL:
						color = _shade( _rgb_wall );
						break;
					case _MAP_DOOR:
						color = _DRAW_DOOR;
						break;
					case _MAP_SHARD:
						PS.gridPlane(_PLANE_SHARD);
						PS.alpha(x,y,255);
						color = _DRAW_SHARD;
						PS.color(x,y,color);
						PS.gridPlane(_PLANE_MAP);
						color = _DRAW_GROUND;
						break;
					default:
						color = PS.COLOR_WHITE;
						break;
				}
				PS.color( x, y, color );
				i += 1;
			}
		}
	};

	const onMapLoad = function ( image ) {
		if ( image === PS.ERROR ) {
			PS.debug( "onMapLoad(): image load error\n" );
			return;
		}

		//If the player sprite exists, be sure to delete it!
		if(_actor_x !== -1){
			PS.spriteDelete(_actor_sprite);
		}

		enemies = [];



		_mapdata = image; // save map data for later

		// Prepare grid for map drawing

		_imagemap.width = _grid_x = image.width;
		_imagemap.height = _grid_y = image.height;

		PS.gridSize( _grid_x, _grid_y );
		PS.border( PS.ALL, PS.ALL, 0 );

		//PS.imageBlit(image, 0, 0, {left: 0, top: 0, width: 16, height: 16 });

		// Translate map pixels to data format expected by _imagemap

		let i = 0; // init pointer into _imagemap.data array

		for ( let y = 0; y < _grid_y; y += 1 ) {
			for ( let x = 0; x < _grid_x; x += 1 ) {
				let data = _MAP_GROUND; // assume ground
				let pixel = image.data[ i ];
				switch ( pixel ) {
					case GROUND_COLOR:
						break; // no need to do anything
					case WALL_COLOR:
						data = _MAP_WALL; // found a wall!
						break;
					case ACTOR_COLOR:

						if(!onInitLoad){
							_actor_x = x; // establish initial location of actor
							_actor_y = y;
							_actor_originX = x;
							_actor_originY = y;
						}

						break;
					case SNAKE_COLOR:
						new Snake(x,y);
						enemyCoords.push([x,y]);
						enemyTypes.push(0);

						break;
					case HUMAN_COLOR:
						new Human(x,y);
						enemyCoords.push([x,y]);
						enemyTypes.push(1);
						break;
					case DOOR_COLOR:
						data = _MAP_DOOR;
						break;
					case SHARD_COLOR:
						//We want to check if the shard has been successfully collected before we spawn it in
						let shardCollected = false;
						let shardCarried = false;

						for(let i = 0; i < shardsCarriedArray.length; i++){
							let currentShard = shardsCarriedArray[i];
							if(levelIndexX === currentShard[0] && levelIndexY === currentShard[1]){
								shardCarried = true;
							}
						}

						for(let i = 0; i < shardsCollectedArray.length; i++){
							let currentShard = shardsCollectedArray[i];
							if(levelIndexX === currentShard[0] && levelIndexY === currentShard[1]){
								shardCollected = true;
							}
						}

						if((!shardCollected && !shardCarried)){
							data = _MAP_SHARD;
						}


						break;
					case ELDER_TALK_COLOR:
						data = _MAP_TALK_NPC;
						break;
					case ELDER_COLOR:
						data = _MAP_NPC;
						break;
					default:
						PS.debug( "onMapLoad(): unrecognized pixel value\n" );
						break;
				}
				_imagemap.data[ i ] = data; // install translated data
				PS.data(x,y,data);
				i += 1; // update array pointer
			}
		}

		// Now we can complete the initialization

		_draw_map( _imagemap );

		// Set up actor sprite and place it

		_actor_sprite = PS.spriteSolid( 1, 1 ); // Create 1x1 solid sprite, save its ID
		PS.spriteSolidColor( _actor_sprite, _DRAW_ACTOR ); // assign color
		PS.spritePlane( _actor_sprite, _PLANE_ACTOR ); // move to assigned plane
		_actor_place( _actor_x, _actor_y );



		// Set up enemy sprite and place it

		/*
		_enemy_sprite = PS.spriteSolid( 1, 1 ); // Create 1x1 solid sprite, save its ID
		PS.spriteSolidColor( _enemy_sprite, _DRAW_ENEMY ); // assign color
		PS.spritePlane( _enemy_sprite, _PLANE_ENEMY_SIGHT ); // move to assigned plane
		_enemy_place( _enemy_x, _enemy_y );

		 */

		_pathmap = PS.pathMap( _imagemap );
	};

	return {
		init : function () {

			// Change this string to your team name
			// Use only ALPHABETIC characters
			// No numbers, spaces or punctuation!

			const TEAM = "pix";

			// Begin with essential setup
			// Establish initial grid size

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


			// This function is called when the map image is loaded

			// Load the image map in format 1

			PS.imageLoad("images/ratmap" + levelIndexX + "-" + levelIndexY + ".gif", onMapLoad, 1 );

			_player_timer_id = PS.timerStart(6, _player_clock);
			_timer_id = PS.timerStart( 6, _clock );

		},
		touch : function ( x, y ) {

			PS.debug("Shards carried: " + shardsCarriedArray);
			PS.debug("Shards collected: " + shardsCollectedArray);
			for(let i = 0; i < 6; i++){
				PS.gridPlane(i);
				PS.debug("Plane " + i + " Color: " + PS.color(x,y));
				PS.debug("Plane " + i + " Alpha: " + PS.alpha(x,y));
			}



			//PS.debug(enemies);

		},
		keyDown : function (key){
			shardNotif = false;
			_actor_moving = true;


			/*
			switch ( key ) {
				case PS.KEY_ARROW_UP:
				case 119:
				case 87: {
					moveUp = true;
					if(moveRight){
						_actor_moveX = 1;
						_actor_moveY = -1;
					} else if(moveLeft){
						_actor_moveX = -1;
						_actor_moveY = -1;
					} else {
						_actor_moveX = 0;
						_actor_moveY = -1;
					}
					break;
				}
				case PS.KEY_ARROW_DOWN:
				case 115:
				case 83: {
					if(moveRight){
						_actor_moveX = 1;
						_actor_moveY = 1;
					} else if(moveLeft){
						_actor_moveX = -1;
						_actor_moveY = 1;
					} else {
						_actor_moveX = 0;
						_actor_moveY = 1;
					}
					moveDown = true;
					break;
				}
				case PS.KEY_ARROW_LEFT:
				case 97:
				case 65: {

					if(moveUp){
						_actor_moveX = -1;
						_actor_moveY = -1;
					} else if(moveDown){
						_actor_moveX = -1;
						_actor_moveY = 1;
					} else {
						_actor_moveX = -1;
						_actor_moveY = 0;
					}
					moveLeft = true;
					break;
				}
				case PS.KEY_ARROW_RIGHT:
				case 100:
				case 68: {
					if(moveUp){
						_actor_moveX = 1;
						_actor_moveY = -1;
					} else if(moveDown){
						_actor_moveX = 1;
						_actor_moveY = 1;
					} else {
						_actor_moveX = 1;
						_actor_moveY = 0;
					}
					moveRight = true;
					break;
				}
			}

			 */


			//courtesy check to ensure a dead player tells no tales
			if(!isDead){
				switch ( key ) {
					case PS.KEY_ARROW_UP:
					case 119:
					case 87: {
						actor_step( 0, -1 ); // move UP (v = -1)
						break;
					}
					case PS.KEY_ARROW_DOWN:
					case 115:
					case 83: {
						actor_step( 0, 1 ); // move DOWN (v = 1)
						break;
					}
					case PS.KEY_ARROW_LEFT:
					case 97:
					case 65: {
						actor_step( -1, 0 ); // move LEFT (h = -1)
						break;
					}
					case PS.KEY_ARROW_RIGHT:
					case 100:
					case 68: {
						actor_step( 1, 0 ); // move RIGHT (h = 1)
						break;
					}
				}
			}
		},
		keyUp : function (key){

			switch ( key ) {
				case PS.KEY_ARROW_UP:
				case 119:
				case 87: {
					moveUp = false;
					break;
				}
				case PS.KEY_ARROW_DOWN:
				case 115:
				case 83: {
					moveDown = false;
					break;
				}
				case PS.KEY_ARROW_LEFT:
				case 97:
				case 65: {
					moveLeft = false;
					break;
				}
				case PS.KEY_ARROW_RIGHT:
				case 100:
				case 68: {
					moveRight = false;
					break;
				}
			}

			if(!moveUp && !moveDown && !moveLeft && !moveRight){
				_actor_moving = false;
			}

		}
	};
} () );

PS.init = G.init;
PS.touch = G.touch;
PS.keyDown = G.keyDown;
PS.keyUp = G.keyUp;

//code blocks

/*

const _enemy_place = function ( x, y ) {
	PS.spriteMove( _enemy_sprite, x, y );
	//PS.alpha(x,y,255);
	_enemy_x = x;
	_enemy_y = y;
};

 */

/*
	const _enemy_view = function(x,y){
		let oplane = PS.gridPlane();
		PS.gridPlane(_PLANE_MAP);

		//PS.statusText("ploopy");
		let checkX = x;
		let checkY = y;
		//If there is a wall directly next to the snake, skip that direction

		switch(_enemy_view_direction){
			case 0:
				_enemy_sight = PS.line(x,y,x,y);
				break;
			case 1:
				//up
				while(PS.data(x,checkY) === _MAP_GROUND){
					checkY--;
				}
				_enemy_sight = PS.line(x, y, x, checkY + 1);
				break;
			case 2:
				//snake looks right

				while(PS.data(checkX,y) === _MAP_GROUND){
					checkX++;
				}
				_enemy_sight = PS.line(x, y, checkX-1, y);

				break;
			case 3:
				//down
				while(PS.data(x,checkY) === _MAP_GROUND){
					checkY++;
				}
				_enemy_sight = PS.line(x, y, x, checkY - 1);
				break;
			case 4:
				//snake looks left

				while(PS.data(checkX,y) === _MAP_GROUND){
					checkX--;
				}
				_enemy_sight = PS.line(x, y, checkX+1, y);

				break;
		}

		//Compare the arrays to see if the view has changed. If it has, delete the last view
		if(JSON.stringify(_enemy_sight) !== JSON.stringify(_enemy_prev_sight)){
			for(let i=0; i < _enemy_prev_sight.length; i++){

				PS.color(_enemy_prev_sight[i][0], _enemy_prev_sight[i][1], _DRAW_GROUND);
				PS.alpha(_enemy_prev_sight[i][0], _enemy_prev_sight[i][1], 255);

			}

			_enemy_prev_sight = _enemy_sight;

		}

		//Create the snake's view that enables it to see the player
		for(let i=0; i < _enemy_sight.length; i++){
			PS.color(_enemy_sight[i][0], _enemy_sight[i][1], 0xFF0000);
		}

		//Update rotational counter as needed
		_enemy_rotate_counter++;
		if(_enemy_rotate_counter > 10){
			if(_enemy_view_direction === (4 || 0)){
				_enemy_view_direction = 1;
			} else {
				_enemy_view_direction++;
			}
			_enemy_rotate_counter = 0;
		}

		PS.gridPlane(oplane);
	}

	 */

