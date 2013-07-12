(function ($) {
    "use strict";

    $.smartDataGrid = $.extend(true, $.smartDataGrid, {
        plugin: {
            LABEL_BUTTON: function ($smartDataGrid, options, cachedData) {

                options = $.extend({
                    labelButtonIdentifier: ".button"
                }, options);

                function load() {
                    $smartDataGrid.delegate(options.labelButtonIdentifier, "click", function () {
                        var rowId = $.smartDataGrid.getElementId($(this).closest(".row").attr("id"));
                        alert("Cell data: " + $(this).next().val() + ", Row data: " + JSON.stringify(cachedData[rowId]));
                        return false;
                    });
                }

                function update(_cachedData) {
                    cachedData = _cachedData;
                }

                function destroy() {
                    $smartDataGrid.undelegate(options.labelButtonIdentifier, "click");
                    options = null;
                }

                return {
                    load: load,
                    update: update,
                    destroy: destroy
                };
            }
        }
    });

}(jQuery));