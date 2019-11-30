"use strict";


var L = L;  // imported from leaflet
var URLSearchParams = window.URLSearchParams;  //JSHint doesn't recognize this global object
var URL_ROOT = SCRIPT_ROOT;  //imported from jinja template
var jStat = jStat;  //imported from jstat


// Map -----------------------------------------------------------------------------
class Choropleth {
    constructor(geoJson, colors= {
        highHigh: '#9C29C1', //dark purple
        highMedium: '#4E44C9',  //dark blue-purple
        highLow: '#1F9FFC',  //blue
        mediumHigh: '#C94493',  //dark red-purple
        mediumMedium: '#C179D8',   //purple
        mediumLow: '#9A94E0',   //light blue-purple
        lowHigh: '#FC551F',  //red
        lowMedium: '#E094C1',   //light red-purple
        lowLow: '#F3E4F7'    //light purple
    }){
        this.geoJson = geoJson;
        this.colors = colors;
        this.choroplethProperties = [];
        this.infoLayer = null;
        this.legend = null;
        this.mapId = null;
        this.title = null;
        this.center = [37.8, -96];
        this.zoom = 4;
        this.map = this.createMap();
    }

    createMap(){
        const mapboxAccessToken = 'pk.eyJ1IjoibnVuaWUxMjMiLCJhIjoiY2szY2g3MXVvMG0xcTNucGljYmYwd3J5dCJ9.rLs2Z8DQSEcYANrpZfyjuQ';
        var map = L.map('map').setView(this.center, this.zoom);
    
        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + mapboxAccessToken, {
            id: 'mapbox.light', attribution: '© Mapbox, © OpenStreetMap'
        }).addTo(map);
    
