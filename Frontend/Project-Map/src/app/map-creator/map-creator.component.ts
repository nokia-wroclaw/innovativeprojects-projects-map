import { FloorServiceService } from './../services/floor-service.service';
import { Floor } from './../common-interfaces/floor';
import { Wall } from './../common-interfaces/wall';
import { Vertex } from './../common-interfaces/vertex';
import { async } from '@angular/core/testing';
import { RoomService } from './../services/room.service';
import { Scale, Doc, PointArray, Rect, Line } from './../../../node_modules/svg.js/svg.js.d';
import { Component, OnInit, Input, Output, EventEmitter, ElementRef } from '@angular/core';
import { Room } from '../common-interfaces/room';
import { Seat } from '../common-interfaces/seat';
declare const SVG: any;

@Component({
  selector: 'app-map-creator',
  templateUrl: './map-creator.component.html',
  styleUrls: ['./map-creator.component.css']
})
export class MapCreatorComponent implements OnInit {
  test() {
  }

  @Input() buildingId: number;
  @Input() loadedFloorId: number = -1; //used to load ready map into component
  @Output() mapCreated = new EventEmitter<boolean>();
  displayGrid: boolean;
  patternRect;

  displayBackgroundImage: boolean;
  backgroundImage;
  imageHref = null;


  element;

  placingSeatEnabled: boolean = false;
  floorNumber: number;
  floorDescription: string;
  removalMode: boolean = false;
  deleteKeyPressed: boolean;
  drawnMap;
  rooms: Room[];
  drawMode: string;
  drawingRightNow: boolean = false;
  createdRooms = Array();
  rects = Array();
  lines = Array();


  constructor(private roomService: RoomService, private floorService: FloorServiceService) {
  }

  changeImage() {
    if (this.displayBackgroundImage) {
      this.backgroundImage = this.drawnMap.image(this.imageHref, 760, 760).move(20, 20).draggable().back();
    }
    //this.backgroundImage.load(this.imageHref);
  }

  moveImage(xShift: number, yShift: number) {
    this.backgroundImage.move(this.backgroundImage.attr().x + xShift, this.backgroundImage.attr().y + yShift);
  }



  setDrawingRightNow(bool: boolean) {
    this.drawingRightNow = bool;
  }
  ngOnInit() {
    this.displayMap();
    this.addEventHandlers();
  }
  addEventHandlers() {
    var self = this;
    document.onkeydown = function switchRemovalMode(e) {
      if (self.removalMode) return;
      if (e.keyCode == 68) {
        self.removalMode = true;
      }
    };
    document.onkeyup = function (e) {
      if (e.keyCode == 68) {
        self.removalMode = false;
      }
    };
  }
  switchOnRemovalMode() {
    this.drawnMap.off("mousedown");
    this.drawnMap.off("mouseup");
    this.removalMode = !this.removalMode;

  }

