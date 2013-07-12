/**
 * Copyright 2011-2013 Manish Shanker
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @author Manish Shanker
 */

(function ($) {
    "use strict";

    var START_SCROLL_PROXIMITY = 100;

    var DIRECTION = {
        LEFT: "LEFT",
        RIGHT: "RIGHT"
    };

    $.smartDataGrid = $.extend(true, $.smartDataGrid, {
        plugin: {
            columnReorder: function ($smartDataGrid, options) {

                var gridWidth, gridLeftOffset, $rowsContainer, $headingContainer;
                var direction = DIRECTION.RIGHT;

                options = $.extend({
                    isGridColumnReorderable: true,
                    onColumnReorder: $.noop
                }, options);

                function onColumnReorderDrop(event, ui) {
                    onColumnReordered(event, ui, options, $smartDataGrid, direction);
                }

                function onReorderOver(event) {
                    onColumnReorderOver($(event.target), direction);
                }

                function load() {
                    if (!options.isGridColumnReorderable) {
                        return;
                    }
                    gridLeftOffset = $smartDataGrid.offset().left;
                    gridWidth = $smartDataGrid.width();
                    $rowsContainer = $smartDataGrid.find(".smartDataGrid-rows");
                    $headingContainer = $smartDataGrid.find(".smartDataGrid-heading");
                    var cellSelector = ".smartDataGrid-heading .cell";
                    var scrollInterval, scrollLeftBy;

                    $smartDataGrid.delegate(cellSelector, "dragstop", function () {
                        $smartDataGrid.undelegate(".smartDataGrid-heading .cell", "mouseout.reorder");
                        $smartDataGrid.undelegate(".smartDataGrid-heading .cell", "mousemove.reorder");
                        window.clearInterval(scrollInterval);
                    });

                    $smartDataGrid.delegate(cellSelector, "dragstart", function (e) {
                        window.clearInterval(scrollInterval);
                        var currentTarget = e.currentTarget;
                        $smartDataGrid.delegate(".smartDataGrid-heading .cell", "mousemove.reorder", function (e) {
                            if (e.currentTarget.id !== currentTarget.id) {
                                direction = (e.clientX < ($(this).offset().left + ($(this).width() / 2))) ? DIRECTION.LEFT : DIRECTION.RIGHT;
                                onColumnReorderOver($(this), direction);
                            }
                        });
                        $smartDataGrid.delegate(".smartDataGrid-heading .cell", "mouseout.reorder", function () {
                            $(this).removeClass("reorder-left reorder-right");
                        });
                    });


                    $smartDataGrid.delegate(cellSelector, "drag", function (event) {
                        if (event.clientX > (gridLeftOffset - START_SCROLL_PROXIMITY) && event.clientX < (gridLeftOffset + START_SCROLL_PROXIMITY)) {
                            window.clearInterval(scrollInterval);
                            scrollLeftBy = $rowsContainer[0].scrollLeft;
                            scrollInterval = window.setInterval(function () {
                                if ($rowsContainer[0].scrollLeft > 0) {
                                    $rowsContainer[0].scrollLeft -= 10;
                                }
                            }, 50);
                        } else if (event.clientX > (gridLeftOffset + gridWidth - START_SCROLL_PROXIMITY) && event.clientX < (gridLeftOffset + gridWidth + START_SCROLL_PROXIMITY)) {
                            window.clearInterval(scrollInterval);
                            scrollLeftBy = $rowsContainer[0].scrollLeft + $headingContainer.width() + 100;
                            scrollInterval = window.setInterval(function () {
                                if ($rowsContainer[0].scrollLeft < scrollLeftBy) {
                                    $rowsContainer[0].scrollLeft += 10;
                                }
                            }, 50);
                        } else {
                            window.clearInterval(scrollInterval);
                        }
                    });

                    if ($.fn.droppable) {
                        $smartDataGrid.find(cellSelector).droppable({
                            drop: onColumnReorderDrop,
                            over: onReorderOver,
                            out: onColumnReorderOut,
                            accept: cellSelector,
                            tolerance: "pointer"
                        });
                    }

                    options.makeColumnDraggable($smartDataGrid);
                }

                function update() {
                    gridLeftOffset = $smartDataGrid.offset().left;
                    gridWidth = $smartDataGrid.width();
                    $rowsContainer = $smartDataGrid.find(".smartDataGrid-rows");
                    $headingContainer = $smartDataGrid.find(".smartDataGrid-heading");
                }

                function destroy() {
                    options = null;
                    if ($.fn.droppable) {
                        $smartDataGrid.find(".smartDataGrid-heading .cell").droppable("destroy");
                    }
                    $smartDataGrid.undelegate(".smartDataGrid-heading .cell", "drag");
                    $smartDataGrid.undelegate(".smartDataGrid-heading .cell", "dragstop");
                    $rowsContainer = null;
                    $headingContainer = null;
                }

                return {
                    load: load,
                    update: update,
                    destroy: destroy
                };
            }
        }
    });

    function onColumnReordered(event, ui, options, $smartDataGrid, direction) {
        var $ele = $(event.target);
        $ele.removeClass("reorder-left reorder-right");
        var columnIdToMove = $.smartDataGrid.getElementId(ui.draggable.attr("id")),
            columnIdToMoveAfter = $.smartDataGrid.getElementId($ele.attr("id")),
            newColumnOrder = [];
        $.each(options.columns, function (i, column) {
            if (column.id !== columnIdToMove) {
                newColumnOrder.push(column.id);
            }
            if (column.id === columnIdToMoveAfter) {
                if (direction === DIRECTION.RIGHT) {
                    newColumnOrder.push(columnIdToMove);
                } else {
                    newColumnOrder.splice((newColumnOrder.length - 1), 0, columnIdToMove);
                }
            }
        });
        $smartDataGrid.removeClass("smartDataGrid-initialized");
        options.onColumnReorder(newColumnOrder);
    }

    function onColumnReorderOver($ele, direction) {
        $ele.removeClass("reorder-left reorder-right").addClass(direction === DIRECTION.LEFT ? "reorder-left" : "reorder-right");
    }

    function onColumnReorderOut(event) {
        $(event.target).removeClass("reorder-left reorder-right");
    }

}(jQuery));