        return map;
    }  

    addChoroplethToMap(){
        if(this.geoJsonLayer){
            this.removeGeoJsonLayer();
        }
        this.geoJsonLayer = L.geoJson(this.geoJson, {
            style: this.styleGeoJsonLayer.bind(this),
            onEachFeature: this.onEachFeature.bind(this)
        }).addTo(this.map); 
    }

    getColor(feature){
        var color;
        if(this.choroplethProperties.length == 1){
            let rank = feature.properties[`${this.choroplethProperties[0].propertyName} relative rank`];
            if(rank){
                color = rank == 'high' ? this.colors.highHigh : 
                rank == 'medium' ? this.colors.mediumMedium : this.colors.lowLow;
            } else {
                color = 'gray';
            }
            
        } else {
            let rank1 = feature.properties[`${this.choroplethProperties[0].propertyName} relative rank`];
            let rank2 = feature.properties[`${this.choroplethProperties[1].propertyName} relative rank`];
            if(rank1 && rank2){
                let capitalRank2 = rank2[0].toUpperCase() + rank2.slice(1);
                let combinedRank = rank1 + capitalRank2;
                color = this.colors[combinedRank];
            } else {
                color = 'gray';
            }
        }
        return color;
    }

    styleGeoJsonLayer(feature) {
        let fillColor = this.getColor(feature);
        var styleObj = {
            fillColor: fillColor,
            weight: 2,
            opacity: 0.3,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.8
        };    
        return styleObj;
    }

    onEachFeature(feature, layer) {
        layer.on({
            mouseover: this.highlightFeature.bind(this),
            mouseout: this.resetHighlight.bind(this),
            click: this.zoomToFeature.bind(this)
        });
    }

    highlightFeature(e) {
        var layer = e.target;
        layer.setStyle({
            weight: 5,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7
        });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
        this.infoLayer.update(layer.feature.properties);
    }

    resetHighlight(e) {
        this.geoJsonLayer.resetStyle(e.target);
        this.infoLayer.update();
    }

    zoomToFeature(e) {
        this.map.fitBounds(e.target.getBounds());
    }

    removeGeoJsonLayer() {
        this.map.removeLayer(this.geoJsonLayer);
    }

    addPropertyToGeoJson(propertyJson){
        var propertyValueArray = propertyJson.map( propertyObj => parseFloat(propertyObj.attribute_value));
        this.geoJson.features.forEach(function(geoEl){
            let propertyEl = propertyJson.filter(property => property.geo_name.toLowerCase() == geoEl.properties.NAME.toLowerCase());
    
            if(propertyEl.length > 0){
                let propertyName = propertyEl[0].attribute_name;
                let propertyValue = parseFloat(propertyEl[0].attribute_value);
                let rank = scoreRelativeRanking(propertyValueArray, propertyValue);
                geoEl.properties[propertyName] = propertyValue;
                geoEl.properties[`${propertyName} relative rank`] = rank;
            }
        });

        function scoreRelativeRanking(arr, item){
            var min = Math.min(...arr);
            var max = Math.max(...arr);
            var range = max - min;
            var oneThird = min + (1/3)*range;
            var twoThirds = min + (2/3)*range;
            var rank = item < oneThird ? 'low' : 
                        item < twoThirds ? 'medium' : 'high';
            return rank;
        }
    }

    removePropertyFromGeoJson(propertyName){
        this.geoJson.features.map( function(feature){
            delete feature.properties[propertyName];
            delete feature.properties[`${propertyName} relative rank`];
        });
    }

    addChoroplethProperty(propertyJson){
        if(this.choroplethProperties.length < 2){
            let property = {};
            property.propertyName = propertyJson[0].attribute_name;
            property.propertyYear = propertyJson[0].attribute_year;
            property.datasetId = propertyJson[0].dataset_id;
            this.choroplethProperties.push(property);
            this.addPropertyToGeoJson(propertyJson);
            this.addChoroplethToMap();
        }
        // The code breaks without the below assignment.  I do not know why.  For some reason the properties don't update properly unless they are evaluated at this stage.  The return value is not used.
        let properties = this.geoJson.features[0].properties;  // DO NOT REMOVE
        return properties;
    }

    removeChoroplethProperty(propertyName){
        this.removePropertyFromGeoJson(propertyName);
        this.choroplethProperties = this.choroplethProperties.filter( property => property.propertyName != propertyName);
        if(this.choroplethProperties.length > 0){
            this.addChoroplethToMap();
        } else {
            this.removeGeoJsonLayer();
        }
        // The code breaks without the below assignment.  I do not know why.  For some reason the properties don't update properly unless they are evaluated at this stage.
        let properties = this.geoJson.features[0].properties;  // DO NOT REMOVE
        return properties;
    }
}

function showMapView(node){
    makeMapNavButtonsInactive();
    node.classList.toggle('btn-success');
    node.classList.toggle('btn-outline-success');
    hideById('table-view');
    showById('map');
    hideById('statistics-view');
}

async function saveMap(saveAsNew=false){
    if(choropleth.choroplethProperties.length == 0){return;}

    let mapDetails = {};
    mapDetails.dataset1 = choropleth.choroplethProperties[0].datasetId;
    mapDetails.attribute1 = choropleth.choroplethProperties[0].propertyName;
    mapDetails.year1 = choropleth.choroplethProperties[0].propertyYear;
    mapDetails.color1 = choropleth.colors.highLow;
    if(choropleth.choroplethProperties.length == 2){
        mapDetails.dataset2 = choropleth.choroplethProperties[1].datasetId;
        mapDetails.attribute2 = choropleth.choroplethProperties[1].propertyName;
        mapDetails.year2 = choropleth.choroplethProperties[1].propertyYear;
        mapDetails.color2 = choropleth.colors.lowHigh;
    }
    mapDetails.title = document.getElementById('map-title').value;
    mapDetails.isPublic = true;
    mapDetails.zoom = choropleth.map.getZoom();
    let latLon = choropleth.map.getCenter();
    mapDetails.coordinates = [latLon.lat, latLon.lng];
    if(!saveAsNew){
        mapDetails.mapId = choropleth.mapId;
    }

    const url = `${URL_ROOT}analysis/save`;
    const dataResponse = await postData(url, mapDetails);   //function from upload_data.js
    choropleth.mapId = dataResponse.map_id;

    const imageResponse = await saveMapImage();
        
}