  drawNewRoom() {
    this.drawMode = 'room';
    this.drawnMap.off("mousedown");
    this.drawnMap.off("mouseup");
    if (!this.drawingRightNow) {
      // grup defined to hold seats, room shape and circles at vertexes of room together
      var group = this.drawnMap.group();
      var poly = this.drawnMap.polygon().draw({ snapToGrid: 5 }).fill('#4f4').stroke({ width: 1 }).mouseover(f => { if (this.removalMode) { var index = this.createdRooms.findIndex((x) => x.polygon.attr().id === poly.attr().id); this.createdRooms.splice(index, 1); group.remove(); } });
      this.drawingRightNow = true;
      var self = this;

      //function that handles end of drawing - 
      var stopDrawingAtEnter = function stopDrawingAtEnter(e) {
        if (e.keyCode == 13) {
          document.removeEventListener('keydown', stopDrawingAtEnter);
          poly.draw('done');
          poly.off('drawstart');
          self.drawingRightNow = false;
          var room = new MapCreatorComponent.RoomWithSeats;
          room.polygon = poly;
          self.createdRooms.push(room);

          var oneCoordinateAtTime = self.createdRooms[self.createdRooms.length - 1].polygon.attr('points').trim().split(/[\s,]+/);
          //holds circles at vertexes of polygon
          var arrayOfCircles = Array();
          for (var j = 0; j <= (oneCoordinateAtTime.length - 2); j += 2) {
            var x = parseInt(oneCoordinateAtTime[j]);
            var y = parseInt(oneCoordinateAtTime[j + 1]);
            var pointie = self.drawnMap.circle(10).fill('#f06').move(x - 5, y - 5).draggable(function (x, y) {
              //function to move circles snapped to grid
              return {
                x: x - x % 5,
                y: y - y % 5
              };
            })
              //every time when circle is moved polygon needs to be replotted
              .on('dragmove.namespace', function (event) {
                var coords = '';
                arrayOfCircles.forEach(circle => {
                  coords = coords.concat(circle.attr('cx') + ',' + circle.attr('cy') + ' ')
                });
                poly.plot(coords);
                group.front();
                arrayOfCircles.forEach(circle => {
                  circle.front();
                });
              });

            group.add(pointie);
            arrayOfCircles.push(pointie);
          }



          group.add(poly);
          poly.click(function placeSeat(event) {
            //seat size hardcoded to 10x10 for now !!! alligned to grid: 10
            if (self.placingSeatEnabled) {
              var seatRect = self.drawnMap.rect(10, 10).move((event.offsetX - event.offsetX % 10), (event.offsetY - event.offsetY % 10));
              var seatVertex = { X: seatRect.attr().x, Y: seatRect.attr().y } as Vertex;
              var seat = { Vertex: seatVertex }
              room.seats.push(seat);
              group.add(seatRect);
            }
          })
        }
      };

      poly.on('drawstart', function (e) {
        document.addEventListener('keydown', stopDrawingAtEnter);
      });
      document.addEventListener('keydown', function cancelDrawingAtEscape(e) {
        if (e.keyCode == 27) {
          document.removeEventListener('keydown', cancelDrawingAtEscape);
          document.removeEventListener('keydown', stopDrawingAtEnter);
          poly.draw('cancel');
          poly.off('drawstart');
          self.drawingRightNow = false;
        }
      });


    }
  }

  clearMap() {
    this.drawnMap.clear();
    this.lines.length = 0;
    this.rects.length = 0;
    this.createdRooms.length = 0;
    this.displayMap();
  }

  displayMap() {
    SVG.prepare();
    this.drawnMap = SVG.adopt(document.getElementById('createMap'));

    if (this.loadedFloorId != -1) {
      this.loadMap();
    }

  }

  chooseLine() {
    var self = this;
    this.drawMode = 'line';
    this.drawnMap.off("mousedown");
    this.drawnMap.off("mouseup");
    var line = this.drawnMap.line().fill('none').stroke({ width: 3 }).mouseover(f => { if (this.removalMode) { var index = this.lines.findIndex((x) => x.attr().id === line.attr().id); this.lines.splice(index, 1); line.remove(); } });
    this.drawnMap.on(
      "mousedown",
      function (e) {
        line.draw(e, { snapToGrid: 5 });
      },
      false
    );

    this.drawnMap.on(
      "mouseup",
      function (e) {
        line.draw("stop", e);
        self.lines.push(line);
      },
      false
    );
  }

  chooseSquare() {
    var self = this;
    this.drawnMap.off("mousedown");
    this.drawnMap.off("mouseup");
    this.drawMode = 'square';
    var rect = this.drawnMap.rect().fill('none').stroke({ width: 3 }).mouseover(f => { if (this.removalMode) { rect.remove(); var index = this.rects.findIndex((x) => x.attr().id === rect.attr().id); this.rects.splice(index, 1) } });
    this.drawnMap.on(
      "mousedown",
      function (e) {
        rect.draw(e, { snapToGrid: 5 });
      },
      false
    );

    this.drawnMap.on(
      "mouseup",
      function (e) {
        rect.draw("stop", e);
        self.rects.push(rect);
      },
      false
    );
  }


  determineShape() {
    if (this.removalMode) {
      return
    }
    switch (this.drawMode) {
      case 'square':
        this.chooseSquare();
        break;
      case 'line':
        this.chooseLine();
        break;
    }
  }

