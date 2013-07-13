$(function () {
    "use strict";
    var grid1 = new SmartDataGrid({
        dataSource: new SmartDataGrid.FakeLocalSource(SmartDataGrid.fakeDataSet3),
        id: "grid1"
    });
    grid1.load();
});