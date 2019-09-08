"use strict";

var map = createMap()
var usStateGeoJson = usStateGeoJson;  // loaded from static file in analysis.html


// Map -----------------------------------------------------------------------------

function createMap(){
    const mapboxAccessToken = 'pk.eyJ1IjoibnVuaWUxMjMiLCJhIjoiY2pscmNpNWNmMDNvMzNxbm5rOGI1cWhvZyJ9.TilZiY3pDTd9BZpagtnHiw';
    var map = L.map('map').setView([37.8, -96], 4);

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + mapboxAccessToken, {
        id: 'mapbox.light'
        , attribution: '© Mapbox, © OpenStreetMap'
    }).addTo(map);

    return map;
};

function addPropertyToGeoJson(geoJson, propertyJson){
    geoJson.features.forEach(function(geoEl){
        let propertyEl = propertyJson.filter(property => property.geo_name.toLowerCase() == geoEl.properties.NAME.toLowerCase());

        if(propertyEl.length > 0){
            let propertyName = propertyEl[0]['attribute_name'];
            let propertyValue = parseFloat(propertyEl[0]['attribute_value']);
            geoEl.properties[propertyName] = propertyValue;
        }
    });
    console.log(geoJson)
}

function addChoroplethToMap(map, geoJson, layerNames, colors){

    function style(feature) {
        fillOpacity = getFillOpacity(layerNames, geoJson, feature)
        // fillColor = color;
        fillOpacity = 0.8
        fillColor = getColor(layerNames, geoJson, feature, colors)
        return {
            fillColor: fillColor,
            weight: 2,
            opacity: 0.3,
            color: 'white',
            dashArray: '3',
            fillOpacity: fillOpacity
        };
    };
    function onEachFeature(feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomToFeature
        });
    };

    let layer = L.geoJson(geoJson, {
        style: style,
        onEachFeature: onEachFeature
    }).addTo(map);
};


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
            addPropertyToGeoJson(usStateGeoJson, propertyJson)
        });
}


// ------------------------------------------------------------------------------


var state = {
    activeMapLayerNames: [],
    activeMapLayers: [],
    attributeLevel: 'state',
    // colors: ['#0061ff', '#f44146'],
    colors: {
        highHigh: '#9C29C1', //dark purple
        highMed: '#4E44C9',  //dark blue-purple
        highLow: '#1F9FFC',  //blue
        medHigh: '#C94493',  //dark red-purple
        medMed: '#C179D8',   //purple
        medLow: '#9A94E0',   //light blue-purple
        lowHigh: '#FC551F',  //red
        lowMed: '#E094C1',   //light red-purple
        lowLow: '#F3E4F7'    //light purple
    },
    map: {},
    stateData: null,       
    countyData: null,      
    info: {},
    legend: null,
    filePendingUpload: null
};
// state.map = createMap();
// state.info = addInfoBoxToMap(state.map);
// refreshMapLayers();

function refreshMapLayers(attributeLevel=state.attributeLevel
                            , map=state.map
                            , activeMapLayerNames=state.activeMapLayerNames
                            , activeMapLayers=state.activeMapLayers
                            , colors=state.colors) {
    let data = attributeLevel==='state' ? state.stateData :
               attributeLevel==='county' ? state.countyData :
               'Unexpected value for "attribute_level" in refreshMapLayers().'
    
    //if new attributeLevel is selected then layerNames at other levels are deleted
    if(attributeLevel != state.attributeLevel){     
        state.activeMapLayerNames = [state.activeMapLayerNames.pop()];
        activeMapLayerNames = state.activeMapLayerNames
        state.attributeLevel = attributeLevel
    };

    //if more than 3 layers selected then 2nd layer swapped with new selection
    if(activeMapLayerNames.length > 2){
        activeMapLayerNames.splice(1,1);
        state.activeMapLayerNames = activeMapLayerNames;
    };
    
    //remove all layers
    activeMapLayers.forEach(function(layer){
        map.removeLayer(layer)
        activeMapLayers=[]
    });
    if(activeMapLayerNames.length > 0){
        addChoroplethToMap(map, data, activeMapLayerNames, colors);
    };
    
    state.legend = updateLegend(state.map);
    
};


// function createMap(){
//     const mapboxAccessToken = 'pk.eyJ1IjoibnVuaWUxMjMiLCJhIjoiY2pscmNpNWNmMDNvMzNxbm5rOGI1cWhvZyJ9.TilZiY3pDTd9BZpagtnHiw';
//     var map = L.map('map').setView([37.8, -96], 4);

//     L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + mapboxAccessToken, {
//         id: 'mapbox.light'
//         //, attribution: '© Mapbox, © OpenStreetMap'
//     }).addTo(map);

//     return map;
// };

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
            for(let i=0; i<state.activeMapLayerNames.length; i++){
                let br = document.createElement('br');
                let text = document.createTextNode(state.activeMapLayerNames[i] + ': ' + props[state.activeMapLayerNames[i]]);
                boxEl.appendChild(br);
                boxEl.appendChild(text);
            };
        } else {
            let text = document.createTextNode(`Hover over a ${state.attributeLevel}.`);
            boxEl.appendChild(text);
        };
    };

    info.addTo(map);
    return info;
};

