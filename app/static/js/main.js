import { addUploadEventListener } from './upload_data.js';
import { Choropleth, loadMap } from './analysis.js';
import { SidePanel } from './side_panel.js';
import { TableView } from './table_view.js';
import { StatisticsView } from './statistics_view.js';
import { STATE_GEO_JSON } from './us_state_geojson.js';

// Choropleth- -----------------------------------------------
var usStateGeoJson = usStateGeoJson;  // loaded from static file in analysis.html
var choropleth = new Choropleth(STATE_GEO_JSON);
// choropleth.infoLayer = addInfoBoxToMap(choropleth.map);
document.getElementById('map-view-button').addEventListener('click', choropleth.showMapView);
addUploadEventListener();
document.getElementById('save-map-button').addEventListener('click', choropleth.saveMap);
document.getElementById('save-as-map-button').addEventListener('click', choropleth.saveMap);


// Side Panel ------------------------------------------------
var sidePanel = new SidePanel(choropleth);

var sidePanelNode = document.getElementById('map-side-panel');
sidePanelNode.addEventListener('pointerover', function() { choropleth.map.scrollWheelZoom.disable(); });
sidePanelNode.addEventListener('pointerleave', function() { choropleth.map.scrollWheelZoom.enable(); });

document.getElementById('default-sources-btn').addEventListener('click', sidePanel.toggleSources);
document.getElementById('default-attributes-btn').addEventListener('click', sidePanel.toggleAttributes);
document.getElementById('side-panel-toggle').addEventListener('click', sidePanel.toggleSideBar);

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