async function saveMapImage(){
    const mapImage = await generateMapImage();
    const imageUrl = `${URL_ROOT}analysis/9/save-thumbnail`;
    const imageResponse = await fetch(imageUrl, {
        method: 'POST',
        body: mapImage
    });
    return imageResponse;
}

async function generateMapImage(){
    let node = document.getElementById('map');
    // let img = new Image();
    let dataUrl = await domtoimage.toJpeg(node, { quality: 0.15});
    // img.src = dataUrl;
    // return img;
    return dataUrl;
}

function loadMap(choropleth, sidePanel){
    if(PRELOADED_MAP){
        choropleth.mapId = PRELOADED_MAP.map_id;
        let title = PRELOADED_MAP.title
        choropleth.title = title;
        document.getElementById('map-title').value = title;
        let zoom = PRELOADED_MAP.zoom_level
        choropleth.zoom = zoom;
        let coordinates = PRELOADED_MAP.center_coordinates;
        let commaIndex = coordinates.indexOf(',');
        let center = Array(coordinates.slice(1, commaIndex), coordinates.slice(commaIndex+1, -1));
        choropleth.center = center;
        choropleth.map.setView(center, zoom);
        let dataset1 = {};
        dataset1.attributeName = PRELOADED_MAP.attribute_name_1;
        dataset1.attributeYear = PRELOADED_MAP.attribute_year_1;
        dataset1.datasetId = PRELOADED_MAP.primary_dataset_id;
        sidePanel.processAttribute(dataset1);
        if(PRELOADED_MAP.secondary_dataset_id){
            let dataset2 = {};
            dataset2.attributeName = PRELOADED_MAP.attribute_name_2;
            dataset2.attributeYear = PRELOADED_MAP.attribute_year_2;
            dataset2.datasetId = PRELOADED_MAP.primary_dataset_id;
            sidePanel.processAttribute(dataset2);
        }
    }
}


// Info Box ------------------------------------------------------------------------------
function addInfoBoxToMap(map){
    var info = L.control();

    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
        this.update();
        return this._div;
    };

    // method that we will use to update the control based on feature properties passed
    info.update = function (props) {
        var boxEl = this._div;
        boxEl.innerHTML = '';
        boxEl.setAttribute('id', 'map-info-box');
        if(props){
            let headerText = document.createTextNode(props.NAME);
            boxEl.appendChild(headerText);
            for(let i=0; i<choropleth.choroplethProperties.length; i++){
                let propertyName = choropleth.choroplethProperties[i].propertyName;
                let brFirst = document.createElement('br');
                let textFirst = document.createTextNode(propertyName + ': ' + props[propertyName]);
                let brSecond = document.createElement('br');
                let textSecond = document.createTextNode(propertyName + ' rank: ' + props[propertyName + ' relative rank']);
                boxEl.appendChild(brFirst);
                boxEl.appendChild(textFirst);
                boxEl.appendChild(brSecond);
                boxEl.appendChild(textSecond);
            }
        } else {
            let text = document.createTextNode(`Hover over a state.`);
            boxEl.appendChild(text);
        }
    };

    info.addTo(map);
    return info;
}

// Legend ----------------------------------------------------------------------------------------------


