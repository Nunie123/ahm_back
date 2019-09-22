"use strict";


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
        this.map = this.createMap();
        this.geoJson = geoJson;
        this.colors = colors;
        this.choroplethProperties = [];
        this.infoLayer = null;
        this.legend = null;
    }

    createMap(){
        const mapboxAccessToken = 'pk.eyJ1IjoibnVuaWUxMjMiLCJhIjoiY2pscmNpNWNmMDNvMzNxbm5rOGI1cWhvZyJ9.TilZiY3pDTd9BZpagtnHiw';
        var map = L.map('map', {scrollWheelZoom: false}).setView([37.8, -96], 4);
    
        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + mapboxAccessToken, {
            id: 'mapbox.light'
            , attribution: '© Mapbox, © OpenStreetMap'
        }).addTo(map);
    
        return map;
    }  

    addChoroplethToMap(){
        if(this.geoJsonLayer){
            this.removeGeoJsonLayer();
        }
        this.geoJsonLayer = L.geoJson(this.geoJson, {
            style: this.styleGeoJsonLayer,
            onEachFeature: this.onEachFeature
        }).addTo(this.map); 
    }

    getColor(feature){
        var color;
        if(this.choroplethProperties.length == 1){
            let rank = feature.properties[`${this.choroplethProperties[0]} relative rank`];
            if(rank){
                color = rank == 'high' ? this.colors.highHigh : 
                rank == 'medium' ? this.colors.mediumMedium : this.colors.lowLow;
            } else {
                color = 'gray';
            }
            
        } else {
            let rank1 = feature.properties[`${this.choroplethProperties[0]} relative rank`];
            let rank2 = feature.properties[`${this.choroplethProperties[1]} relative rank`];
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

    styleGeoJsonLayer = (feature) => {
        var styleObj = {
            fillColor: this.getColor(feature),
            weight: 2,
            opacity: 0.3,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.8
        };    
        return styleObj;
    }

    onEachFeature = (feature, layer) => {
        layer.on({
            mouseover: this.highlightFeature,
            mouseout: this.resetHighlight,
            click: this.zoomToFeature
        });
    }

    highlightFeature = (e) => {
        var layer = e.target;
        layer.setStyle({
            weight: 5,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7
        });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        };
        this.infoLayer.update(layer.feature.properties);
    }

    resetHighlight = (e) => {
        this.geoJsonLayer.resetStyle(e.target);
        this.infoLayer.update();
    }

    zoomToFeature = (e) => {
        this.map.fitBounds(e.target.getBounds());
    }

    removeGeoJsonLayer = () => {
        this.map.removeLayer(this.geoJsonLayer);
    }

    addPropertyToGeoJson(propertyJson){
        var propertyValueArray = propertyJson.map( propertyObj => parseFloat(propertyObj['attribute_value']));
        this.geoJson.features.forEach(function(geoEl){
            let propertyEl = propertyJson.filter(property => property.geo_name.toLowerCase() == geoEl.properties.NAME.toLowerCase());
    
            if(propertyEl.length > 0){
                let propertyName = propertyEl[0]['attribute_name'];
                let propertyValue = parseFloat(propertyEl[0]['attribute_value']);
                let rank = scoreRelativeRanking(propertyValueArray, propertyValue)
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

    addChoroplethProperty(propertyJson){
        var propertyName = propertyJson[0]['attribute_name'];

        if(this.choroplethProperties.length < 2){
            this.choroplethProperties.push(propertyName);
            this.addPropertyToGeoJson(propertyJson);
            this.addChoroplethToMap();
        }
    }

    removeChoroplethProperty(propertyName){
        var index = this.choroplethProperties.indexOf(propertyName);
        this.choroplethProperties.splice(index, 1);
        if(this.choroplethProperties.length > 0){
            this.addChoroplethToMap();
        } else {
            this.removeGeoJsonLayer();
        }
    }
}

// Code Execution -------------------------------------------------------------------------------

var usStateGeoJson = usStateGeoJson;  // loaded from static file in analysis.html
var choropleth = new Choropleth(usStateGeoJson);
choropleth.infoLayer = addInfoBoxToMap(choropleth.map);
choropleth.map.once('focus', function() { choropleth.map.scrollWheelZoom.enable(); });



// Side Panel --------------------------------------------------------------------

function toggleAttributes(e){
    var attributesList;
    if(e.id.slice(0,7) == 'default'){
        attributesList = document.getElementById('default-data-attributes');
    }
    attributesList.style.display = (attributesList.style.display === 'none') ? 'block' : 'none';
}

function toggleSources(e){
    var sourceList;
    if(e.id.slice(0,7) == 'default'){
        sourceList = document.getElementById('default-data-sources');
    }
    sourceList.style.display = (sourceList.style.display === 'none') ? 'block' : 'none';
}

function toggleYearList(e){
    var attributeText = e.firstChild;
    var yearList = attributeText.nextSibling
    if(yearList.childNodes.length > 0){
        while (yearList.firstChild) {
            yearList.removeChild(yearList.firstChild);
          }
    } else {
        var datasetId = e.dataset.sourceId
        var url_string = SCRIPT_ROOT + 'get-attribute-years'
        var url = new URL(url_string)
        var attributeName = e.textContent.trim()
        var params = {datasetId: datasetId, attributeName: attributeName}
        url.search = new URLSearchParams(params)
        fetch(url)
            .then(function(response) {
                return response.json();
            })
            .then(function(yearArray) {
                yearArray.forEach(function(year){
                    let btn = document.createElement('button');
                    btn.className = 'list-group-item list-group-item-action list-group-item-light';
                    btn.textContent = year;
                    btn.dataset.sourceId = datasetId;
                    btn.dataset.attributeName = attributeName;
                    btn.addEventListener('click', selectAttribute);
                    yearList.appendChild(btn);
                });

            });
    }
}

function selectAttribute(e){
    if(choropleth.choroplethProperties.length >= 2){
        return;
    }
    var clickedEl = e.target;
    var datasetId = clickedEl.dataset.sourceId;
    var attributeName = clickedEl.dataset.attributeName;
    var attributeYear = clickedEl.textContent.trim()
    var url_string = SCRIPT_ROOT + 'get-data-attribute'
    var url = new URL(url_string)
    var params = {datasetId: datasetId, attributeName: attributeName, attributeYear: attributeYear}
    url.search = new URLSearchParams(params)
    fetch(url)
        .then(function(response) {
            return response.json();
        })
        .then(function(propertyJson) {
            choropleth.addChoroplethProperty(propertyJson)
            addAttributeToSidePanel(attributeName, attributeYear);
            updateLegend(choropleth);
        });

    function addAttributeToSidePanel(attributeName, attributeYeear){
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
        cancelDiv.addEventListener('click', removeAttribute)
        
        attributeListEl.appendChild(attributeWrapper);
        attributeWrapper.appendChild(topRow);
        attributeWrapper.appendChild(bottomRow);
        topRow.appendChild(attributeTextDiv);
        bottomRow.appendChild(yearDiv);
        bottomRow.appendChild(cancelDiv);
    }
}

function removeAttribute(e){
    var clickedEl = e.target;
    var attributeName = clickedEl.dataset.attributeName;
    var grandParent = clickedEl.parentNode.parentNode;
    grandParent.parentNode.removeChild(grandParent);
    choropleth.removeChoroplethProperty(attributeName);
    updateLegend(choropleth);
}

function toggleSideBar(el){
    var sidePanel = document.getElementById('map-side-panel');
    if(el.checked){
        sidePanel.style.display = 'block';
    } else {
        sidePanel.style.display = 'none';
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
                let brFirst = document.createElement('br');
                let textFirst = document.createTextNode(choropleth.choroplethProperties[i] + ': ' + props[choropleth.choroplethProperties[i]]);
                let brSecond = document.createElement('br');
                let textSecond = document.createTextNode(choropleth.choroplethProperties[i] + ' rank: ' + props[choropleth.choroplethProperties[i] + ' relative rank']);
                boxEl.appendChild(brFirst);
                boxEl.appendChild(textFirst);
                boxEl.appendChild(brSecond);
                boxEl.appendChild(textSecond);
            };
        } else {
            let text = document.createTextNode(`Hover over a state.`);
            boxEl.appendChild(text);
        };
    };

    info.addTo(map);
    return info;
};

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
            let leftText = document.createTextNode(choropleth.choroplethProperties[0]);
            leftTd.appendChild(leftText);
            let svgTd = document.createElement('td');
            svgTd.setAttribute('id', 'legend-diamond');
            middleRow.appendChild(svgTd);
            let rightTd = document.createElement('td');
            middleRow.appendChild(rightTd);
            rightTd.setAttribute('id', 'legend-right-text');
            let rightText = document.createTextNode(choropleth.choroplethProperties[1]);
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
            `
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


function updateLegend_deprecated(map){
    if(state.legend){map.removeControl(state.legend)}
    var legend = L.control({position: 'bottomright'});
    if(state.activeMapLayerNames.length===0){
        return null;
    }else if(state.activeMapLayerNames.length===1){
        legend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'legend');
            let legendTitle = document.createTextNode(state.activeMapLayerNames[0])
            let colorOpaque = hexToRgba(state.colors.highLow,1);
            let colorTransparent = hexToRgba(state.colors.highLow,0);
            let gradientBar = document.createElement('i');
            gradientBar.className = 'gradient-bar';
            gradientBar.style.backgroundImage = `linear-gradient(to right, ${colorOpaque}, ${colorTransparent})`;
            div.appendChild(legendTitle);
            div.appendChild(gradientBar);
            return div;
        };
    } else if (state.activeMapLayerNames.length===2){
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
            let leftText = document.createTextNode(state.activeMapLayerNames[0]);
            leftTd.appendChild(leftText);
            let svgTd = document.createElement('td');
            svgTd.setAttribute('id', 'legend-diamond');
            middleRow.appendChild(svgTd);
            let rightTd = document.createElement('td');
            middleRow.appendChild(rightTd);
            rightTd.setAttribute('id', 'legend-right-text');
            let rightText = document.createTextNode(state.activeMapLayerNames[1]);
            rightTd.appendChild(rightText);
            svgTd.innerHTML = `
            <svg width="99" height="99" xmlns="http://www.w3.org/2000/svg" 
                transform="rotate(45) translate(0,0)" opacity="0.8">
                <rect id="high-high" x="0" y="0" width="33" height="33" fill="${state.colors.highHigh}"/>
                <rect id="medium-high" x="33" y="0" width="33" height="33" fill="${state.colors.medHigh}"/>
                <rect id="low-high" x="66" y="0" width="33" height="33" fill="${state.colors.lowHigh}"/>
                <rect id="high-medium" x="0" y="33" width="33" height="33" fill="${state.colors.highMed}"/>
                <rect id="medium-medium" x="33" y="33" width="33" height="33" fill="${state.colors.medMed}"/>
                <rect id="low-medium" x="66" y="33" width="33" height="33" fill="${state.colors.lowMed}"/>
                <rect id="high-low" x="0" y="66" width="33" height="33" fill="${state.colors.highLow}"/>
                <rect id="medium-low" x="33" y="66" width="33" height="33" fill="${state.colors.medLow}"/>
                <rect id="low-low" x="66" y="66" width="33" height="33" fill="${state.colors.lowLow}"/>
            </svg>
            `
            return outerTable;
        };
    };
    
    legend.addTo(map);
    return legend;
};




