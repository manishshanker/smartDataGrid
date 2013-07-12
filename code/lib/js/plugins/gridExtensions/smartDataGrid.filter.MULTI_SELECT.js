(function ($) {
    "use strict";

    $.smartDataGrid.filter.MULTI_SELECT = {
        render: function (id, filterData) {
            var select, options;
            select = "<select id='{id}' multiple='true' class='{filterIdentifier}'>{options}</select>";
            options = [];
            $.each(filterData, function (i, value) {
                options[options.length] = "<option value='{value}'>{value}</option>".supplant({
                    value: value
                });
            });
            return select.supplant({
                id: id,
                options: options.join("")
            });
        },
        init: function ($filter, onFilter, gridId, $smartDataGrid) {
            if ($.fn.multiselect) {
                $filter.multiselect({
                    overrideWidth: "100%",
                    overrideMenuWidth: "200px",
                    close: onFilterChange,
                    click: onMultiSelectChange,
                    checkAll: onMultiSelectChange,
                    uncheckAll: onMultiSelectChange,
                    noneSelectedText: "&nbsp;",
                    selectedText: "Filtered",
                    selectedList: 1
                });
            }

            function onFilterChange(event) {
                if ($(event.target).hasClass("multi-select-changed")) {
                    onFilter.apply(event.target, arguments);
                }
            }

            $smartDataGrid.find(".smartDataGrid-rows").bind("scroll.multiselect-" + $filter.attr("id"), function () {
                $(document).trigger("mousedown.multiselect");
            });

        },
        filterBy: function ($filter, filter) {
            var filterValues = filter.values;
            $filter.find("option").each(function () {
                if (filterValues.indexOf($(this).val()) > -1) {
                    $(this).attr("selected", "true");
                }
            });
            $filter.multiselect("refresh");
        },
        getValue: function ($filter) {
            var values = $filter.multiselect("getChecked").map(function () {
                return this.value;
            }).get();
            return values && values.length && {
                values: values
            };
        },
        filter: function (filterValue, columnValue) {
            var addRow = true;
            if (filterValue && filterValue.values) {
                if (filterValue.values.indexOf(columnValue) < 0) {
                    addRow = false;
                }
            }
            return addRow;
        },
        destroy: function ($filter, $smartDataGrid) {
            if ($.fn.multiselect) {
                $filter.multiselect("destroy");
            }
            $smartDataGrid.find(".smartDataGrid-rows").unbind("scroll.multiselect-" + $filter.attr("id"));
        }
    };

    function onMultiSelectChange(event) {
        $(event.target).addClass("multi-select-changed");
    }

}(jQuery));