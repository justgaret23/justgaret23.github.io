/*
 game.js for Perlenspiel 3.3.x
 Last revision: 2018-10-14 (BM)
 */

"use strict";

/* jshint browser : true, devel : true, esversion : 5, freeze : true */
/* globals PS : true */

const G = ( function () {
	// These define the colors assignments used in the .gif map

	let levelIndex = 1;

	const WALL_COLOR = PS.COLOR_BLACK;
	const GROUND_COLOR = PS.COLOR_WHITE;
	const ACTOR_COLOR = PS.COLOR_GREEN;
	const ENEMY_COLOR = PS.COLOR_RED;
	const SHARD_COLOR = PS.COLOR_BLUE;

	// These define the data used by the pathfinder

	const _MAP_WALL = 0;
	const _MAP_GROUND = 1;
	const _MAP_SHARD = 2;

	// These are the plane assignments

	const _PLANE_MAP = 0;
	const _PLANE_ENEMY = 1;
	const _PLANE_ACTOR = 2;
	const _PLANE_SHARD = 3;

	// These are the actual drawing colors for all elements

	const _DRAW_WALL = 0x600000;
	const _DRAW_GROUND = 0xC0C0C0;
	const _DRAW_ACTOR = PS.COLOR_GRAY;
	const _DRAW_ENEMY = 0xC00000;
	const _DRAW_FOV = 0xFFFF00;
	const _DRAW_SHARD = PS.COLOR_BLUE;

	let _rgb_ground = PS.unmakeRGB( _DRAW_GROUND, {} );
	let _rgb_wall = PS.unmakeRGB( _DRAW_WALL, {} );

	let _grid_x;
	let _grid_y;

	let _actor_x;
	let _actor_y;
	let _actor_originX;
	let _actor_originY;
	let _actor_path = null;
	let _actor_position;
	let _actor_sprite;

	let enemies = [];

	let _enemy_x;
	let _enemy_y;
	let _enemy_path = null;
	let _enemy_position;
	let _enemy_sight = [];
	let _enemy_prev_sight = [];
	let _enemy_rotate_counter = 0;
	let _enemy_view_direction = 0;
	let _enemy_sprite;

	//map variables
	const MAP_WIDTH = 96;
	const MAP_HEIGHT = 80;
	const SEGMENTS_WIDTH = MAP_WIDTH/16;
	const SEGMENTS_HEIGHT = MAP_HEIGHT/16;

	let _timer_id;
	let _pathmap;
	let pause = false;

	let _mapdata;

	const _imagemap = {
		width : 0,
		height : 0,
		pixelSize : 1,
		data : []
	};

	const _actor_place = function ( x, y ) {
		PS.spriteMove( _actor_sprite, x, y );
		_actor_x = x;
		_actor_y = y;
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
			PS.spriteSolidColor( this._enemy_sprite, _DRAW_ENEMY ); // assign color
			PS.spritePlane( this._enemy_sprite, _PLANE_ENEMY ); // move to assigned plane
			PS.spriteMove(this._enemy_sprite, x, y);

			enemies.push(this);
		}

		update(){

			if(this._enemy_path){
				let path;
				if(!this._enemy_touched){
					PS.spriteCollide(_actor_sprite, enemyTouch);
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
				for(let i=0; i < this._enemy_sight.length; i++){
					PS.color(this._enemy_sight[i][0], this._enemy_sight[i][1], _DRAW_GROUND);
				}


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
			PS.gridPlane(_PLANE_MAP);
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
					PS.alpha(this._enemy_prev_sight[i][0], this._enemy_prev_sight[i][1], 255);

				}

				this._enemy_prev_sight = this._enemy_sight;

			}

			//Create the snake's view that enables it to see the player
			for(let i=0; i < this._enemy_sight.length; i++){
				PS.color(this._enemy_sight[i][0], this._enemy_sight[i][1], 0xFF0000);
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
			//pause = true;
			PS.statusText("Rats! You were devoured!");
			_actor_x = _actor_originX;
			_actor_y = _actor_originY;

			PS.spriteMove(_actor_sprite, _actor_originX, _actor_originY);
			_actor_path = PS.pathFind( _pathmap, _actor_x, _actor_y, _actor_originX, _actor_originY );

			for(let i = 0; i < enemies.length; i++){
				PS.spriteMove(enemies[i]._enemy_sprite, enemies[i]._enemy_originX, enemies[i]._enemy_originY);
				enemies[i]._enemy_position = 0;
				//enemies[i]._enemy_path = [];
				enemies[i]._enemy_path = PS.pathFind( _pathmap, enemies[i]._enemy_x, enemies[i]._enemy_y, enemies[i]._enemy_originX, enemies[i]._enemy_originY);
				enemies[i]._enemy_touched = true;
			}


			//enemies = [];

		}
	}

	// ========================
	//GENERAL GAME FUNCTIONS //
	// ========================

	const _clock = function () {

		//Enemy detection
		if(PS.color(_actor_x, _actor_y) === PS.COLOR_RED){
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

		if(PS.data(_actor_x, _actor_y) === _MAP_SHARD){
			PS.statusText("");
			for(let i = 0; i < enemies.length; i++){
				PS.spriteDelete(enemies[i]._enemy_sprite);
			}
			enemies = [];
			levelIndex += 1;
			if(levelIndex < 4) {
				PS.imageLoad("images/rat_level" + levelIndex + ".gif", onMapLoad, 1 );
			} else {
				PS.statusText("To be continued...");
			}

		}



		//Path functions
		if ( _actor_path ) {
			let point = _actor_path[ _actor_position ];
			if(typeof point !== 'undefined'){
				let x = point[ 0 ];
				let y = point[ 1 ];

				_actor_place( x, y );
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
				let color;
				let data = map.data[ i ];
				switch ( data ) {
					case _MAP_GROUND:
						color = _DRAW_GROUND;
						break;
					case _MAP_WALL:
						color = _shade( _rgb_wall );
						break;
					case _MAP_SHARD:
						color = _DRAW_SHARD;
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
						_actor_x = x; // establish initial location of actor
						_actor_y = y;
						_actor_originX = x;
						_actor_originY = y;
						break;
					case ENEMY_COLOR:
						new Snake(x,y);


						//_enemy_x = x; // establish initial location of actor
						//_enemy_y = y;


						break;
					case SHARD_COLOR:
						data = _MAP_SHARD;
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
		PS.spritePlane( _enemy_sprite, _PLANE_ENEMY ); // move to assigned plane
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
			}, { active : true } );


			// This function is called when the map image is loaded

			// Load the image map in format 1

			PS.imageLoad( "images/rat_level1.gif", onMapLoad, 1 );
			_timer_id = PS.timerStart( 6, _clock );

		},
		touch : function ( x, y ) {

			let path = PS.pathFind( _pathmap, _actor_x, _actor_y, x, y );
			if ( path.length > 0 ) {
				_actor_position = 0;
				_actor_path = path;
			}
		}
	};
} () );

PS.init = G.init;
PS.touch = G.touch;
PS.keyDown = G.keyDown;

//code blocks

const _is_wall = function ( x, y ) {
	let data = _imagemap.data[ ( y * _grid_x ) + x ];
	return ( data === _MAP_WALL );
};
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

