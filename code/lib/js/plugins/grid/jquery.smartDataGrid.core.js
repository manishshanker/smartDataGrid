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

    if (!$.browser) {
        var browserVersion = /MSIE(.*?);/.exec(navigator.appVersion);
        $.browser = {
            msie: navigator && navigator.appName.indexOf("Microsoft") > -1,
            version: browserVersion && browserVersion[1]
        };
    }

    if ($.browser.msie && parseInt($.browser.version, 10) <= 7 && document.documentMode !== 8) {
        $("html").addClass("ie7below");
    }

    $.smartDataGrid = $.extend($.smartDataGrid, {
        appendRows: "smartDataGrid-append-rows",
        destroy: "smartDataGrid-destroy",
        renderingComplete: "smartDataGrid-rendering-complete",
        adjustRowWidth: "smartDataGrid-adjust-row-width",
        showLoading: "smartDataGrid-showLoading",
        hideLoading: "smartDataGrid-hideLoading",
        getElementId: function (id) {
            var ids = id.split("_");
            ids.splice(0, 1);
            return ids.join("_");
        }
    });

    $.smartDataGrid.renderer = {};
    $.smartDataGrid.filter = {};

    $.smartDataGrid.plugin = $.smartDataGrid.plugin || {};

    var gridPluginMap = {};

    var scrollBottomTimer;

    var TOTAL_ROW_LABEL_TEMPLATE = "<div class='total-row-count'>Showing {loadedRows} of {totalRows}</div>",
        GROUP_CONTAINER_WRAPPER_TEMPLATE = "<div class='group-data'></div>",
        HEADING_ROW_TEMPLATE = "<div class='smartDataGrid-heading'></div>",
        HEADING_ROW_COLUMN_HELPER_TEMPLATE = "<div class='{cssClass} column-helper'></div>",
        HEADING_ROW_CONTAINER_TEMPLATE = "<div class='smartDataGrid-head'></div>",
        HEADING_ROW_CELL_TEMPLATE = "<div class='cell {columnId} {cssClass}' id='{id}'><span class='label'>{value}</span></div>",
        GROUP_HEADING_TEMPLATE = "<div class='group level{level}'><div class='group-header group-header-row'><span class='open-close-indicator'>-</span></div></div>",
        ROW_TEMPLATE = "<div class='row level{level}' id='{id}'></div>",
        CELL_TEMPLATE = "<div class='cell {columnId} {cssClass} {spacerClass}'>{value}</div>",
        ROWS_CONTAINER_TEMPLATE = "<div class='smartDataGrid-rows'><div class='smartDataGrid-rows-content'></div></div>",
        LOADING_MESSAGE = "<div class='loading-message'>Loading...</div>";