function updateLegend(choropleth){
    removeLegend(choropleth);
    var legend = null;
    if(choropleth.choroplethProperties.length == 1){
        legend = L.control({position: 'bottomright'});
        legend.onAdd = function (map){
            let table = L.DomUtil.create('table', 'legend small-legend');
            let titleRow = document.createElement('tr');
            let highRow = document.createElement('tr');
            let midRow = document.createElement('tr');
            let lowRow = document.createElement('tr');
            let titleCell = L.DomUtil.create('th', 'legend-title');
            titleCell.colSpan = 2;
            let highColorCell = document.createElement('td');
            highColorCell.style.backgroundColor = choropleth.colors.highHigh;
            highColorCell.style.width = '33px';
            let midColorCell = document.createElement('td');
            midColorCell.style.backgroundColor = choropleth.colors.mediumMedium;
            let lowColorCell = document.createElement('td');
            lowColorCell.style.backgroundColor = choropleth.colors.lowLow;
            let highLebelCell = document.createElement('td');
            highLebelCell.textContent = 'High';
            let midLebelCell = document.createElement('td');
            midLebelCell.textContent = 'Medium';
            let lowLebelCell = document.createElement('td');
            lowLebelCell.textContent = 'Low';

            table.appendChild(titleRow);
            table.appendChild(highRow);
            table.appendChild(midRow);
            table.appendChild(lowRow);
            titleRow.appendChild(titleCell);
            highRow.appendChild(highColorCell);
            highRow.appendChild(highLebelCell);
            midRow.appendChild(midColorCell);
            midRow.appendChild(midLebelCell);
            lowRow.appendChild(lowColorCell);
            lowRow.appendChild(lowLebelCell);

            return table;
        };
        legend.addTo(choropleth.map);
    } else if(choropleth.choroplethProperties.length > 1){
        legend = L.control({position: 'bottomright'});
        legend.onAdd = function(map){
            let outerTable = L.DomUtil.create('table', 'legend legend-big');
            let topRow = document.createElement('tr');
            topRow.className = 'legend-top-row';
            outerTable.appendChild(topRow);
            let topTd = document.createElement('td');
            topTd.colSpan = '3';
            topRow.appendChild(topTd);
            let topText = document.createTextNode('Both');
            topTd.appendChild(topText);

            let middleRow = document.createElement('tr');
            middleRow.className = 'legend-middle-row';
            outerTable.appendChild(middleRow);
            let leftTd = document.createElement('td');
            leftTd.setAttribute('id', 'legend-left-text');
            middleRow.appendChild(leftTd);
            let leftText = document.createTextNode(choropleth.choroplethProperties[0].propertyName);
            leftTd.appendChild(leftText);
            let svgTd = document.createElement('td');
            svgTd.setAttribute('id', 'legend-diamond');
            middleRow.appendChild(svgTd);
            let rightTd = document.createElement('td');
            middleRow.appendChild(rightTd);
            rightTd.setAttribute('id', 'legend-right-text');
            let rightText = document.createTextNode(choropleth.choroplethProperties[1].propertyName);
            rightTd.appendChild(rightText);
            svgTd.innerHTML = `
            <svg width="99" height="99" xmlns="http://www.w3.org/2000/svg" 
                transform="rotate(45) translate(0,0)" opacity="0.8">
                <rect id="high-high" x="0" y="0" width="33" height="33" fill="${choropleth.colors.highHigh}"/>
                <rect id="medium-high" x="33" y="0" width="33" height="33" fill="${choropleth.colors.mediumHigh}"/>
                <rect id="low-high" x="66" y="0" width="33" height="33" fill="${choropleth.colors.lowHigh}"/>
                <rect id="high-medium" x="0" y="33" width="33" height="33" fill="${choropleth.colors.highMedium}"/>
                <rect id="medium-medium" x="33" y="33" width="33" height="33" fill="${choropleth.colors.mediumMedium}"/>
                <rect id="low-medium" x="66" y="33" width="33" height="33" fill="${choropleth.colors.lowMedium}"/>
                <rect id="high-low" x="0" y="66" width="33" height="33" fill="${choropleth.colors.highLow}"/>
                <rect id="medium-low" x="33" y="66" width="33" height="33" fill="${choropleth.colors.mediumLow}"/>
                <rect id="low-low" x="66" y="66" width="33" height="33" fill="${choropleth.colors.lowLow}"/>
            </svg>
            `;
            return outerTable;
        };
        legend.addTo(choropleth.map);
    }
    choropleth.legend = legend;
}

function removeLegend(choropleth){
    if(choropleth.legend){
        choropleth.map.removeControl(choropleth.legend);
        choropleth.legend = null;
    }
}

// Side Panel --------------------------------------------------------------------

class SidePanel {
    constructor(choropleth){
        this.selectedAttributes = [];
        this.choropleth = choropleth;
    }

