import { TableView } from './table_view.js';
import { hideById, showById, postData } from './helpers.js';
import { STATE_GEO_JSON } from './us_state_geojson.js';
import { COUNTY_GEO_JSON } from './us_counties_geojson.js';

const L = window.L;  
const URL_ROOT = window.SCRIPT_ROOT;  


// Map -----------------------------------------------------------------------------
class Choropleth {
    constructor(colors= {
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
        this.geoJson = null;
        this.geoLevel = null;
        this.colors = colors;
        this.choroplethProperties = [];
        this.legend = null;
        this.mapId = null;
        this.title = null;
        this.center = [37.8, -96];
        this.zoom = 4;
        this.map = this.createMap();
        this.infoLayer = null;
        this.showMapView = this.showMapView.bind(this);
        this.saveMap = this.saveMap.bind(this);
        this.downloadAsCsv = this.downloadAsCsv.bind(this);
        this.downloadAsGeoJson = this.downloadAsGeoJson.bind(this);
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
        if(!this.geoJson){
            this.addGeoJson();
        }
        this.geoJson.features.forEach(function(geoEl){
            let propertyEl = propertyJson.filter(property => property.fips_code == geoEl.properties['FIPS CODE']);
    
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
        if(this.choroplethProperties.length == 0){
            this.addInfoBox();
        }
        let geoLevel = propertyJson[0].fips_code.length == 2 ? 'state' : 'county';
        if(this.geoLevel != geoLevel){
            this.geoLevel = geoLevel;
            this.addGeoJson();
            this.choroplethProperties = [];
        }
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

    addGeoJson(){
        if(this.geoLevel == 'state'){
            this.geoJson = STATE_GEO_JSON;
        } else if (this.geoLevel == 'county'){
            this.geoJson = COUNTY_GEO_JSON;
        }
    }

    removeChoroplethProperty(propertyName){
        this.removePropertyFromGeoJson(propertyName);
        this.choroplethProperties = this.choroplethProperties.filter( property => property.propertyName != propertyName);
        if(this.choroplethProperties.length > 0){
            this.addChoroplethToMap();
        } else {
            this.removeGeoJsonLayer();
            this.removeInfoBox();
        }
        // The code breaks without the below assignment.  I do not know why.  For some reason the properties don't update properly unless they are evaluated at this stage.
        let properties = this.geoJson.features[0].properties;  // DO NOT REMOVE
        return properties;
    }

    showMapView(e){
        let node = e.target;
        TableView.makeMapNavButtonsInactive();
        node.classList.toggle('btn-purple');
        node.classList.toggle('btn-outline-purple');
        hideById('table-view');
        showById('map');
        hideById('statistics-view');
    }

    addInfoBox(){
        let info = L.control();
        let map = this.map;
    
        info.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
            this.update();
            return this._div;
        };
    
        info.update = function (props) {
            var boxNode = this._div;
            boxNode.innerHTML = '';
            boxNode.setAttribute('id', 'map-info-box');
            if(props){
                let headerText = document.createTextNode(props.NAME);
                let propsCopy = Object.assign({}, props);
                boxNode.appendChild(headerText);
                boxNode.appendChild(document.createElement('br'));
                delete propsCopy.NAME;
                delete propsCopy['GEO ID'];
                delete propsCopy.LSAD10;
                delete propsCopy.CLASSFP10;
                delete propsCopy.MTFCC10;
                delete propsCopy.CSAFP10;
                delete propsCopy.CBSAFP10;
                delete propsCopy.METDIVFP10;
                delete propsCopy.FUNCSTAT10;
                for (let key in propsCopy){
                    let text = document.createTextNode(`${key}: ${propsCopy[key]}`);
                    boxNode.appendChild(text);
                    boxNode.appendChild(document.createElement('br'));
                }
            } else {
                let text = document.createTextNode(`Hover over a state.`);
                boxNode.appendChild(text);
            }
        };
    
        info.addTo(map);
        this.infoLayer = info;
    }

    removeInfoBox(){
        this.map.removeControl(this.infoLayer);
        this.infoLayer = null;
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
    
        const imageResponse = await saveMapImage(this.mapId);

        if(saveAsNew || !('mapId' in mapDetails)){
            window.location = `${URL_ROOT}analysis/${this.mapId}`;  
        }
    }

    async downloadMapAsJpg(){
        let dataUrl = await generateImage();
        let link = document.createElement('a');
        let title = this.title.replace('.', '_') || 'untitled_map';
        link.download = `${title}.jpg`;
        link.href = dataUrl;
        link.click();
    }

    async downloadMapAsPng(){
        let dataUrl = await generateImage(1, 'png');
        let link = document.createElement('a');
        let title = this.title.replace('.', '_') || 'untitled_map';
        link.download = `${title}.png`;
        link.href = dataUrl;
        link.click();
    }

    downloadAsCsv(){
        let properties = this.geoJson.features.map( feature => feature.properties);
        let csv = Papa.unparse(properties);
        let blob = new Blob([csv], {type: "text/csv"});
        window.saveAs(blob, `${self.title}.csv`);       //FileSaver.js
    }

    downloadAsGeoJson(){
        let json = JSON.stringify(this.geoJson);
        let blob = new Blob([json], {type: "geo+json"});
        window.saveAs(blob, `${this.title}.json`);       //FileSaver.js
    }

}



async function saveMapImage(map_id){
    const mapImage = await generateImage(0.15);
    const imageUrl = `${URL_ROOT}analysis/${map_id}/save-thumbnail`;
    const imageResponse = await fetch(imageUrl, {
        method: 'POST',
        body: mapImage
    });
    return imageResponse;
}

async function generateImage(quality=0.95, format='jpg'){
    let node = document.getElementById('map');
    let options = {};
    options.quality = quality;
    options.width = node.clientWidth;
    options.height = node.clientHeight;
    let dataUrl = format == 'jpg' ? await domtoimage.toJpeg(node, options) : await domtoimage.toPng(node, options);    
    return dataUrl;
}

function loadMap(choropleth, sidePanel){
    if(PRELOADED_MAP){
        choropleth.mapId = PRELOADED_MAP.map_id;
        choropleth.geoLevel = PRELOADED_MAP.geo_level;
        sidePanel.geoLevel = PRELOADED_MAP.geo_level;
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
            dataset2.datasetId = PRELOADED_MAP.secondary_dataset_id;
            sidePanel.processAttribute(dataset2);
        }
    }
}


export { Choropleth, loadMap };