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

    $.smartDataGrid = $.extend(true, $.smartDataGrid, {
        plugin: {
            sortable: function ($smartDataGrid, options) {

                options = $.extend({
                    isGridSortable: true,
                    sortBy: null,
                    onSort: $.noop
                }, options);

                var SortDirection = {
                    ASC: "asc",
                    DESC: "desc"
                };

                function onColumnSort(event) {
                    var $cell = $(event.currentTarget),
                        columnId = $.smartDataGrid.getElementId(event.currentTarget.id),
                        direction;

                    $smartDataGrid
                        .find(".smartDataGrid-heading .sortable-column")
                        .not($cell)
                        .removeClass("asc desc")
                        .removeData("direction");

                    direction = $cell.data("direction");
                    if (!direction) {
                        direction = SortDirection.ASC;
                    } else if (direction === SortDirection.ASC) {
                        direction = SortDirection.DESC;
                    } else {
                        direction = SortDirection.ASC;
                    }
                    $cell.data("direction", direction);
                    $cell.removeClass("asc desc").addClass(direction);
                    options.onSort(columnId, direction);
                }

                function load(helper) {
                    if (!options.isGridSortable) {
                        return;
                    }

                    if (options.sortBy) {
                        var $column = $smartDataGrid.find("#" + options.id + "Col_" + options.sortBy.column);
                        $column.addClass(options.sortBy.direction);
                        $column.data("direction", options.sortBy.direction);
                    }

                    $.each(options.columns, function (index, column) {
                        if ($.smartDataGrid.renderer[column.type] && $.smartDataGrid.renderer[column.type].headerSortArrow) {
                            var headerSortArrow = $.smartDataGrid.renderer[column.type].headerSortArrow;
                            if (headerSortArrow) {
                                headerSortArrow($smartDataGrid, column, options.columns, helper.getColumnElementById(column.id, options));
                            }
                        } else {
                            if (column.isSortable !== false) {
                                helper.getColumnElementById(column.id, options)
                                    .append("<span class='sort-arrow'></span>")
                                    .addClass("sortable-column");
                            }
                        }
                    });

                    undelegate($smartDataGrid);
                    $smartDataGrid
                        .delegate(".smartDataGrid-heading .sortable-column", "click", onColumnSort)
                        .delegate(".smartDataGrid-heading .sortable-column", "mouseenter", function () {
                            $(this).addClass("sort-hover");
                        })
                        .delegate(".smartDataGrid-heading .sortable-column", "mouseleave", function () {
                            $(this).removeClass("sort-hover");
                        });
                }

                function undelegate($smartDataGrid) {
                    $smartDataGrid.undelegate(".smartDataGrid-heading .sortable-column", "click");
                    $smartDataGrid.undelegate(".smartDataGrid-heading .sortable-column", "mouseleave");
                    $smartDataGrid.undelegate(".smartDataGrid-heading .sortable-column", "mouseenter");
                }

                function destroy() {
                    undelegate($smartDataGrid);
                    options = null;
                }

                return {
                    load: load,
                    destroy: destroy
                };
            }
        }
    });

}(jQuery));