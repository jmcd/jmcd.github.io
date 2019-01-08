"use strict";
var line2data;
(function (line2data) {
    var InputElementValueAccessor = /** @class */ (function () {
        function InputElementValueAccessor(element) {
            this.element = element;
        }
        InputElementValueAccessor.prototype.numberAttribute = function (name) {
            var minValString = this.element.getAttribute(name);
            if (minValString == null) {
                return undefined;
            }
            var minValOrNan = parseInt(minValString);
            return isNaN(minValOrNan) ? undefined : minValOrNan;
        };
        InputElementValueAccessor.prototype.float = function () {
            var n = parseFloat(this.element.value);
            if (isNaN(n)) {
                return undefined;
            }
            return n;
        };
        InputElementValueAccessor.prototype.integer = function (minVal) {
            var n = this.float();
            if (n == undefined) {
                return undefined;
            }
            var absn = Math.abs(n);
            var floatPart = absn - Math.floor(absn);
            if (floatPart > 0) {
                return undefined;
            }
            if (minVal != undefined && n < minVal) {
                return undefined;
            }
            return n;
        };
        return InputElementValueAccessor;
    }());
    var ValidationFactory = /** @class */ (function () {
        function ValidationFactory() {
        }
        ValidationFactory.prototype.appy = function (element) {
            var values = new InputElementValueAccessor(element);
            var typeName = element.getAttribute("data-input-type");
            function initialize(vf, numberProvider) {
                var n = numberProvider();
                vf.setValidatedValue(element, n);
            }
            function setup(vf, numberProvider) {
                element.addEventListener("input", function (event) {
                    initialize(vf, numberProvider);
                });
                initialize(vf, numberProvider);
            }
            if (typeName == "integer") {
                var minVal_1 = values.numberAttribute("data-min-val");
                setup(this, function () { return values.integer(minVal_1); });
            }
            if (typeName == "float") {
                setup(this, function () { return values.float(); });
            }
        };
        ValidationFactory.prototype.setValidatedValue = function (element, n) {
            var attrName = "data-validated-value";
            if (n != undefined) {
                element.setAttribute(attrName, "" + n);
            }
            else {
                element.removeAttribute(attrName);
            }
        };
        return ValidationFactory;
    }());
    line2data.ValidationFactory = ValidationFactory;
    var Point = /** @class */ (function () {
        function Point(x, y) {
            this.x = x;
            this.y = y;
        }
        return Point;
    }());
    var Params = /** @class */ (function () {
        function Params(count, xMin, xMax, xDp, yMin, yMax, yDp) {
            this.count = count;
            this.xMin = xMin;
            this.xMax = xMax;
            this.xDp = xDp;
            this.yMin = yMin;
            this.yMax = yMax;
            this.yDp = yDp;
        }
        return Params;
    }());
    line2data.Params = Params;
    var Drawing = /** @class */ (function () {
        function Drawing(canvas) {
            this.canvas = canvas;
            this.workingPoints = undefined;
            this.drawingPoints = undefined;
            this.prevDrawingStrokeStyle = "slategray";
            this.guideFillStyle = "powderblue";
            this.userDidFinishDrawing = undefined;
            this.workingMax = undefined;
            this.workingMin = undefined;
            this.context = canvas.getContext("2d");
            var drawing = this;
            canvas.addEventListener("mousedown", function (ev) {
                drawing.mdown(new Point(ev.offsetX, ev.offsetY));
            });
            canvas.addEventListener("mousemove", function (ev) {
                drawing.mmove(new Point(ev.offsetX, ev.offsetY));
            });
            canvas.addEventListener("mouseup", function (ev) {
                drawing.mup(new Point(ev.offsetX, ev.offsetY));
            });
            canvas.addEventListener("touchstart", function (ev) {
                var p = Drawing.pointFromTouchEvent(ev);
                if (p == undefined) {
                    return;
                }
                drawing.mdown(p);
                ev.preventDefault();
            });
            canvas.addEventListener("touchmove", function (ev) {
                var p = Drawing.pointFromTouchEvent(ev);
                if (p == undefined) {
                    return;
                }
                drawing.mmove(p);
                ev.preventDefault();
            });
            canvas.addEventListener("touchend", function (ev) {
                var p = Drawing.pointFromTouchEvent(ev);
                drawing.mup(p);
                ev.preventDefault();
            });
            canvas.addEventListener("touchcancel", function (ev) {
                var p = Drawing.pointFromTouchEvent(ev);
                drawing.mup(p);
                ev.preventDefault();
            });
        }
        Drawing.pointFromTouchEvent = function (ev) {
            if (ev.touches.length == 0) {
                return undefined;
            }
            return new Point(ev.touches[0].clientX, ev.touches[0].clientY);
        };
        Drawing.prototype.mdown = function (p) {
            this.workingPoints = [];
            this.workingPoints.push(p);
            this.workingMax = p.y;
            this.workingMin = p.y;
            var tmp = this.context.strokeStyle;
            this.context.strokeStyle = this.prevDrawingStrokeStyle;
            this.redraw();
            this.context.strokeStyle = tmp;
        };
        Drawing.prototype.mmove = function (p) {
            if (this.workingPoints != null) {
                this.workingPoints.push(p);
                this.workingMax = Math.max(this.workingMax, p.y);
                this.workingMin = Math.min(this.workingMin, p.y);
                this.context.fillStyle = this.guideFillStyle;
                this.context.fillRect(0, this.workingMin, this.canvas.width, this.workingMax - this.workingMin);
                if (this.drawingPoints != undefined) {
                    var tmp = this.context.strokeStyle;
                    this.context.strokeStyle = this.prevDrawingStrokeStyle;
                    this.drawPoints(this.drawingPoints);
                    this.context.strokeStyle = tmp;
                }
                this.drawPoints(this.workingPoints);
            }
        };
        Drawing.prototype.mup = function (p) {
            if (this.workingPoints != null) {
                if (p != undefined) {
                    this.workingPoints.push(p);
                }
                this.commit(this.workingPoints);
                this.workingPoints = undefined;
                if (this.userDidFinishDrawing != undefined) {
                    this.userDidFinishDrawing();
                }
            }
        };
        Drawing.prototype.commit = function (points) {
            var w = this.canvas.width;
            var h = this.canvas.height;
            var ps = [];
            var pp = null;
            for (var i = 0; i < points.length; i++) {
                var p = points[i];
                if (pp == null || pp.x < p.x) {
                    ps.push(p);
                    pp = p;
                }
            }
            this.drawingPoints = ps;
            this.redraw();
        };
        Drawing.prototype.drawPoints = function (points) {
            this.context.beginPath();
            for (var index = 1; index < points.length; index++) {
                var from = points[index - 1];
                var to = points[index];
                this.context.moveTo(from.x, from.y);
                this.context.lineTo(to.x, to.y);
            }
            this.context.stroke();
        };
        Drawing.prototype.redraw = function () {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (this.drawingPoints == null) {
                return;
            }
            var points = this.drawingPoints;
            this.context.beginPath();
            for (var index = 1; index < points.length; index++) {
                var from = points[index - 1];
                var to = points[index];
                this.context.moveTo(from.x, from.y);
                this.context.lineTo(to.x, to.y);
            }
            this.context.stroke();
        };
        Drawing.prototype.heights = function () {
            var points = this.drawingPoints == undefined ? [] : this.drawingPoints;
            var result = [];
            if (points.length == 0) {
                return result;
            }
            var ys = points.map(function (p) { return p.y; });
            var min = ys[0];
            var max = min;
            for (var i = 1; i < ys.length; i++) {
                var y = ys[i];
                max = Math.min(max, y);
                min = Math.max(min, y);
            }
            var height = max - min;
            for (var i = 0; i < ys.length; i++) {
                var y = ys[i];
                var yn = (y - min) / height;
                result.push(yn);
            }
            return result;
        };
        return Drawing;
    }());
    line2data.Drawing = Drawing;
    var Transform = /** @class */ (function () {
        function Transform(min, max) {
            this.translation = min;
            this.scale = max - min;
        }
        Transform.prototype.perform = function (n) {
            return this.translation + (n * this.scale);
        };
        return Transform;
    }());
    var TableRow = /** @class */ (function () {
        function TableRow(index, x, y) {
            this.index = index;
            this.x = x;
            this.y = y;
        }
        return TableRow;
    }());
    line2data.TableRow = TableRow;
    var TableDataFactory = /** @class */ (function () {
        function TableDataFactory(params) {
            this.params = params;
        }
        TableDataFactory.prototype.construct = function (normalizedHeights) {
            var xTx = new Transform(this.params.xMin, this.params.xMax);
            var yTx = new Transform(this.params.yMin, this.params.yMax);
            var scaledHeights = normalizedHeights.map(function (y) { return yTx.perform(y); });
            var result = [];
            for (var resultIndex = 0; resultIndex < this.params.count; resultIndex++) {
                var rawSourceIndex = normalizedHeights.length / this.params.count * resultIndex;
                var sourceIndex = Math.floor(rawSourceIndex);
                var x = xTx.perform(resultIndex / (this.params.count - 1));
                var y = void 0;
                var nextSourceIndex = sourceIndex + 1;
                if (nextSourceIndex < scaledHeights.length) {
                    var y0 = scaledHeights[sourceIndex];
                    var y1 = scaledHeights[nextSourceIndex];
                    var diff = y1 - y0;
                    var pctBetweenY0Y1 = (rawSourceIndex - sourceIndex);
                    y = y0 + pctBetweenY0Y1 * diff;
                }
                else {
                    y = scaledHeights[sourceIndex];
                }
                result.push(new TableRow("" + (resultIndex + 1), "" + TableDataFactory.round(x, this.params.xDp), "" + TableDataFactory.round(y, this.params.yDp)));
            }
            return result;
        };
        TableDataFactory.round = function (n, dp) {
            var scale = Math.pow(10, dp);
            return Math.round(n * scale) / scale;
        };
        return TableDataFactory;
    }());
    line2data.TableDataFactory = TableDataFactory;
    var CSVFactory = /** @class */ (function () {
        function CSVFactory() {
        }
        CSVFactory.construct = function (rows) {
            var csvContent = "data:text/csv;charset=utf-8,";
            rows.forEach(function (rowArray) {
                var row = ["" + rowArray.index, "" + rowArray.x, "" + rowArray.y].join(",");
                csvContent += row + "\r\n";
            });
            return csvContent;
        };
        return CSVFactory;
    }());
    line2data.CSVFactory = CSVFactory;
})(line2data || (line2data = {}));
