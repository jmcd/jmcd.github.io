function addSnekGame(canvas, scale) {

	var ctx = canvas.getContext("2d");

	var bpp = 4;

	var size = new Vertex(canvas.width, canvas.height)
	var lgimageData = ctx.createImageData(size.x, size.y);

	//var scale = 0.1;
	var scaledSize = new Vertex(canvas.width * scale, canvas.height * scale);
	var scaledImageData = ctx.createImageData(scaledSize.x, scaledSize.y);
	var screen = new Screen(scaledSize);

	var gameOverMessage = document.getElementById("gameOverMessage");
	var scoreElement = document.getElementById("score");

	var game = new Game(scaledSize, {
		gameOverDidChange: function(gameOver) {
			gameOverMessage.hidden = !gameOver;
		},
		scoreDidChange: function(score) {
			scoreElement.innerHTML = score;
		}
	});

	var gameLoop = new GameLoop(game.didChange, function() {
		game.draw(screen);
		screen.commitTransactionTo(scaledImageData, [186, 203, 119, 255], [67, 73, 43, 255], bpp);
		copyImageData(scaledImageData, lgimageData, 1/scale, bpp);
		ctx.putImageData(lgimageData, 0, 0);
	});

	function doKeyDown(e) {
		switch(e.keyCode) {
			case 90:
				game.rotate(DIRECTION_ANTICLOCKWISE);
				break;
			case 88: 
				game.rotate(DIRECTION_CLOCKWISE);
				break;
			case 32:
				game.start();
				break;
		}
	}
	document.addEventListener( "keydown", doKeyDown, true);

	window.requestAnimationFrame(gameLoop)
}

function GameLoop(didChangeFn, drawFn) {

	var prevTimestamp = undefined;
	var needsRedraw = true;

	function update(timestamp) {
		var timeInterval = (timestamp - prevTimestamp)/1000;
		if (!isNaN(timeInterval)) {
			needsRedraw = didChangeFn(timeInterval) || needsRedraw;
		}
		prevTimestamp = timestamp;
	}

	function loop(timestamp) {
		update(timestamp);
		if (needsRedraw) {
			drawFn();
			needsRedraw = false;
		}
		lastRender = timestamp
		window.requestAnimationFrame(loop)
	}

	return loop;
} 

function Screen(size) {
	var size = size;
	var ON = true;
	var OFF = !ON;
	var arr = Array(size.x * size.y).fill(OFF);
	var transaction = arr.map(function(_, i) { return i; });

	function set(index, onOff) { 
		arr[index] = onOff; 
		transaction.push(index);
	}

	function commitTransactionTo(imageData, offColor, onColor, bpp) {
		transaction.forEach(function(i) {
			var color = arr[i] ? onColor : offColor;
			color.forEach(function(component, j) {
				imageData.data[i*bpp+j] = component;
			});
		});
		transaction = [];
	}

	return {
		index: function(point) { return point.y * size.x + point.x; },
		setOn: function(index) { set(index, ON); },
		setOff: function(index) { set(index, OFF); },
		commitTransactionTo: commitTransactionTo
	};
}


function Snek(headPosition, speed, direction, pendingLen) {

	var body = [headPosition];
	var pendingLen = pendingLen;
	var remainderNumberOfPxToMove = 0;
	
	function didMove(timeInterval) {
		var fractionalNumberOfPxToMove = timeInterval * speed + remainderNumberOfPxToMove;
		var wholeNumberOfPxToMove = Math.floor(fractionalNumberOfPxToMove);
		remainderNumberOfPxToMove = fractionalNumberOfPxToMove - wholeNumberOfPxToMove;
		move(wholeNumberOfPxToMove);
		return wholeNumberOfPxToMove > 0;
	}

	function move(numberOfPx) {
		for (var i = 0; i < numberOfPx; i += 1) {
			var newHead = body[0] + direction;
			body.unshift(newHead);
			if (pendingLen > 0) {
				pendingLen -= 1;
			} else {
				body.pop();
			}
		}
	}

	return {
		head: function() { return body[0]; },
		body: function() { return body; },
		length: function() { return body.length + pendingLen; },
		didMove: didMove,
		direction: function() { return direction; },
		setDirection: function(newDirection) {
			if (Math.abs(newDirection) == Math.abs(direction)) { return; }
			direction = newDirection;
		},
		grow: function() { 
			pendingLen += 1; 
			speed += 1;
		}
	};
}