function updateLegend(map){
    if(state.legend){map.removeControl(state.legend)}
    var legend = L.control({position: 'bottomleft'});
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

// function addChoroplethToMap(map, geoJson, layerNames, colors){

//     function style(feature) {
//         fillOpacity = getFillOpacity(layerNames, geoJson, feature)
//         // fillColor = color;
//         // fillOpacity = 0.8
//         fillColor = getColor(layerNames, geoJson, feature, colors)
//         return {
//             fillColor: fillColor,
//             weight: 2,
//             opacity: 0.3,
//             color: 'white',
//             dashArray: '3',
//             fillOpacity: fillOpacity
//         };
//     };
//     function onEachFeature(feature, layer) {
//         layer.on({
//             mouseover: highlightFeature,
//             mouseout: resetHighlight,
//             click: zoomToFeature
//         });
//     };

//     let layer = L.geoJson(geoJson, {
//         style: style,
//         onEachFeature: onEachFeature
//     }).addTo(map);
//     state.activeMapLayers = [layer];
// };

function getColor(layerNames, data, feature, colors){
    if(layerNames.length===1){
        var color = colors.highLow;
    } else {
        var color = getColorForTwoLayers(layerNames, data, feature, colors);
    };
    return color;
};

function getFillOpacity(layerNames, data, feature, maxOpacity=0.8){
    if(layerNames.length === 1){
        var fillOpacity = getWeightedValueForOneLayer(layerNames[0], data, feature)*maxOpacity;
    } else {
        // let [weightedVal1, weightedVal2] = getWeightedValuesForTwoLayers(layerNames, data, feature);
        // var fillOpacity = (weightedVal1+weightedVal2)/2*maxOpacity;
        var fillOpacity = 0.8
    };
    return fillOpacity;
};

function getColorForTwoLayers(layerNames, data, feature, colors){
    let [weightedVal1, weightedVal2] = getWeightedValuesForTwoLayers(layerNames, data, feature)
    // let weightedVal1Proportion = Math.round(weightedVal1/(weightedVal1+weightedVal2)*100)/100;
    // let hsl1 = hexToHsl(colors[0])
    // let hsl2 = hexToHsl(colors[1])
    // let hue1 = hsl1[0];
    // let hue2 = hsl2[0];
    // let hueRange = Math.abs(hue1 - hue2);
    // let finalHue = hue2 - weightedVal1Proportion*hueRange;
    // let normalizedFinalHue = finalHue>1 ? finalHue-1 : finalHue;
    // let color = `hsl(${normalizedFinalHue*360}, ${hsl1[1]*100}%, ${hsl1[2]*100}%)`
    val1Description = getQualitativeDescription(weightedVal1);
    val2Description = getQualitativeDescription(weightedVal2);
    let color = val1Description == 'high' && val2Description == 'high' ? colors.highHigh:
                val1Description == 'high' && val2Description == 'medium' ? colors.highMed:
                val1Description == 'high' && val2Description == 'low' ? colors.highLow:
                val1Description == 'medium' && val2Description == 'high' ? colors.medHigh:
                val1Description == 'medium' && val2Description == 'medium' ? colors.medMed:
                val1Description == 'medium' && val2Description == 'low' ? colors.medLow:
                val1Description == 'low' && val2Description == 'high' ? colors.lowHigh:
                val1Description == 'low' && val2Description == 'medium' ? colors.lowMed:
                colors.lowLow
    return color;
};

function getQualitativeDescription(val){
    description = val >= 0.66 ? 'high' :
                    val < 0.33 ? 'low' :
                    'medium';
    return description;
};

function getWeightedValuesForTwoLayers(layerNames, data, feature){
    let weightedVal1 = getWeightedValueForOneLayer(layerNames[0], data, feature);
    let weightedVal2 = getWeightedValueForOneLayer(layerNames[1], data, feature);
    return [weightedVal1, weightedVal2]
};

function getWeightedValueForOneLayer(layerName, data, feature){
    let val = feature.properties[layerName];
    let weightedVal = getPropertyValueAsWeight(data, layerName, val);
    return weightedVal
};

function getPropertyValueAsWeight(data, propertyName, value){       //returns value between 0 and 1
    let minMax = getMinMaxFromGeoJsonProperty(data, propertyName);
    let range = minMax.max - minMax.min;
    let normalizedValue = value - minMax.min;
    let weight = Math.round(normalizedValue/range*100)/100;
    return weight;
};

function getMinMaxFromGeoJsonProperty(data, propertyName){
    const propertyArray = data.features.map(x => parseInt(x.properties[propertyName]));
    const filteredArray = propertyArray.filter(x => isNumeric(x));
    const minMax = {'min': Math.min(...filteredArray), 'max': Math.max(...filteredArray)};
    return minMax;
};

function hexToHsl(hexColor){
    var r = parseInt(hexColor.substr(1,2), 16); // Grab the hex representation of red (chars 1-2) and convert to decimal (base 10).
    var g = parseInt(hexColor.substr(3,2), 16);
    var b = parseInt(hexColor.substr(5,2), 16);

    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h,s,l]
};

function hexToRgba(hex, alpha){
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";

};

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
};

function highlightFeature(e) {
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

    state.info.update(layer.feature.properties);
};

function resetHighlight(e) {
    geojson = state.activeMapLayers[0];
    geojson.resetStyle(e.target);
    state.info.update();
};

function zoomToFeature(e) {
    state.map.fitBounds(e.target.getBounds());
};