    async selectAttribute(e){
        if(this.selectedAttributes.length >= 2){return;}
        let attribute = {};
        let clickedEl = e.target;
        attribute.datasetId = clickedEl.dataset.sourceId;
        attribute.attributeName = clickedEl.dataset.attributeName;
        attribute.attributeYear = clickedEl.textContent.trim();
        this.processAttribute(attribute);
    }

    async processAttribute(attribute){
        this.selectedAttributes.push(attribute);
        const data = await this.getAttributeData(attribute);
        this.choropleth.addChoroplethProperty(data);
        this.addAttributeToSidePanel(attribute.attributeName, attribute.attributeYear);
        renderTableView();
        renderStatisticsView();
        updateLegend(this.choropleth);
    }

    async getAttributeData(attribute){
        let url_string = URL_ROOT + 'get-data-attribute';
        let url = new URL(url_string);
        let params = {datasetId: attribute.datasetId, attributeName: attribute.attributeName, attributeYear: attribute.attributeYear};
        url.search = new URLSearchParams(params);
        const response = await fetch(url);
        const responseArray = await response.json();
        return responseArray;
    }

    addAttributeToSidePanel(attributeName, attributeYeear){
        let attributeListEl = document.getElementById('selected-attributes');
        let attributeWrapper = document.createElement('div');
        let topRow = document.createElement('div');
        topRow.className = 'row';
        let attributeTextDiv = document.createElement('div');
        attributeTextDiv.className = 'attribute-cell col-sm-12';
        attributeTextDiv.textContent = attributeName;
        let bottomRow = document.createElement('div');
        bottomRow.className = 'row';
        let yearDiv = document.createElement('div');
        yearDiv.className = 'col-sm-8 attribute-cell';
        yearDiv.textContent = attributeYeear;
        let cancelDiv = document.createElement('div');
        cancelDiv.className = 'attribute-remove-button col-sm-4 attribute-cell';
        cancelDiv.textContent = 'remove';
        cancelDiv.dataset.attributeName = attributeName;
        cancelDiv.addEventListener('click', this.removeAttribute.bind(this));
        
        attributeListEl.appendChild(attributeWrapper);
        attributeWrapper.appendChild(topRow);
        attributeWrapper.appendChild(bottomRow);
        topRow.appendChild(attributeTextDiv);
        bottomRow.appendChild(yearDiv);
        bottomRow.appendChild(cancelDiv);
    }

    removeAttribute(e){
        var clickedEl = e.target;
        var attributeName = clickedEl.dataset.attributeName;
        var grandParent = clickedEl.parentNode.parentNode;
        grandParent.parentNode.removeChild(grandParent);
        this.choropleth.removeChoroplethProperty(attributeName);
        this.selectedAttributes = this.selectedAttributes.filter( attribute => attribute.attributeName != attributeName);
        updateLegend(this.choropleth);
        renderTableView();
        renderStatisticsView();
    }

    toggleAttributes(e){
        var attributesList;
        if(e.id.slice(0,7) == 'default'){
            attributesList = document.getElementById('default-data-attributes');
        }
        attributesList.style.display = (attributesList.style.display === 'none') ? 'block' : 'none';
    }
    
    toggleSources(e){
        var sourceList;
        if(e.id.slice(0,7) == 'default'){
            sourceList = document.getElementById('default-data-sources');
        }
        sourceList.style.display = (sourceList.style.display === 'none') ? 'block' : 'none';
    }
    
    async toggleYearList(e){
        let attributeText = e.firstChild;
        let yearList = attributeText.nextSibling;
        const datasetId = e.dataset.sourceId;
        const attributeName = e.textContent.trim();

        let createYearButtons = yearArray => {
            yearArray.forEach(function(year){
                let btn = document.createElement('button');
                btn.className = 'list-group-item list-group-item-action list-group-item-light';
                btn.textContent = year;
                btn.dataset.sourceId = datasetId;
                btn.dataset.attributeName = attributeName;
                btn.addEventListener('click', this.selectAttribute.bind(this));
                yearList.appendChild(btn);
            }.bind(this));

        };

        if(yearList.childNodes.length > 0){
            deleteChildren(yearList);
        } else {
            const url_string = URL_ROOT + 'get-attribute-years';
            let url = new URL(url_string);
            const params = {datasetId: datasetId, attributeName: attributeName};
            url.search = new URLSearchParams(params);
            const response = await fetch(url);
            const responseArray = await response.json();
            createYearButtons(responseArray);
        }
    }
    
