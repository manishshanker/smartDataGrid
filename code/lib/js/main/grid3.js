(function($) {
    $(function() {
        var grid1 = new SmartDataGrid({
            dataSource: new SmartDataGrid.FakeLocalSource(SmartDataGrid.fakeDataSet4),
            id:"grid1"
        });
        grid1.load();
        var grid2 = new SmartDataGrid({
            dataSource: new SmartDataGrid.FakeLocalSource(SmartDataGrid.fakeDataSet2),
            id:"grid2"
        });
        grid2.load();
    });
}(jQuery));