function Vertex(x, y) {
	return {
		x: x,
		y: y,
		abs: function() { return Math.max(Math.abs(x), Math.abs(y)); },
		sign: function() { return new Vertex(Math.sign(x), Math.sign(y)); },
		dividing: function(v) { return new Vertex(x/v.x, y/v.y); },
		adding: function(v) { return new Vertex(x+v.x, y+v.y); }
	};
}

function Directions(size) {

	var clockwise = [-size.x, 1, size.x, -1];

	function nextAnticlockwise(direction) {
		return nextDirection(direction, function(i) {
			return i == 0 ? clockwise.length - 1 : i - 1;
		});
	}

	function nextClockwise(direction) {
		return nextDirection(direction, function(i) {
			return (i + 1) % clockwise.length;
		});
	}

	function nextDirection(direction, nextIndexFn) {
		var i = clockwise.indexOf(direction);
		if (i === -1) { return undefined; }
		var j = nextIndexFn(i);
		return clockwise[j];
	}

	return {
		clockwise: clockwise,
		nextAnticlockwise: nextAnticlockwise,
		nextClockwise: nextClockwise
	};
}

var DIRECTION_ANTICLOCKWISE = true;
var DIRECTION_CLOCKWISE = !DIRECTION_ANTICLOCKWISE;

function Game(size, gameListener) {

	var gameOver = true;
	var directions = new Directions(size);
	var snek;
	var food;

	var initialSnekLen = 10;

	function reset() {
		snek = new Snek(size.x*size.y/2+size.x/2, 5, directions.clockwise[0], initialSnekLen);
		dropFood();
		notifyScoreDidChange();
	}

	function dropFood() {
		var i = Math.floor(Math.random() * size.x * size.y - snek.body().length)
		while (snek.body().indexOf(i) !== -1) {
			i += 1;
		}
		food = i;
	}

	function notifyScoreDidChange() {
		gameListener.scoreDidChange(snek.length() - initialSnekLen - 1);
	}

	reset();
	
	var prevSetOn = [];
	function draw(screen) {
		var nextSetOn = snek.body().slice();
		nextSetOn.push(food);
		prevSetOn
			.filter(function(i) { return nextSetOn.indexOf(i) < 0; })
			.forEach(screen.setOff);
		nextSetOn.forEach(screen.setOn);
		prevSetOn = nextSetOn;
	}

	function row(index) {
		return Math.floor(index / size.x);
	}

	function headIsOutOfBounds(prevHead, head) {
		return head < 0 || 
			head >= size.x*size.y ||
			(Math.abs(prevHead-head) == 1 && row(head) !== row(prevHead));
	}

	function setGameOver(b) {
		gameOver = b;
		gameListener.gameOverDidChange(gameOver);
	}

	return {
		draw: draw,
		didChange: function(timeInterval) { 
			
			if (gameOver) {
				return false;
			}

			var prevHead = snek.head();
			var snekChanged = snek.didMove(timeInterval);
			if (snekChanged) {
				var head = snek.head();
				if (headIsOutOfBounds(prevHead, head)) {
					setGameOver(true);
					return false;
				}
				if (head === food) {
					snek.grow();
					dropFood();
					notifyScoreDidChange();
				}
				return true;
			} 

			return false;
		},
		rotate: function(direction) {
			var fn = direction === DIRECTION_ANTICLOCKWISE ? directions.nextAnticlockwise : directions.nextClockwise;
			var next = fn(snek.direction());
			snek.setDirection(next);
		},
		start: function() {
			if (gameOver) {
				reset();
				setGameOver(false);
			}
		},

	};
}


function copyImageData(srcImageData, destImageData, scale, bpp) {
	for(var srcY = 0; srcY < srcImageData.height; srcY++) {
		for(var srcX = 0; srcX < srcImageData.width; srcX++) {
			var srcOffset = (srcY * srcImageData.width + srcX) * bpp;
			var srcPx = [];
			for (var pxi = 0; pxi < bpp; pxi++) {
				srcPx[pxi] = srcImageData.data[srcOffset + pxi];
			}
			for(var y = 0; y < scale; y++) {
				var destRow = srcY * scale + y;
				for(var x = 0; x < scale; x++) {
					var destCol = srcX * scale + x;
					for(var i = 0; i < bpp; i++) {
						destImageData.data[(destRow * destImageData.width + destCol) * bpp + i] = srcPx[i];
					}
				}
			}
		}
	}
	return destImageData;
}