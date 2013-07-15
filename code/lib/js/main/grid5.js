(function ($) {
    "use strict";

    function renderGridAndConnectToWebSocket() {

        var isStarted = false;
        var updateTimer;
        var webSocketService;

        $(function () {
            webSocketService = new KZ.WebSocketService({
                onTick: updateRow
            });

            webSocketService.connect();

            var gridCB = new SmartDataGrid({
                dataSource: new SmartDataGrid.FakeLocalSource(SmartDataGrid.fakeDataSet5),
                showToolbar: false,
                rowHover: false,
                id: "gridLive"
            });
            gridCB.load();

            $("#startStopBtn").on("click", function (event) {
                isStarted = !isStarted;
                if (isStarted) {
                    $("#startStopBtn").attr("value","Stop");
                    updateRowData();
                } else {
                    $("#startStopBtn").attr("value","Start");
                    window.clearTimeout(updateTimer);
                }
            });
        });

        function updateRow(data) {
            $("#startStopBtn").attr("value","Stop");
            if (data) {
                $("#gridLive").trigger(jQuery.smartDataGrid.updateRow, [data]);
                $("#flotcontainer").trigger("update", [data]);
            }
        }

        function getTime(date) {
            return date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        }

        function randomData(data, key) {
            if (Math.round(Math.random() * 2) > 1) {
                data[key] = (1 + (Math.random() * 30));
                data.colTime = getTime(new Date());
            }
        }

        function updateRowData() {
            if (location.hash.indexOf("child") < 0) {
                var data = {};
                data.id = 1 + Math.floor(Math.random() * 9);
                randomData(data, "colBid");
                randomData(data, "colAsk");
                randomData(data, "colMin");

                if (Math.round(Math.random() * 2) > 1) {
                    data.colMax = (30 + (Math.random() * 30));
                    data.colTime = getTime(new Date());
                }
                if (data.colTime) {
                    webSocketService.publish(data);
                }
            }
            updateTimer = window.setTimeout(updateRowData, 400);
        }

    }

    //Dynamic chart plotting
    function renderChartAndListenToTickUpdates() {
        var chartData = [];
        var chartDataXAxisLabel = {};
        var totalPoints = 25;
        var lastBid = 12.89;
        var n = 0;

        function updateData(newTime, newData) {
            if (chartData.length > totalPoints) {
                chartData.shift();
            }
            chartDataXAxisLabel[n] = newTime;
            chartData.push([n++, newData]);
        }

        var options = {
            series: {
                shadowSize: 0 // Drawing is faster without shadows
            },
            yaxis: {
                min: -100,
                max: 100,
                font: {
                    size: 10,
                    lineHeight: 13,
                    family: "sans-serif",
                    variant: "small-caps",
                    color: "#545454"
                }
            },
            xaxis: {
                show: true,
                ticks: 5,
                tickFormatter: function (a, b, c) {
                    return chartDataXAxisLabel[a] || "";
                },
                font: {
                    size: 10,
                    lineHeight: 13,
                    family: "sans-serif",
                    variant: "small-caps",
                    color: "#545454"
                }
            }
        };

        (function init() {

            var plot = $.plot("#flotcontainer", [chartData], options);

            $("#flotcontainer").on("update", function (e, data) {
                if (data.colBid && data.id === 7) {
                    updateData(data.colTime, data.colBid - lastBid);
                    lastBid = data.colBid;
                } else {
                    updateData(data.colTime, 0);
                }
                plot.setData([chartData]);
                plot.setupGrid();
                plot.draw();
            });

        }());
    }

    $(function () {
        renderGridAndConnectToWebSocket();
        renderChartAndListenToTickUpdates();
    });

}(jQuery));