    toggleSideBar(){
        let sidePanel = document.getElementById('map-side-panel');
        sidePanel.classList.toggle('visible-panel');
        sidePanel.classList.toggle('hidden-panel');
        let toggleButton = document.getElementById('side-panel-toggle');
        toggleButton.classList.toggle('visible-panel');
        toggleButton.classList.toggle('hidden-panel');
        let tableView = document.getElementById('table-view');
        tableView.classList.toggle('table-small');
        if (toggleButton.classList.contains('visible-panel')){
            toggleButton.textContent = 'Hide';
        } else {
            toggleButton.textContent = 'Show';
        }
    }

}


// Code Execution -------------------------------------------------------------------------------

var usStateGeoJson = usStateGeoJson;  // loaded from static file in analysis.html
var choropleth = new Choropleth(usStateGeoJson);
var sidePanel = new SidePanel(choropleth);
choropleth.infoLayer = addInfoBoxToMap(choropleth.map);
var sidePanelNode = document.getElementById('map-side-panel');
sidePanelNode.addEventListener('pointerover', function() { choropleth.map.scrollWheelZoom.disable(); });
sidePanelNode.addEventListener('pointerleave', function() { choropleth.map.scrollWheelZoom.enable(); });
loadMap(choropleth, sidePanel);


// Table View --------------------------------------------------------------------------------------

function getTableData(){
    let tableData = choropleth.geoJson.features.map( feature => feature.properties);
    return tableData;
}

function renderTableView(){
    let data = getTableData();
    let tableView = document.getElementById('table-view');
    deleteChildren(tableView);
    let table = document.createElement('table');
    table.className = 'table';
    tableView.append(table);
    let thead = document.createElement('thead');
    table.appendChild(thead);
    let trHead = document.createElement('tr');
    thead.appendChild(trHead);
    let keys = Object.keys(data[0]);
    keys.forEach( function(key){
        let th = document.createElement('th');
        th.textContent = key;
        trHead.appendChild(th);
    });
    let tbody = document.createElement('tbody');
    table.appendChild(tbody);
    data.forEach(function(row){
        let tr = document.createElement('tr');
        tbody.appendChild(tr);
        keys.forEach(function(key){
            let td = document.createElement('td');
            td.textContent = row[key];
            tr.appendChild(td);
        });
    });

}

function showTableView(node){
    makeMapNavButtonsInactive();
    node.classList.toggle('btn-success');
    node.classList.toggle('btn-outline-success');
    renderTableView();
    hideById('map');
    showById('table-view');
    hideById('statistics-view');
}

function makeMapNavButtonsInactive(){
    let nav = document.getElementById('data-nav');
    let children = nav.getElementsByClassName('btn-success');
    for (let child of children){
        child.classList.remove('btn-success');
        child.classList.add('btn-outline-success');
    }
}

function hideById(id){
    let node = document.getElementById(id);
    node.classList.remove('visible');
    node.classList.add('hidden');
}

function showById(id){
    let node = document.getElementById(id);
    node.classList.add('visible');
    node.classList.remove('hidden');
}

function deleteChildren(node){
    while (node.firstChild) {
        node.removeChild(node.firstChild);
      }
}

// Statistics View ---------------------------------------

function showStatisticsView(node){
    makeMapNavButtonsInactive();
    node.classList.toggle('btn-success');
    node.classList.toggle('btn-outline-success');
    renderStatisticsView();
    hideById('map');
    hideById('table-view');
    showById('statistics-view');
}

