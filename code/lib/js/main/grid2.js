(function ($) {
    "use strict";
    $(function () {
        var gridCB = new SmartDataGrid({
            dataSource: new SmartDataGrid.FakeLocalSource(SmartDataGrid.fakeDataSet1),
            id: "gridCB"
        });
        gridCB.load();
    });
}(jQuery));