  //add allert so that user will know that saving map will end map creation!
  saveMap() {
    var linesVertexes = Array();
    //parse svg.js lines to LineMap
    for (var i = 0; i < this.lines.length; i++) {
      linesVertexes.push(this.coordinatesToLine(this.lines[i].attr('x1'), this.lines[i].attr('y1'), this.lines[i].attr('x2'), this.lines[i].attr('y2')));
    }
    //parse svg.js rects to 
    for (var i = 0; i < this.rects.length; i++) {
      linesVertexes.push(...this.rectToLines(this.rects[i]));
    }
    //polygon to lines
    var Rooms = Array();
    for (var i = 0; i < this.createdRooms.length; i++) {
      var oneCoordinateAtTime = this.createdRooms[i].polygon.attr('points').trim().split(/[\s,]+/);
      var Walls = Array();
      for (var j = 0; j < (oneCoordinateAtTime.length - 2); j += 2) {
        Walls.push(this.coordinatesToLine(oneCoordinateAtTime[j], oneCoordinateAtTime[j + 1], oneCoordinateAtTime[j + 2], oneCoordinateAtTime[j + 3]));
      }
      Walls.push(this.coordinatesToLine(oneCoordinateAtTime[oneCoordinateAtTime.length - 2], oneCoordinateAtTime[oneCoordinateAtTime.length - 1], oneCoordinateAtTime[0], oneCoordinateAtTime[1]));
      //push seats and Projects as empty
      var Seats = this.createdRooms[i].seats;
      var room: Room = { Walls, Seats, Id: this.createdRooms[i].RoomId } as Room;//!!! Seats
      Rooms.push(room);
    }


    var floor: Floor = { Rooms, Walls: linesVertexes, BuildingId: this.buildingId, Description: this.floorDescription, FloorNumber: this.floorNumber } as Floor;

    if (this.loadedFloorId == -1) {
      this.floorService.addFloor(floor).subscribe(mapCreated => { this.mapCreated.emit(true); });
    } else {
      floor.Id = this.loadedFloorId;
      this.floorService.updateFloor(floor).subscribe(mapCreated => { this.mapCreated.emit(true); });
    }

    //clear map
    this.lines.length = 0;
    this.rects.length = 0;
    this.createdRooms.length = 0;
    this.drawnMap.clear();
  }

  rectToLines(rect: Rect): Wall[] {
    var lines = Array();

    lines.push(this.coordinatesToLine(rect.attr('x'), rect.attr('y'), rect.attr('x') + rect.attr('width'), rect.attr('y')));
    lines.push(this.coordinatesToLine(rect.attr('x'), rect.attr('y'), rect.attr('x'), rect.attr('y') + rect.attr('height')));
    lines.push(this.coordinatesToLine(rect.attr('x') + rect.attr('width'), rect.attr('y'), rect.attr('x') + rect.attr('width'), rect.attr('y') + rect.attr('height')));
    lines.push(this.coordinatesToLine(rect.attr('x'), rect.attr('y') + rect.attr('height'), rect.attr('x') + rect.attr('width'), rect.attr('y') + rect.attr('height')));
    return lines;
  }

  coordinatesToLine(x1, y1, x2, y2): Wall {
    var X = x1;
    var Y = y1
    var StartVertex = { X, Y } as Vertex;

    X = x2;
    Y = y2;
    var EndVertex = { X, Y } as Vertex;

    var line: Wall = { StartVertex, EndVertex } as Wall;
    return line;
  }



