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

    var toolbarContainer = {};

    $.smartDataGrid = $.extend(true, $.smartDataGrid, {
        plugin: {
            toolbar: function ($smartDataGrid, options) {

                options = $.extend({
                    showToolbar: true,
                    toolbarTemplate: "<div class='smartDataGrid-toolbar'><a href='#' class='smartDataGrid-reset'>Reset</a><a href='#' class='smartDataGrid-refresh'>Refresh</a></div>",
                    onReset: $.noop
                }, options);

                var $toolbar;

                function load() {
                    if (!options.showToolbar) {
                        return;
                    }
                    $toolbar = $(options.toolbarTemplate);
                    toolbarContainer[options.id] = $toolbar;
                    $smartDataGrid.prepend($toolbar);
                    $smartDataGrid.undelegate(".smartDataGrid-reset", "click").delegate(".smartDataGrid-reset", "click", function () {
                        options.onReset();
                        return false;
                    });
                    $smartDataGrid.undelegate(".smartDataGrid-refresh", "click").delegate(".smartDataGrid-refresh", "click", function () {
                        options.onRefresh();
                        return false;
                    });
                }

                function destroy() {
                    delete toolbarContainer[options.id];
                    if ($toolbar) {
                        $smartDataGrid.undelegate(".smartDataGrid-reset", "click");
                        $smartDataGrid.undelegate(".smartDataGrid-refresh", "click");
                    }
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