/*!
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

/*!
 * @author Manish Shanker
 * @revision $Rev$
 * @date $Date$
 */

(function ($) {
    "use strict";

    var SmartDataGrid = function (options) {

        var defaultOptions = {
            id: null,
            dataSource: null,
            statePersist: $.statePersistToCookie,
            isGridGroupable: true,
            isGridSortable: true,
            groupsPlaceHolder: "." + options.id + "-smartDataGrid-group-by",
            columnWidthOverride: null,
            pageSize: null,
            smartDataGridSelector: "#" + options.id,
            onRowClick: $.noop,
            onSort: onSortBy,
            onGroupChange: onGroupBy,
            onGroupReorder: onGroupReorder,
            onFilter: onFilterBy,
            onColumnReorder: onColumnReorder,
            onColumnResize: onColumnResize,
            onScrollToBottom: fetchRowsIncrementally,
            onStateChange: $.noop,
            onReset: resetAndRefresh,
            onRefresh: refresh,
            onGridDataLoaded: $.noop,
            groupBy: [],
            clientCache: false
        };

        options = $.extend(true, {}, defaultOptions, options);

        var $smartDataGrid = $();

        var store = new SmartDataGrid.DataStore(options.dataSource, options.clientCache),
            loadedRows = 0,
            totalRows = 0,
            pageSize = 0,
            columnData = null,
            smartDataGridCurrentStateData;

        function render(data) {
            columnData = data.columns;
            totalRows = data.totalRows;
            loadedRows = data.rows.length;
            pageSize = data.pageSize || options.pageSize;
            data.columnWidthOverride = data.columnWidthOverride || smartDataGridCurrentStateData.columnWidthOverride;
            if (data.groupBy && data.groupBy.length) {
                data.groupBy = $.map(data.groupBy, function (column) {
                    return column.id;
                });
            }
            if (data.sortBy && data.sortBy.length) {
                data.sortBy = {
                    column: data.sortBy[0].id,
                    direction: data.sortBy[0].direction
                };
            }
            renderData(data);
            smartDataGridCurrentStateData.columnOrder = $.map(data.columns, function (column) {
                return column.id;
            });
            smartDataGridCurrentStateData.hiddenColumns = data.hiddenColumns;
            saveStateOfCurrentGrid();
            $smartDataGrid.trigger($.smartDataGrid.hideLoading);
        }

        function saveStateOfCurrentGrid() {
            if (options.statePersist) {
                options.statePersist.save("smartDataGridState_" + options.id, JSON.stringify(smartDataGridCurrentStateData));
            }
            options.onStateChange(smartDataGridCurrentStateData);
        }

        function getCurrentState(callback) {
            if (options.statePersist) {
                options.statePersist.load("smartDataGridState_" + options.id, function (data) {
                    callback(JSON.parse(data));
                });
            } else {
                callback({});
            }
        }

        function fetchRowsIncrementally() {
            //This can be fetched from the serve
            if (loadedRows >= totalRows) {
                return;
            }
            var requestData = $.extend({}, smartDataGridCurrentStateData, {
                pageOffset: loadedRows + 1,
                pageSize: pageSize
            });
            $smartDataGrid.trigger($.smartDataGrid.showLoading);
            store.fetchRows(requestData, onReceiveOfNewRows);
        }

        function onReceiveOfNewRows(newRows) {
            smartDataGridCurrentStateData = smartDataGridCurrentStateData || {};
            loadedRows += newRows.rows.length;
            addNewRows(newRows);
            $smartDataGrid.trigger($.smartDataGrid.hideLoading);
        }

        function onReceiveOfData(data) {
            smartDataGridCurrentStateData = smartDataGridCurrentStateData || {};
            smartDataGridCurrentStateData.pageSize = options.pageSize = data.pageSize || smartDataGridCurrentStateData.pageSize;
            smartDataGridCurrentStateData = $.extend(true, smartDataGridCurrentStateData, data.state);
            render(data);
        }

        function onFilterBy(filters) {
            smartDataGridCurrentStateData.filterBy = filters;
            $smartDataGrid.trigger($.smartDataGrid.showLoading);
            store.filter(smartDataGridCurrentStateData, render);
        }

        function onGroupBy(columnIds) {
            var newColumnOrder;
            if (smartDataGridCurrentStateData.columnOrder) {
                newColumnOrder = [];
                $.each(columnIds, function (i, value) {
                    newColumnOrder.push(value);
                });
                $.each(smartDataGridCurrentStateData.columnOrder, function (i, value) {
                    if (newColumnOrder.indexOf(value) < 0) {
                        newColumnOrder.push(value);
                    }
                });
                smartDataGridCurrentStateData.columnOrder = newColumnOrder;
            }
            smartDataGridCurrentStateData.groupBy = columnIds.length ? $.map(columnIds, function (columnId) {
                var column = getColumnById(columnId).column;
                return {
                    id: columnId,
                    type: column.type || column.renderer || null,
                    direction: "desc"
                };
            }) : [];
            $smartDataGrid.trigger($.smartDataGrid.showLoading);
            store.groupBy(smartDataGridCurrentStateData, render);
        }

        function onSortBy(columnId, direction) {
            var column = getColumnById(columnId).column;
            smartDataGridCurrentStateData.sortBy = [
                {
                    id: columnId,
                    type: column.type || column.renderer || null,
                    direction: direction
                }
            ];
            $smartDataGrid.trigger($.smartDataGrid.showLoading);
            store.sortBy(smartDataGridCurrentStateData, render);
        }

        function onColumnReorder(newColumnOrder) {
            var groupByColumnsLength, newGroupByColumns, n, foundColumn;

            if (smartDataGridCurrentStateData.groupBy && smartDataGridCurrentStateData.groupBy.length) {
                groupByColumnsLength = smartDataGridCurrentStateData.groupBy.length;
                newGroupByColumns = [];
                for (n = 0; n < groupByColumnsLength; n += 1) {
                    foundColumn = getColumnById(newColumnOrder[n]);
                    if (foundColumn.column.isGroupable) {
                        newGroupByColumns.push(newColumnOrder[n]);
                    } else {
                        break;
                    }
                }
                smartDataGridCurrentStateData.groupBy = $.map(newGroupByColumns, function (column) {
                    return {id: column, direction: "desc"};
                });
            }
            smartDataGridCurrentStateData.columnOrder = newColumnOrder;
            $smartDataGrid.trigger($.smartDataGrid.showLoading);
            store.reorderColumn(smartDataGridCurrentStateData, render);
        }

        function getColumnById(columnId) {
            var foundIndex = -1,
                column = $.grep(columnData, function (column, index) {
                    if (column.id === columnId) {
                        foundIndex = index;
                        return true;
                    }
                    return false;
                })[0];
            return {
                column: column,
                index: foundIndex
            };
        }

        function onGroupReorder(newGroupOrder) {
            onGroupBy(newGroupOrder);
        }

        //noinspection JSUnusedLocalSymbols
        function onColumnResize(columnId, oldWidth, newWidth) {
            smartDataGridCurrentStateData.columnWidthOverride = smartDataGridCurrentStateData.columnWidthOverride || {};
            smartDataGridCurrentStateData.columnWidthOverride[columnId] = newWidth;
            saveStateOfCurrentGrid();
        }

        function load(overrideState) {
            getCurrentState(function (currentStateData) {
                smartDataGridCurrentStateData = overrideState || currentStateData || {};
                if (options.pageSize) {
                    smartDataGridCurrentStateData.pageSize = options.pageSize;
                }
                store.load(smartDataGridCurrentStateData, onReceiveOfData);
            });
        }

        function destroy() {
            $smartDataGrid.unbind($.smartDataGrid.renderingComplete);
            gridViewRefresh();
            if (store) {
                store.destroy();
                store = null;
            }
        }

        function refresh() {
            $smartDataGrid.trigger($.smartDataGrid.destroy);
            $smartDataGrid.removeClass("smartDataGrid-initialized");
            if (store) {
                store.refresh(smartDataGridCurrentStateData, onReceiveOfData);
            }
        }

        function gridViewRefresh() {
            if (options.statePersist) {
                options.statePersist.save("smartDataGridState_" + options.id, null);
            }
            smartDataGridCurrentStateData = {};
            smartDataGridCurrentStateData.pageSize = options.pageSize;
            $smartDataGrid.trigger($.smartDataGrid.destroy);
            $smartDataGrid.removeClass("smartDataGrid-initialized");
        }

        function resetAndRefresh(overrideState) {
            options.groupBy = [];
            options.state = {};
            options.columnWidthOverride = null;
            options.sortBy = [];
            options.filterBy = [];
            gridViewRefresh();
            smartDataGridCurrentStateData = overrideState || null;
            if (store) {
                store.refresh(smartDataGridCurrentStateData, onReceiveOfData);
            }
        }

        function getSource() {
            return options.dataSource;
        }

        function getCurrentMetaData() {
            return store.getCurrentMetaData();
        }

        function renderData(data) {
            var smartDataGridData = $.extend(options, data);
            $smartDataGrid = $(options.smartDataGridSelector);
            $smartDataGrid.bind($.smartDataGrid.renderingComplete, options.onGridDataLoaded);
            $smartDataGrid.smartDataGrid(smartDataGridData);
        }

        function addNewRows(newData) {
            $smartDataGrid.trigger($.smartDataGrid.appendRows, [newData.rows, smartDataGridCurrentStateData.columnWidthOverride]);
        }

        function getDefaultOptions() {
            return defaultOptions;
        }

        function getCurrentOptions() {
            return $.extend({}, options);
        }

        return $.extend({}, SmartDataGrid.extension, {
            load: load,
            destroy: destroy,
            refresh: refresh,
            resetAndRefresh: resetAndRefresh,
            getDefaultOptions: getDefaultOptions,
            getCurrentOptions: getCurrentOptions,
            getCurrentMetaData: getCurrentMetaData,
            getSource: getSource
        });
    };

    SmartDataGrid.extension = {};

    window.SmartDataGrid = SmartDataGrid;

}(jQuery));