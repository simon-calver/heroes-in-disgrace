class MapBuilder {
  constructor(scene) {
    this.scene = scene;
  }

  buildMap(width, height, openness = 1) {
    var maze = this.generateMaze(width, height, openness);
    maze = this.addRooms(maze, width, height, 2, 4, 'corners');

    // const mazeWidth = width * 2 + 1;
    // const startPoint = new Phaser.Math.Vector2(
    // maze = this.addStartArea(maze, mazeWidth, startPoint, 4, 4);

    const map = this.drawMaze(maze, width, height);
    return map;



    // const map = this.scene.make.tilemap({
    //   tileWidth: 64,
    //   tileHeight: 64,
    //   width: width,
    //   height: height
    // });

    // // Load up a tileset, in this case, the tileset has 1px margin & 2px padding (last two arguments)
    // const tileset = map.addTilesetImage('tiles', null, 32, 32, 0, 0);

    // // Create an empty layer and give it the name "Layer 1"
    // const layer = map.createBlankLayer('mainLayer', tileset);

    // for (let i = 1; i < width - 1; i++) {
    //   for (let j = 1; j < width - 1; j++) {
    //     layer.putTileAt(0, i, j);
    //   }
    // }
    // // make edges of the map solid
    // for (let i = 0; i < width; i++) {
    //   layer.putTileAt(1, i, 0);
    //   layer.putTileAt(1, i, height - 1);
    // }
    // for (let i = 0; i < height; i++) {
    //   layer.putTileAt(1, 0, i);
    //   layer.putTileAt(1, width - 1, i);
    // }

    // layer.setCollisionByExclusion([0]);

    // return layer;
    // layer.putTileAt(0, 0, 0);
    // layer.putTileAt(0, 0, 1);
    // layer.putTileAt(0, 1, 2);

    // this.physics.add.collider(this.player, layer);
    // let mapBuilder = new MapBuilder(this);
    // mapBuilder.buildMap();
  }

  rebuildMap(width, height, map, openness = 1, minRoomSize = 2, maxRoomSize = 4, roomPlacement = 'corners') {
    var maze = this.generateMaze(width, height, openness);
    maze = this.addRooms(maze, width, height, minRoomSize, maxRoomSize, roomPlacement);

    map = this.redrawMaze(maze, width, height, map);
    return map;
  }

  generateMaze(width, height, openness) {
    var graph = this.growingTreeGraph(width, height, openness);

    const mazeWidth = width * 2 + 1;
    const mazeHeight = height * 2 + 1;

    var maze = Array(mazeWidth * mazeHeight).fill(0);

    for (let i = 0; i < graph.getSize(); i++) {
      const vertexPos = graph.idToPos(i);
      const rand = Math.random();
      maze[(2 * vertexPos.x + 1) + (2 * vertexPos.y + 1) * mazeWidth] = rand < 0.1 ? 5 : rand < 0.2 ? 4 : 3;

      for (let edge of graph.getVertex(i).edges) {
        const midPoint = graph.idToPos(edge).clone().subtract(vertexPos).scale(0.5).add(vertexPos);

        const rand = Math.random();
        maze[(2 * midPoint.x + 1) + (2 * midPoint.y + 1) * mazeWidth] = rand < 0.1 ? 5 : rand < 0.2 ? 4 : 3;
      }
    }

    return maze;
  }

  // addStartArea(maze, width, startPoint, startAreaWidth, startAreaHeight) {
  //   for (let i = 0; i < startAreaWidth; i++) {
  //     for (let j = 0; j < startAreaHeight; j++) {
  //       maze[(startPoint.x + i) + (startPoint.y + j) * width] = 0;
  //     }
  //   }

  //   return maze;
  // }

  addRooms(maze, width, height, minSize = 3, maxSize = 6, roomArange = 'all') {
    const mazeWidth = width * 2 + 1;
    const mazeHeight = height * 2 + 1;
    const middleRoomWidth = 3;
    const middleRoomHeight = 3;
    const middleRoomCorner = new Phaser.Math.Vector2(Math.floor((mazeWidth - middleRoomWidth) / 2), Math.floor((mazeHeight - middleRoomHeight) / 2));

    maze = this.addRoom(maze, mazeWidth, middleRoomCorner, middleRoomWidth, middleRoomHeight);

    var rooms = [];
    var roomPos = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1]];
    switch (roomArange) {
      case 'all':
        roomPos = roomPos;
        break;
      case 'corners':
        roomPos = roomPos.filter((_, i) => i % 2 == 0);
        break;
      case 'sides':
        roomPos = roomPos.filter((_, i) => i % 2 == 1);
        break;
      case 'random':
        Phaser.Utils.Array.Shuffle(roomPos);
        roomPos = roomPos.slice(0, 4);
        break;
      default:
        roomPos = roomPos;
        break;
    }

    // Add rooms around the middle
    for (let c of roomPos) {
      const roomWidth = Phaser.Math.Between(minSize, maxSize);
      const roomHeight = Phaser.Math.Between(minSize, maxSize);
      const roomCorner = new Phaser.Math.Vector2(
        Phaser.Math.Between(c[0] * mazeWidth / 3 + 1, (c[0] + 1) * mazeWidth / 3 - maxSize - 1),
        Phaser.Math.Between(c[1] * mazeHeight / 3 + 1, (c[1] + 1) * mazeHeight / 3 - maxSize - 1)
      );

      // Add corridor to previous room
      if (rooms.length > 0) {
        maze = this.addCorridor(maze, mazeWidth, rooms[rooms.length - 1], { corner: roomCorner, width: roomWidth, height: roomHeight });
      }
      rooms.push({ corner: roomCorner, width: roomWidth, height: roomHeight });
    }

    // Connect last room to first room
    maze = this.addCorridor(maze, mazeWidth, rooms[rooms.length - 1], rooms[0]);

    // Draw rooms last so they overwrite the corridors
    for (let room of rooms) {
      maze = this.addRoom(maze, mazeWidth, room.corner, room.width, room.height);
    }

    this.rooms = rooms;
    return maze;
  }

  addRoom(maze, mazeWidth, startPoint, roomWidth, roomHeight) {
    for (let i = 0; i < roomWidth; i++) {
      for (let j = 0; j < roomHeight; j++) {
        const rand = Math.random();
        maze[(startPoint.x + i) + (startPoint.y + j) * mazeWidth] = rand < 0.1 ? 8 : rand < 0.2 ? 7 : 6;
      }
    }

    return maze;
  }

  addCorridor(maze, mazeWidth, startRoom, endRoom) {
    // Simple algorithm: move towards last room until you get to the same row or column, then move towards the last room on that row or column.
    // Also only put corridors on odd numbered rows and columns too line up with maze walls
    const startX = 2 * Math.ceil((startRoom.corner.x + startRoom.width / 2) / 2) - 1;
    const startY = 2 * Math.ceil((startRoom.corner.y + startRoom.height / 2) / 2) - 1;

    const endX = 2 * Math.ceil((endRoom.corner.x + endRoom.width / 2) / 2) - 1;
    const endY = 2 * Math.ceil((endRoom.corner.y + endRoom.height / 2) / 2) - 1;

    // var x1, x2, y1, y2, x, y;
    // if (startX <= endX) {
    //   x1 = startX;
    //   x2 = endX;
    //   y = startY;
    // } else {
    //   x1 = endX;
    //   x2 = startX;
    //   y = endY;
    // }
    // if (startY <= endY) {
    //   y1 = startY;
    //   y2 = endY;
    //   x = endX;
    // } else {
    //   y1 = endY;
    //   y2 = startY;
    //   x = startX;
    // }
    // console.log(x1, x2, y1, y2)
    // maze = this.addVerticalCorridor(maze, mazeWidth, x, y1, y2)
    // maze = this.addHorizontalCorridor(maze, mazeWidth, y, x1, x2)



    if (startX <= endX && startY <= endY) {
      maze = this.addVerticalCorridor(maze, mazeWidth, endX, startY, endY);
      maze = this.addHorizontalCorridor(maze, mazeWidth, startY, startX, endX);
    } else if (startX <= endX && startY > endY) {
      maze = this.addVerticalCorridor(maze, mazeWidth, startX, endY, startY);
      maze = this.addHorizontalCorridor(maze, mazeWidth, endY, startX, endX);
    } else if (startX > endX && startY <= endY) {
      maze = this.addVerticalCorridor(maze, mazeWidth, startX, startY, endY + 1);
      maze = this.addHorizontalCorridor(maze, mazeWidth, endY, endX, startX);
    } else if (startX > endX && startY > endY) {
      maze = this.addVerticalCorridor(maze, mazeWidth, endX, endY, startY);
      maze = this.addHorizontalCorridor(maze, mazeWidth, startY, endX, startX);
    }



    //   if (startX < endX) {
    //     for (let i = startX; i < endX; i++) {
    //       const rand = Math.random();
    //       maze[i + startY * mazeWidth] = rand < 0.1 ? 8 : rand < 0.2 ? 7 : 6;//rand < 0.1 ? 5 : rand < 0.2 ? 4 : 3;
    //     }
    //   } else {
    //     for (let i = startX; i > endX; i--) {
    //       const rand = Math.random();
    //       maze[i + startY * mazeWidth] = rand < 0.1 ? 8 : rand < 0.2 ? 7 : 6;//rand < 0.1 ? 5 : rand < 0.2 ? 4 : 3;
    //     }
    //   }

    // if (startY < endY) {
    //   for (let i = startY; i < endY; i++) {
    //     const rand = Math.random();
    //     maze[endX + i * mazeWidth] = rand < 0.1 ? 8 : rand < 0.2 ? 7 : 6;//rand < 0.1 ? 5 : rand < 0.2 ? 4 : 3;
    //   }
    // } else {
    //   for (let i = startY; i > endY; i--) {
    //     const rand = Math.random();
    //     maze[endX + i * mazeWidth] = rand < 0.1 ? 8 : rand < 0.2 ? 7 : 6;//rand < 0.1 ? 5 : rand < 0.2 ? 4 : 3;
    //   }
    // }


    // console.log(startX, startY, endX, endY);

    // Check if the rooms are on the same row or column


    // console.log(startRoom, endRoom);
    // Check if the rooms are on the same row or column
    // if (startRoom.corner.x <= endRoom.corner.x + endRoom.width && startRoom.corner.x + startRoom.width >= endRoom.corner.x) {
    //   const startX = endRoom.corner.x + Math.ceil((startRoom.corner.x + startRoom.width - endRoom.corner.x) / 2);
    //   if (startRoom.corner.y < endRoom.corner.y) {
    //     for (let i = startRoom.corner.y; i < endRoom.corner.y; i++) {
    //       maze[startX + i * mazeWidth] = 3;
    //     }
    //   } else {
    //     for (let i = startRoom.corner.y; i > endRoom.corner.y; i--) {
    //       maze[startX + i * mazeWidth] = 3;
    //     }
    //   }
    // } else if (startRoom.corner.y <= endRoom.corner.y + endRoom.height && startRoom.corner.y + startRoom.height >= endRoom.corner.y) {
    //   const startY = endRoom.corner.y + Math.ceil((startRoom.corner.y + startRoom.height - endRoom.corner.y) / 2);
    //   if (startRoom.corner.x < endRoom.corner.x) {
    //     for (let i = startRoom.corner.x; i < endRoom.corner.x; i++) {
    //       maze[i + startY * mazeWidth] = 3;
    //     }
    //   } else {
    //     for (let i = startRoom.corner.x; i > endRoom.corner.x; i--) {
    //       maze[i + startY * mazeWidth] = 3;
    //     }
    //   }
    // } 



    return maze;
  }

  addVerticalCorridor(maze, mazeWidth, xPos, startY, endY) {
    // if (startY < endY) {
    for (let i = startY; i < endY; i++) {
      const rand = Math.random();
      maze[xPos + i * mazeWidth] = rand < 0.1 ? 8 : rand < 0.2 ? 7 : 6;//rand < 0.1 ? 5 : rand < 0.2 ? 4 : 3;
    }
    // } else {
    //   for (let i = startY; i > endY; i--) {
    //     const rand = Math.random();
    //     maze[xPos + i * mazeWidth] = rand < 0.1 ? 8 : rand < 0.2 ? 7 : 6;//rand < 0.1 ? 5 : rand < 0.2 ? 4 : 3;
    //   }
    // }

    return maze;
  }

  addHorizontalCorridor(maze, mazeWidth, yPos, startX, endX) {
    // if (startX < endX) {
    for (let i = startX; i < endX; i++) {
      const rand = Math.random();
      maze[i + yPos * mazeWidth] = rand < 0.1 ? 8 : rand < 0.2 ? 7 : 6;//rand < 0.1 ? 5 : rand < 0.2 ? 4 : 3;
    }
    // } else {
    //   for (let i = startX; i > endX; i--) {
    //     const rand = Math.random();
    //     maze[i + yPos * mazeWidth] = rand < 0.1 ? 8 : rand < 0.2 ? 7 : 6;//rand < 0.1 ? 5 : rand < 0.2 ? 4 : 3;
    //   }
    // }

    return maze;
  }
  // Same column
  // const corridorHeight = Math.abs(startRoom.corner.y - endRoom.corner.y);
  // const corridorStart = Math.min(startRoom.corner.y, endRoom.corner.y);

  // Same row
  // const corridorWidth = Math.abs(startRoom.corner.x - endRoom.corner.x);


  drawMaze(maze, width, height) {
    const mazeWidth = width * 2 + 1;
    const mazeHeight = height * 2 + 1;

    const map = this.scene.make.tilemap({
      tileWidth: 64,
      tileHeight: 64,
      width: mazeWidth,
      height: mazeHeight
    });

    const tileset = map.addTilesetImage('tiles', null, 64, 64, 4, 8); // last two arguments are margin & padding
    const layer = map.createBlankLayer('mainLayer', tileset);

    for (let i = 0; i < mazeWidth; i++) {
      for (let j = 0; j < mazeHeight; j++) {
        layer.putTileAt(maze[i + j * mazeWidth], i, j);
        // if (maze[i + j * mazeWidth]) {
        //   layer.putTileAt(1, i, j);
        // } else {
        //   layer.putTileAt(0, i, j);
        // }
      }
    }

    layer.setCollision([0]);

    return map;
  }

  redrawMaze(maze, width, height, map) {
    const mazeWidth = width * 2 + 1;
    const mazeHeight = height * 2 + 1;

    const layer = map.getLayer('mainLayer').tilemapLayer;
    console.log(layer);
    for (let i = 0; i < mazeWidth; i++) {
      for (let j = 0; j < mazeHeight; j++) {
        layer.putTileAt(maze[i + j * mazeWidth], i, j);
      }
    }

    return map;
  }

  growingTreeGraph(width, height, openness) {
    var graph = new Graph(width, height);

    var vertices = [];
    var visited = [];

    const modVal = 10;
    const threshold = Math.floor(openness * modVal);

    // Add random vertex ID to start
    const start = Math.floor(Math.random() * width * height);
    vertices.push(start);

    var count = 0;
    while (vertices.length > 0 && count < 1000) {
      var current = vertices[vertices.length - 1];
      var currentVertex = graph.getVertex(current);

      visited.push(current);

      const neighbors = graph.getVertexNeighbors(current);
      const unvisitedNeighbors = neighbors.filter(neighbor => !visited.includes(neighbor));

      if (unvisitedNeighbors.length > 0) {
        var next = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];
        currentVertex.addEdge(next);
        vertices.push(next);
      } else {
        vertices.pop(); //splice(current, 1);
      }

      // Add random edges to make it more open
      if (count % modVal < threshold) {

        // const unvisitedNeighbors = neighbors.filter(neighbor => !visited.includes(neighbor));
        // if (unvisitedNeighbors.length > 0) {
        //   const extraNeighbor = unvisitedNeighbors[0];
        //   currentVertex.addEdge(extraNeighbor);
        // }

        const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        currentVertex.addEdge(randomNeighbor);

        // const extraNeighbor = neighbors[0];
        // currentVertex.addEdge(extraNeighbor);

      }

      count++;
    }

    return graph;
  }
}

