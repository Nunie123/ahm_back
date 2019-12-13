import { addUploadEventListener } from './upload_data.js';
import { Choropleth, loadMap } from './map.js';
import { SidePanel } from './side_panel.js';
import { TableView } from './table_view.js';
import { StatisticsView } from './statistics_view.js';


// Choropleth- -----------------------------------------------
var usStateGeoJson = usStateGeoJson;  // loaded from static file in analysis.html
var choropleth = new Choropleth();
// choropleth.infoLayer = addInfoBoxToMap(choropleth.map);
document.getElementById('map-view-button').addEventListener('click', choropleth.showMapView);
addUploadEventListener();
document.getElementById('save-map-button').addEventListener('click', choropleth.saveMap);
document.getElementById('save-as-map-button').addEventListener('click', choropleth.saveMap);
document.getElementById('download-jpg').addEventListener('click', choropleth.downloadMapAsJpg);
document.getElementById('download-png').addEventListener('click', choropleth.downloadMapAsPng);
document.getElementById('download-csv').addEventListener('click', choropleth.downloadAsCsv);
document.getElementById('download-json').addEventListener('click', choropleth.downloadAsGeoJson);


// Side Panel ------------------------------------------------
var sidePanel = new SidePanel(choropleth);

var sidePanelNode = document.getElementById('map-side-panel');
sidePanelNode.addEventListener('pointerover', function() { choropleth.map.scrollWheelZoom.disable(); });
sidePanelNode.addEventListener('pointerleave', function() { choropleth.map.scrollWheelZoom.enable(); });

document.getElementById('side-panel-toggle').addEventListener('click', sidePanel.toggleSideBar);

var sourceButtons = document.getElementsByClassName("source-btn");
Array.from(sourceButtons).forEach(function(element) {
    element.addEventListener('click', sidePanel.toggleSources);
});

var regionButtons = document.getElementsByClassName("region-dataset-btn");
Array.from(regionButtons).forEach(function(element) {
    element.addEventListener('click', sidePanel.toggleRegions);
});

var datasetButtons = document.getElementsByClassName("dataset-btn");
Array.from(datasetButtons).forEach(function(element) {
    element.addEventListener('click', sidePanel.toggleAttributes);
});

var yearButtons = document.getElementsByClassName("year-button");
Array.from(yearButtons).forEach(function(element) {
    element.addEventListener('click', sidePanel.toggleYearList);
});

loadMap(choropleth, sidePanel);


// Table View ------------------------------------------------
var tableView = new TableView(choropleth);
document.getElementById('table-view-button').addEventListener('click', tableView.showTableView);
sidePanel.tableView = tableView;


// Statistics View ------------------------------------------------
var statisticsView = new StatisticsView(choropleth);
document.getElementById('statistics-view-button').addEventListener('click', statisticsView.showStatisticsView);
sidePanel.statisticsView = statisticsView;