  loadMap() {
    var floor;
    this.floorService.getFloor(this.loadedFloorId)
      .subscribe(
        Floor => {
          floor = Floor;
          floor.Rooms.forEach(room => {
            //concatenate room lines into polygon coordinates
            var arra = '';
            room.Walls.forEach(wall => {
              arra = arra.concat(wall.StartVertex.X + ',' + wall.StartVertex.Y + ' ')
            });

            var poly = this.drawnMap
              .polygon(arra).fill('#999')
              .stroke({ width: 2 })
              .mouseover(f => { if (this.removalMode) { var index = this.createdRooms.findIndex((x) => x.polygon.attr().id === poly.attr().id); this.createdRooms.splice(index, 1); group.remove(); } });

            var group = this.drawnMap.group();
            var roomie = new MapCreatorComponent.RoomWithSeats;
            roomie.RoomId = room.Id;
            roomie.polygon = poly;

            var oneCoordinateAtTime = poly.attr('points').trim().split(/[\s,]+/);
            //holds circles at vertexes of polygon
            var arrayOfCircles = Array();
            for (var j = 0; j <= (oneCoordinateAtTime.length - 2); j += 2) {
              var x = parseInt(oneCoordinateAtTime[j]);
              var y = parseInt(oneCoordinateAtTime[j + 1]);
              var pointie = this.drawnMap.circle(10).fill('#f06').move(x - 5, y - 5).draggable(function (x, y) {
                //function to move circles snapped to grid
                return {
                  x: x - x % 5,
                  y: y - y % 5
                };
              })
                //every time when circle is moved polygon needs to be replotted
                .on('dragmove.namespace', function (event) {
                  var coords = '';
                  arrayOfCircles.forEach(circle => {
                    coords = coords.concat(circle.attr('cx') + ',' + circle.attr('cy') + ' ')
                  });
                  poly.plot(coords);
                  group.front();
                  arrayOfCircles.forEach(circle => {
                    circle.front();
                  });
                });
              group.add(pointie);
              arrayOfCircles.push(pointie);
            }

            group.add(poly);

            var self = this;
            poly.click(function placeSeat(event) {
              //seat size hardcoded to 10x10 for now !!! alligned to grid: 10
              if (self.placingSeatEnabled) {
                var seatRect = self.drawnMap.rect(10, 10).move((event.offsetX - event.offsetX % 10), (event.offsetY - event.offsetY % 10));
                var seatVertex = { X: seatRect.attr().x, Y: seatRect.attr().y } as Vertex;
                var seat = { Vertex: seatVertex }
                roomie.seats.push(seat);
                group.add(seatRect);
              }
            })

            room.Seats.forEach(seat => {
              var seatle = this.drawnMap
                .rect(10, 10)
                .move(seat.Vertex.X, seat.Vertex.Y)
                .fill('#123')
                .stroke({ width: 0 });
              var seatVertex = { X: seat.Vertex.X, Y: seat.Vertex.Y } as Vertex;
              roomie.seats.push(seat);
              group.add(seatle);
            });


            this.createdRooms.push(roomie);
          });
          floor.Walls.forEach(wall => {
            //drawing lines
            var line = this.drawnMap
              .line(wall.StartVertex.X + ", " + wall.StartVertex.Y + ", " + wall.EndVertex.X + ", " + wall.EndVertex.Y)
              .stroke({ width: 2 })
              .mouseover(f => { if (this.removalMode) { var index = this.lines.findIndex((x) => x.attr().id === line.attr().id); this.lines.splice(index, 1); line.remove(); } });
            this.lines.push(line);
          });
        });
  }

  static RoomWithSeats = class {
    RoomId: number;
    polygon;
    seats = Array();
  }

  onSelectFile(event) { // called each time file input changes
    if (event.target.files && event.target.files[0]) {
      var reader = new FileReader();

      reader.readAsDataURL(event.target.files[0]); // read file as data url

      reader.onload = (event) => { // called once readAsDataURL is completed
        this.imageHref = (event.target as any).result;
        this.changeImage();
      }
    }
  }

  gridOnOff() {
    this.displayGrid = !this.displayGrid;
    if (this.displayGrid) {
      var pattern = this.drawnMap.pattern(5, 5, function (add) {
        add.rect(10, 10).fill('none').stroke({ width: 1, color: '#005' });
      });
      pattern.fill('none');
      this.patternRect = this.drawnMap.rect(800, 800);
      this.patternRect.fill(pattern);
      this.patternRect.back();
      if (this.imageHref !== null) {
        this.patternRect.forward();
      }
    } else if (this.patternRect) {
      this.patternRect.remove();//check if is of type rect!!!
    }
  }

  backgroundImageOnOff() {
    this.displayBackgroundImage = !this.displayBackgroundImage;
    if (this.displayBackgroundImage && this.imageHref !== null) {
      this.changeImage();
    } else if (this.imageHref !== null) {
      this.backgroundImage.remove();
    }
  }

}