class Vertex {
  constructor(id) {
    this.id = id;
    this.edges = new Set();
  }

  addEdge(id) {
    // console.log(vertex);
    this.edges.add(id);
  }
}

class Graph {
  constructor(width, height) {
    this.width = width;
    this.height = height;

    this.adjList = [];

    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        this.adjList.push(new Vertex(i * height + j));
      }
    }

    // const up = new Phaser.Math.Vector2(0, -1);
    // const down = new Phaser.Math.Vector2(0, 1);
    // const left = new Phaser.Math.Vector2(-1, 0);
    // const right = new Phaser.Math.Vector2(1, 0);
    this.neighbourPositions = [
      Phaser.Math.Vector2.UP,
      Phaser.Math.Vector2.DOWN,
      Phaser.Math.Vector2.LEFT,
      Phaser.Math.Vector2.RIGHT
    ];
    // up, down, left, right];

    // console.log(this.neighbourPositions);
    // this.neighbourPositions.push(new Phaser.Math.Vector2(1, 0));
    // this.neighbourPositions.push(new Phaser.Math.Vector2(0, 1));
    // this.neighbourPositions.push(new Phaser.Math.Vector2(-1, 0));

    //   new Phaser.Math.Vector2(0, -1),
    //   new Phaser.Math.Vector2(1, 0),
    //   new Phaser.Math.Vector2(0, 1),
    //   new Phaser.Math.Vector2(-1, 0)
    // ];

    // console.log(new Phaser.Math.Vector2(0, -1));
    // console.log(this.neighbourPositions);
    // console.log(this.neighbourPositions[0].add(this.neighbourPositions[1]));
  }

  getVertex(id) {
    return this.adjList[id];
  }

  setVertex(id, vertex) {
    this.adjList[id] = vertex;
  }

  getVertexNeighbors(id) {
    const vertexPos = this.idToPos(id);
    var vertexNeighbors = [];
    for (var neighbour of this.neighbourPositions) {
      const neighbourPos = vertexPos.clone().add(neighbour);
      if (this.isValidPos(neighbourPos)) {
        vertexNeighbors.push(this.posToId(neighbourPos));
      }
    }

    return vertexNeighbors;
  }

  idToPos(id) {
    return new Phaser.Math.Vector2(id % this.width, Math.floor(id / this.width));
  }

  posToId(pos) {
    return pos.x + pos.y * this.width;
  }

  isValidPos(pos) {
    return pos.x >= 0 && pos.x < this.width && pos.y >= 0 && pos.y < this.height;
  }

  getSize() {
    return this.width * this.height;
  }
}

export default MapBuilder;