//    var TOTAL_ROW_LABEL_TEMPLATE = "<div class='total-row-count'>Showing {loadedRows} of {totalRows}</div>",GROUP_CONTAINER_WRAPPER_TEMPLATE = "<table class='group-data'></table>",HEADING_ROW_TEMPLATE = "<tr class='smartDataGrid-heading'></tr>",HEADING_ROW_COLUMN_HELPER_TEMPLATE = "<div class='{cssClass} column-helper'></div>",HEADING_ROW_CONTAINER_TEMPLATE = "<thead class='smartDataGrid-head'></thead>",HEADING_ROW_CELL_TEMPLATE = "<td class='cell {cssClass}' id='{id}'>{value}<span class='sort-arrow'></span></td>",GROUP_HEADING_TEMPLATE = "<tr class='group level{level}'><tboby><tr class='group-header'><table><tr><td><span class='open-close-indicator'>-</span>{value}</td></tr></table></tbody></tr>",ROW_TEMPLATE = "<tr class='row level{level}' id='{id}'></tr>",CELL_TEMPLATE = "<td class='cell {columnId} {cssClass}'>{value}</td>",ROWS_CONTAINER_TEMPLATE = "<table class='smartDataGrid-rows'><tbody class='smartDataGrid-rows-content'></tbody></table>",LOADING_MESSAGE = "<div class='loading-message'>Loading...</div>";

    var DATA_ROW_KEY = "DataRow_";
    var HEADER_COL_KEY = "Col_";

    $.fn.smartDataGrid = function (options) {

        options = $.extend({
            id: null,
            rows: [],
            columns: [],
            rowHover: true,
            onRowClick: null,
            onScrollToBottom: $.noop,
            columnWidthOverride: null,
            makeColumnDraggable: makeColumnDraggable,
            showTotalRows: true,
            groupDetails: null,
            groupDetailsInFirstColumnOnly: true,
            totalRowLabelTemplate: TOTAL_ROW_LABEL_TEMPLATE,
            loadingMessage: LOADING_MESSAGE
        }, options);

        var plugins = {};

        if (!(options.id && /^[a-zA-Z0-9]*$/.test(options.id))) {
            throw "You need to provide id for the smartDataGrid and ensure that the id don't have any special characters in it.";
        }

        return this.each(function () {
            var $smartDataGrid = $(this);
            var groupDetails = options.groupDetails;

            updateColumnHashMap(options);
            updateColumnWidth(options);

            //if (this.tagName !== "TABLE") {var prop = {id:$smartDataGrid.attr("id"),class:$smartDataGrid.attr("class"),cellSpacing:0,cellPadding:0};var $table = $("<table></table>").attr(prop);$smartDataGrid.replaceWith($table);$smartDataGrid = $table;}

            var cachedGridData = {},
                $head,
                rowsAndGroup = renderRowsAndGroups(options, cachedGridData, groupDetails),
                $rows = rowsAndGroup.$rowsMainContainer,
                countOfLoadedRows = options.rows.length,
                rowWidth;

            if ($smartDataGrid.hasClass("smartDataGrid-initialized")) {
                $rows = $smartDataGrid.find(".smartDataGrid-rows").empty().append($rows.children());
                rowsAndGroup.$rowsMainContainer = $rows;
                $head = $smartDataGrid.find(".smartDataGrid-head");
            } else {
                $smartDataGrid.trigger($.smartDataGrid.destroy);
                $head = renderHeading($smartDataGrid, options).wrap(HEADING_ROW_CONTAINER_TEMPLATE).parent();
                $smartDataGrid.addClass("smartDataGrid").empty().append($head.add($rows));
                if (options.showTotalRows) {
                    $smartDataGrid.append(options.totalRowLabelTemplate.supplant({
                        totalRows: "",
                        loadedRows: ""
                    }));
                }
                $smartDataGrid.append(options.loadingMessage);
                $rows.bind("scroll.smartDataGrid", function () {
                    onSmartDataGridScroll($head, $rows, options);
                    $smartDataGrid.data("lastScrollPos", $rows[0].scrollLeft);
                });
                $smartDataGrid.unbind($.smartDataGrid.hideLoading).bind($.smartDataGrid.hideLoading, function () {
                    $smartDataGrid.find(".loading-message").hide();
                });
                $smartDataGrid.unbind($.smartDataGrid.showLoading).bind($.smartDataGrid.showLoading, function () {
                    $smartDataGrid.find(".loading-message").show();
                });
            }

            //Fix for the grid width issue
            adjustRowWidth();

            if ($rows && $rows.length) {
                $rows[0].scrollLeft = $smartDataGrid.data("lastScrollPos");
            }

            function destroy() {
                destroyPlugins(plugins, options);
                unbindGridEvents($smartDataGrid, $head, $rows);
                $head = null;
                rowsAndGroup = null;
                $rows = null;
                options = null;
                $smartDataGrid = null;
                cachedGridData = null;
            }

            $smartDataGrid.unbind($.smartDataGrid.destroy).bind($.smartDataGrid.destroy, destroy);

            //noinspection JSUnusedLocalSymbols
            function onRowAppend(event, newRows, columnWidthOverride) {
                countOfLoadedRows = addFetchedRow(newRows, countOfLoadedRows, $smartDataGrid, options, columnWidthOverride, rowsAndGroup, cachedGridData, rowWidth, groupDetails);
            }

            $smartDataGrid.unbind($.smartDataGrid.appendRows).bind($.smartDataGrid.appendRows, onRowAppend);

            function adjustRowWidth() {
                var gridRowWidth = 0;
                $head.find(".smartDataGrid-heading .cell:visible").each(function () {
                    gridRowWidth += $(this).outerWidth(true);
                });
                $smartDataGrid.find(".smartDataGrid-rows-content").css({minHeight: 1, overflow: "hidden", width: gridRowWidth});
            }

            $smartDataGrid.unbind($.smartDataGrid.adjustRowWidth).bind($.smartDataGrid.adjustRowWidth, adjustRowWidth);

            if (options.rowHover) {
                $smartDataGrid.undelegate(".smartDataGrid-rows .row", "mouseenter").undelegate(".smartDataGrid-rows .row", "mouseleave").delegate(".smartDataGrid-rows .row", "mouseenter", function () {
                    $(this).addClass("row-hover");
                }).delegate(".smartDataGrid-rows .row", "mouseleave", function () {
                    $(this).removeClass("row-hover");
                });
            }

            if (options.onRowClick) {
                $smartDataGrid.undelegate(".smartDataGrid-rows .row", "click").delegate(".smartDataGrid-rows .row", "click", function () {
                    var rowId = $.smartDataGrid.getElementId($(this).attr("id"));
                    options.onRowClick(cachedGridData[rowId].orig || cachedGridData[rowId], $(this));
                });
            }

            updateCountLabel($smartDataGrid, options, countOfLoadedRows);

            var helper = {
                getColumnElementById: getColumnElementById,
                getRowElementById: getRowElementById,
                getColumnById: getColumnById,
                getCellContent: getCellContent
            };

            $.each($.smartDataGrid.plugin, function (key, plugin) {
                if ($smartDataGrid.hasClass("smartDataGrid-initialized")) {
                    plugins[key] = gridPluginMap[options.id][key];
                    if (plugins[key].update) {
                        plugins[key].update(cachedGridData);
                    }
                } else {
                    gridPluginMap[options.id] = gridPluginMap[options.id] || {};
                    gridPluginMap[options.id][key] = plugins[key] = plugin($smartDataGrid, options, cachedGridData);
                    plugins[key].load(helper);
                }
            });

            $smartDataGrid.addClass("smartDataGrid-initialized");
            $smartDataGrid.trigger($.smartDataGrid.renderingComplete);

        });

    };

    function unbindGridEvents($smartDataGrid, $head, $rows) {
        if ($.draggable) {
            $smartDataGrid.find(".smartDataGrid-heading .cell").draggable("destroy");
        }
        $head.undelegate().unbind().empty().remove();
        $rows.undelegate().unbind().remove();
        removeColumnDraggable($smartDataGrid);
        $smartDataGrid
            .unbind($.smartDataGrid.hideLoading)
            .unbind($.smartDataGrid.showLoading)
            .unbind($.smartDataGrid.adjustRowWidth)
            .unbind($.smartDataGrid.destroy)
            .unbind($.smartDataGrid.appendRows)
            .undelegate(".group .group-header", "click")
            .undelegate(".smartDataGrid-rows .row", "click")
            .undelegate(".smartDataGrid-rows .row", "mouseenter")
            .undelegate(".smartDataGrid-rows .row", "mouseleave")
            .empty();
        $smartDataGrid.data("smartDataGridColumnDraggable", false);
    }

    function addFetchedRow(newRows, countOfLoadedRows, $smartDataGrid, options, columnWidthOverride, rowsAndGroup, cachedGridData, rowWidth, groupDetails) {
        countOfLoadedRows += newRows.length;
        updateCountLabel($smartDataGrid, options, countOfLoadedRows);
        options.columnWidthOverride = columnWidthOverride;
        updateColumnWidth(options);
        var $groupContainers = rowsAndGroup.lastGroupInformation.$groupContainers,
            currentGroupValues = rowsAndGroup.lastGroupInformation.currentGroupValues,
            $rowsMainContainer = rowsAndGroup.$rowsMainContainer,
            isStartRowEven = $rowsMainContainer.find(".row:last").hasClass("even");
        rowsAndGroup.lastGroupInformation = addRows({
            tableId: options.id,
            rows: newRows,
            columns: options.columns,
            groups: options.groupBy,
            $rowMainContainer: $rowsMainContainer.find(".smartDataGrid-rows-content"),
            $groupContainers: $groupContainers,
            currentGroupValues: currentGroupValues,
            isStartEven: isStartRowEven,
            cachedGridData: cachedGridData,
            rowWidth: rowWidth,
            groupDetails: groupDetails,
            areFetchedRows: true,
            groupDetailsInFirstColumnOnly: options.groupDetailsInFirstColumnOnly
        });
        if ($smartDataGrid.find(".smartDataGrid-rows")[0].scrollHeight <= $smartDataGrid.find(".smartDataGrid-rows").height()) {
            options.onScrollToBottom();
        }
        return countOfLoadedRows;
    }

    function destroyPlugins(plugins, options) {
        $.each(plugins, function (key, plugin) {
            if (plugin.destroy) {
                plugin.destroy();
            }
        });
        delete gridPluginMap[options.id];
    }

    function onSmartDataGridScroll($head, $rows, options) {
        var eleRow = $rows[0];
        $head.css({
            marginLeft: -1 * eleRow.scrollLeft
        });
        clearTimeout(scrollBottomTimer);
        scrollBottomTimer = setTimeout(function () {
            var scrolled = (eleRow.scrollHeight - $rows.scrollTop()),
                containerHeight = $rows.height();
            if ((scrolled <= (containerHeight - 17)) || (scrolled <= containerHeight)) {
                options.onScrollToBottom();
            }
        }, 100);
    }

    function updateCountLabel($smartDataGrid, options, countOfLoadedRows) {
        if (options.showTotalRows) {
            $smartDataGrid.find(".total-row-count").replaceWith(options.totalRowLabelTemplate.supplant({
                totalRows: options.totalRows,
                loadedRows: countOfLoadedRows
            }));
        }
    }

    function updateColumnWidth(options) {
        if (options.columnWidthOverride) {
            $.each(options.columnWidthOverride, function (columnId, width) {
                if (options.columnsHashMap[columnId]) {
                    options.columns[options.columnsHashMap[columnId]].width = width;
                }
            });
        }
    }

    function updateColumnHashMap(options) {
        options.columnsHashMap = {};
        $.each(options.columns, function (i, column) {
            options.columnsHashMap[column.id] = i;
        });
    }

    function getRowElementById(rowId, options) {
        return $("#" + options.id + DATA_ROW_KEY + rowId);
    }

    function getColumnElementById(columnId, options) {
        return $("#" + options.id + HEADER_COL_KEY + columnId);
    }

    function makeColumnDraggable($smartDataGrid) {
        if (!$smartDataGrid.data("smartDataGridColumnDraggable")) {
            if ($.fn.draggable) {
                $smartDataGrid.find(".smartDataGrid-heading .cell").draggable({
                    helper: function (event) {
                        return getHelper(event, $smartDataGrid.attr("class"));
                    },
                    revert: false,
                    cancel: ".resize-handle",
                    appendTo: "body",
                    refreshPositions: true,
                    cursorAt: { top: 0, left: 0 }
                });
            }
            $smartDataGrid.data("smartDataGridColumnDraggable", true);
        }
    }

    function removeColumnDraggable($smartDataGrid) {
        if ($.fn.draggable) {
            $smartDataGrid.find(".smartDataGrid-heading .cell").draggable("destroy");
        }
        $smartDataGrid.removeData("smartDataGridColumnDraggable");
    }

    function getHelper(event, cssClass) {
        return $(event.currentTarget).clone(false).wrap(HEADING_ROW_TEMPLATE).parent().wrap(HEADING_ROW_COLUMN_HELPER_TEMPLATE.supplant({
            cssClass: cssClass
        })).parent().css("width", "auto");
    }

    function renderHeading($smartDataGrid, options) {
        return headingRowElementsRenderer($smartDataGrid, options.columns, {
            container: HEADING_ROW_TEMPLATE,
            cell: HEADING_ROW_CELL_TEMPLATE,
            cellContent: function (column) {
                return {
                    value: column.label,
                    id: options.id + HEADER_COL_KEY + column.id,
                    cssClass: column.type || column.renderer || "",
                    columnId: column.id
                };
            }
        }, options.id);
    }

    function headingRowElementsRenderer($smartDataGrid, columns, template, gridId) {
        var $row = $(template.container),
            colCount = columns.length;
        $.each(columns, function (i, column) {
            if (column.render !== false) {
                var templateData = template.cellContent(column),
                    $cell;
                templateData.cssClass = templateData.cssClass + (i === colCount - 1 ? " last" : "") + (i === 0 ? " first" : "");
                if ($.smartDataGrid.renderer[column.type] && $.smartDataGrid.renderer[column.type].headerCell) {
                    templateData.value = $.smartDataGrid.renderer[column.type].headerCell($smartDataGrid, column, columns, gridId);
                }
                $cell = $(template.cell.supplant(templateData));
                $cell.css({
                    width: column.width,
                    display: column.isHidden ? "none" : ""
                });
                $row.append($cell);
            }
        });
        return $row;
    }

    function renderRowsAndGroups(options, cachedGridData, groupDetails) {
        var $rowsMainContainer = $(ROWS_CONTAINER_TEMPLATE),
            lastGroupInformation = addRows({
                tableId: options.id,
                rows: options.rows,
                columns: options.columns,
                groups: options.groupBy,
                $rowMainContainer: $rowsMainContainer.find(".smartDataGrid-rows-content"),
                $groupContainers: null,
                currentGroupValues: [],
                isStartEven: false,
                cachedGridData: cachedGridData,
                rowWidth: null,
                groupDetails: groupDetails,
                areFetchedRows: false,
                groupDetailsInFirstColumnOnly: options.groupDetailsInFirstColumnOnly
            });
        return {
            $rowsMainContainer: $rowsMainContainer,
            lastGroupInformation: lastGroupInformation
        };
    }

    function getColumnById(id, columns) {
        return $.grep(columns, function (col) {
            return col.id === id;
        })[0];
    }

    function getGroupDetailByRefLabel(refLabel, groupDetails) {
        if (groupDetails) {
            return $.grep(groupDetails, function (groupDetail) {
                return groupDetail && (groupDetail.refLabel === refLabel);
            })[0];
        }
        return null;
    }

    function getCurrentGroupDetail(currentValues, groupDetails, n) {
        var n1, groupDetail = getGroupDetailByRefLabel(currentValues[0], groupDetails);
        for (n1 = 1; n1 <= n; n1++) {
            groupDetail = groupDetail && getGroupDetailByRefLabel(currentValues[n1], groupDetail.groupDetails);
        }
        return groupDetail;
    }

    function getGroupDetailText(currentValues, groupDetails, n, columns) {
        var groupDetail = getCurrentGroupDetail(currentValues, groupDetails, n);
        var groupDetailText = [];
        if (groupDetail) {
            $.each(groupDetail, function (key, value) {
                var column = getColumnById(key, columns);
                if (column) {
                    groupDetailText[groupDetailText.length] = column.label + ": " + getCellContent(value, column);
                }
            });
            return "[" + groupDetailText.join(", ") + "]";
        }
        return "";
    }

    function renderGroupDetail(parameters) {
        var n = parameters.n,
            columns = parameters.columns,
            $groupContainers = parameters.$groupContainers,
            groupDetails = parameters.groupDetails,
            currentGroupValues = parameters.currentGroupValues,
            cellContent,
            $row = $(),
            groupDetailInFirstColumnOnly = parameters.groupDetailsInFirstColumnOnly,
            groupDetail;
        if (groupDetails && groupDetails.length) {
            groupDetail = getCurrentGroupDetail(currentGroupValues, groupDetails, n);
        }
        var n1;
        for (n1 = n; n1 < columns.length; n1++) {
            cellContent = "";
            var column = columns[n1];
            if (n1 === n) {
                if (groupDetailInFirstColumnOnly) {
                    var groupDetailText = "";
                    if (groupDetails && groupDetails.length) {
                        if (groupDetail.label) {
                            cellContent = groupDetail.label;
                        } else {
                            groupDetailText = getGroupDetailText(currentGroupValues, groupDetails, n, columns);
                            cellContent = getCellContent(currentGroupValues[n], columns[n]) + " " + groupDetailText;
                        }
                    } else {
                        cellContent = getCellContent(currentGroupValues[n], columns[n]);
                    }
                } else {
                    cellContent = (groupDetail && groupDetail.label) || getCellContent(currentGroupValues[n], column);
                }
            } else if (!groupDetailInFirstColumnOnly && groupDetail && groupDetail[column.id]) {
                cellContent = groupDetail && getCellContent(groupDetail[column.id], column);
            }
            var $cell = getCell(column, cellContent, "");
            if (n1 === n) {
                $cell.addClass("first-cell-in-group");
            }
            $row = $row.add($cell);
        }
        $groupContainers[n].find(".group-header").append($row).addClass(groupDetailInFirstColumnOnly ? "details-in-first-column" : "");
    }

    function renderAndGetContainerForFirstLoad($groupContainers, n, columns, $placeHolder) {
        $groupContainers[n] = $(GROUP_HEADING_TEMPLATE.supplant({ level: n }));
        var $wrapper = $(GROUP_CONTAINER_WRAPPER_TEMPLATE);
        if (n !== 0) {
            $wrapper.append(getCell(columns[n - 1], "", "spacer"));
        }
        $wrapper.append($groupContainers[n]);
        $placeHolder.append($wrapper);
        $placeHolder = $groupContainers[n];
        return {$wrapper: $wrapper, $placeHolder: $placeHolder};
    }

    function renderAndGetContainerForFetchedRows($groupContainers, n, columns, $placeHolder) {
        $groupContainers[n] = $(GROUP_HEADING_TEMPLATE.supplant({ level: n }));
        var $wrapper = $(GROUP_CONTAINER_WRAPPER_TEMPLATE);
        if (n === 0) {
            $wrapper.append($groupContainers[n]);
            $placeHolder.append($wrapper);
        } else {
            $wrapper.append(getCell(columns[n - 1], "", "spacer"));
            $wrapper.append($groupContainers[n]);
            $groupContainers[n - 1].append($wrapper);
        }
        return {$wrapper: $wrapper, $placeHolder: $placeHolder};
    }

    function renderGroupHeading(parameters) {
        var $placeHolder = parameters.$placeHolder,
            groups = parameters.groups,
            level = parameters.level,
            currentGroupValues = parameters.currentGroupValues,
            columns = parameters.columns,
            groupDetails = parameters.groupDetails,
            n,
            l,
            $wrapper,
            $groupContainers,
            start,
            methodToCall;
        if (parameters.$groupContainers === null) {
            $groupContainers = [];
            start = 0;
            methodToCall = renderAndGetContainerForFirstLoad;
        } else {
            $groupContainers = parameters.$groupContainers;
            start = level;
            methodToCall = renderAndGetContainerForFetchedRows;
        }
        for (n = start, l = groups.length; n < l; n += 1) {
            var containers = methodToCall($groupContainers, n, columns, $placeHolder);
            $wrapper = containers.$wrapper;
            $placeHolder = containers.$placeHolder;
            renderGroupDetail({
                n: n,
                columns: columns,
                $groupContainers: $groupContainers,
                groupDetails: groupDetails,
                currentGroupValues: currentGroupValues,
                groupDetailsInFirstColumnOnly: parameters.groupDetailsInFirstColumnOnly
            });
        }
        return $groupContainers;
    }

    function addRows(parameters) {
        var tableId = parameters.tableId;
        var rows = parameters.rows;
        var columns = parameters.columns;
        var groups = parameters.groups;
        var $rowMainContainer = parameters.$rowMainContainer;
        var $groupContainers = parameters.$groupContainers;
        var areFetchedRows = parameters.areFetchedRows;
        var currentGroupValues = parameters.currentGroupValues;
        var isStartEven = parameters.isStartEven;
        var cachedGridData = parameters.cachedGridData;
        var rowWidth = parameters.rowWidth;
        var groupDetails = parameters.groupDetails;
        var groupsLength = groups && groups.length;
        var idPostFix = new Date().getTime() + Math.floor(Math.random() * 100);
        $.each(rows, function (i, row) {
            row.id = row.id || tableId + "Row" + (idPostFix + i);
            var rowId = row.id,
                rowData = rowId ? row.data : row,
                $rowContainer = $rowMainContainer,
                $row;
            if (rowId) {
                (cachedGridData[rowId] = row);
            }
            if (groupsLength) {
                if ($groupContainers === null) {
                    $.each(groups, function (index) {
                        currentGroupValues[index] = rowData[index];
                    });
                    $groupContainers = renderGroupHeading({
                        $placeHolder: $rowMainContainer,
                        groups: groups,
                        level: null,
                        currentGroupValues: currentGroupValues,
                        $groupContainers: $groupContainers,
                        columns: columns,
                        groupDetails: groupDetails,
                        groupDetailsInFirstColumnOnly: parameters.groupDetailsInFirstColumnOnly
                    });
                } else {
                    $.each(groups, function (index) {
                        var x;
                        if (rowData[index] !== currentGroupValues[index]) {
                            for (x = index; x < groupsLength; x += 1) {
                                currentGroupValues[x] = rowData[x];
                            }
                            $groupContainers = renderGroupHeading({
                                $placeHolder: $rowMainContainer,
                                groups: groups,
                                level: index,
                                currentGroupValues: currentGroupValues,
                                $groupContainers: $groupContainers,
                                columns: columns,
                                groupDetails: groupDetails,
                                groupDetailsInFirstColumnOnly: parameters.groupDetailsInFirstColumnOnly
                            });
                        }
                    });
                }
                $rowContainer = $groupContainers[groupsLength - 1];
            }
            $row = getNewRow(tableId, row, groupsLength, columns);
            if ((i + (isStartEven ? 1 : 0)) % 2 === 0) {
                $row.addClass("even");
            }
            if (i === 0 && !areFetchedRows) {
                $row.addClass("row-first");
            }
            if (rowWidth) {
                $row.css("width", rowWidth);
            }
            $rowContainer.append($row);
        });

        return {
            $groupContainers: $groupContainers,
            currentGroupValues: currentGroupValues
        };
    }

    function getCellContent(cellContent, column, columnIndex, row) {
        var cellRenderer = (column.type || column.renderer);
        if (cellRenderer) {
            cellContent = $.smartDataGrid.renderer[cellRenderer].cell(cellContent, column, columnIndex, row);
        }
        return cellContent;
    }

    function getNewRow(tableId, row, groupLength, columns) {
        var rowId = row.id;
        var rowData = rowId ? row.data : row,
            $row = $(ROW_TEMPLATE.supplant({
                level: groupLength,
                id: tableId + DATA_ROW_KEY + rowId
            })),
            previousColumn = columns[groupLength - 1];
        var n, l;
        if (previousColumn) {
            $row.append(getCell(previousColumn, ""));
        }
        for (n = groupLength, l = rowData.length; n < l; n += 1) {
            $row.append(getCell(columns[n], getCellContent(rowData[n], columns[n], n, row), null, n === (l - 1)));
        }
        return $row;
    }

    function getCell(column, value, spacerClass, isLastCell) {
        var $cell = $(CELL_TEMPLATE.supplant({
            value: value || "&nbsp;",
            columnId: column.id,
            cssClass: (column.type || column.renderer || "") + (isLastCell ? " last" : ""),
            spacerClass: spacerClass || ""
        }));
        $cell.css({
            "width": column.width,
            "display": column.isHidden ? "none" : ""
        });
        $cell.css("width", column.width);
        return $cell;
    }

}(jQuery));

if (!Array.indexOf) {
    Array.prototype.indexOf = function (obj, start) {
        "use strict";

        var i, l;
        for (i = (start || 0), l = this.length; i < l; i += 1) {
            if (this[i] === obj) {
                return i;
            }
        }
        return -1;
    };
}

if (!String.hasOwnProperty("supplant")) {
    String.prototype.supplant = function (jsonObject, keyPrefix) {
        "use strict";

        return this.replace(/\{([^{}]*)\}/g, function (matchedString, capturedString1) {
            var jsonPropertyKey = keyPrefix ? capturedString1.replace(keyPrefix + ".", "") : capturedString1,
                jsonPropertyValue = jsonObject[jsonPropertyKey];
            return jsonPropertyValue !== undefined ? jsonPropertyValue : matchedString;
        });
    };
}