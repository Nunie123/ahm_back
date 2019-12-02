import { TableView } from './table_view.js';
import { hideById, showById, postData } from './helpers.mjs';

const L = window.L;  // imported leaflet in analysis.html
const URL_ROOT = window.SCRIPT_ROOT;  //imported from analysis.html


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
        this.legend = null;
        this.mapId = null;
        this.title = null;
        this.center = [37.8, -96];
        this.zoom = 4;
        this.map = this.createMap();
        this.infoLayer = this.makeInfoBox(this.choroplethProperties, this.map);
        this.showMapView = this.showMapView.bind(this);
        this.saveMap = this.saveMap.bind(this);
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

    showMapView(e){
        let node = e.target;
        TableView.makeMapNavButtonsInactive();
        node.classList.toggle('btn-success');
        node.classList.toggle('btn-outline-success');
        hideById('table-view');
        showById('map');
        hideById('statistics-view');
    }

    makeInfoBox(choroplethProperties, map){
        var info = L.control();
    
        info.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
            this.update();
            return this._div;
        };
    
        info.update = function (props) {
            var boxEl = this._div;
            boxEl.innerHTML = '';
            boxEl.setAttribute('id', 'map-info-box');
            if(props){
                let headerText = document.createTextNode(props.NAME);
                boxEl.appendChild(headerText);
                for(let i=0; i<choroplethProperties.length; i++){
                    let propertyName = choroplethProperties[i].propertyName;
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

    async saveMap(e){
        let node = e.target;
        let saveAsNew = node.dataset.saveAsNew == 'yes' ? true : false;
        if(this.choroplethProperties.length == 0){return;}
    
        let mapDetails = {};
        mapDetails.dataset1 = this.choroplethProperties[0].datasetId;
        mapDetails.attribute1 = this.choroplethProperties[0].propertyName;
        mapDetails.year1 = this.choroplethProperties[0].propertyYear;
        mapDetails.color1 = this.colors.highLow;
        if(this.choroplethProperties.length == 2){
            mapDetails.dataset2 = this.choroplethProperties[1].datasetId;
            mapDetails.attribute2 = this.choroplethProperties[1].propertyName;
            mapDetails.year2 = this.choroplethProperties[1].propertyYear;
            mapDetails.color2 = this.colors.lowHigh;
        }
        mapDetails.title = document.getElementById('map-title').value;
        mapDetails.isPublic = true;
        mapDetails.zoom = this.map.getZoom();
        let latLon = this.map.getCenter();
        mapDetails.coordinates = [latLon.lat, latLon.lng];
        if(!saveAsNew){
            mapDetails.mapId = this.mapId;
        }
    
        const url = `${URL_ROOT}analysis/save`;
        const dataResponse = await postData(url, mapDetails);
        this.mapId = dataResponse.map_id;
    
        const imageResponse = await saveMapImage(this.map_id);
            
    }
}



async function saveMapImage(map_id){
    const mapImage = await generateMapImage();
    const imageUrl = `${URL_ROOT}analysis/${map_id}/save-thumbnail`;
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
        let title = PRELOADED_MAP.title;
        choropleth.title = title;
        document.getElementById('map-title').value = title;
        let zoom = PRELOADED_MAP.zoom_level;
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


export { Choropleth, loadMap };