function getStatisticsData(){
    let propertyNames = choropleth.choroplethProperties.map( property => property.propertyName);
    if(propertyNames.length == 0){return;}
    let data = choropleth.geoJson.features.map( feature => filterProperties(feature.properties, propertyNames));

    function filterProperties(propertyObj, propertyNames){
        let newObj = {};
        const regionName = propertyObj.NAME;
        newObj.regionName = regionName;
        newObj.propertyNames = propertyNames;
        newObj.values = [];
        propertyNames.forEach(function(property){
            newObj.values.push(propertyObj[property]);
        });
        return newObj;
    }
    return data;
}

function generateSummaryStatistics(data){
    let arr1 = data.map( item => item.values[0]).filter( item => item != null);
    let statRows;

    if(data[0].propertyNames.length > 1){
        let arr2 = data.map( item => item.values[1]).filter( item => item != null);
        statRows = generateMultiVectorStats(arr1, arr2);
        let combinedArray = data.map( item => item.values).filter( item => item[0] != null && item[1] != null);
        let correlationArray1 = combinedArray.map( item => item[0]);
        let correlationArray2 = combinedArray.map( item => item[1]);
        let correlation = Math.round(jStat.corrcoeff(correlationArray1, correlationArray2)*1000)/1000;
        statRows.push(['Correlation', correlation, correlation]);
        let r2 = Math.round(Math.pow(correlation, 2)*1000)/1000;
        statRows.push(['R Squared', r2, r2]);
    } else {
        statRows = generateSingleVectorStats(arr1);
    }
    return statRows;

    function generateSingleVectorStats(vector){
        let statsArray = [];
        statsArray.push(['Data Element Count', vector.length]);
        statsArray.push(['Mean', Math.round(jStat.mean(vector)*100)/100]);
        statsArray.push(['Median', Math.round(jStat.median(vector)*100)/100]);
        let mode = jStat.mode(vector);
        let strMode = Array.isArray(mode) ? mode.join() : mode;
        statsArray.push(['Mode', strMode]);
        statsArray.push(['Min', jStat.min(vector)]);
        statsArray.push(['Max', jStat.max(vector)]);
        statsArray.push(['Range', Math.round(jStat.range(vector)*100)/100]);
        statsArray.push(['Standard Deviation', Math.round(jStat.stdev(vector)*1000)/1000]);
        let quartiles = jStat.quartiles(vector);
        let iqr = quartiles[2] - quartiles[0];
        statsArray.push(['Quartiles', quartiles.join()]);
        statsArray.push(['Interquartile Range', Math.round(iqr*100)/100]);
        statsArray.push(['Variance', Math.round(jStat.variance(vector)*100)/100]);

        return statsArray;
    }

    function generateMultiVectorStats(vector1, vector2){
        let statsArray1 = generateSingleVectorStats(vector1);
        let statsArray2 = generateSingleVectorStats(vector2);
        let fullStatsArray = statsArray1;
        for(let i=0; i < statsArray1.length; i++){
            fullStatsArray[i].push(statsArray2[i][1]);
        }
        return fullStatsArray;
    }

}

function renderStatisticsView(){
    let data = getStatisticsData() || Array();
    let statisticsTable = document.getElementById('statistics-table');
    if(data.length == 0){
        return;
    }
    let statRows = generateSummaryStatistics(data);
    deleteChildren(statisticsTable);
    let thead = document.createElement('thead');
    statisticsTable.appendChild(thead);
    let headRow = document.createElement('tr');
    thead.appendChild(headRow);
    let th = document.createElement('th');
    th.style.width = '20%';
    headRow.appendChild(th);
    data[0].propertyNames.forEach( function(name){
        let th = document.createElement('th');
        th.textContent = name;
        th.style.width = '40%';
        headRow.appendChild(th);
    });
    let tbody = document.createElement('tbody');
    statisticsTable.appendChild(tbody);
    statRows.forEach( function(row){
        let tr = document.createElement('tr');
        tbody.appendChild(tr);
        for(let i=0; i<row.length; i++){
            let td = document.createElement('td');
            td.textContent = row[i];
            tr.appendChild(td);
            if(i==0){
                td.style.fontWeight = 'bold';
                td.style.width = '20%';
            } else {
                td.style.width = '40%';
            }
        }
    });
}