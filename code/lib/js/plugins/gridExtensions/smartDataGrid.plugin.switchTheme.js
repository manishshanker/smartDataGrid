(function ($) {
    "use strict";

    var currentTheme = {};

    $.smartDataGrid = $.extend(true, $.smartDataGrid, {
        plugin: {
            THEME_SWITCHER: function ($smartDataGrid, options) {
                function load() {
                    var $themeSwitcher = $("." + options.id + "-smartDataGrid-switch-theme");
                    $themeSwitcher.delegate(".theme", "click", function () {
                        var theme = $(this).attr("href").replace("#", ""), gridId = options.id;
                        var $grid = $("#" + gridId);
                        var $gridGroupBy = $("." + gridId + "-smartDataGrid-group-by");
                        if (currentTheme[gridId]) {
                            $grid.removeClass("smartDataGrid-" + currentTheme[gridId]);
                            $gridGroupBy.removeClass("smartDataGrid-group-by-" + currentTheme[gridId]);
                        }
                        currentTheme[gridId] = theme;
                        $grid.addClass("smartDataGrid-" + currentTheme[gridId]);
                        $gridGroupBy.addClass("smartDataGrid-group-by-" + currentTheme[gridId]);
                        return false;
                    });
                }

                function destroy() {
                    $("." + options.id + "-smartDataGrid-switch-theme").undelegate(".theme", "click");
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